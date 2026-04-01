'use client';

import { useState } from 'react';
import type { Format } from '@/lib/client-formatter';

interface InstallGuideProps {
  format: Format;
}

const instructions: Record<Format, { title: string; steps: string[] }> = {
  'claw-skill': {
    title: 'Install for Claude Code',
    steps: [
      'Download the .md skill file.',
      'Copy the file to ~/.claude/skills/ directory.',
      'Claude Code will automatically detect and use the skill.',
    ],
  },
  'cursor-rules': {
    title: 'Install for Cursor',
    steps: [
      'Download the .cursorrules file.',
      'Drop the file into your project root directory.',
      'Cursor will automatically load the rules on next session.',
    ],
  },
  'windsurf-rules': {
    title: 'Install for Windsurf',
    steps: [
      'Download the .windsurfrules file.',
      'Drop the file into your project root directory.',
      'Windsurf will pick up the rules automatically.',
    ],
  },
};

export default function InstallGuide({ format }: InstallGuideProps) {
  const [open, setOpen] = useState(false);
  const guide = instructions[format];

  return (
    <div className="w-full max-w-3xl mx-auto mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary
                   font-body text-sm transition-colors duration-200"
      >
        <span
          className="inline-block transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &#9656;
        </span>
        {guide.title}
      </button>

      {open && (
        <div className="mt-3 p-4 bg-surface border border-border-subtle rounded-lg">
          <ol className="list-decimal list-inside space-y-2">
            {guide.steps.map((step, i) => (
              <li key={i} className="text-text-secondary text-sm font-body">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
