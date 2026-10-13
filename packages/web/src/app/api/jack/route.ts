import { NextRequest, NextResponse } from 'next/server';
import { jackSkills, SkillJackError } from '@skilljack/core';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';
import { generateShareId } from '@/lib/share-id';
import { getOrCreateUser, type AppUser } from '@/lib/users';
import { ensureUsageRow, refundJack, reserveJack, tierLimit } from '@/lib/usage-server';
import { hashClaimToken, newClaimToken } from '@/lib/claim-token';
import { skillDescription, videoIdFromUrl, type JackSkillRow } from '@/lib/jack-view';
import { toJackView, type JackRow } from '@/lib/jacks-server';

const ANONYMOUS_JACK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// The Privacy Policy promises unclaimed signed-out results are deleted after
// 7 days. There is no scheduler, so every jack sweeps the expired ones.
async function deleteStaleAnonymousJacks(): Promise<void> {
  const cutoff = new Date(Date.now() - ANONYMOUS_JACK_TTL_MS).toISOString();
  const { error } = await getSupabase().from('jacks').delete().is('user_id', null).lt('created_at', cutoff);
  if (error) console.error('[/api/jack] Anonymous cleanup failed:', error);
}

// Extraction does multiple sequential Claude calls: one segmenter call
// (own internal abort at 110s, streamed with a 32k token budget so
// adaptive thinking doesn't truncate the JSON plan on longer transcripts)
// plus up to 10 skill generations at concurrency 3 (each with a 60s
// internal abort), and jackSkills can retry the whole segment+generate
// pass once if the first attempt returns zero skills. 280s gives real
// headroom for that combination; Vercel already accepted 150s previously
// so this is a safe incremental raise on the same plan.
export const maxDuration = 280;

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
const MAX_BODY_BYTES = 1024; // 1KB — plenty for a URL

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

    let body: { url?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'A valid YouTube URL is required.' },
        { status: 400 }
      );
    }

    const { userId: clerkId } = await auth();
    let user: AppUser | null = null;

    // --- Reserve one of this month's videos before spending AI budget ---
    if (clerkId) {
      user = await getOrCreateUser(clerkId);
      if (!user || !(await ensureUsageRow(user.id, tierLimit(user.tier)))) {
        return NextResponse.json({ error: 'Could not check your usage. Please try again.' }, { status: 500 });
      }
      if (!(await reserveJack(user.id))) {
        return NextResponse.json(
          { error: "You've used all your videos for this month. Upgrade to Pro for more.", upgrade: true },
          { status: 402 },
        );
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[/api/jack] Missing ANTHROPIC_API_KEY');
      if (user) await refundJack(user.id);
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    let results: Awaited<ReturnType<typeof jackSkills>>;
    try {
      results = await jackSkills(url, {
        apiKey,
        count: 10,
        concurrency: 3,
        extraction: {
          onDebug: (msg) => console.log(`[/api/jack] ${msg}`),
          supadataApiKey: process.env.SUPADATA_API_KEY,
        },
        onDebug: (msg) => console.log(`[/api/jack] ${msg}`),
        onSkip: (msg) => console.log(`[/api/jack] ${msg}`),
      });
    } catch (err) {
      if (user) await refundJack(user.id);
      throw err;
    }

    console.log(`[/api/jack] Success: ${results.length} skills from ${url}`);

    // A zero-skill result is shown as a failure, so it must not cost a video.
    if (results.length === 0) {
      if (user) await refundJack(user.id);
      return NextResponse.json({ jack: null });
    }

    // --- Store the jack. Nothing reaches the library until the user saves. ---
    const supabase = getSupabase();
    const first = results[0].skill;
    const claimToken = user ? undefined : newClaimToken();

    const { data: jackRow, error: jackError } = await supabase
      .from('jacks')
      .insert({
        user_id: user?.id ?? null,
        claim_token_hash: claimToken ? hashClaimToken(claimToken) : null,
        share_id: generateShareId(),
        source_title: first.sourceTitle,
        source_url: first.sourceUrl,
        source_video_id: videoIdFromUrl(first.sourceUrl),
        source_channel: first.sourceChannel ?? null,
      })
      .select('*')
      .single();

    const { data: skillRows, error: skillsError } = jackRow
      ? await supabase
          .from('jack_skills')
          .insert(
            results.map((r, position) => ({
              jack_id: jackRow.id,
              position,
              name: r.skill.name,
              description: skillDescription(r.skill.content),
              content: r.skill.content,
            })),
          )
          .select('id, position, name, description, content, saved_skill_id')
      : { data: null, error: null };

    if (jackError || skillsError || !jackRow || !skillRows) {
      console.error('[/api/jack] Failed to store jack:', jackError ?? skillsError);
      if (user) await refundJack(user.id);
      return NextResponse.json(
        { error: "We couldn't store your results. This didn't use one of your videos. Please try again." },
        { status: 500 },
      );
    }

    await deleteStaleAnonymousJacks();

    return NextResponse.json({
      jack: { ...toJackView(jackRow as JackRow, skillRows as JackSkillRow[], user !== null), claimToken },
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
