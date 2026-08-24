import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabase } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';

export interface AccountInfo {
  tier: 'free' | 'pro';
  /** Formatted price for the current plan, e.g. "$12/mo". Null for free. */
  price: string | null;
  /** ISO date the subscription renews. Null for free users, or when Stripe is unreachable. */
  renewalDate: string | null;
  /** True when the subscription is set to end at the period end rather than renew. */
  cancelAtPeriodEnd: boolean;
  jacksUsed: number;
  jacksLimit: number;
  librarySkills: number;
  /** Whether a Stripe customer exists — gates the billing portal button. */
  hasBilling: boolean;
}

const FREE_LIMIT = 3;
const PRO_LIMIT = 50;

function emptyAccount(): AccountInfo {
  return {
    tier: 'free',
    price: null,
    renewalDate: null,
    cancelAtPeriodEnd: false,
    jacksUsed: 0,
    jacksLimit: FREE_LIMIT,
    librarySkills: 0,
    hasBilling: false,
  };
}

function formatPrice(unitAmount: number | null, currency: string, interval?: string): string | null {
  if (unitAmount === null) return null;
  const amount = unitAmount / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    // Show cents only when the price actually has them.
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
  return interval ? `${formatted}/${interval === 'month' ? 'mo' : interval}` : formatted;
}

/**
 * Stripe moved current_period_end from the Subscription to the SubscriptionItem
 * in the 2025-04-30 API generation; this project pins 2026-03-25.dahlia, so the
 * item is the source of truth. The subscription-level read stays as a fallback
 * so a pinned-version change can't silently blank the renewal date.
 */
function readPeriodEnd(subscription: Record<string, unknown>): number | null {
  const items = (subscription.items as { data?: Array<Record<string, unknown>> } | undefined)?.data;
  const fromItem = items?.[0]?.current_period_end;
  if (typeof fromItem === 'number') return fromItem;

  const fromSubscription = subscription.current_period_end;
  if (typeof fromSubscription === 'number') return fromSubscription;

  return null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('id, tier, stripe_customer_id')
    .eq('clerk_id', userId)
    .single();

  // A signed-in user with no row yet is a legitimate pre-first-jack state, not
  // an error — the jack and skills routes both create the row on demand.
  if (!user) {
    return NextResponse.json(emptyAccount());
  }

  const tier: 'free' | 'pro' = user.tier === 'pro' ? 'pro' : 'free';
  const fallbackLimit = tier === 'pro' ? PRO_LIMIT : FREE_LIMIT;

  const [usageResult, skillsResult] = await Promise.all([
    supabase
      .from('usage')
      .select('jacks_used, jacks_limit')
      .eq('user_id', user.id)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('skills')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const account: AccountInfo = {
    tier,
    price: null,
    renewalDate: null,
    cancelAtPeriodEnd: false,
    jacksUsed: usageResult.data?.jacks_used ?? 0,
    jacksLimit: usageResult.data?.jacks_limit ?? fallbackLimit,
    librarySkills: skillsResult.count ?? 0,
    hasBilling: Boolean(user.stripe_customer_id),
  };

  // Free users have no subscription — never call Stripe for them.
  if (tier !== 'pro' || !user.stripe_customer_id) {
    return NextResponse.json(account);
  }

  try {
    const subscriptions = await getStripe().subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1,
      expand: ['data.items.data.price'],
    });

    const subscription = subscriptions.data[0];
    if (subscription) {
      const periodEnd = readPeriodEnd(subscription as unknown as Record<string, unknown>);
      if (periodEnd !== null) {
        account.renewalDate = new Date(periodEnd * 1000).toISOString();
      }
      account.cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

      const price = subscription.items.data[0]?.price;
      if (price) {
        account.price = formatPrice(
          price.unit_amount,
          price.currency,
          price.recurring?.interval
        );
      }
    }
  } catch (err) {
    // Billing display is not worth failing the page over: the tier already came
    // from Supabase (the source of truth), so the account renders without a
    // renewal date rather than erroring.
    console.error('[/api/account] Stripe lookup failed:', err);
  }

  return NextResponse.json(account);
}
