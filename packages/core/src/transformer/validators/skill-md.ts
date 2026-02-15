/**
 * Validates a generated SKILL.md string against SkillJack output rules.
 */
export function validateSkillMarkdown(
  md: string,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  // Check YAML frontmatter exists
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    errors.push('Missing YAML frontmatter (--- delimiters)');
    return { ok: false, errors };
  }

  const frontmatter = fmMatch[1];

  // Check name field
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  if (!nameMatch) {
    errors.push('Frontmatter missing "name" field');
  } else {
    const name = nameMatch[1].trim();
    if (!/^[a-z0-9-]{1,64}$/.test(name)) {
      errors.push(
        `name "${name}" must match /^[a-z0-9-]{1,64}$/ (kebab-case, max 64 chars)`,
      );
    }
  }

  // Check description field
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  if (!descMatch) {
    errors.push('Frontmatter missing "description" field');
  } else {
    const desc = descMatch[1].trim();
    if (desc.length > 1024) {
      errors.push(
        `description is ${desc.length} chars, max 1024`,
      );
    }
  }

  // Reject forbidden headers
  const forbiddenPattern = /^##\s+(when\s+to\s+use|when\s+to\s+apply)/im;
  if (forbiddenPattern.test(md)) {
    errors.push(
      'Body contains forbidden header "When to Use" or "When to Apply" (belongs in description)',
    );
  }

  // Body line count (everything after frontmatter closing ---)
  const bodyStart = md.indexOf('---', md.indexOf('---') + 3);
  if (bodyStart !== -1) {
    const body = md.slice(bodyStart + 3);
    const lineCount = body.split('\n').length;
    if (lineCount > 500) {
      errors.push(`Body is ${lineCount} lines, max 500`);
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
