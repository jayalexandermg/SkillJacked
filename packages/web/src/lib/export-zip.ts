const EXTENSIONS: Record<string, string> = {
  'claude-skill': 'md',
  'cursor-rules': 'cursorrules',
  'windsurf-rules': 'windsurfrules',
};

export interface ExportableSkill {
  slug: string;
  content: string;
  format?: string | null;
}

/**
 * Build the filename for each skill, suffixing duplicates.
 *
 * Slugs are not unique — the same video jacked twice, or two videos covering
 * the same topic, both produce colliding slugs. A zip with two identical
 * entry names is not an error, but most extractors silently overwrite the
 * first, so the user would quietly receive fewer files than they selected.
 *
 * Exported separately from the zip build so the naming is testable without
 * constructing an archive.
 */
export function resolveFilenames(skills: ExportableSkill[]): string[] {
  const used = new Map<string, number>();

  return skills.map((skill) => {
    const ext = EXTENSIONS[skill.format ?? 'claude-skill'] ?? 'md';
    const base = skill.slug || 'skill';
    const key = `${base}.${ext}`;

    const seen = used.get(key) ?? 0;
    used.set(key, seen + 1);

    return seen === 0 ? key : `${base}-${seen + 1}.${ext}`;
  });
}

/**
 * Zip the selected skills in the browser.
 *
 * Deliberately client-side: the content is already in memory on the page, so
 * a server route would upload it only to have it sent straight back, and would
 * put archive-building CPU on the serverless budget for no benefit.
 */
export async function buildSkillsZip(skills: ExportableSkill[]): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const filenames = resolveFilenames(skills);
  skills.forEach((skill, index) => {
    zip.file(filenames[index], skill.content);
  });

  return zip.generateAsync({ type: 'blob' });
}

/** Trigger a browser download for an in-memory blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
