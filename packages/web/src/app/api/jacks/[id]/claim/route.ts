import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/users';
import { claimTokenMatches } from '@/lib/claim-token';
import { getJack, getJackSkills, toJackView } from '@/lib/jacks-server';

/**
 * POST /api/jacks/:id/claim — attach a signed-out jack to the account that
 * just signed up, and return every skill in full. Proof of ownership is the
 * claim token only the visitor's browser holds. A claimed jack doesn't use one
 * of the month's videos: the visitor ran it before having an account.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;

  const user = await getOrCreateUser(userId);
  const jack = await getJack(id);
  if (!user || !jack) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Already this user's (a retried claim): answer as if it just succeeded.
  if (jack.user_id !== user.id) {
    if (jack.user_id !== null || !claimTokenMatches(body?.token, jack.claim_token_hash)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Conditional on user_id still being null, so two accounts racing with the
    // same token can't both win.
    const { data: claimed, error } = await getSupabase()
      .from('jacks')
      .update({ user_id: user.id, claim_token_hash: null })
      .eq('id', jack.id)
      .is('user_id', null)
      .select('id');

    if (error) {
      console.error('[/api/jacks/:id/claim] update error:', error);
      return NextResponse.json({ error: 'Failed to claim these results' }, { status: 500 });
    }
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    jack.user_id = user.id;
    jack.claim_token_hash = null;
  }

  try {
    return NextResponse.json({ jack: toJackView(jack, await getJackSkills(jack.id), true) });
  } catch (err) {
    console.error('[/api/jacks/:id/claim] read error:', err);
    return NextResponse.json({ error: 'Failed to load these results' }, { status: 500 });
  }
}
