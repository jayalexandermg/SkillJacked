import { getSupabase } from '@/lib/supabase';
import { FREE_EXTRACTION_LIMIT, PRO_EXTRACTION_LIMIT } from '@/lib/usage-tracker';

export function currentPeriod(now = new Date()): { start: string; end: string } {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
  };
}

export function tierLimit(tier: string): number {
  return tier === 'pro' ? PRO_EXTRACTION_LIMIT : FREE_EXTRACTION_LIMIT;
}

export interface UsageRow {
  jacks_used: number;
  jacks_limit: number;
}

/** This month's usage row, created on first use. */
export async function ensureUsageRow(userId: string, limit: number): Promise<UsageRow | null> {
  const supabase = getSupabase();
  const { start, end } = currentPeriod();

  const read = async () =>
    (await supabase
      .from('usage')
      .select('jacks_used, jacks_limit')
      .eq('user_id', userId)
      .eq('period_start', start)
      .maybeSingle()).data as UsageRow | null;

  const existing = await read();
  if (existing) return existing;

  const { data: created } = await supabase
    .from('usage')
    .insert({ user_id: userId, jacks_used: 0, jacks_limit: limit, period_start: start, period_end: end })
    .select('jacks_used, jacks_limit')
    .single();

  // A parallel request can win the insert (user_id + period_start is unique);
  // its row is just as good.
  return created ?? (await read());
}

/**
 * Take one video from this month's allowance, or report that none are left.
 * A single conditional UPDATE (see migration 0003), so parallel requests
 * can't each pass a separate check and overshoot the limit.
 */
export async function reserveJack(userId: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('reserve_jack', {
    p_user_id: userId,
    p_period_start: currentPeriod().start,
  });
  if (error) throw new Error(`reserve_jack failed: ${error.message}`);
  return data === true;
}

/** Give a reserved video back: the jack failed or produced no skills. */
export async function refundJack(userId: string): Promise<void> {
  const { error } = await getSupabase().rpc('refund_jack', {
    p_user_id: userId,
    p_period_start: currentPeriod().start,
  });
  if (error) console.error('[usage] refund_jack failed:', error);
}
