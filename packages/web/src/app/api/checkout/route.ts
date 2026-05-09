import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const stripe = getStripe();

  let { data: user, error } = await supabase
    .from('users')
    .select('id, stripe_customer_id, email')
    .eq('clerk_id', userId)
    .single();

  if (error || !user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress
      ?? clerkUser?.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    const created = await supabase
      .from('users')
      .upsert({ clerk_id: userId, email }, { onConflict: 'clerk_id' })
      .select('id, stripe_customer_id, email')
      .single();

    user = created.data;
    error = created.error;

    if (error || !user) {
      console.error('[checkout] Failed to sync user:', error);
      return NextResponse.json({ error: 'User sync failed' }, { status: 500 });
    }
  }

  let stripeCustomerId = user.stripe_customer_id;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { clerk_id: userId, supabase_id: user.id },
    });
    stripeCustomerId = customer.id;

    await supabase
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('clerk_id', userId);
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://skilljacked.com';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?upgraded=1`,
    cancel_url: `${origin}/`,
    metadata: { clerk_id: userId },
  });

  return NextResponse.json({ url: session.url });
}
