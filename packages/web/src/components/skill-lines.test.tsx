import { renderToStaticMarkup } from 'react-dom/server';
import JSZip from 'jszip';
import { classifyLines, renderFormattedLines } from './skill-lines';
import SkillReader from './skill-reader';
import SkillPreview from './skill-preview';
import LibraryDetail, { type LibraryGroup } from './library-detail';
import { buildSkillsZip } from '../lib/export-zip';

let pass = 0;
let fail = 0;
const check = (name: string, cond: boolean) => {
  if (cond) {
    pass++;
    console.log('  PASS', name);
  } else {
    fail++;
    console.log('  FAIL', name);
  }
};

function rendered(lines: string[], start = 0, end?: number) {
  return renderToStaticMarkup(<pre>{renderFormattedLines(lines, classifyLines(lines), start, end)}</pre>);
}

function goldHeading(html: string, line: string) {
  return html.includes(`<div class="text-accent font-semibold">${line}</div>`);
}

async function main() {
  for (let level = 1; level <= 6; level++) {
    const line = `${'#'.repeat(level)} Heading ${level}`;
    check(`level ${level} is a gold semibold heading`, classifyLines([line])[0] === 'heading' && goldHeading(rendered([line]), line));
  }

  for (const line of [' # One space', '  ## Two spaces', '   ### Three spaces', '#\tTabbed title', '#', '#\r', '######', '## Closing hashes ##']) {
    check(`valid ATX heading ${JSON.stringify(line)}`, classifyLines([line])[0] === 'heading' && goldHeading(rendered([line]), line));
  }

  for (const line of ['####### Seven hashes', '#nospace', '##no-space', '    # Indented code', '\t# Tab-indented code', '\\# Escaped hash', '**Ordinary bold body**', 'Body with # a hash']) {
    check(`ordinary source stays unaccented ${JSON.stringify(line)}`, classifyLines([line])[0] !== 'heading' && !rendered([line]).includes('text-accent'));
  }

  const fenceCases = [
    { name: 'backticks', lines: ['```sh', '# Shell comment', '## Still code', '```', '## Real heading'], headings: [4] },
    { name: 'tildes', lines: ['~~~markdown', '# Example heading', '~~~', '# Real heading'], headings: [3] },
    { name: 'shorter and opposite fences stay inside backticks', lines: ['````md', '# Inside', '```', '## Still inside', '~~~~', '### Also inside', '````', '# Outside'], headings: [7] },
    { name: 'shorter and opposite fences stay inside tildes', lines: ['~~~~', '# Inside', '~~~', '## Still inside', '````', '### Also inside', '~~~~~', '# Outside'], headings: [7] },
    { name: 'longer matching fence closes', lines: ['```', '# Inside', '`````', '# Outside'], headings: [3] },
    { name: 'closer with trailing whitespace', lines: ['~~~', '# Inside', '~~~ \t', '# Outside'], headings: [3] },
    { name: 'closer with text does not close', lines: ['```', '# Inside', '``` trailing text', '## Still inside', '```', '# Outside'], headings: [5] },
    { name: 'unclosed fence', lines: ['# Before', '```', '# Inside', '## Still inside'], headings: [0] },
    { name: 'backtick in opener info is not a fence', lines: ['```invalid`info', '# Outside'], headings: [1] },
    { name: 'tilde opener allows backtick in info', lines: ['~~~valid`info', '# Inside', '~~~', '# Outside'], headings: [3] },
    { name: 'indented fences', lines: ['   ```sh', '   # Inside', '  ```', '   # Outside'], headings: [3] },
    { name: 'four-space opener is indented code', lines: ['    ```', '# Outside'], headings: [1] },
    { name: 'four-space closer does not close', lines: ['```', '    ```', '# Inside', '```', '# Outside'], headings: [4] },
    { name: 'tab-indented closer does not close', lines: ['~~~', '\t~~~', '# Inside', '~~~', '# Outside'], headings: [4] },
    { name: 'CRLF fences and headings', lines: ['# Before\r', '```sh\r', '# Inside\r', '```\r', '## After\r'], headings: [0, 4] },
    { name: 'unordered list fence', lines: ['- ```sh', '  # Inside', '  ```', '## Outside'], headings: [3] },
    { name: 'unclosed continuation-line list fence ends at dedent', lines: ['- item', '  ```sh', '  # Inside', '', '# Next section'], headings: [4] },
    { name: 'list context survives blanks before a continuation fence', lines: ['- item', '', '  ```sh', '  # Inside', '# Next section'], headings: [4] },
    { name: 'ordered list continuation fence ends at dedent', lines: ['10. item', '    ~~~sh', '    # Inside', '# Next section'], headings: [3] },
    { name: 'nested continuation fence ends at its own list boundary', lines: ['- item', '  - child', '    ```sh', '    # Inside', '  # Parent section', '# Next section'], headings: [4, 5] },
    { name: 'continuation fence retains explicit closer handling', lines: ['- item', '  ````sh', '  ```', '  # Still inside', '  ````', '  ## List section', '# Next section'], headings: [5, 6] },
    { name: 'tab-indented continuation fence inherits list context', lines: ['- item', '\t```sh', '\t# Inside', '# Next section'], headings: [3] },
    { name: 'standalone two-space fence stays open on dedent', lines: ['  ```sh', '  # Inside', '', '# Still inside'], headings: [] },
    { name: 'standalone two-space fence accepts a dedented closer', lines: ['  ```sh', '# Inside', '```', '# Next section'], headings: [3] },
    { name: 'ending a list clears context for later top-level fences', lines: ['- item', '# Next section', '  ```sh', '# Inside', '```', '# Outside'], headings: [1, 5] },
    { name: 'list-like code does not create a list container', lines: ['```', '- item', '```', '  ```sh', '# Inside', '```', '# Outside'], headings: [6] },
    { name: 'dash thematic break does not create a list container', lines: ['- - -', '  ```sh', '# Inside', '```', '# Outside'], headings: [4] },
    { name: 'star thematic break does not create a list container', lines: ['* * *', '  ~~~sh', '# Inside', '~~~', '# Outside'], headings: [4] },
    { name: 'ordered list fence', lines: ['1. ~~~sh', '   # Inside', '   ~~~', '## Outside'], headings: [3] },
    { name: 'ordered list fence with four-space closer', lines: ['10. ````sh', '    # Inside', '    ````', '## Outside'], headings: [3] },
    { name: 'list fence with additional closer indentation', lines: ['- ```sh', '  # Inside', '     ```', '## Outside'], headings: [3] },
    { name: 'list fence with four-space marker padding', lines: ['-    ```sh', '     # Inside', '     ```', '## Outside'], headings: [3] },
    { name: 'unclosed list fence ends at container dedent', lines: ['- ```sh', '  # Inside', '', '  ## Still inside', '## Outside'], headings: [4] },
    { name: 'shorter and opposite fences stay inside a list fence', lines: ['- ````sh', '  ```', '  # Still inside', '  ~~~~', '  ## Also inside', '  ````', '## Outside'], headings: [6] },
    { name: 'five spaces after a list marker form indented code', lines: ['-     ```sh', '  # Outside the indented code'], headings: [1] },
    { name: 'tab-indented list code retains its fence', lines: ['- ```sh', '\tcode', '  # Still inside', '  ```', '## Outside'], headings: [4] },
    { name: 'tab-padded list marker and mixed indentation', lines: ['-\t```sh', '\t# Inside', '    ## Also inside', '\t```', '## Outside'], headings: [4] },
  ];
  for (const { name, lines, headings } of fenceCases) {
    const kinds = classifyLines(lines);
    check(`${name}: only document headings are recognized`, JSON.stringify(kinds.flatMap((kind, i) => kind === 'heading' ? [i] : [])) === JSON.stringify(headings));
    check(`${name}: code lines receive no heading accent`, renderFormattedLines(lines, kinds).every((element, i) => headings.includes(i) || !String(element.props.className ?? '').includes('text-accent')));
  }

  const frontmatter = ['---', 'name: heading-fixture', 'description: Keep # symbols and **bold** literal.', 'source: https://example.test/video', 'generated_by: SkillJacked', '# YAML comment', '---', '# Document title'];
  const frontmatterKinds = classifyLines(frontmatter);
  check('frontmatter keys retain their classification', frontmatterKinds.slice(1, 5).every((kind) => kind === 'key'));
  check('frontmatter comments are not document headings', frontmatterKinds[5] === 'frontmatter');
  check('frontmatter delimiters retain their classification', frontmatterKinds[0] === 'fence' && frontmatterKinds[6] === 'fence');
  const frontmatterHtml = rendered(frontmatter);
  check('frontmatter keys remain gold with white values', frontmatterHtml.includes('<span class="text-accent">name:</span><span class="text-text-primary"> heading-fixture</span>'));
  check('heading after frontmatter becomes gold', goldHeading(frontmatterHtml, '# Document title'));

  const sliced = ['---', 'name: heading-fixture', '---', '```markdown', '# Code example', '```', '## Real section'];
  const sliceHtml = rendered(sliced, 4, 7);
  check('slice beginning inside a fence uses full-file classification', !goldHeading(sliceHtml, '# Code example') && goldHeading(sliceHtml, '## Real section'));

  const source = [...frontmatter, '', '**Ordinary bold body**', '## Quick Start', '```sh', '# Shell comment', '```', '### Core Workflow', '#### Anti-Patterns', '##### Edge Cases', '###### Error Handling', ''].join('\n');
  const originalLines = source.split('\n');
  const before = [...originalLines];
  const nodes = renderFormattedLines(originalLines, classifyLines(originalLines));
  check('classification and rendering preserve every source line', JSON.stringify(originalLines) === JSON.stringify(before) && originalLines.join('\n') === source);
  check('Markdown hashes and bold markers remain literal', nodes.some((node) => node.props.children === '## Quick Start') && nodes.some((node) => node.props.children === '**Ordinary bold body**'));
  check('blank lines retain the existing visible spacer', nodes.some((node, i) => originalLines[i] === '' && node.props.children === '\u00A0'));
  const crlf = '# Heading\r\n\r\n```sh\r\n# Comment\r\n```\r\n';
  const crlfLines = crlf.split('\n');
  renderFormattedLines(crlfLines, classifyLines(crlfLines));
  check('CRLF source bytes are untouched', crlfLines.join('\n') === crlf);

  const readerHtml = renderToStaticMarkup(<SkillReader name="heading-fixture" content={source} />);
  const group: LibraryGroup = {
    key: 'fixture', shareId: null, isPublic: false, sourceTitle: 'Local fixture', sourceUrl: null, sourceChannel: null, videoId: null,
    skills: [{ id: 'fixture-skill', name: 'heading-fixture', slug: 'heading-fixture', content: source, source_title: 'Local fixture', source_url: null, format: 'claude-skill', created_at: '2026-01-01T00:00:00.000Z' }],
  };
  const libraryHtml = renderToStaticMarkup(<LibraryDetail group={group} openId="fixture-skill" isPro={false} onOpen={() => {}} onClose={() => {}} onEdit={() => {}} onDelete={async () => false} />);
  const previewProps = { content: source, name: 'heading-fixture', description: 'Local fixture', sourceTitle: 'Local fixture', sourceUrl: '', formatLabel: 'Claude Skill', filename: 'SKILL.md' };
  const previewHtml = renderToStaticMarkup(<SkillPreview {...previewProps} />);
  for (const [name, html] of [['shared initial-preview reader', readerHtml], ['saved library detail', libraryHtml], ['public skill preview', previewHtml]]) {
    check(`${name} renders gold document headings`, goldHeading(html, '# Document title') && goldHeading(html, '## Quick Start') && goldHeading(html, '###### Error Handling'));
    check(`${name} leaves bold prose and fenced comments unaccented`, !goldHeading(html, '**Ordinary bold body**') && !goldHeading(html, '# Shell comment'));
    check(`${name} retains source whitespace and line spacing`, html.includes('whitespace-pre-wrap') && html.includes('leading-relaxed'));
  }
  const partialHtml = renderToStaticMarkup(<SkillPreview {...previewProps} previewMode="partial" />);
  const lockedHtml = renderToStaticMarkup(<SkillPreview {...previewProps} previewMode="locked" />);
  check('partial preview keeps gold headings and its blur treatment', goldHeading(partialHtml, '## Quick Start') && partialHtml.includes('blur-sm select-none pointer-events-none opacity-40'));
  check('locked preview keeps its blur and selection restrictions', lockedHtml.includes('blur-md select-none pointer-events-none opacity-30'));
  const gatedReaderHtml = renderToStaticMarkup(<SkillReader name="locked-fixture" tier="locked" gate="Sign up" />);
  check('gated reader retains inaccessible blurred placeholder', gatedReaderHtml.includes('aria-hidden="true"') && gatedReaderHtml.includes('select-none blur-sm opacity-40 pointer-events-none') && gatedReaderHtml.includes('Sign up'));

  const zip = await JSZip.loadAsync(await (await buildSkillsZip([{ slug: 'heading-fixture', content: source }])).arrayBuffer());
  const exported = await zip.file('heading-fixture/SKILL.md')?.async('string');
  check('downloaded SKILL.md keeps literal source byte-for-byte', exported !== undefined && Buffer.from(exported).equals(Buffer.from(source)));
  check('library fixture content remains unchanged after display and export', group.skills[0].content === source);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

void main();
