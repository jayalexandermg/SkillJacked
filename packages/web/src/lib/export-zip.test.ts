import { resolveFilenames } from './export-zip';

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

const s = (slug: string, format?: string) => ({ slug, content: 'x', format });

check(
  'distinct slugs keep their names',
  JSON.stringify(resolveFilenames([s('alpha'), s('beta')])) ===
    JSON.stringify(['alpha.md', 'beta.md']),
);

check(
  'a collision is suffixed, not overwritten',
  JSON.stringify(resolveFilenames([s('dup'), s('dup')])) ===
    JSON.stringify(['dup.md', 'dup-2.md']),
);

check(
  'three-way collision keeps counting',
  JSON.stringify(resolveFilenames([s('x'), s('x'), s('x')])) ===
    JSON.stringify(['x.md', 'x-2.md', 'x-3.md']),
);

check(
  'every selected skill yields a unique filename',
  new Set(resolveFilenames(Array.from({ length: 50 }, () => s('same')))).size === 50,
);

check(
  'format drives the extension',
  JSON.stringify(
    resolveFilenames([s('a', 'cursor-rules'), s('b', 'windsurf-rules')]),
  ) === JSON.stringify(['a.cursorrules', 'b.windsurfrules']),
);

check(
  'same slug in different formats does not collide',
  JSON.stringify(resolveFilenames([s('n', 'claude-skill'), s('n', 'cursor-rules')])) ===
    JSON.stringify(['n.md', 'n.cursorrules']),
);

check(
  'an empty slug still produces a usable name',
  resolveFilenames([s('')])[0] === 'skill.md',
);

check(
  'an unknown format falls back to .md',
  resolveFilenames([s('a', 'nonsense')])[0] === 'a.md',
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
