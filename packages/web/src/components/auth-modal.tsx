'use client';

import { useState } from 'react';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
}

export default function AuthModal({ open, onClose, onSubmit }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      onSubmit(trimmed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 p-8 bg-surface border border-border-subtle rounded-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors"
        >
          &#10005;
        </button>

        <h2 className="font-heading text-2xl font-bold mb-2">
          Create your account
        </h2>
        <p className="text-text-secondary text-sm mb-6">
          Save your skills and get early access to new features.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            className="w-full px-4 py-3 bg-primary border border-border-subtle rounded-lg
                       text-text-primary placeholder:text-text-tertiary font-body text-sm
                       focus:outline-none focus:border-border-focus focus:gold-glow-subtle
                       disabled:opacity-50 transition-all duration-200 mb-4"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 bg-accent text-primary font-body font-semibold text-sm
                       rounded-lg hover:bg-accent-hover hover:gold-glow
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            {loading ? 'Creating...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}
