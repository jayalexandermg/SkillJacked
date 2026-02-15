'use client';

import { useState } from 'react';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

export default function UrlInput({ onSubmit, disabled = false }: UrlInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube URL..."
          disabled={disabled}
          className="flex-1 px-5 py-4 bg-surface border border-border-subtle rounded-lg
                     text-text-primary placeholder:text-text-tertiary font-body text-base
                     focus:outline-none focus:border-border-focus focus:gold-glow-subtle
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        />
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className="px-6 py-4 bg-accent text-primary font-body font-semibold text-base
                     rounded-lg hover:bg-accent-hover hover:gold-glow
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 whitespace-nowrap"
        >
          <span className="mr-2">&#9889;</span>
          Jack This Skill
        </button>
      </div>
    </form>
  );
}
