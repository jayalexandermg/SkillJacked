import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { FormattedOutput } from '@skilljack/core';

export async function writeSkillFile(
  formatted: FormattedOutput,
  outputDir: string,
): Promise<string> {
  const resolvedDir = resolve(outputDir);

  await mkdir(resolvedDir, { recursive: true });

  const filePath = resolve(resolvedDir, formatted.filename);

  // --- Fix 2: Path containment check ---
  if (!filePath.startsWith(resolvedDir)) {
    throw new Error('Output path escapes the target directory. Aborting write.');
  }

  await writeFile(filePath, formatted.content, 'utf-8');

  return filePath;
}
