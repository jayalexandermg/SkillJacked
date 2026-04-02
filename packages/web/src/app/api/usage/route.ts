import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';

function getCurrentPeriod() {
  const now = new Date();
  const periodStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();
  const periodEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  ).toISOString();
  return { periodStart, periodEnd };
}

async function findOrCreateUsage(userId: string, jacksLimit: number) {
  const supabase = getSupabase();
  const { periodStart, periodEnd } = getCurrentPeriod();

  const { data: existing } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .single();

  if (existing) return existing;

  const { data: created } = await supabase
    .from('usage')
    .insert({
      user_id: userId,
      jacks_used: 0,
      jacks_limit: jacksLimit,
      period_start: periodStart,
      period_end: periodEnd,
    })
    .select()
    .single();

  return created;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({
      used: 0,
      limit: 3,
      tier: 'free',
      remaining: 3,
    });
  }

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('id, tier')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({
      used: 0,
      limit: 3,
      tier: 'free',
      remaining: 3,
    });
  }

  const tier = user.tier || 'free';
  const limit = tier === 'pro' ? 50 : 3;
  const usage = await findOrCreateUsage(user.id, limit);

  const used = usage?.jacks_used ?? 0;
  const effectiveLimit = usage?.jacks_limit ?? limit;

  return NextResponse.json({
    used,
    limit: effectiveLimit,
    tier,
    remaining: Math.max(0, effectiveLimit - used),
  });
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('id, tier')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const tier = user.tier || 'free';
  const limit = tier === 'pro' ? 50 : 3;
  const usage = await findOrCreateUsage(user.id, limit);

  if (!usage) {
    return NextResponse.json(
      { error: 'Failed to get usage record' },
      { status: 500 }
    );
  }

  if (usage.jacks_used >= usage.jacks_limit) {
    return NextResponse.json(
      { error: 'Extraction limit reached', upgrade: true },
      { status: 402 }
    );
  }

  const newCount = usage.jacks_used + 1;

  await supabase
    .from('usage')
    .update({ jacks_used: newCount })
    .eq('id', usage.id);

  return NextResponse.json({
    used: newCount,
    limit: usage.jacks_limit,
    remaining: usage.jacks_limit - newCount,
  });
}
