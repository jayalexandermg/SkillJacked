/**
 * How a skill is laid out on disk: `<name>/SKILL.md`, where `<name>` equals the
 * frontmatter `name:`. Claude Code (and every Agent Skills tool) only loads a
 * skill from a folder like that — a loose `<name>.md` is silently ignored.
 *
 * Pure and DOM-free so the server-rendered share page and the tests can use it.
 * The frontmatter handling mirrors packages/core/src/transformer/frontmatter.ts;
 * it is duplicated because importing @skilljack/core would pull the Anthropic
 * SDK into the client bundle.
 */

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const NAME_LINE = /^name:.*$/m;
const MAX_NAME_LENGTH = 64;

export interface ExportableSkill {
  slug: string;
  content: string;
}

export interface PackagedSkill {
  folder: string;
  content: string;
}

function toSkillName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, MAX_NAME_LENGTH)
    .replace(/^-|-$/g, '');
}

/**
 * The frontmatter name wins over the slug: a Pro edit can change `name:`, and
 * the user will look for the skill under the name they typed.
 */
export function skillFolderName(skill: ExportableSkill): string {
  const frontmatter = skill.content.match(FRONTMATTER)?.[1] ?? '';
  const declared = (frontmatter.match(NAME_LINE)?.[0] ?? '')
    .replace(/^name:/, '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

  return toSkillName(declared) || toSkillName(skill.slug) || 'skill';
}

export function setFrontmatterName(md: string, name: string): string {
  const match = md.match(FRONTMATTER);
  if (!match) return md;

  const body = match[1];
  const start = md.indexOf('\n') + 1;
  const nextBody = NAME_LINE.test(body)
    ? body.replace(NAME_LINE, `name: ${name}`)
    : `name: ${name}\n${body}`;

  return md.slice(0, start) + nextBody + md.slice(start + body.length);
}

function withSuffix(base: string, n: number): string {
  const suffix = `-${n}`;
  return base.slice(0, MAX_NAME_LENGTH - suffix.length).replace(/-$/, '') + suffix;
}

/**
 * Give every skill a unique folder and make its `name:` match it.
 *
 * Names are not unique — the same video jacked twice, or two videos on the
 * same topic, collide. Two identical folders in one zip make most extractors
 * silently overwrite the first, so a collision is suffixed (`-2`, `-3`) and
 * the suffix is written into `name:` too, keeping folder and name equal.
 */
export function packageSkills(skills: ExportableSkill[]): PackagedSkill[] {
  const used = new Set<string>();

  return skills.map((skill) => {
    const base = skillFolderName(skill);
    let folder = base;
    for (let n = 2; used.has(folder); n++) folder = withSuffix(base, n);
    used.add(folder);

    return { folder, content: setFrontmatterName(skill.content, folder) };
  });
}

export function packageSkill(skill: ExportableSkill): PackagedSkill {
  return packageSkills([skill])[0];
}
