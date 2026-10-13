import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';
import { getJackSkills, getOwnedJack, toJackView } from '@/lib/jacks-server';

const MAX_SKILLS = 50;

/**
 * POST /api/jacks/:id/save { skillIds } — copy the chosen skills of one of the
 * user's jacks into their library. Saved rows carry the jack's share_id, so a
 * video's saved skills are one shareable group; they inherit that group's
 * current public/private state so saving more never changes what's shared.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { skillIds?: unknown } | null;
  const skillIds = body?.skillIds;

  if (
    !Array.isArray(skillIds) ||
    skillIds.length === 0 ||
    skillIds.length > MAX_SKILLS ||
    !skillIds.every((s) => typeof s === 'string')
  ) {
    return NextResponse.json({ error: 'Choose at least one skill to save.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: user } = await supabase.from('users').select('id').eq('clerk_id', userId).single();
  const jack = user ? await getOwnedJack(id, user.id) : null;
  if (!user || !jack) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const wanted = new Set(skillIds as string[]);
    const toSave = (await getJackSkills(jack.id)).filter((s) => wanted.has(s.id) && s.saved_skill_id === null);

    if (toSave.length > 0) {
      const { data: shared } = await supabase
        .from('skills')
        .select('is_public')
        .eq('share_id', jack.share_id)
        .eq('user_id', user.id)
        .limit(1);

      const isPublic = shared?.[0]?.is_public === true;

      // One insert per skill (at most ten) so each library copy is paired with
      // its jack skill without relying on multi-row RETURNING order.
      const failures = await Promise.all(
        toSave.map(async (s) => {
          const { data: saved, error: insertError } = await supabase
            .from('skills')
            .insert({
              user_id: user.id,
              jack_id: jack.id,
              name: s.name,
              slug: s.name,
              description: s.description,
              content: s.content,
              source_title: jack.source_title,
              source_url: jack.source_url,
              source_video_id: jack.source_video_id,
              format: 'claude-skill',
              share_id: jack.share_id,
              is_public: isPublic,
            })
            .select('id')
            .single();

          if (insertError || !saved) {
            console.error('[/api/jacks/:id/save] insert error:', insertError);
            return true;
          }

          // Conditional on the jack skill still being unlinked: if a
          // double-click already saved it, drop this duplicate copy.
          const { data: linked } = await supabase
            .from('jack_skills')
            .update({ saved_skill_id: saved.id })
            .eq('id', s.id)
            .is('saved_skill_id', null)
            .select('id');
          if (!linked || linked.length === 0) {
            await supabase.from('skills').delete().eq('id', saved.id).eq('user_id', user.id);
          }
          return false;
        }),
      );

      if (failures.some(Boolean)) throw new Error('one or more skills failed to save');
    }

    return NextResponse.json({ jack: toJackView(jack, await getJackSkills(jack.id), true) });
  } catch (err) {
    console.error('[/api/jacks/:id/save] error:', err);
    return NextResponse.json({ error: 'Failed to save these skills. Please try again.' }, { status: 500 });
  }
}
