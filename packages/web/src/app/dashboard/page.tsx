'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserButton } from '@clerk/nextjs';
import SkillTile from '@/components/skill-tile';
import ShareToggle from '@/components/share-toggle';
import SkillEditModal from '@/components/skill-edit-modal';
import LibraryDetail, { type LibraryGroup, type LibrarySkill } from '@/components/library-detail';
import VideoHeader, { VideoThumb } from '@/components/video-header';
import Footer from '@/components/footer';
import { buildSkillsZip, downloadBlob } from '@/lib/export-zip';
import { getRecentJacks } from '@/lib/api-client';
import { skillDescription, videoIdFromUrl, type RecentJack } from '@/lib/jack-view';
import { cleanSourceUrl } from '@/lib/source-url';
import { videosLeft } from '@/lib/usage-tracker';

/**
 * Group skills by the jack they came from. share_id is one per jack (and was
 * one per save before jacks were stored), so it identifies the video.
 *
 * Skills saved before share ids existed have no share_id; they are grouped by
 * source title so they still render, but they get no share control — there is
 * no id to publish, and inventing one retroactively would let a single click
 * publish content saved when sharing did not exist.
 */
function groupByVideo(skills: LibrarySkill[]): LibraryGroup[] {
  const groups = new Map<string, LibraryGroup>();

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
        sourceUrl: skill.source_url ? cleanSourceUrl(skill.source_url) : null,
        sourceChannel: skill.source_channel ?? null,
        videoId: skill.source_video_id ?? videoIdFromUrl(skill.source_url ?? ''),
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

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function RecentJacks({ jacks }: { jacks: RecentJack[] }) {
  if (jacks.length === 0) return null;
  return (
    <div className="mb-10">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h2 className="font-heading text-sm font-semibold text-text-primary">Recent jacks</h2>
        <span className="text-xs text-text-tertiary">Not saved yet. Open one to pick skills to keep.</span>
      </div>
      <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2">
        {jacks.map((j) => (
          <a
            key={j.id}
            href={`/?jack=${j.id}`}
            className="flex w-60 shrink-0 gap-3 rounded-lg border border-border-subtle bg-surface p-3
                       transition-colors hover:border-border-focus/60"
          >
            <VideoThumb videoId={j.videoId} className="h-12 w-20" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5 text-text-primary line-clamp-2">{j.sourceTitle}</p>
              <p className="mt-1 text-xs text-accent">
                {j.unsavedSkills === j.totalSkills
                  ? `${plural(j.totalSkills, 'skill')} unsaved`
                  : `${j.unsavedSkills} of ${j.totalSkills} unsaved`}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [skills, setSkills] = useState<LibrarySkill[]>([]);
  const [recent, setRecent] = useState<RecentJack[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  const isPro = usage?.tier === 'pro';

  const fetchRecent = useCallback(() => {
    getRecentJacks().then(setRecent).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/usage')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UsageInfo | null) => { if (data) setUsage(data); })
      .catch(() => {});
    fetchRecent();
  }, [fetchRecent]);

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

  const groups = useMemo(() => groupByVideo(skills), [skills]);
  const openGroup = groups.find((g) => g.skills.some((s) => s.id === openId)) ?? null;

  const handleDelete = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    setSkills((prev) => prev.filter((s) => s.id !== id));
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // A deleted library copy returns to its jack's unsaved skills.
    fetchRecent();
    return true;
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
      <section className="pt-10 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <a href="/" className="font-heading text-sm text-text-secondary hover:text-text-primary transition-colors">
                &larr; Jack a video
              </a>
              <div className="flex items-center gap-3 mt-2">
                <h1 className="font-heading text-3xl font-bold">Library</h1>
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
              <p className="mt-1 text-sm text-text-secondary">
                {plural(skills.length, 'skill')} from {plural(groups.length, 'video')}
                {usage && <span className="text-text-tertiary"> &middot; {videosLeft(usage.used, usage.limit)}</span>}
              </p>
            </div>

            <UserButton />
          </div>

          <RecentJacks jacks={recent} />

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
                  . Upgrade to select skills across videos and download them as one zip.
                </p>
              )}
            </div>
          )}

          {/* Skills grouped by video — the video is the shareable unit */}
          {skills.length > 0 ? (
            <div className="space-y-10">
              {groups.map((group) => (
                <div key={group.key}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <VideoHeader
                      size="sm"
                      sourceTitle={group.sourceTitle}
                      sourceChannel={group.sourceChannel}
                      sourceUrl={group.sourceUrl}
                      videoId={group.videoId}
                    >
                      <span>{plural(group.skills.length, 'skill')}</span>
                    </VideoHeader>
                    {group.shareId && (
                      <ShareToggle
                        shareId={group.shareId}
                        initialIsPublic={group.isPublic}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.skills.map((skill) => (
                      <SkillTile
                        key={skill.id}
                        name={skill.name}
                        description={skill.description ?? skillDescription(skill.content)}
                        badge={
                          skill.format === 'cursor-rules'
                            ? 'Cursor rules'
                            : skill.format === 'windsurf-rules'
                              ? 'Windsurf rules'
                              : skill.is_edited
                                ? 'Edited'
                                : undefined
                        }
                        selected={selected.has(skill.id)}
                        onToggleSelect={isPro ? () => toggleSelect(skill.id) : undefined}
                        onOpen={() => setOpenId(skill.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-text-secondary text-lg mb-2">No saved skills yet.</p>
              <p className="text-text-tertiary text-sm mb-6">
                {recent.length > 0
                  ? 'Open a recent jack above and save the skills you want to keep.'
                  : 'Jack a YouTube video, then save the skills you want to keep.'}
              </p>
              <a
                href="/"
                className="inline-block px-6 py-3 bg-accent text-primary font-body font-semibold
                           text-sm rounded-lg hover:bg-accent-hover hover:gold-glow
                           transition-all duration-200"
              >
                Jack a video
              </a>
            </div>
          )}

          {/* Billing section */}
          {usage && (
            <div className="mt-16 p-6 bg-surface border border-border-subtle rounded-lg text-center">
              <p className="text-text-secondary text-sm mb-4">
                {videosLeft(usage.used, usage.limit)}
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
                <a
                  href="/pricing"
                  className="inline-block px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm
                             rounded-lg hover:bg-accent-hover hover:gold-glow
                             transition-all duration-200"
                >
                  Upgrade to Pro
                </a>
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

      {openGroup && openId && (
        <LibraryDetail
          group={openGroup}
          openId={openId}
          isPro={isPro}
          onOpen={setOpenId}
          onClose={() => { if (!editingId) setOpenId(null); }}
          onEdit={setEditingId}
          onDelete={handleDelete}
        />
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
