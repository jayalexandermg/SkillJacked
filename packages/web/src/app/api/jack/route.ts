import { NextRequest, NextResponse } from 'next/server';
import {
  extract,
  segmentTranscript,
  generateSkillsFromPlan,
  format as formatSkill,
  SkillJackError,
} from '@skilljack/core';
import type { OutputFormat } from '@skilljack/core';

// --- In-memory rate limiter ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
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

// Request body size cap
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
    const outputFormat: OutputFormat = VALID_FORMATS.includes(rawFormat as OutputFormat)
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

    // Multi-skill pipeline: extract → segment → generate up to 10 skills
    const rawContent = await extract(url);

    const plan = await segmentTranscript(rawContent, {
      maxSegments: 10,
      apiKey,
    });

    const { skills } = await generateSkillsFromPlan(rawContent, plan, {
      count: 10,
      concurrency: 3,
      apiKey,
    });

    const results = skills.map((skill) => {
      const formatted = formatSkill(skill, outputFormat);
      return {
        skill: {
          name: skill.name,
          sourceTitle: skill.sourceTitle,
          sourceUrl: skill.sourceUrl,
          generatedAt: skill.generatedAt,
          content: skill.content,
        },
        formatted: {
          content: formatted.content,
          filename: formatted.filename,
          format: formatted.format,
        },
      };
    });

    return NextResponse.json({ skills: results });
  } catch (err: unknown) {
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
