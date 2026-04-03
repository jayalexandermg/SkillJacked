import type { ReactNode } from 'react';

interface SkillPreviewProps {
  content: string;
  name: string;
  description: string;
  sourceTitle: string;
  sourceUrl: string;
  formatLabel: string;
  filename: string;
  overlay?: ReactNode;
  previewMode?: 'full' | 'partial' | 'locked';
}

function getLineClass(line: string, index: number): string {
  if (line.startsWith('---')) {
    return 'text-accent font-semibold';
  }

  if (line.startsWith('#')) {
    return 'text-accent font-semibold';
  }

  if (line.startsWith('- ') || line.startsWith('* ')) {
    return 'text-text-primary';
  }

  if (line.includes(':') && !line.startsWith(' ') && index < 10) {
    return 'text-text-primary';
  }

  return 'text-text-secondary';
}

function renderFormattedLines(lines: string[], limit?: number) {
  const visibleLines = typeof limit === 'number' ? lines.slice(0, limit) : lines;

  return visibleLines.map((line, index) => (
    <div key={`${index}-${line}`} className={getLineClass(line, index)}>
      {line || '\u00A0'}
    </div>
  ));
}

export default function SkillPreview({
  content,
  name,
  description,
  sourceTitle,
  sourceUrl,
  formatLabel,
  filename,
  overlay,
  previewMode = 'full',
}: SkillPreviewProps) {
  const lines = content.split('\n');
  const gatedValueClass =
    previewMode === 'locked'
      ? 'blur-sm opacity-35 select-none pointer-events-none'
      : previewMode === 'partial'
        ? 'blur-[1px] opacity-80 select-none pointer-events-none'
        : '';
  const resolvedSourceTitle = sourceTitle || 'Unknown source';

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="bg-surface border border-border-subtle rounded-lg p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em]">
              Skill Name
            </p>
            <p className="text-text-primary text-base font-semibold break-words">
              {name}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em]">
              Format
            </p>
            <p className="text-text-secondary text-sm">
              {formatLabel}
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em]">
              Description
            </p>
            <p className={`text-text-secondary text-sm leading-6 break-words ${gatedValueClass}`}>
              {description}
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em]">
              Source
            </p>
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className={`text-text-secondary text-sm leading-6 break-words underline underline-offset-4 hover:text-text-primary transition-colors ${gatedValueClass}`}
              >
                {resolvedSourceTitle}
              </a>
            ) : (
              <p className={`text-text-secondary text-sm leading-6 break-words ${gatedValueClass}`}>
                {resolvedSourceTitle}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="relative bg-code-bg border border-border-subtle rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          <div className="w-3 h-3 rounded-full bg-error opacity-60" />
          <div className="w-3 h-3 rounded-full bg-accent opacity-60" />
          <div className="w-3 h-3 rounded-full bg-success opacity-60" />
          <span className="ml-3 text-text-tertiary text-xs font-mono">
            {filename}
          </span>
        </div>

        <div className="p-5 max-h-96 overflow-y-auto">
          {previewMode === 'locked' ? (
            <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words blur-md select-none pointer-events-none opacity-30">
              {renderFormattedLines(lines, 12)}
            </pre>
          ) : previewMode === 'partial' ? (
            <>
              <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                {renderFormattedLines(lines, 3)}
              </pre>
              <div className="relative mt-2">
                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words blur-sm select-none pointer-events-none opacity-40">
                  {renderFormattedLines(lines.slice(3, 15))}
                </pre>
              </div>
            </>
          ) : (
            <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
              {renderFormattedLines(lines)}
            </pre>
          )}
        </div>

        {overlay && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-sm rounded-xl border border-accent/30 bg-surface/95 px-4 py-5 text-center shadow-xl backdrop-blur-sm sm:px-6 sm:py-6">
              {overlay}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
