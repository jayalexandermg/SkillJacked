import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';

// GET /api/skills — the user's library. Skills get here only via
// POST /api/jacks/:id/save.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up internal user ID from Clerk ID
  const { data: user } = await getSupabase()
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ skills: [] });
  }

  const { data: skills, error } = await getSupabase()
    .from('skills')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[/api/skills] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }

  // The channel lives on the jack. A second query rather than an embed: skills
  // and jacks are linked two ways (skills.jack_id and jack_skills), which makes
  // a PostgREST embed ambiguous.
  const jackIds = [...new Set((skills ?? []).map((s) => s.jack_id).filter(Boolean))];
  const channels = new Map<string, string | null>();
  if (jackIds.length > 0) {
    const { data: jacks } = await getSupabase().from('jacks').select('id, source_channel').in('id', jackIds);
    for (const j of jacks ?? []) channels.set(j.id, j.source_channel);
  }

  return NextResponse.json({
    skills: (skills ?? []).map((s) => ({ ...s, source_channel: channels.get(s.jack_id) ?? null })),
  });
}
