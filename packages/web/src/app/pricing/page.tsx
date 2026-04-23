'use client';

import { useState, useEffect } from 'react';
import { SignInButton, useUser } from '@clerk/nextjs';
import Footer from '@/components/footer';

interface UsageInfo {
  used: number;
  limit: number;
  tier: string;
  remaining: number;
}

export default function PricingPage() {
  const { isLoaded, isSignedIn } = useUser();
  const signedIn = isSignedIn === true;

  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !signedIn) return;
    fetch('/api/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UsageInfo | null) => { if (data) setUsage(data); })
      .catch(() => {});
  }, [isLoaded, signedIn]);

  const isPro = usage?.tier === 'pro';

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        console.error('[checkout] Failed:', res.status);
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error('[checkout] Error:', err);
      setCheckoutLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 pt-6 max-w-5xl mx-auto">
        <a href="/" className="font-heading text-sm text-text-secondary hover:text-text-primary transition-colors">
          &larr; Back
        </a>
        <a href="/dashboard" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
          My Skills
        </a>
      </nav>

      <section className="pt-16 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight mb-4">
              Simple <span className="text-accent gold-text-glow">pricing</span>.
            </h1>
            <p className="text-text-secondary text-lg max-w-xl mx-auto leading-relaxed">
              Start free. Upgrade when you want more skills per month.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free tier */}
            <div className="p-8 bg-surface border border-border-subtle rounded-lg flex flex-col">
              <div className="mb-6">
                <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 font-mono">
                  Free
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-heading text-4xl font-bold">$0</span>
                  <span className="text-text-tertiary text-sm">/ month</span>
                </div>
                <p className="text-text-secondary text-sm">
                  For trying things out.
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <Feature>3 skill extractions / month</Feature>
                <Feature>Hosted web app</Feature>
                <Feature>Cloud-synced skill library</Feature>
                <Feature>BYOK CLI (bring your own Anthropic key)</Feature>
              </ul>

              {signedIn ? (
                <div className="px-5 py-2.5 border border-border-subtle text-text-tertiary text-center font-body font-semibold text-sm rounded-lg">
                  {isPro ? 'Downgrade via billing portal' : 'Current plan'}
                </div>
              ) : (
                <SignInButton mode="modal">
                  <button className="w-full px-5 py-2.5 bg-surface border border-border-subtle text-text-primary font-body font-semibold text-sm rounded-lg hover:border-border-focus transition-all duration-200">
                    Start free
                  </button>
                </SignInButton>
              )}
            </div>

            {/* Pro tier */}
            <div className="p-8 bg-surface border border-accent/40 rounded-lg flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-primary text-[10px] font-mono font-semibold uppercase tracking-widest rounded">
                Recommended
              </div>

              <div className="mb-6">
                <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 font-mono">
                  Pro
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-heading text-4xl font-bold">$12</span>
                  <span className="text-text-tertiary text-sm">/ month</span>
                </div>
                <p className="text-text-secondary text-sm">
                  For people actually shipping skills.
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <Feature>50 skill extractions / month</Feature>
                <Feature>Everything in Free</Feature>
                <Feature>Priority extraction queue</Feature>
                <Feature>Manage billing via Stripe portal</Feature>
              </ul>

              {!signedIn ? (
                <SignInButton mode="modal">
                  <button className="w-full px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm rounded-lg hover:bg-accent-hover hover:gold-glow transition-all duration-200">
                    Sign in to upgrade
                  </button>
                </SignInButton>
              ) : isPro ? (
                <div className="px-5 py-2.5 border border-accent/40 bg-accent/10 text-accent text-center font-body font-semibold text-sm rounded-lg">
                  Current plan
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className={`w-full px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm
                             rounded-lg hover:bg-accent-hover hover:gold-glow transition-all duration-200
                             ${checkoutLoading ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {checkoutLoading ? 'Redirecting...' : 'Upgrade to Pro'}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-text-tertiary text-xs mt-10 font-mono">
            Cancel anytime. Managed by Stripe.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-text-secondary">
      <span className="text-accent mt-0.5">✓</span>
      <span>{children}</span>
    </li>
  );
}
