'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserButton } from '@clerk/nextjs';
import SkillCard from '@/components/skill-card';
import ShareToggle from '@/components/share-toggle';
import SkillEditModal from '@/components/skill-edit-modal';
import { buildSkillsZip, downloadBlob } from '@/lib/export-zip';
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
  share_id?: string | null;
  is_public?: boolean | null;
  is_edited?: boolean | null;
}

interface ExtractionGroup {
  key: string;
  shareId: string | null;
  isPublic: boolean;
  sourceTitle: string;
  skills: DbSkill[];
}

/**
 * Group skills into the extraction they came from. share_id is written per
 * POST /api/skills, so it identifies one extraction.
 *
 * Skills saved before share ids existed have no share_id; they are grouped by
 * source title so they still render, but they get no share control — there is
 * no id to publish, and inventing one retroactively would let a single click
 * publish content saved when sharing did not exist.
 */
function groupByExtraction(skills: DbSkill[]): ExtractionGroup[] {
  const groups = new Map<string, ExtractionGroup>();

  for (const skill of skills) {
    const sourceTitle = skill.source_title || 'Untitled source';
    const key = skill.share_id ?? `legacy:${sourceTitle}`;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        shareId: skill.share_id ?? null,
        isPublic: Boolean(skill.is_public),
        sourceTitle,
        skills: [],
      };
      groups.set(key, group);
    }
    group.skills.push(skill);
  }

  return [...groups.values()];
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  const isPro = usage?.tier === 'pro';

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
      setSelected((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = skills.length > 0 && selected.size === skills.length;
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(skills.map((s) => s.id)));
  };

  const downloadSelected = async () => {
    setZipping(true);
    try {
      // Preserve library order rather than selection order, so the archive
      // matches what the user sees on screen.
      const chosen = skills.filter((s) => selected.has(s.id));
      const blob = await buildSkillsZip(chosen);
      downloadBlob(blob, `skilljacked-${chosen.length}-skills.zip`);
    } catch (err) {
      console.error('[export] Failed:', err);
    } finally {
      setZipping(false);
    }
  };

  const applyEdit = (id: string, content: string, isEdited: boolean) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content, is_edited: isEdited } : s)),
    );
  };

  const editingSkill = skills.find((s) => s.id === editingId) ?? null;

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

          {/* Bulk export control. Shown to free users too, with an upgrade
              prompt rather than a hidden feature. */}
          {skills.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4
                            border-b border-border-subtle">
              {isPro ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 accent-accent cursor-pointer"
                  />
                  <span className="font-body text-sm text-text-secondary">
                    Select all ({skills.length})
                  </span>
                </label>
              ) : (
                <p className="font-body text-sm text-text-secondary">
                  Bulk export is a{' '}
                  <a href="/pricing" className="text-accent hover:text-accent-hover underline underline-offset-4">
                    Pro feature
                  </a>
                  . Upgrade to select skills and download them as a zip.
                </p>
              )}
            </div>
          )}

          {/* Skills grouped by extraction — the extraction is the shareable unit */}
          {skills.length > 0 ? (
            <div className="space-y-10">
              {groupByExtraction(skills).map((group) => (
                <div key={group.key}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h2 className="font-heading text-sm font-semibold text-text-secondary">
                      {group.sourceTitle}
                    </h2>
                    {group.shareId && (
                      <ShareToggle
                        shareId={group.shareId}
                        initialIsPublic={group.isPublic}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.skills.map((skill) => (
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
                        isEdited={Boolean(skill.is_edited)}
                        selected={selected.has(skill.id)}
                        onToggleSelect={isPro ? toggleSelect : undefined}
                        onEdit={isPro ? setEditingId : undefined}
                      />
                    ))}
                  </div>
                </div>
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

      {/* Floating selection bar */}
      {isPro && selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4
                        rounded-full border border-border-subtle bg-surface px-5 py-3 shadow-xl">
          <span className="font-body text-sm text-text-secondary whitespace-nowrap">
            {selected.size} selected
          </span>
          <button
            onClick={downloadSelected}
            disabled={zipping}
            className={`px-4 py-2 bg-accent text-primary font-body font-semibold text-sm
                       rounded-full hover:bg-accent-hover transition-all duration-200
                       ${zipping ? 'opacity-60 cursor-wait' : ''}`}
          >
            {zipping ? 'Zipping...' : 'Download ZIP'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="font-body text-sm text-text-tertiary hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {editingSkill && (
        <SkillEditModal
          id={editingSkill.id}
          name={editingSkill.name}
          content={editingSkill.content}
          isEdited={Boolean(editingSkill.is_edited)}
          onClose={() => setEditingId(null)}
          onSaved={applyEdit}
        />
      )}

      <Footer />
    </main>
  );
}
