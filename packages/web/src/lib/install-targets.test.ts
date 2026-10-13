import {
  DEFAULT_TARGET,
  PRIMARY_TARGET_IDS,
  TARGETS,
  getTarget,
  installPath,
  unixInstallCommand,
  windowsInstallCommand,
} from './install-targets';

let pass = 0;
let fail = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    pass++;
    console.log('  PASS', name);
  } else {
    fail++;
    console.log('  FAIL', name, '— expected', JSON.stringify(expected), 'got', JSON.stringify(actual));
  }
};

const claude = getTarget('claude');
check('default target is Claude Code', getTarget(DEFAULT_TARGET).label, 'Claude Code');
check('unknown id falls back to Claude Code', getTarget('nope').id, 'claude');
check('null id falls back to Claude Code', getTarget(null).id, 'claude');
check('Claude path', installPath(claude, 'my-skill'), '~/.claude/skills/my-skill/SKILL.md');
check('Codex path', installPath(getTarget('codex'), 'x'), '~/.codex/skills/x/SKILL.md');
check('Gemini path', installPath(getTarget('gemini'), 'x'), '~/.gemini/skills/x/SKILL.md');
check(
  'unix command unzips into the folder',
  unixInstallCommand(claude, 'a.zip'),
  'mkdir -p ~/.claude/skills && unzip -o ~/Downloads/a.zip -d ~/.claude/skills/',
);
check(
  'windows command uses backslashes',
  windowsInstallCommand(getTarget('cursor'), 'a.zip'),
  'Expand-Archive -Force "$HOME\\Downloads\\a.zip" "$HOME\\.cursor\\skills"',
);
check('four primary tabs', PRIMARY_TARGET_IDS.length, 4);
check('every primary id is a real target', PRIMARY_TARGET_IDS.every((id) => TARGETS.some((t) => t.id === id)), true);
check('Hermes is under More', PRIMARY_TARGET_IDS.includes('hermes'), false);
check('ids are unique', new Set(TARGETS.map((t) => t.id)).size, TARGETS.length);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
