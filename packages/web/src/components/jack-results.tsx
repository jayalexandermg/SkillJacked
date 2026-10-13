'use client';

import { useMemo, useState } from 'react';
import { SignUpButton } from '@clerk/nextjs';
import Modal, { ModalHeader } from '@/components/modal';
import SkillReader from '@/components/skill-reader';
import SkillTile from '@/components/skill-tile';
import VideoHeader from '@/components/video-header';
import CopyButton, { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/copy-button';
import { buildSkillsZip, downloadBlob, downloadSkill } from '@/lib/export-zip';
import type { JackSkillView, JackView } from '@/lib/jack-view';

interface JackResultsProps {
  jack: JackView;
  signedIn: boolean;
  /** Signed in: save these skills to the library. */
  onSave: (skillIds: string[]) => Promise<void>;
  /** Signed out: remember these skills so they're saved right after sign-up. */
  onSignUpToSave: (skillIds: string[]) => void;
  onReset: () => void;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

async function downloadSkills(skills: JackSkillView[]): Promise<void> {
  const files = skills.flatMap((s) => (s.content === undefined ? [] : [{ slug: s.name, content: s.content }]));
  if (files.length === 1) return downloadSkill(files[0]);
  if (files.length > 1) downloadBlob(await buildSkillsZip(files), `skilljacked-${files.length}-skills.zip`);
}

export default function JackResults({ jack, signedIn, onSave, onSignUpToSave, onReset }: JackResultsProps) {
  const total = jack.skills.length;
  const [selected, setSelected] = useState<Set<string>>(() => new Set(jack.skills.map((s) => s.id)));
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const chosen = useMemo(() => jack.skills.filter((s) => selected.has(s.id)), [jack.skills, selected]);
  const chosenUnsaved = chosen.filter((s) => !s.saved);
  const chosenDownloadable = chosen.filter((s) => s.content !== undefined);
  const savedCount = jack.skills.filter((s) => s.saved).length;
  const allSelected = selected.size === total;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(jack.skills.map((s) => s.id)));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(chosenUnsaved.map((s) => s.id));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadSkills(chosenDownloadable);
    } catch (err) {
      console.error('[download] Failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const signUpGate = (
    <>
      <p className="font-heading text-base font-semibold leading-6 text-text-primary">
        Sign up free to unlock all {plural(total, 'skill')}
      </p>
      <p className="mt-1 text-xs text-text-secondary">Your results carry over. Nothing to re-run.</p>
      <SignUpButton mode="modal">
        <button className={`${PRIMARY_BUTTON} mt-4`}>Sign up free</button>
      </SignUpButton>
    </>
  );

  // One set of actions, shown under the grid and again in the modal footer.
  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={download}
        disabled={chosenDownloadable.length === 0 || downloading}
        className={SECONDARY_BUTTON}
        title={!signedIn ? 'Signed out, only unlocked skills download' : undefined}
      >
        {downloading
          ? 'Zipping...'
          : signedIn
            ? `Download ${chosenDownloadable.length === 1 ? '' : 'all '}${plural(chosenDownloadable.length, 'skill')}`
            : `Download ${plural(chosenDownloadable.length, 'unlocked skill')}`}
      </button>
      {signedIn ? (
        <button onClick={save} disabled={chosenUnsaved.length === 0 || saving} className={PRIMARY_BUTTON}>
          {saving
            ? 'Saving...'
            : chosenUnsaved.length === 0 && chosen.length > 0
              ? 'Already in Library'
              : `Save ${chosenUnsaved.length} to Library`}
        </button>
      ) : (
        <SignUpButton mode="modal">
          <button
            onClick={() => onSignUpToSave(chosen.map((s) => s.id))}
            disabled={chosen.length === 0}
            className={PRIMARY_BUTTON}
          >
            Sign up to save {chosen.length}
          </button>
        </SignUpButton>
      )}
    </div>
  );

  const openSkill = jack.skills.find((s) => s.id === openId) ?? null;

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <VideoHeader
          sourceTitle={jack.sourceTitle}
          sourceChannel={jack.sourceChannel}
          sourceUrl={jack.sourceUrl}
          videoId={jack.videoId}
        >
          <span>{plural(total, 'skill')}</span>
        </VideoHeader>
        <button
          onClick={onReset}
          className="shrink-0 self-start text-sm text-text-secondary underline underline-offset-4 transition-colors hover:text-text-primary sm:self-center"
        >
          Jack another video
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 cursor-pointer accent-accent" />
          Select all
          <span className="text-text-tertiary">
            &middot; {selected.size} of {total} selected
          </span>
        </label>
        <span className="text-xs text-text-tertiary">
          {!signedIn
            ? 'Not saved. Sign up to keep these.'
            : savedCount === 0
              ? 'Not in your library yet'
              : savedCount === total
                ? 'All in your library'
                : `${savedCount} of ${total} in your library`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {jack.skills.map((skill) => (
          <SkillTile
            key={skill.id}
            name={skill.name}
            description={skill.description}
            tier={skill.tier}
            badge={skill.saved ? 'In library' : undefined}
            selected={selected.has(skill.id)}
            onToggleSelect={() => toggle(skill.id)}
            onOpen={() => setOpenId(skill.id)}
          />
        ))}
      </div>

      <div className="sticky bottom-0 z-10 -mx-2 mt-5 flex flex-col gap-3 border-t border-border-subtle bg-primary/95 px-2 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => setOpenId(chosen[0]?.id ?? jack.skills[0]?.id ?? null)}
          disabled={chosen.length === 0}
          className="self-start text-sm font-semibold text-accent transition-colors hover:text-accent-hover disabled:opacity-50 sm:self-center"
        >
          Preview {plural(chosen.length, 'skill')} &rarr;
        </button>
        {actions}
      </div>
      {saveError && <p className="mt-2 text-right text-sm text-error">{saveError}</p>}
      {!signedIn && (
        <p className="mt-2 text-right text-xs text-text-tertiary">
          Signed-out results are deleted after 7 days unless you sign up.
        </p>
      )}

      {openSkill && (
        <Modal label="Preview and export" onClose={() => setOpenId(null)}>
          <ModalHeader
            title="Preview & export"
            subtitle={`${jack.sourceTitle}${jack.sourceChannel ? ` · ${jack.sourceChannel}` : ''}`}
            onClose={() => setOpenId(null)}
          />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <ul className="max-h-40 shrink-0 overflow-y-auto border-b border-border-subtle p-2 md:max-h-none md:w-72 md:border-b-0 md:border-r">
              {jack.skills.map((skill) => (
                <li key={skill.id}>
                  <div
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                      skill.id === openSkill.id ? 'bg-surface-hover' : 'hover:bg-surface'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(skill.id)}
                      onChange={() => toggle(skill.id)}
                      aria-label={`Select ${skill.name}`}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
                    />
                    <button
                      onClick={() => setOpenId(skill.id)}
                      className={`min-w-0 flex-1 truncate text-left font-mono text-xs ${
                        skill.id === openSkill.id ? 'text-accent' : 'text-text-primary'
                      }`}
                    >
                      {skill.name}
                    </button>
                    {skill.saved && <span className="shrink-0 text-[10px] text-text-tertiary">saved</span>}
                    {skill.tier !== 'full' && (
                      <span className="shrink-0 text-[10px] text-text-tertiary">{skill.tier === 'preview' ? 'preview' : 'locked'}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <SkillReader
                key={openSkill.id}
                name={openSkill.name}
                description={openSkill.description}
                content={openSkill.content}
                tier={openSkill.tier}
                gate={signUpGate}
                actions={
                  openSkill.content !== undefined && (
                    <>
                      <CopyButton text={openSkill.content} />
                      <button
                        onClick={() => downloadSkills([openSkill]).catch((err) => console.error('[download] Failed:', err))}
                        className={SECONDARY_BUTTON}
                      >
                        Download
                      </button>
                    </>
                  )
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="text-sm text-text-secondary">
              {selected.size} of {total} selected
            </span>
            {actions}
          </div>
        </Modal>
      )}
    </div>
  );
}
