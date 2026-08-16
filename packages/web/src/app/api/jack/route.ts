import { NextRequest, NextResponse } from 'next/server';
import { jackSkills, SkillJackError } from '@skilljack/core';
import type { OutputFormat } from '@skilljack/core';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';

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

// Best-effort title lookup for the manual-transcript path (SPEC-R1 §4.B3).
// NEVER throws and NEVER fails the request — returns undefined on any
// failure, letting the core fall back to a URL-derived title.
const OEMBED_TIMEOUT_MS = 10_000;

async function fetchTitleBestEffort(url: string): Promise<string | undefined> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { title?: unknown };
    return typeof data.title === 'string' && data.title.trim().length > 0
      ? data.title
      : undefined;
  } catch {
    return undefined;
  }
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

// --- Fix 4: Request body size cap (two-tier, SPEC-R1 §4.B4) ---
//
// Unit note (CG-P2): both constants below are measured in UTF-16 CODE UNITS —
// what String.prototype.length returns on the decoded body — NOT bytes.
// rawBody is the decoded string, and code units are what every downstream
// consumer of the string (JSON.parse, the word cap, the Claude prompt)
// actually operates on. For ASCII content 1 code unit == 1 byte; non-ASCII
// text can be up to 3x larger in UTF-8 bytes, so the true wire-size ceiling
// is bounded by ~3x these values in the worst case. That looseness is
// accepted: the constants exist to bound downstream work, and downstream
// work is measured in code units.
//
// Tier 1 — hard read ceiling for every request, sized to the worst legitimate
// transcript. Derivation: the pipeline caps transcripts at 50,000 words; at a
// generous ~10 code units per word including whitespace that is ~500,000 code
// units of transcript, plus JSON quoting/escape overhead and the url/format
// fields. 640,000 code units gives that headroom without inviting abuse.
const MAX_BODY_UNITS_HARD_CEILING = 640_000;
// Tier 2 — requests WITHOUT rawTranscript keep (approximately) the original
// 1KB-order bound, preserving the pre-existing hardening for the URL-only
// request shape. Applied post-parse, once we know the request's shape.
const MAX_BODY_UNITS_URL_ONLY = 2_048;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    // Tier 1: hard read ceiling (see unit note above — UTF-16 code units)
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_UNITS_HARD_CEILING) {
      return NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 }
      );
    }

    let body: { url?: string; format?: string; rawTranscript?: string };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const { url, format: rawFormat } = body;

    // A rawTranscript is "present" only when it is a non-empty string after
    // trimming; anything else is treated as absent and the request behaves
    // exactly like a URL-only request.
    const hasRawTranscript =
      typeof body.rawTranscript === 'string' && body.rawTranscript.trim().length > 0;

    // Tier 2: post-parse cap for the URL-only shape (same unit as tier 1).
    if (!hasRawTranscript && rawBody.length > MAX_BODY_UNITS_URL_ONLY) {
      return NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 }
      );
    }

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

    // --- Manual-transcript path (SPEC-R1 §4.B2/B3) ---
    // Positioned AFTER the usage-enforcement block above (CG-P3): a request
    // that would be quota-rejected never reaches this work. When a
    // rawTranscript is present, ALL YouTube transcript fetching is bypassed
    // (jackSkills skips extraction entirely); the title comes from a
    // best-effort oEmbed lookup that can never fail the request — on any
    // failure the core derives a URL-based title instead.
    let rawTranscript: string | undefined;
    let rawTranscriptTitle: string | undefined;
    if (hasRawTranscript) {
      rawTranscript = body.rawTranscript;
      rawTranscriptTitle = await fetchTitleBestEffort(url);
      console.log(
        `[/api/jack] rawTranscript provided (${rawBody.length} body units); bypassing extraction`
      );
    }

    const results = await jackSkills(url, {
      format,
      apiKey,
      count: 10,
      concurrency: 3,
      rawTranscript,
      rawTranscriptTitle,
      extraction: {
        onDebug: (msg) => console.log(`[/api/jack] ${msg}`),
        supadataApiKey: process.env.SUPADATA_API_KEY,
      },
      onDebug: (msg) => console.log(`[/api/jack] ${msg}`),
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
