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

type LineKind = 'fence' | 'key' | 'frontmatter' | 'heading' | 'list' | 'body';

const KEY_LINE = /^([A-Za-z_][\w-]*:)(.*)$/;

/**
 * Classify every line once, over the whole file, so the frontmatter block is
 * found by its fences rather than guessed from line position. Preview modes
 * slice the result, and a slice must not change how a line is coloured.
 */
function classifyLines(lines: string[]): LineKind[] {
  const closing = lines[0]?.trim() === '---'
    ? lines.findIndex((line, i) => i > 0 && line.trim() === '---')
    : -1;

  return lines.map((line, i) => {
    if (closing > 0 && i <= closing) {
      if (i === 0 || i === closing) return 'fence';
      return KEY_LINE.test(line) ? 'key' : 'frontmatter';
    }
    if (line.startsWith('#')) return 'heading';
    if (/^\s*([-*]|\d+\.)\s/.test(line)) return 'list';
    return 'body';
  });
}

const KIND_CLASS: Record<Exclude<LineKind, 'key'>, string> = {
  fence: 'text-accent font-semibold',
  frontmatter: 'text-text-primary',
  heading: 'text-text-primary font-semibold',
  list: 'text-text-primary',
  body: 'text-text-secondary',
};

function renderFormattedLines(lines: string[], kinds: LineKind[], start = 0, end?: number) {
  return lines.slice(start, end).map((line, offset) => {
    const kind = kinds[start + offset];
    const key = `${start + offset}-${line}`;

    if (kind === 'key') {
      const [, name, value] = line.match(KEY_LINE) ?? [];
      return (
        <div key={key}>
          <span className="text-accent">{name}</span>
          <span className="text-text-primary">{value}</span>
        </div>
      );
    }

    return (
      <div key={key} className={KIND_CLASS[kind]}>
        {line || '\u00A0'}
      </div>
    );
  });
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
  const kinds = classifyLines(lines);
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
              {renderFormattedLines(lines, kinds, 0, 12)}
            </pre>
          ) : previewMode === 'partial' ? (
            <>
              <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                {renderFormattedLines(lines, kinds, 0, 3)}
              </pre>
              <div className="relative mt-2">
                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words blur-sm select-none pointer-events-none opacity-40">
                  {renderFormattedLines(lines, kinds, 3, 15)}
                </pre>
              </div>
            </>
          ) : (
            <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
              {renderFormattedLines(lines, kinds)}
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
