import { packageSkills, skillFolderName } from './skill-package';

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

const md = (name: string, body = '# Skill\n') =>
  `---\nname: ${name}\ndescription: Does a thing.\n---\n\n${body}`;
const s = (slug: string, content = md(slug)) => ({ slug, content });
const folders = (skills: ReturnType<typeof s>[]) => packageSkills(skills).map((p) => p.folder);
const nameOf = (content: string) => content.match(/^name: (.*)$/m)?.[1];

check('distinct skills keep their names', JSON.stringify(folders([s('alpha'), s('beta')])) === '["alpha","beta"]');
check('a collision is suffixed, not overwritten', JSON.stringify(folders([s('dup'), s('dup')])) === '["dup","dup-2"]');
check('three-way collision keeps counting', JSON.stringify(folders([s('x'), s('x'), s('x')])) === '["x","x-2","x-3"]');
check(
  'a suffix never lands on an existing name',
  new Set(folders([s('x'), s('x'), s('x-2')])).size === 3,
);
check('every skill yields a unique folder', new Set(folders(Array.from({ length: 50 }, () => s('same')))).size === 50);

check(
  'a suffixed folder has a matching name: line',
  packageSkills([s('dup'), s('dup')]).every((p) => nameOf(p.content) === p.folder),
);
check(
  'suffixed long names stay within 64 chars',
  folders([s('a'.repeat(64)), s('a'.repeat(64))]).every((f) => f.length <= 64),
);

check('frontmatter name wins over the slug (Pro edits)', skillFolderName(s('old-slug', md('renamed-by-user'))) === 'renamed-by-user');
check('a display-style name is kebab-cased', skillFolderName(s('x', md('My Great Skill'))) === 'my-great-skill');
check('a quoted name is unquoted', skillFolderName(s('x', md('"quoted-name"'))) === 'quoted-name');
check(
  'the name: line is rewritten to match the folder',
  nameOf(packageSkills([s('x', md('My Great Skill'))])[0].content) === 'my-great-skill',
);
check('no frontmatter falls back to the slug', skillFolderName(s('the-slug', '# No frontmatter\n')) === 'the-slug');
check('content without frontmatter is left as-is', packageSkills([s('a', '# Body\n')])[0].content === '# Body\n');
check('an empty slug and no name still produce a usable folder', skillFolderName(s('', '# x\n')) === 'skill');
check('the body is never altered', packageSkills([s('a', md('A B', 'name: not frontmatter\n'))])[0].content.endsWith('name: not frontmatter\n'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
