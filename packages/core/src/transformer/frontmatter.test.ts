import { sanitizeSkillName, setFrontmatterName } from './frontmatter';

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean) {
  if (ok) { passed++; console.log(`PASS: ${label}`); } else { failed++; console.log(`FAIL: ${label}`); }
}

const doc = (fm: string, body = '# Title\n\nBody.\n') => `---\n${fm}\n---\n\n${body}`;

check('kebab-cases a display name', sanitizeSkillName('Content Tier Diagnostic!') === 'content-tier-diagnostic');
check('caps names at 64 chars', sanitizeSkillName('a'.repeat(100)).length === 64);
check('no trailing hyphen after the cap', !sanitizeSkillName(`${'a'.repeat(63)} b`).endsWith('-'));
check('empty input still yields a name', /^skill-\d+$/.test(sanitizeSkillName('!!!')));

check(
  'rewrites a mismatched name line',
  setFrontmatterName(doc('name: My Skill\ndescription: Does X.'), 'my-skill') ===
    doc('name: my-skill\ndescription: Does X.'),
);
check(
  'inserts a missing name line',
  setFrontmatterName(doc('description: Does X.'), 'my-skill') ===
    doc('name: my-skill\ndescription: Does X.'),
);
check(
  'leaves an indented metadata name alone',
  setFrontmatterName(doc('name: a\nmetadata:\n  name: keep'), 'b') ===
    doc('name: b\nmetadata:\n  name: keep'),
);
check(
  'does not touch name lines in the body',
  setFrontmatterName(doc('name: a', 'name: body line\n'), 'b') === doc('name: b', 'name: body line\n'),
);
check('content without frontmatter is untouched', setFrontmatterName('# Just a body\n', 'x') === '# Just a body\n');
check(
  'handles CRLF frontmatter',
  setFrontmatterName('---\r\nname: A B\r\ndescription: d\r\n---\r\nbody', 'a-b') ===
    '---\r\nname: a-b\r\ndescription: d\r\n---\r\nbody',
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
