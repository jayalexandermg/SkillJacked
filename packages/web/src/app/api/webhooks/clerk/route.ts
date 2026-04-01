import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getSupabase } from '@/lib/supabase';

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    primary_email_address_id: string;
  };
  type: string;
}

export async function POST(request: NextRequest) {
  if (!CLERK_WEBHOOK_SECRET) {
    console.error('[webhooks/clerk] Missing CLERK_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const headerPayload = request.headers;
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const payload = await request.text();
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (event.type === 'user.created') {
    const { id: clerkId, email_addresses, primary_email_address_id } = event.data;
    const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id);
    const email = primaryEmail?.email_address ?? email_addresses[0]?.email_address;

    if (!email) {
      console.error('[webhooks/clerk] No email found for user', clerkId);
      return NextResponse.json({ error: 'No email' }, { status: 400 });
    }

    const { error } = await getSupabase()
      .from('users')
      .upsert({ clerk_id: clerkId, email }, { onConflict: 'clerk_id' });

    if (error) {
      console.error('[webhooks/clerk] Failed to upsert user:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
