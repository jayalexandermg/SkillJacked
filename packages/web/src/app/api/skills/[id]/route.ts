import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';

// DELETE /api/skills/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Get user's internal ID
  const { data: user } = await getSupabase()
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Delete only if skill belongs to user
  const { error } = await getSupabase()
    .from('skills')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('[/api/skills/:id] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

/**
 * PATCH /api/skills/:id — edit a skill's content.
 *
 * Pro-only. The tier is read from Supabase rather than Clerk metadata, which
 * is the project's rule: the Stripe webhook writes tier there, so it is the
 * only source of truth.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    content?: unknown;
    reset?: unknown;
  } | null;

  const wantsReset = body?.reset === true;
  const nextContent = body?.content;

  if (!wantsReset && typeof nextContent !== 'string') {
    return NextResponse.json({ error: 'content must be a string.' }, { status: 400 });
  }
  if (!wantsReset && (nextContent as string).length === 0) {
    return NextResponse.json({ error: 'Skill content cannot be empty.' }, { status: 400 });
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

  if (user.tier !== 'pro') {
    return NextResponse.json(
      { error: 'Editing skills is a Pro feature.' },
      { status: 402 },
    );
  }

  // Scoped by user_id: this client uses the service-role key and bypasses RLS,
  // so ownership is enforced here or not at all.
  const { data: skill } = await supabase
    .from('skills')
    .select('id, content, original_content, is_edited')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!skill) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (wantsReset) {
    // Nothing to restore: the skill was never edited, so it is already original.
    if (!skill.is_edited || skill.original_content === null) {
      return NextResponse.json({ error: 'This skill has no original to restore.' }, { status: 400 });
    }

    const { data: restored, error: resetError } = await supabase
      .from('skills')
      .update({
        content: skill.original_content,
        is_edited: false,
        original_content: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, content, is_edited')
      .single();

    if (resetError) {
      console.error('[/api/skills/:id] PATCH reset error:', resetError);
      return NextResponse.json({ error: 'Failed to reset skill.' }, { status: 500 });
    }

    return NextResponse.json({ skill: restored });
  }

  // Capture the generated text on the FIRST edit only. Overwriting it on every
  // save would make "original" mean "previous", and the second reset would
  // restore an edit rather than the generated skill.
  const originalContent = skill.is_edited ? skill.original_content : skill.content;

  const { data: updated, error } = await supabase
    .from('skills')
    .update({
      content: nextContent as string,
      original_content: originalContent,
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, content, is_edited')
    .single();

  if (error) {
    console.error('[/api/skills/:id] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to save skill.' }, { status: 500 });
  }

  return NextResponse.json({ skill: updated });
}
