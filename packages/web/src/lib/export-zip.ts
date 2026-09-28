import { packageSkill, packageSkills, type ExportableSkill } from './skill-package';

/**
 * Zip skills as `<name>/SKILL.md` folders, the only layout Claude Code loads.
 *
 * Deliberately client-side: the content is already in memory on the page, so
 * a server route would upload it only to have it sent straight back, and would
 * put archive-building CPU on the serverless budget for no benefit.
 */
export async function buildSkillsZip(skills: ExportableSkill[]): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  for (const { folder, content } of packageSkills(skills)) {
    zip.file(`${folder}/SKILL.md`, content);
  }

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Download one skill as `<name>.zip` holding `<name>/SKILL.md`. A zip rather
 * than a bare file because browsers cannot create folders, and a bare
 * `SKILL.md` relies on the user creating and naming the folder correctly.
 */
export async function downloadSkill(skill: ExportableSkill): Promise<void> {
  const { folder } = packageSkill(skill);
  downloadBlob(await buildSkillsZip([skill]), `${folder}.zip`);
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
  // Revoking synchronously can cancel the download in Safari, which reads the
  // blob after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
