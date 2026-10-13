'use client';

import { useState } from 'react';
import Modal, { ModalHeader } from '@/components/modal';
import SkillReader from '@/components/skill-reader';
import CopyButton, { SECONDARY_BUTTON } from '@/components/copy-button';
import { LockIcon } from '@/components/skill-tile';
import { downloadSkill } from '@/lib/export-zip';
import { skillDescription } from '@/lib/jack-view';
import { exportEntries } from '@/lib/skill-package';

export interface LibrarySkill {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  content: string;
  source_title: string | null;
  source_url: string | null;
  source_video_id?: string | null;
  source_channel?: string | null;
  format: string;
  created_at: string;
  share_id?: string | null;
  is_public?: boolean | null;
  is_edited?: boolean | null;
}

export interface LibraryGroup {
  key: string;
  shareId: string | null;
  isPublic: boolean;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceChannel: string | null;
  videoId: string | null;
  skills: LibrarySkill[];
}

interface LibraryDetailProps {
  group: LibraryGroup;
  openId: string;
  isPro: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
  onEdit: (id: string) => void;
  /** Resolves false when the delete failed. */
  onDelete: (id: string) => Promise<boolean>;
}

export default function LibraryDetail({ group, openId, isPro, onOpen, onClose, onEdit, onDelete }: LibraryDetailProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skill = group.skills.find((s) => s.id === openId) ?? group.skills[0];
  const [{ path }] = exportEntries([skill]);
  const legacy = !path.endsWith('/SKILL.md');

  const open = (id: string) => {
    setConfirmingDelete(false);
    setError(null);
    onOpen(id);
  };

  const remove = async () => {
    setDeleting(true);
    setError(null);
    const index = group.skills.findIndex((s) => s.id === skill.id);
    const next = group.skills[index + 1] ?? group.skills[index - 1];
    const ok = await onDelete(skill.id);
    setDeleting(false);
    setConfirmingDelete(false);
    if (!ok) {
      setError('Could not delete this skill.');
      return;
    }
    if (next) onOpen(next.id);
    else onClose();
  };

  return (
    <Modal label={skill.name} onClose={onClose}>
      <ModalHeader
        title={group.sourceTitle}
        subtitle={[group.sourceChannel, `${group.skills.length} skill${group.skills.length === 1 ? '' : 's'}`]
          .filter(Boolean)
          .join(' · ')}
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ul className="max-h-40 shrink-0 overflow-y-auto border-b border-border-subtle p-2 md:max-h-none md:w-72 md:border-b-0 md:border-r">
          {group.skills.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => open(s.id)}
                className={`block w-full truncate rounded-md px-3 py-2 text-left font-mono text-xs transition-colors ${
                  s.id === skill.id ? 'bg-surface-hover text-accent' : 'text-text-primary hover:bg-surface'
                }`}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <SkillReader
            key={skill.id}
            name={skill.name}
            description={skill.description ?? skillDescription(skill.content)}
            content={skill.content}
            legacyFilename={legacy ? path : undefined}
            actions={
              <>
                <CopyButton text={skill.content} />
                <button
                  onClick={() => downloadSkill(skill).catch((err) => console.error('[download] Failed:', err))}
                  className={SECONDARY_BUTTON}
                >
                  Download
                </button>
                {legacy ? null : isPro ? (
                  <button onClick={() => onEdit(skill.id)} className={SECONDARY_BUTTON}>
                    Edit
                  </button>
                ) : (
                  <a href="/pricing" className={`${SECONDARY_BUTTON} text-text-secondary`} title="Editing is a Pro feature">
                    <LockIcon className="h-3 w-3" />
                    Edit
                    <span className="rounded bg-accent/20 px-1 py-px text-[9px] font-mono font-semibold text-accent">PRO</span>
                  </a>
                )}
                {confirmingDelete ? (
                  <span className="inline-flex items-center gap-2 text-xs text-text-secondary">
                    Delete from Library?
                    <button
                      onClick={remove}
                      disabled={deleting}
                      className="font-semibold text-error hover:underline disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button onClick={() => setConfirmingDelete(false)} className="hover:text-text-primary">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className={`${SECONDARY_BUTTON} text-error hover:border-error`}
                  >
                    Delete
                  </button>
                )}
                {error && <span className="text-xs text-error">{error}</span>}
              </>
            }
          />
        </div>
      </div>
    </Modal>
  );
}
