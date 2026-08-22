'use client';

import { useState, useEffect, useCallback } from 'react';

interface SkillEditModalProps {
  id: string;
  name: string;
  content: string;
  isEdited: boolean;
  onClose: () => void;
  onSaved: (id: string, content: string, isEdited: boolean) => void;
}

/**
 * Edit one skill's content.
 *
 * Deliberately a textarea and two buttons. The plan called for no split pane,
 * no diff view, no version history, and no preview pane, and none are here.
 */
export default function SkillEditModal({
  id,
  name,
  content,
  isEdited,
  onClose,
  onSaved,
}: SkillEditModalProps) {
  const [draft, setDraft] = useState(content);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape closes, matching the expectation set by every other dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dirty = draft !== content;

  const submit = useCallback(
    async (payload: { content?: string; reset?: boolean }) => {
      setPending(true);
      setError(null);
      try {
        const res = await fetch(`/api/skills/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
          setError(body?.error ?? 'Could not save the skill.');
          return;
        }

        const saved = body?.skill;
        onSaved(id, saved?.content ?? draft, Boolean(saved?.is_edited));
        onClose();
      } catch {
        setError('Could not save the skill.');
      } finally {
        setPending(false);
      }
    },
    [id, draft, onSaved, onClose],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${name}`}
    >
      <div
        className="w-full max-w-3xl rounded-xl border border-border-subtle bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary truncate">
            {name}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-tertiary hover:text-text-primary transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="w-full h-[50vh] rounded-lg border border-border-subtle bg-code-bg p-4
                       font-mono text-sm leading-relaxed text-text-primary
                       focus:border-border-focus focus:outline-none resize-none"
          />

          {error && <p className="mt-3 font-body text-sm text-error">{error}</p>}

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {/* Both buttons appear only when they would do something: Save when
                the draft differs from what is stored, Reset when an edit exists
                to revert. */}
            {isEdited && (
              <button
                onClick={() => submit({ reset: true })}
                disabled={pending}
                className={`px-4 py-2 bg-transparent border border-border-subtle text-text-secondary
                           font-body font-semibold text-sm rounded-lg hover:border-border-focus
                           hover:text-text-primary transition-all duration-200
                           ${pending ? 'opacity-60 cursor-wait' : ''}`}
              >
                Reset to original
              </button>
            )}
            {dirty && (
              <button
                onClick={() => submit({ content: draft })}
                disabled={pending}
                className={`px-5 py-2 bg-accent text-primary font-body font-semibold text-sm
                           rounded-lg hover:bg-accent-hover transition-all duration-200
                           ${pending ? 'opacity-60 cursor-wait' : ''}`}
              >
                {pending ? 'Saving...' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
