const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const NAME_LINE = /^name:.*$/m;

// Skill names become directory names, and the Agent Skills spec caps them at
// 64 chars of lowercase kebab-case.
export function sanitizeSkillName(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64)
    .replace(/^-|-$/g, '');
  return slug || `skill-${Date.now()}`;
}

/**
 * Force the frontmatter `name:` to `name`.
 *
 * The generator sanitizes the model's name into a directory name but the file
 * kept the raw one, so `My Skill/SKILL.md` could say `name: My Skill`. Tools
 * that enforce the spec reject a name that differs from its directory.
 * Content without frontmatter is returned untouched — Claude Code falls back
 * to the directory name for it.
 */
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
