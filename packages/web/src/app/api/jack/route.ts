import { NextRequest, NextResponse } from 'next/server';
import { jackSkills, SkillJackError } from '@skilljack/core';
import type { OutputFormat } from '@skilljack/core';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';

// --- Fix 1: In-memory rate limiter ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

// --- Fix 4: Request body size cap ---
const MAX_BODY_BYTES = 1024; // 1KB — sufficient for URL + format

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    // Cap request body size
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 }
      );
    }

    let body: { url?: string; format?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { url, format: rawFormat } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'A valid YouTube URL is required.' },
        { status: 400 }
      );
    }

    const VALID_FORMATS: OutputFormat[] = ['claude-skill', 'cursor-rules', 'windsurf-rules'];
    const format: OutputFormat = VALID_FORMATS.includes(rawFormat as OutputFormat)
      ? (rawFormat as OutputFormat)
      : 'claude-skill';

    // --- Usage enforcement for signed-in users ---
    const { userId } = await auth();
    let supabaseUserId: string | null = null;

    if (userId) {
      const supabase = getSupabase();
      const now = new Date();
      const periodStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      const { data: user } = await supabase
        .from('users')
        .select('id, tier')
        .eq('clerk_id', userId)
        .single();

      if (user) {
        supabaseUserId = user.id;
        const tier = user.tier || 'free';
        const limit = tier === 'pro' ? 50 : 3;

        // Find or create usage record for current month
        let { data: usage } = await supabase
          .from('usage')
          .select('jacks_used, jacks_limit')
          .eq('user_id', user.id)
          .eq('period_start', periodStart)
          .single();

        if (!usage) {
          const periodEnd = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
          ).toISOString();

          const { data: created } = await supabase
            .from('usage')
            .insert({
              user_id: user.id,
              jacks_used: 0,
              jacks_limit: limit,
              period_start: periodStart,
              period_end: periodEnd,
            })
            .select('jacks_used, jacks_limit')
            .single();

          usage = created;
        }

        if (usage && usage.jacks_used >= usage.jacks_limit) {
          return NextResponse.json(
            {
              error:
                'Monthly extraction limit reached. Upgrade to Pro for more.',
              upgrade: true,
            },
            { status: 402 }
          );
        }
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[/api/jack] Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const results = await jackSkills(url, {
      format,
      apiKey,
      count: 10,
      concurrency: 3,
      extraction: {
        onDebug: (msg) => console.log(`[/api/jack] ${msg}`),
      },
      onSkip: (msg) => console.log(`[/api/jack] ${msg}`),
    });

    console.log(`[/api/jack] Success: ${results.length} skills from ${url}`);

    // --- Increment usage after successful extraction ---
    if (userId && supabaseUserId) {
      try {
        const supabase = getSupabase();
        const now = new Date();
        const periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();

        // Read current usage then increment
        const { data: currentUsage } = await supabase
          .from('usage')
          .select('id, jacks_used')
          .eq('user_id', supabaseUserId)
          .eq('period_start', periodStart)
          .single();

        if (currentUsage) {
          await supabase
            .from('usage')
            .update({ jacks_used: currentUsage.jacks_used + 1 })
            .eq('id', currentUsage.id);
        }
      } catch (usageErr) {
        // Log but don't fail the request — the extraction already succeeded
        console.error('[/api/jack] Failed to increment usage:', usageErr);
      }
    }

    return NextResponse.json({
      skills: results.map((r) => ({
        skill: {
          name: r.skill.name,
          sourceTitle: r.skill.sourceTitle,
          sourceUrl: r.skill.sourceUrl,
          generatedAt: r.skill.generatedAt,
          content: r.skill.content,
        },
        formatted: {
          content: r.formatted.content,
          filename: r.formatted.filename,
          format: r.formatted.format,
        },
      })),
    });
  } catch (err: unknown) {
    // --- Fix 7: Only expose SkillJackError messages, sanitize the rest ---
    console.error('[/api/jack] Error:', err);

    if (err instanceof SkillJackError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
