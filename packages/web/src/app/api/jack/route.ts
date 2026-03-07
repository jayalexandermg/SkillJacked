import { NextRequest, NextResponse } from 'next/server';
import { jackSkill, SkillJackError } from '@skilljack/core';
import type { OutputFormat } from '@skilljack/core';

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[/api/jack] Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const result = await jackSkill(url, {
      format,
      apiKey,
      extraction: {
        onDebug: (msg) => console.log(`[/api/jack] ${msg}`),
      },
    });

    console.log(`[/api/jack] Success: "${result.skill.name}" via ${result.skill.sourceUrl}`);

    return NextResponse.json({
      skill: {
        name: result.skill.name,
        sourceTitle: result.skill.sourceTitle,
        sourceUrl: result.skill.sourceUrl,
        generatedAt: result.skill.generatedAt,
        content: result.skill.content,
      },
      formatted: {
        content: result.formatted.content,
        filename: result.formatted.filename,
        format: result.formatted.format,
      },
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
