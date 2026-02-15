import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

// Simple in-memory store for MVP (resets on server restart)
const tokens = new Map<string, string>();
const MAX_TOKENS = 10_000;

// --- Fix 6: Rate limiter for signups ---
const authRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const AUTH_RATE_LIMIT = 3;
const AUTH_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isAuthRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = authRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    authRateLimitMap.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > AUTH_RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (isAuthRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already has a token
    const existing = tokens.get(normalizedEmail);
    if (existing) {
      return NextResponse.json({ token: existing });
    }

    // Cap token store size to prevent memory exhaustion
    if (tokens.size >= MAX_TOKENS) {
      return NextResponse.json(
        { error: 'Service is at capacity. Please try again later.' },
        { status: 503 }
      );
    }

    // Generate cryptographically secure token
    const token = `sj_${randomUUID().replace(/-/g, '')}`;
    tokens.set(normalizedEmail, token);

    return NextResponse.json({ token });
  } catch (err: unknown) {
    // --- Fix 7: Sanitize error responses ---
    console.error('[/api/auth] Error:', err);

    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
