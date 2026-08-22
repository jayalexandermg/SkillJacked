'use client';

import { useEffect, useState } from 'react';
import Footer from '@/components/footer';

interface UsageInfo {
  used: number;
  limit: number;
  tier: string;
  remaining: number;
}

export default function CheckoutSuccessPage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      while (!cancelled && attempts < 6) {
        try {
          const res = await fetch('/api/usage', { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as UsageInfo;
            if (!cancelled) setUsage(data);
            if (data.tier === 'pro') return;
          }
        } catch {
          // try again
        }
        attempts += 1;
        await new Promise((r) => setTimeout(r, 1500));
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  const isPro = usage?.tier === 'pro';

  return (
    <main className="min-h-screen flex flex-col">
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-xl w-full text-center">
          <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em] mb-3 font-mono">
            Payment confirmed
          </p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight mb-4">
            You&apos;re <span className="text-accent gold-text-glow">Pro</span>.
          </h1>
          <p className="text-text-secondary text-base leading-relaxed mb-10">
            {isPro
              ? `50 extractions a month, cloud-synced library, manage billing anytime.`
              : `Your subscription is processing — your account will flip to Pro within a few seconds.`}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/"
              className="px-6 py-3 bg-accent text-primary font-body font-semibold text-sm
                         rounded-lg hover:bg-accent-hover hover:gold-glow
                         transition-all duration-200"
            >
              Jack a skill
            </a>
            <a
              href="/dashboard"
              className="px-6 py-3 bg-surface border border-border-subtle text-text-primary
                         font-body font-semibold text-sm rounded-lg hover:border-border-focus
                         transition-all duration-200"
            >
              View dashboard
            </a>
          </div>

          <p className="text-text-tertiary text-xs mt-10 font-mono">
            Receipt sent by email. Cancel anytime via the billing portal.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
