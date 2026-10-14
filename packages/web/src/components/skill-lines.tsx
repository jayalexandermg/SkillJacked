/**
 * SKILL.md syntax colouring, shared by every view that shows a skill: keys
 * and headings gold, values white, prose grey.
 */

type LineKind = 'fence' | 'key' | 'frontmatter' | 'heading' | 'list' | 'body';

const KEY_LINE = /^([A-Za-z_][\w-]*:)(.*)$/;
const HEADING_LINE = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const CODE_FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const LIST_PREFIX = /^ {0,3}(?:[-+*]|\d{1,9}[.)]) {1,4}(?=[`~])/;

/**
 * Classify every line once, over the whole file, so the frontmatter block is
 * found by its fences rather than guessed from line position. Preview modes
 * slice the result, and a slice must not change how a line is coloured.
 */
export function classifyLines(lines: string[]): LineKind[] {
  const closing = lines[0]?.trim() === '---'
    ? lines.findIndex((line, i) => i > 0 && line.trim() === '---')
    : -1;
  let codeFence: { marker: string; indent: string } | null = null;

  return lines.map((line, i) => {
    if (closing > 0 && i <= closing) {
      if (i === 0 || i === closing) return 'fence';
      return KEY_LINE.test(line) ? 'key' : 'frontmatter';
    }
    const source = line.replace(/\r$/, '').replace(
      /^( {0,3}(?:[-+*]|\d{1,9}[.)]))?([ \t]+)/,
      (_, marker: string = '', whitespace: string) => {
        let width = marker.length;
        for (const char of whitespace) width += char === '\t' ? 4 - (width % 4) : 1;
        return marker + ' '.repeat(width - marker.length);
      },
    );
    // A list's fenced block ends when its container ends, even without a closer.
    if (codeFence?.indent && source.trim() && !source.startsWith(codeFence.indent)) {
      codeFence = null;
    }
    if (codeFence !== null) {
      const fence = source.slice(codeFence.indent.length).match(CODE_FENCE);
      if (fence && fence[1][0] === codeFence.marker[0] && fence[1].length >= codeFence.marker.length && /^[ \t]*$/.test(fence[2])) {
        codeFence = null;
      }
      return 'body';
    }
    const listPrefix = source.match(LIST_PREFIX)?.[0] ?? '';
    const fence = source.slice(listPrefix.length).match(CODE_FENCE);
    if (fence && (fence[1][0] === '~' || !fence[2].includes('`'))) {
      codeFence = { marker: fence[1], indent: ' '.repeat(listPrefix.length) };
      return 'body';
    }
    if (HEADING_LINE.test(source)) return 'heading';
    if (/^\s*([-*]|\d+\.)\s/.test(line)) return 'list';
    return 'body';
  });
}

const KIND_CLASS: Record<Exclude<LineKind, 'key'>, string> = {
  fence: 'text-accent font-semibold',
  frontmatter: 'text-text-primary',
  heading: 'text-accent font-semibold',
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
