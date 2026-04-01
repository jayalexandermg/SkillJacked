'use client';

import { useState } from 'react';

interface SkillCardProps {
  id: string;
  name: string;
  sourceTitle: string;
  generatedAt: string;
  format: string;
  content: string;
  filename: string;
  onDelete?: (id: string) => void;
}

const formatLabels: Record<string, string> = {
  'claw-skill': 'Claw',
  'claude-skill': 'Claw', // legacy compat
  'cursor-rules': 'Cursor',
  'windsurf-rules': 'Windsurf',
};

export default function SkillCard({
  id,
  name,
  sourceTitle,
  generatedAt,
  format,
  content,
  filename,
  onDelete,
}: SkillCardProps) {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent fail
    }
  };

  const date = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="p-5 bg-surface border border-border-subtle rounded-lg
                    hover:border-border-focus hover:translate-y-[-2px]
                    transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-heading text-base font-semibold text-text-primary truncate pr-3">
          {name}
        </h3>
        <span className="text-xs font-mono text-accent-secondary bg-primary
                         px-2 py-0.5 rounded border border-border-subtle shrink-0">
          {formatLabels[format] || format}
        </span>
      </div>

      <p className="text-text-secondary text-sm truncate mb-2">{sourceTitle}</p>
      <p className="text-text-tertiary text-xs mb-4">{date}</p>

      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          className="flex-1 py-2 text-xs font-medium text-text-primary border border-border-subtle
                     rounded hover:border-border-focus transition-all duration-200"
        >
          Download
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 py-2 text-xs font-medium text-text-primary border border-border-subtle
                     rounded hover:border-border-focus transition-all duration-200"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className="py-2 px-3 text-xs font-medium text-error border border-border-subtle
                       rounded hover:border-error transition-all duration-200"
          >
            &#10005;
          </button>
        )}
      </div>
    </div>
  );
}
