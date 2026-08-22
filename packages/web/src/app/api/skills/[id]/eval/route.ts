import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { evaluateSkill, SkillJackError } from '@skilljack/core';
import { getSupabase } from '@/lib/supabase';

// Three sequential-ish model calls: two generations in parallel, then one
// judgement. Comfortably inside the platform ceiling, but not instant.
export const maxDuration = 280;

const MAX_TEST_PROMPT_LENGTH = 4000;

/**
 * POST /api/skills/:id/eval — test whether this skill improves model output.
 *
 * Pro-only, and only ever on demand. Evaluating automatically on every
 * extraction would cost more per jack than the tier earns, so there is no code
 * path that reaches this without a user clicking.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { test_prompt?: unknown } | null;
  const testPrompt = body?.test_prompt;

  if (typeof testPrompt !== 'string' || testPrompt.trim().length === 0) {
    return NextResponse.json({ error: 'A test prompt is required.' }, { status: 400 });
  }
  if (testPrompt.length > MAX_TEST_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Test prompt must be under ${MAX_TEST_PROMPT_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('id, tier')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (user.tier !== 'pro') {
    return NextResponse.json({ error: 'Skill evals are a Pro feature.' }, { status: 402 });
  }

  // Scoped by user_id: this client uses the service-role key and bypasses RLS,
  // so ownership is enforced here or not at all. Without it, any known skill id
  // would let one account spend model budget evaluating someone else's skill.
  const { data: skill } = await supabase
    .from('skills')
    .select('id, name, content')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!skill) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const result = await evaluateSkill(
      {
        skillName: skill.name,
        skillContent: skill.content,
        testPrompt: testPrompt.trim(),
      },
      { apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 },
    );

    // Persisting is best-effort: the user already paid for the model calls, so
    // a write failure must not throw the result away. It is returned either
    // way; only the ability to render it on a return visit is lost.
    const { error: writeError } = await supabase
      .from('skills')
      .update({
        eval_score: result.score,
        eval_run_at: new Date().toISOString(),
        test_prompt: testPrompt.trim(),
        baseline_output: result.baselineOutput,
        skill_output: result.skillOutput,
        eval_reasoning: result.reasoning,
        skill_label: result.skillLabel,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (writeError) {
      console.error('[/api/skills/:id/eval] persist failed:', writeError);
    }

    return NextResponse.json({
      score: result.score,
      tally: result.tally,
      verdicts: result.verdicts,
      skill_label: result.skillLabel,
      baseline_output: result.baselineOutput,
      skill_output: result.skillOutput,
      reasoning: result.reasoning,
      persisted: !writeError,
    });
  } catch (err) {
    console.error('[/api/skills/:id/eval] Error:', err);

    // The eval is metadata, never a gate — a failure here leaves the skill
    // completely usable, so the message says what happened and nothing else
    // changes.
    if (err instanceof SkillJackError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'The eval could not be completed. Your skill is unchanged.' },
      { status: 500 },
    );
  }
}
