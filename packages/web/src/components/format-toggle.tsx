'use client';

import type { Format } from '@/lib/client-formatter';

interface FormatToggleProps {
  selected: Format;
  onChange: (format: Format) => void;
}

const formats: { value: Format; label: string }[] = [
  { value: 'claw-skill', label: 'Claw Skill' },
  { value: 'cursor-rules', label: 'Cursor' },
  { value: 'windsurf-rules', label: 'Windsurf' },
];

export default function FormatToggle({ selected, onChange }: FormatToggleProps) {
  return (
    <div className="inline-flex bg-surface border border-border-subtle rounded-lg p-1">
      {formats.map((fmt) => (
        <button
          key={fmt.value}
          onClick={() => onChange(fmt.value)}
          className={`px-4 py-2 text-sm font-body font-medium rounded-md transition-all duration-200
            ${
              selected === fmt.value
                ? 'bg-accent text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
        >
          {fmt.label}
        </button>
      ))}
    </div>
  );
}
