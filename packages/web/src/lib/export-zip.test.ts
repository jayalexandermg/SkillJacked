import JSZip from 'jszip';
import { buildSkillsZip } from './export-zip';

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

const md = (name: string) => `---\nname: ${name}\ndescription: Does a thing.\n---\n\n# Skill\n`;

async function entries(skills: { slug: string; content: string; format?: string }[]) {
  const zip = await JSZip.loadAsync(await (await buildSkillsZip(skills)).arrayBuffer());
  return Object.values(zip.files).filter((f) => !f.dir).map((f) => f.name).sort();
}

async function main() {
  check(
    'each skill is a <name>/SKILL.md folder',
    JSON.stringify(await entries([{ slug: 'alpha', content: md('alpha') }, { slug: 'beta', content: md('beta') }])) ===
      JSON.stringify(['alpha/SKILL.md', 'beta/SKILL.md']),
  );

  check(
    'no loose .md files at the zip root',
    (await entries([{ slug: 'a', content: md('a') }])).every((name) => name.includes('/')),
  );

  check(
    'colliding names become separate folders',
    JSON.stringify(await entries([{ slug: 'dup', content: md('dup') }, { slug: 'dup', content: md('dup') }])) ===
      JSON.stringify(['dup-2/SKILL.md', 'dup/SKILL.md']),
  );

  const zip = await JSZip.loadAsync(
    await (await buildSkillsZip([{ slug: 'x', content: md('Display Name') }])).arrayBuffer(),
  );
  const file = zip.file('display-name/SKILL.md');
  check('the archived SKILL.md name: matches its folder', !!file && (await file.async('string')).includes('name: display-name\n'));

  check(
    'a legacy rules row sits beside skill folders, not inside one',
    JSON.stringify(await entries([{ slug: 'a', content: md('a') }, { slug: 'r', content: 'rules', format: 'cursor-rules' }])) ===
      JSON.stringify(['a/SKILL.md', 'r.cursorrules']),
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

void main();
