'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserButton } from '@clerk/nextjs';
import SkillCard from '@/components/skill-card';
import Footer from '@/components/footer';

interface DbSkill {
  id: string;
  name: string;
  slug: string;
  content: string;
  source_title: string | null;
  source_url: string | null;
  format: string;
  created_at: string;
}

interface UsageInfo {
  used: number;
  limit: number;
  tier: string;
  remaining: number;
}

export default function DashboardPage() {
  const [skills, setSkills] = useState<DbSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    fetch('/api/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UsageInfo | null) => { if (data) setUsage(data); })
      .catch(() => {});
  }, []);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills ?? []);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSkills((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <section className="pt-16 pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <a href="/" className="font-heading text-sm text-text-secondary hover:text-text-primary transition-colors">
                &larr; Back
              </a>
              <div className="flex items-center gap-3 mt-2">
                <h1 className="font-heading text-3xl font-bold">
                  Your <span className="text-accent">Skills</span>
                </h1>
                {usage && (
                  usage.tier === 'pro' ? (
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-accent/20 text-accent">
                      Pro
                    </span>
                  ) : (
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-text-tertiary/20 text-text-tertiary">
                      Free
                    </span>
                  )
                )}
              </div>
            </div>

            <UserButton />
          </div>

          {/* Skills grid */}
          {skills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  id={skill.id}
                  name={skill.name}
                  sourceTitle={skill.source_title ?? ''}
                  generatedAt={skill.created_at}
                  format={skill.format}
                  content={skill.content}
                  filename={`${skill.slug}.md`}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-text-secondary text-lg mb-2">No skills yet.</p>
              <p className="text-text-tertiary text-sm mb-6">
                Go jack a skill from a YouTube video to get started.
              </p>
              <a
                href="/"
                className="inline-block px-6 py-3 bg-accent text-primary font-body font-semibold
                           text-sm rounded-lg hover:bg-accent-hover hover:gold-glow
                           transition-all duration-200"
              >
                Jack a Skill
              </a>
            </div>
          )}

          {/* Cloud sync badge */}
          <div className="mt-16 p-6 bg-surface border border-border-subtle rounded-lg text-center">
            <p className="text-text-secondary text-sm">
              Your skills are <span className="text-accent font-medium">synced to the cloud</span>.
              Access them from any device.
            </p>
          </div>

          {/* Billing section */}
          {usage && (
            <div className="mt-4 p-6 bg-surface border border-border-subtle rounded-lg text-center">
              <p className="text-text-secondary text-sm mb-4">
                {usage.used} of {usage.limit} extractions used this month
              </p>
              {usage.tier === 'pro' ? (
                <button
                  onClick={async () => {
                    setBillingLoading(true);
                    try {
                      const res = await fetch('/api/billing/portal', { method: 'POST' });
                      if (res.ok) {
                        const { url } = await res.json();
                        window.location.href = url;
                      } else {
                        console.error('[billing] Failed:', res.status);
                        setBillingLoading(false);
                      }
                    } catch (err) {
                      console.error('[billing] Error:', err);
                      setBillingLoading(false);
                    }
                  }}
                  disabled={billingLoading}
                  className={`px-5 py-2.5 bg-surface border border-border-subtle text-text-secondary
                             font-body font-semibold text-sm rounded-lg hover:border-border-focus
                             hover:text-text-primary transition-all duration-200
                             ${billingLoading ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {billingLoading ? 'Redirecting...' : 'Manage Subscription'}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setBillingLoading(true);
                    try {
                      const res = await fetch('/api/checkout', { method: 'POST' });
                      if (res.ok) {
                        const { url } = await res.json();
                        window.location.href = url;
                      } else {
                        console.error('[checkout] Failed:', res.status);
                        setBillingLoading(false);
                      }
                    } catch (err) {
                      console.error('[checkout] Error:', err);
                      setBillingLoading(false);
                    }
                  }}
                  disabled={billingLoading}
                  className={`px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm
                             rounded-lg hover:bg-accent-hover hover:gold-glow
                             transition-all duration-200
                             ${billingLoading ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {billingLoading ? 'Redirecting...' : 'Upgrade to Pro'}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
