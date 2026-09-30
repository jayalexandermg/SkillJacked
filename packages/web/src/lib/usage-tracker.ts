/**
 * Usage constants. Server-side tracking via /api/usage handles the actual state.
 * These are fallback defaults for display before the API responds.
 */

export const FREE_EXTRACTION_LIMIT = 3;
export const PRO_EXTRACTION_LIMIT = 50;

/** The one user-facing wording for monthly usage, used everywhere it's shown. */
export function videosLeft(used: number, limit: number): string {
  return `${Math.max(0, limit - used)} of ${limit} videos left this month`;
}
