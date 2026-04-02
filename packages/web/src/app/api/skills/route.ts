import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';

// GET /api/skills — fetch all skills for the authenticated user
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

  return NextResponse.json({ skills });
}

// POST /api/skills — save one or more skills
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up or create user record
  let { data: user } = await getSupabase()
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single();

  if (!user) {
    // User signed up but webhook hasn't fired yet — create inline
    const { data: newUser, error: createErr } = await getSupabase()
      .from('users')
      .insert({ clerk_id: userId, email: 'pending@webhook' })
      .select('id')
      .single();

    if (createErr || !newUser) {
      console.error('[/api/skills] Failed to create user:', createErr);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
    user = newUser;
  }

  const body = await request.json();
  const { skills } = body as {
    skills: Array<{
      name: string;
      slug: string;
      content: string;
      source_title?: string;
      source_url?: string;
      source_video_id?: string;
      format?: string;
    }>;
  };

  if (!Array.isArray(skills) || skills.length === 0) {
    return NextResponse.json({ error: 'No skills provided' }, { status: 400 });
  }

  const rows = skills.map((s) => ({
    user_id: user.id,
    name: s.name,
    slug: s.slug,
    content: s.content,
    source_title: s.source_title ?? null,
    source_url: s.source_url ?? null,
    source_video_id: s.source_video_id ?? null,
    format: s.format ?? 'claude-skill',
  }));

  const { data, error } = await getSupabase()
    .from('skills')
    .insert(rows)
    .select('id, name, slug');

  if (error) {
    console.error('[/api/skills] POST error:', error);
    return NextResponse.json({ error: 'Failed to save skills' }, { status: 500 });
  }

  return NextResponse.json({ saved: data });
}
