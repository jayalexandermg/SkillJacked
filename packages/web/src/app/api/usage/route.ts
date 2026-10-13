import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';
import { ensureUsageRow, tierLimit } from '@/lib/usage-server';

export async function GET() {
  const { userId } = await auth();
  const anonymous = { used: 0, limit: tierLimit('free'), tier: 'free', remaining: tierLimit('free') };
  if (!userId) return NextResponse.json(anonymous);

  const { data: user } = await getSupabase().from('users').select('id, tier').eq('clerk_id', userId).single();
  if (!user) return NextResponse.json(anonymous);

  const tier = user.tier === 'pro' ? 'pro' : 'free';
  const usage = await ensureUsageRow(user.id, tierLimit(tier));

  const used = usage?.jacks_used ?? 0;
  const limit = usage?.jacks_limit ?? tierLimit(tier);

  return NextResponse.json({ used, limit, tier, remaining: Math.max(0, limit - used) });
}
