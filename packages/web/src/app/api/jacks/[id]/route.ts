import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';
import { getJackSkills, getOwnedJack, toJackView } from '@/lib/jacks-server';

// GET /api/jacks/:id — one of the user's own jacks, every skill in full.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { data: user } = await getSupabase().from('users').select('id').eq('clerk_id', userId).single();
  const jack = user ? await getOwnedJack(id, user.id) : null;
  if (!jack) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    return NextResponse.json({ jack: toJackView(jack, await getJackSkills(jack.id), true) });
  } catch (err) {
    console.error('[/api/jacks/:id] GET error:', err);
    return NextResponse.json({ error: 'Failed to load this jack' }, { status: 500 });
  }
}
