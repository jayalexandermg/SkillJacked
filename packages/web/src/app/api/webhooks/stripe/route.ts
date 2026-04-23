import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id;

        if (!customerId) break;

        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!user) {
          console.error(
            '[stripe-webhook] No user for customer:',
            customerId
          );
          break;
        }

        await supabase
          .from('users')
          .update({ tier: 'pro', updated_at: new Date().toISOString() })
          .eq('id', user.id);

        const now = new Date();
        const periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();
        const periodEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1
        ).toISOString();

        await supabase.from('usage').upsert(
          {
            user_id: user.id,
            jacks_limit: 50,
            period_start: periodStart,
            period_end: periodEnd,
          },
          { onConflict: 'user_id,period_start' }
        );

        console.log('[stripe-webhook] Upgraded user to pro:', user.id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;

        if (!customerId) break;

        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!user) {
          console.error(
            '[stripe-webhook] No user for customer:',
            customerId
          );
          break;
        }

        const isActive =
          subscription.status === 'active' ||
          subscription.status === 'trialing';
        const nextTier = isActive ? 'pro' : 'free';
        const nextLimit = isActive ? 50 : 3;

        await supabase
          .from('users')
          .update({ tier: nextTier, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        const now = new Date();
        const periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();
        const periodEnd = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1
        ).toISOString();

        await supabase.from('usage').upsert(
          {
            user_id: user.id,
            jacks_limit: nextLimit,
            period_start: periodStart,
            period_end: periodEnd,
          },
          { onConflict: 'user_id,period_start' }
        );

        console.log(
          `[stripe-webhook] Subscription ${subscription.status} — synced user ${user.id} to ${nextTier}`
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;

        if (!customerId) break;

        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!user) break;

        await supabase
          .from('users')
          .update({ tier: 'free', updated_at: new Date().toISOString() })
          .eq('id', user.id);

        const now = new Date();
        const periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();

        await supabase
          .from('usage')
          .update({ jacks_limit: 3 })
          .eq('user_id', user.id)
          .eq('period_start', periodStart);

        console.log('[stripe-webhook] Downgraded user to free:', user.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id;

        if (!customerId) break;

        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!user) break;

        const now = new Date();
        const periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();

        await supabase
          .from('usage')
          .update({ jacks_used: 0 })
          .eq('user_id', user.id)
          .eq('period_start', periodStart);

        console.log('[stripe-webhook] Reset usage for user:', user.id);
        break;
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] Error handling event:', err);
  }

  return NextResponse.json({ received: true });
}
