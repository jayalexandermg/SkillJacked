import { randomBytes } from 'node:crypto';

// URL-safe, no lookalike-heavy padding characters. 64 symbols keeps the
// byte -> character mapping a clean 6-bit slice with no modulo bias.
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';

export const SHARE_ID_LENGTH = 10;

/**
 * Generate a share id for one extraction.
 *
 * 10 characters from a 64-symbol alphabet is 60 bits of entropy — the ids must
 * be unguessable, since possessing one is the only thing gating access to a
 * public extraction. Sequential integers and the row UUID are both deliberately
 * avoided: the first is enumerable, the second leaks an internal identifier.
 */
export function generateShareId(): string {
  const bytes = randomBytes(SHARE_ID_LENGTH);
  let id = '';
  for (let i = 0; i < SHARE_ID_LENGTH; i++) {
    id += ALPHABET[bytes[i] & 63];
  }
  return id;
}

/**
 * Shape-check a share id before it reaches the database. A caller-supplied
 * path segment is untrusted input; rejecting anything that is not exactly the
 * generated shape keeps malformed values out of the query entirely.
 */
export function isValidShareId(value: string): boolean {
  if (value.length !== SHARE_ID_LENGTH) return false;
  for (const char of value) {
    if (!ALPHABET.includes(char)) return false;
  }
  return true;
}
