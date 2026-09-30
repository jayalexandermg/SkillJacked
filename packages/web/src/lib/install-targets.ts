/**
 * Where each tool loads Agent Skills from. The SKILL.md is identical for every
 * tool; only the folder it goes in changes, so a target is just a path.
 */

export type TargetId = 'claude' | 'codex' | 'cursor' | 'gemini' | 'hermes';

export interface InstallTarget {
  id: TargetId;
  label: string;
  /** The tool's user-level skills folder, under the home directory. */
  folder: string;
  /** How to run a skill once it's in place. */
  runHint: (name: string) => string;
}

export const TARGETS: InstallTarget[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    folder: '.claude/skills',
    runHint: (name) => `Start a new Claude Code session and type /${name}, or just describe the task.`,
  },
  {
    id: 'codex',
    label: 'Codex',
    folder: '.codex/skills',
    runHint: (name) => `Restart Codex and type $${name}, or just describe the task.`,
  },
  {
    id: 'cursor',
    label: 'Cursor',
    folder: '.cursor/skills',
    runHint: () => 'Reload Cursor. The agent loads the skill when the task matches it.',
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    folder: '.gemini/skills',
    runHint: () => 'Start a new Gemini CLI session. It loads the skill when the task matches it.',
  },
  {
    id: 'hermes',
    label: 'Hermes',
    folder: '.hermes/skills',
    runHint: (name) => `Start a new Hermes session and type /${name}, or just describe the task.`,
  },
];

/** Shown as tabs; the rest sit under "More". */
export const PRIMARY_TARGET_IDS: TargetId[] = ['claude', 'codex', 'cursor', 'gemini'];

export const DEFAULT_TARGET: TargetId = 'claude';

export function getTarget(id: string | null | undefined): InstallTarget {
  return TARGETS.find((t) => t.id === id) ?? TARGETS[0];
}

export function installPath(target: InstallTarget, name: string): string {
  return `~/${target.folder}/${name}/SKILL.md`;
}

/** Unzip a download straight into place. The zip holds `<name>/SKILL.md` folders. */
export function unixInstallCommand(target: InstallTarget, zipName: string): string {
  return `mkdir -p ~/${target.folder} && unzip -o ~/Downloads/${zipName} -d ~/${target.folder}/`;
}

export function windowsInstallCommand(target: InstallTarget, zipName: string): string {
  const folder = target.folder.replace(/\//g, '\\');
  return `Expand-Archive -Force "$HOME\\Downloads\\${zipName}" "$HOME\\${folder}"`;
}
