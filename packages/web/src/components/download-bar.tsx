'use client';

import { useState } from 'react';
import FormatToggle from './format-toggle';
import type { Format } from '@/lib/client-formatter';

interface DownloadBarProps {
  content: string;
  filename: string;
  format: Format;
  onFormatChange: (format: Format) => void;
  hideActions?: boolean;
}

export default function DownloadBar({
  content,
  filename,
  format,
  onFormatChange,
  hideActions,
}: DownloadBarProps) {
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
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-surface border border-border-subtle rounded-lg">
        <FormatToggle selected={format} onChange={onFormatChange} />

        {!hideActions && (
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="px-5 py-2.5 border border-border-subtle text-text-primary font-body font-medium
                         text-sm rounded-lg hover:border-border-focus hover:gold-glow-subtle
                         transition-all duration-200"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>

            <button
              onClick={handleDownload}
              className="px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm
                         rounded-lg hover:bg-accent-hover hover:gold-glow
                         transition-all duration-200"
            >
              Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
