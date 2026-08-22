import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';
import { isValidShareId } from '@/lib/share-id';

/**
 * POST /api/share — publish or unpublish one extraction.
 *
 * Extractions are private by default (see the migration): this is the only
 * thing that ever sets is_public true, and it is always an explicit,
 * authenticated act by the owner. Prompt 3 called for private-by-default plus
 * an explicit Share control precisely because file upload lands next — nobody
 * who pastes an internal document should discover it was published by default.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    share_id?: unknown;
    is_public?: unknown;
  } | null;

  const shareId = body?.share_id;
  const isPublic = body?.is_public;

  if (typeof shareId !== 'string' || !isValidShareId(shareId)) {
    return NextResponse.json({ error: 'A valid share id is required.' }, { status: 400 });
  }
  if (typeof isPublic !== 'boolean') {
    return NextResponse.json({ error: 'is_public must be a boolean.' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Scoped to user_id as well as share_id: this client uses the service-role
  // key and bypasses RLS, so ownership has to be enforced in the query itself.
  // Without the user_id filter, knowing someone else's share id would be enough
  // to publish or unpublish their extraction.
  const { data, error } = await supabase
    .from('skills')
    .update({ is_public: isPublic })
    .eq('share_id', shareId)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    console.error('[/api/share] update error:', error);
    return NextResponse.json({ error: 'Failed to update sharing.' }, { status: 500 });
  }

  // No rows matched: either the share id does not exist or it belongs to
  // someone else. Both answer the same way so this cannot be used to probe for
  // the existence of another user's extraction.
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ share_id: shareId, is_public: isPublic, skills: data.length });
}
