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
      <div
        style={{
          border: '1.5px solid #e0c866',
          borderRadius: '14px',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL to get started"
          disabled={disabled}
          className="flex-1 px-5 py-4 bg-surface
                     text-text-primary placeholder:text-text-tertiary font-body text-base
                     focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        />
        <button
          type="submit"
          disabled={disabled || !url.trim()}
          className="px-6 py-4 bg-accent text-primary font-body font-semibold text-base
                     hover:bg-accent-hover hover:gold-glow
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
