import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * An anonymous jack is claimed after sign-up with a token only the visitor's
 * browser holds. The database keeps a SHA-256 of it, so a database leak
 * doesn't let anyone claim someone else's results.
 */
export function newClaimToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashClaimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function claimTokenMatches(token: unknown, storedHash: string | null): boolean {
  if (typeof token !== 'string' || !token || !storedHash) return false;
  const a = Buffer.from(hashClaimToken(token), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
