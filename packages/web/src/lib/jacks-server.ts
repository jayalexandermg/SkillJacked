import { getSupabase } from '@/lib/supabase';
import { viewSkill, videoIdFromUrl, type JackSkillRow, type JackView } from '@/lib/jack-view';

export interface JackRow {
  id: string;
  user_id: string | null;
  claim_token_hash: string | null;
  share_id: string;
  source_title: string | null;
  source_url: string | null;
  source_video_id: string | null;
  source_channel: string | null;
  created_at: string;
}

export function toJackView(jack: JackRow, skills: JackSkillRow[], signedIn: boolean): JackView {
  return {
    id: jack.id,
    shareId: jack.share_id,
    sourceTitle: jack.source_title ?? 'Untitled video',
    sourceUrl: jack.source_url ?? '',
    sourceChannel: jack.source_channel,
    videoId: jack.source_video_id ?? videoIdFromUrl(jack.source_url ?? ''),
    createdAt: jack.created_at,
    skills: [...skills].sort((a, b) => a.position - b.position).map((s) => viewSkill(s, signedIn)),
  };
}

export async function getJack(jackId: string): Promise<JackRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(jackId)) return null;
  const { data } = await getSupabase().from('jacks').select('*').eq('id', jackId).single();
  return (data as JackRow | null) ?? null;
}

export async function getJackSkills(jackId: string): Promise<JackSkillRow[]> {
  const { data, error } = await getSupabase()
    .from('jack_skills')
    .select('id, position, name, description, content, saved_skill_id')
    .eq('jack_id', jackId)
    .order('position', { ascending: true });
  if (error) throw new Error(`jack_skills read failed: ${error.message}`);
  return (data as JackSkillRow[]) ?? [];
}

/**
 * The jack if `userId` owns it, else null. Callers answer "not found" either
 * way, so a jack id reveals nothing about whether someone else's jack exists.
 * The Supabase client bypasses RLS, so ownership is checked here.
 */
export async function getOwnedJack(jackId: string, userId: string): Promise<JackRow | null> {
  const jack = await getJack(jackId);
  return jack && jack.user_id === userId ? jack : null;
}
