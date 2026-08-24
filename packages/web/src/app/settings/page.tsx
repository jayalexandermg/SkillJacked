'use client';

import { useState, useEffect } from 'react';
import { SignOutButton } from '@clerk/nextjs';
import Footer from '@/components/footer';
import type { AccountInfo } from '@/app/api/account/route';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-border-subtle last:border-b-0">
      <span className="font-body text-sm text-text-secondary">{label}</span>
      <div className="font-body text-sm text-text-primary text-right">{children}</div>
    </div>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  // A limit of 0 would divide by zero; treat it as fully consumed.
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const depleted = used >= limit;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-body text-sm text-text-secondary">Jacks this month</span>
        <span className="font-mono text-sm text-text-primary">
          {used}/{limit}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-surface-hover overflow-hidden"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`${used} of ${limit} jacks used this month`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            depleted ? 'bg-error' : 'bg-accent'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/account')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: AccountInfo) => setAccount(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const openBillingPortal = async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
        return;
      }
      const body = await res.json().catch(() => null);
      setBillingError(body?.error ?? 'Could not open the billing portal.');
    } catch {
      setBillingError('Could not open the billing portal.');
    }
    setBillingLoading(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-text-secondary font-body">Loading...</div>
      </main>
    );
  }

  if (loadError || !account) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="font-body text-text-secondary">Could not load your account.</p>
        <a
          href="/dashboard"
          className="font-body text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Back to library
        </a>
      </main>
    );
  }

  const isPro = account.tier === 'pro';

  return (
    <main className="min-h-screen">
      <section className="pt-16 pb-8 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <a
              href="/dashboard"
              className="font-heading text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              &larr; Back
            </a>
            <h1 className="font-heading text-3xl font-bold text-text-primary mt-4">
              Settings
            </h1>
          </div>

          {/* Plan */}
          <div className="rounded-xl border border-border-subtle bg-surface p-6 mb-6">
            <h2 className="font-heading text-lg font-semibold text-text-primary mb-2">
              Plan
            </h2>

            <Row label="Current plan">
              <span className="inline-flex items-center gap-2">
                {isPro ? (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-accent/20 text-accent">
                    Pro
                  </span>
                ) : (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-text-tertiary/20 text-text-tertiary">
                    Free
                  </span>
                )}
                {isPro && account.price && (
                  <span className="text-text-secondary">{account.price}</span>
                )}
              </span>
            </Row>

            <Row label={account.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}>
              {account.renewalDate ? (
                formatDate(account.renewalDate)
              ) : (
                <span className="text-text-tertiary">&mdash;</span>
              )}
            </Row>

            {account.cancelAtPeriodEnd && (
              <p className="font-body text-xs text-text-tertiary pt-4">
                Your subscription is set to cancel. You keep Pro access until the
                date above.
              </p>
            )}
          </div>

          {/* Usage */}
          <div className="rounded-xl border border-border-subtle bg-surface p-6 mb-6">
            <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
              Usage
            </h2>

            <UsageBar used={account.jacksUsed} limit={account.jacksLimit} />

            <div className="mt-6">
              <Row label="Skills in your library">
                <span className="font-mono">{account.librarySkills}</span>
              </Row>
            </div>
          </div>

          {/* Billing + account actions */}
          <div className="rounded-xl border border-border-subtle bg-surface p-6">
            <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
              Account
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {isPro && account.hasBilling && (
                <button
                  onClick={openBillingPortal}
                  disabled={billingLoading}
                  className={`px-5 py-2.5 bg-surface border border-border-subtle text-text-secondary
                             font-body font-semibold text-sm rounded-lg hover:border-border-focus
                             hover:text-text-primary transition-all duration-200
                             ${billingLoading ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {billingLoading ? 'Redirecting...' : 'Manage subscription'}
                </button>
              )}

              {!isPro && (
                <a
                  href="/pricing"
                  className="px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm
                             rounded-lg hover:bg-accent-hover transition-all duration-200"
                >
                  Upgrade to Pro
                </a>
              )}

              <SignOutButton>
                <button
                  className="px-5 py-2.5 bg-transparent border border-border-subtle text-text-secondary
                             font-body font-semibold text-sm rounded-lg hover:border-error
                             hover:text-error transition-all duration-200"
                >
                  Sign out
                </button>
              </SignOutButton>
            </div>

            {billingError && (
              <p className="font-body text-sm text-error mt-4">{billingError}</p>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
