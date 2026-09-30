'use client';

import { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-2 ' +
  'font-body text-xs font-semibold text-text-primary transition-all duration-200 hover:border-border-focus ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 font-body text-sm font-semibold ' +
  'text-primary transition-all duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50';

export default function CopyButton({ text, label = 'Copy', className = SECONDARY_BUTTON }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The text stays selectable on screen, so a failed copy is recoverable by hand.
    }
  };

  return (
    <button onClick={copy} className={className}>
      {copied ? 'Copied!' : label}
    </button>
  );
}
