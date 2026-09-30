import { getSupabase } from '@/lib/supabase';

export interface AppUser {
  id: string;
  tier: 'free' | 'pro';
}

/**
 * The users row for a Clerk id. Created inline when the Clerk sign-up webhook
 * hasn't landed yet; the webhook's upsert on clerk_id fills in the real email.
 */
export async function getOrCreateUser(clerkId: string): Promise<AppUser | null> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('users')
    .select('id, tier')
    .eq('clerk_id', clerkId)
    .single();

  if (existing) return { id: existing.id, tier: existing.tier === 'pro' ? 'pro' : 'free' };

  const { data: created, error } = await supabase
    .from('users')
    .insert({ clerk_id: clerkId, email: 'pending@webhook' })
    .select('id, tier')
    .single();

  if (error || !created) {
    console.error('[users] Failed to create user:', error);
    return null;
  }
  return { id: created.id, tier: created.tier === 'pro' ? 'pro' : 'free' };
}
