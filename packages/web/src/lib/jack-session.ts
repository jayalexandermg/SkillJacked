import type { JackView } from '@/lib/jack-view';

/**
 * The jack on screen, kept in sessionStorage so a reload or a sign-up redirect
 * doesn't lose it. A signed-out jack also carries its claim token, and the
 * skills the visitor ticked before signing up to save them.
 */
export interface StoredJack {
  jack: JackView;
  claimToken?: string;
  pendingSave?: string[];
}

const KEY = 'skilljacked_jack';
const LEGACY_KEYS = ['skilljack_extraction', 'skilljack_pending_anonymous'];

export function getStoredJack(): StoredJack | null {
  try {
    for (const key of LEGACY_KEYS) sessionStorage.removeItem(key);
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredJack;
    if (!parsed?.jack?.id || !Array.isArray(parsed.jack.skills)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredJack(stored: StoredJack): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Storage full or blocked: the jack is still on screen, and a signed-in
    // user's jack is on the server regardless.
  }
}

export function clearStoredJack(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
