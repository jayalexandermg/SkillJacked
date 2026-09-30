'use client';

import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** Full-height dialog shell: Escape and the backdrop close it, the page behind doesn't scroll. */
export default function Modal({ label, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className="flex w-full max-w-6xl flex-col overflow-hidden border-border-subtle bg-primary shadow-2xl
                   sm:rounded-xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, subtitle, onClose }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-4 py-3 sm:px-6 sm:py-4">
      <div className="min-w-0">
        <h2 className="font-heading text-base font-semibold text-text-primary sm:text-lg truncate">{title}</h2>
        {subtitle && <div className="mt-0.5 truncate text-xs text-text-secondary">{subtitle}</div>}
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="shrink-0 text-2xl leading-none text-text-tertiary transition-colors hover:text-text-primary"
      >
        &times;
      </button>
    </div>
  );
}
