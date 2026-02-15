import { extract } from './extractor';
import { transform } from './transformer';
import { format } from './formatter';
import { OutputFormat, FormattedOutput } from './formatter/types';
import { StructuredSkill } from './transformer/types';

export interface SkillOutput {
  skill: StructuredSkill;
  formatted: FormattedOutput;
}

export interface JackOptions {
  format?: OutputFormat;
  apiKey?: string;
}

export async function jackSkill(url: string, options: JackOptions = {}): Promise<SkillOutput> {
  const outputFormat = options.format ?? 'claude-skill';

  const rawContent = await extract(url);
  const skill = await transform(rawContent, options.apiKey);
  const formatted = format(skill, outputFormat);

  return { skill, formatted };
}

export { extract } from './extractor';
export { transform } from './transformer';
export { format } from './formatter';
export { parseUrl } from './utils/url-parser';
export { segmentTranscript } from './transformer/segmenter';
export { generateSkillsFromPlan } from './transformer/skill-generator';
export { writeSkillPack } from './transformer/write-skill-pack';
export { normalizeTranscript } from './transformer/normalize-transcript';
export { validateSkillMarkdown } from './transformer/validators/skill-md';
export type { RawContent } from './extractor/types';
export type { StructuredSkill, SkillPlan, SkillSegment } from './transformer/types';
export type { FormattedOutput, OutputFormat } from './formatter/types';
export { SkillJackError, ExtractionError, TransformError, ValidationError, SegmenterParseError } from './utils/errors';
