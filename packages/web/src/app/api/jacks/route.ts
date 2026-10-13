import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';
import { videoIdFromUrl, type RecentJack } from '@/lib/jack-view';
import type { JackRow } from '@/lib/jacks-server';

const RECENT_LIMIT = 20;

/**
 * GET /api/jacks — the user's recent jacks that still have unsaved skills.
 * Summaries only: the strip needs a title and a count, and full skill content
 * for twenty jacks would be megabytes. GET /api/jacks/:id loads one.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  const { data: user } = await supabase.from('users').select('id').eq('clerk_id', userId).single();
  if (!user) return NextResponse.json({ jacks: [] });

  const { data: jacks, error } = await supabase
    .from('jacks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) {
    console.error('[/api/jacks] GET error:', error);
    return NextResponse.json({ error: 'Failed to load recent jacks' }, { status: 500 });
  }
  if (!jacks || jacks.length === 0) return NextResponse.json({ jacks: [] });

  const { data: skills, error: skillsError } = await supabase
    .from('jack_skills')
    .select('jack_id, saved_skill_id')
    .in('jack_id', jacks.map((j) => j.id));

  if (skillsError) {
    console.error('[/api/jacks] GET skills error:', skillsError);
    return NextResponse.json({ error: 'Failed to load recent jacks' }, { status: 500 });
  }

  const counts = new Map<string, { total: number; unsaved: number }>();
  for (const s of skills ?? []) {
    const c = counts.get(s.jack_id) ?? { total: 0, unsaved: 0 };
    c.total++;
    if (s.saved_skill_id === null) c.unsaved++;
    counts.set(s.jack_id, c);
  }

  const recent: RecentJack[] = (jacks as JackRow[])
    .map((j) => ({
      id: j.id,
      sourceTitle: j.source_title ?? 'Untitled video',
      sourceChannel: j.source_channel,
      videoId: j.source_video_id ?? videoIdFromUrl(j.source_url ?? ''),
      createdAt: j.created_at,
      totalSkills: counts.get(j.id)?.total ?? 0,
      unsavedSkills: counts.get(j.id)?.unsaved ?? 0,
    }))
    .filter((j) => j.unsavedSkills > 0);

  return NextResponse.json({ jacks: recent });
}
