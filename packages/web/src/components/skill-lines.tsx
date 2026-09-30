/**
 * SKILL.md syntax colouring, shared by every view that shows a skill: keys
 * gold, values white, headings bold white, prose grey.
 */

type LineKind = 'fence' | 'key' | 'frontmatter' | 'heading' | 'list' | 'body';

const KEY_LINE = /^([A-Za-z_][\w-]*:)(.*)$/;

/**
 * Classify every line once, over the whole file, so the frontmatter block is
 * found by its fences rather than guessed from line position. Preview modes
 * slice the result, and a slice must not change how a line is coloured.
 */
export function classifyLines(lines: string[]): LineKind[] {
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

export function renderFormattedLines(lines: string[], kinds: LineKind[], start = 0, end?: number) {
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
