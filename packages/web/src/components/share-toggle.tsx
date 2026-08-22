'use client';

import { useState } from 'react';

interface ShareToggleProps {
  shareId: string;
  initialIsPublic: boolean;
}

/**
 * Publish / unpublish one extraction.
 *
 * Extractions are private until this is used — the control mints nothing, it
 * only flips visibility on an id that already exists.
 */
export default function ShareToggle({ shareId, initialIsPublic }: ShareToggleProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl =
    typeof window === 'undefined' ? '' : `${window.location.origin}/j/${shareId}`;

  const setSharing = async (next: boolean) => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_id: shareId, is_public: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? 'Could not update sharing.');
        return;
      }
      setIsPublic(next);
    } catch {
      setError('Could not update sharing.');
    } finally {
      setPending(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the link.');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isPublic ? (
        <>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-success/20 text-success">
            Public
          </span>
          <button
            onClick={copyLink}
            className="px-3 py-1.5 bg-surface border border-border-subtle text-text-secondary
                       font-body font-medium text-xs rounded-md hover:border-border-focus
                       hover:text-text-primary transition-all duration-200"
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            onClick={() => setSharing(false)}
            disabled={pending}
            className={`px-3 py-1.5 bg-transparent border border-border-subtle text-text-tertiary
                       font-body font-medium text-xs rounded-md hover:border-error hover:text-error
                       transition-all duration-200 ${pending ? 'opacity-60 cursor-wait' : ''}`}
          >
            {pending ? '...' : 'Unshare'}
          </button>
        </>
      ) : (
        <button
          onClick={() => setSharing(true)}
          disabled={pending}
          className={`px-3 py-1.5 bg-surface border border-border-subtle text-text-secondary
                     font-body font-medium text-xs rounded-md hover:border-border-focus
                     hover:text-text-primary transition-all duration-200
                     ${pending ? 'opacity-60 cursor-wait' : ''}`}
        >
          {pending ? 'Sharing...' : 'Share'}
        </button>
      )}

      {error && <span className="font-body text-xs text-error">{error}</span>}
    </div>
  );
}
