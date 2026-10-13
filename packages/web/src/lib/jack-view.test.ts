import { ANON_FULL, ANON_PREVIEW, skillDescription, tierFor, videoIdFromUrl, viewSkill, type JackSkillRow } from './jack-view';

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

const row = (position: number): JackSkillRow => ({
  id: `id-${position}`,
  position,
  name: `skill-${position}`,
  description: 'Does a thing.',
  content: '---\nname: x\n---\n# Body',
  saved_skill_id: null,
});

check('signed-in sees every skill in full', [0, 3, 9].every((p) => tierFor(p, true) === 'full'));
check('signed-out: first skill is full', tierFor(0, false) === 'full');
check('signed-out: next three are previews', [1, 2, 3].every((p) => tierFor(p, false) === 'preview'));
check('signed-out: the rest are locked', [4, 9].every((p) => tierFor(p, false) === 'locked'));
check('gating constants are 1 / 3', ANON_FULL === 1 && ANON_PREVIEW === 3);

const full = viewSkill(row(0), false);
check('full view carries content', full.content === row(0).content && full.description === 'Does a thing.');

const preview = viewSkill(row(2), false);
check('preview view has a description but no content', preview.description === 'Does a thing.' && preview.content === undefined);
check('preview view has no content key at all', !('content' in preview));

const locked = viewSkill(row(5), false);
check('locked view has only a name', locked.content === undefined && locked.description === undefined && locked.name === 'skill-5');
check('locked view never serialises content', !JSON.stringify(locked).includes('Body'));

check('saved flag follows saved_skill_id', viewSkill({ ...row(0), saved_skill_id: 'x' }, true).saved === true && !full.saved);

check('description is read from frontmatter', skillDescription('---\nname: a\ndescription: "Hello there"\n---\nbody') === 'Hello there');
check('description in the body is ignored', skillDescription('---\nname: a\n---\ndescription: nope') === null);
check('no frontmatter means no description', skillDescription('# Just a heading') === null);

check('video id from watch URL', videoIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5') === 'dQw4w9WgXcQ');
check('video id from youtu.be', videoIdFromUrl('https://youtu.be/dQw4w9WgXcQ') === 'dQw4w9WgXcQ');
check('malformed id is rejected', videoIdFromUrl('https://www.youtube.com/watch?v=short') === null);
check('non-URL is rejected', videoIdFromUrl('not a url') === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
