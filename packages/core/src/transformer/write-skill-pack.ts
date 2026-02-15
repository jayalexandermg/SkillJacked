import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { StructuredSkill, SkillPlan } from './types';

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'video';
}

function buildIndex(plan: SkillPlan, generatedSlugs: string[]): string {
  const generated = new Set(generatedSlugs);
  const lines: string[] = [
    `# ${plan.video.title}`,
    '',
    `**Source:** ${plan.video.url}`,
  ];
  if (plan.video.duration) {
    lines.push(`**Duration:** ${plan.video.duration}`);
  }
  lines.push(
    `**Content type:** ${plan.content_type}`,
    `**Segments found:** ${plan.segments.length}`,
    '',
    '## Segments',
    '',
  );

  for (const seg of plan.segments) {
    const status = generated.has(seg.proposed_slug) ? 'generated' : 'planned';
    const path = generated.has(seg.proposed_slug)
      ? ` -> [\`${seg.proposed_slug}/SKILL.md\`](./${seg.proposed_slug}/SKILL.md)`
      : '';
    lines.push(`- **${seg.proposed_name}** (\`${seg.proposed_slug}\`) [priority ${seg.priority}] — ${status}${path}`);
  }

  lines.push('');
  return lines.join('\n');
}

export interface WriteResult {
  baseDir: string;
  indexPath: string;
  skillPaths: string[];
}

/**
 * Write INDEX.md and SKILL.md files to disk under `outputDir/skills/{videoSlug}/`.
 */
export async function writeSkillPack(
  plan: SkillPlan,
  skills: StructuredSkill[],
  outputDir: string,
): Promise<WriteResult> {
  const videoSlug = slugify(plan.video.title);
  const baseDir = join(outputDir, 'skills', videoSlug);
  await mkdir(baseDir, { recursive: true });

  const skillPaths: string[] = [];
  const generatedSlugs: string[] = [];

  for (const skill of skills) {
    const skillDir = join(baseDir, skill.name);
    await mkdir(skillDir, { recursive: true });
    const skillPath = join(skillDir, 'SKILL.md');
    await writeFile(skillPath, skill.content, 'utf-8');
    skillPaths.push(skillPath);
    generatedSlugs.push(skill.name);
  }

  const indexContent = buildIndex(plan, generatedSlugs);
  const indexPath = join(baseDir, 'INDEX.md');
  await writeFile(indexPath, indexContent, 'utf-8');

  return { baseDir, indexPath, skillPaths };
}
