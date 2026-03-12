import { extract } from './extractor';
import { transform } from './transformer';
import { format } from './formatter';
import { OutputFormat, FormattedOutput } from './formatter/types';
import { StructuredSkill } from './transformer/types';
import { segmentTranscript } from './transformer/segmenter';
import { generateSkillsFromPlan } from './transformer/skill-generator';
import type { ExtractionOptions } from './extractor/types';

export interface SkillOutput {
  skill: StructuredSkill;
  formatted: FormattedOutput;
}

export interface JackOptions {
  format?: OutputFormat;
  apiKey?: string;
  maxRetries?: number;
  onRetry?: (msg: string) => void;
  extraction?: ExtractionOptions;
}

export async function jackSkill(url: string, options: JackOptions = {}): Promise<SkillOutput> {
  const outputFormat = options.format ?? 'claude-skill';

  const rawContent = await extract(url, options.extraction);
  const retryOpts = options.maxRetries !== undefined || options.onRetry
    ? { maxRetries: options.maxRetries, onRetry: options.onRetry }
    : undefined;
  const skill = await transform(rawContent, options.apiKey, retryOpts);
  const formatted = format(skill, outputFormat);

  return { skill, formatted };
}

export interface JackSkillsOptions extends JackOptions {
  count?: number;
  concurrency?: number;
  onSkip?: (msg: string) => void;
}

export async function jackSkills(url: string, options: JackSkillsOptions = {}): Promise<SkillOutput[]> {
  const { count = 10, concurrency = 3, onSkip, ...baseOptions } = options;
  const outputFormat = baseOptions.format ?? 'claude-skill';

  const rawContent = await extract(url, baseOptions.extraction);

  const plan = await segmentTranscript(
    {
      title: rawContent.title,
      sourceUrl: rawContent.sourceUrl,
      duration: rawContent.duration,
      transcript: rawContent.transcript,
    },
    {
      maxSegments: count,
      apiKey: baseOptions.apiKey,
      maxRetries: baseOptions.maxRetries,
      onRetry: baseOptions.onRetry,
    },
  );

  const result = await generateSkillsFromPlan(rawContent, plan, {
    apiKey: baseOptions.apiKey,
    count,
    concurrency,
    maxRetries: baseOptions.maxRetries,
    onRetry: baseOptions.onRetry,
    onSkip,
  });

  return result.skills.map((skill) => ({
    skill,
    formatted: format(skill, outputFormat),
  }));
}

export { extract } from './extractor';
export { transform } from './transformer';
export { format } from './formatter';
export { parseUrl } from './utils/url-parser';
export { segmentTranscript } from './transformer/segmenter';
export { generateSkillsFromPlan, type GenerateFromPlanResult, type SkippedSegment, type GenerateFromPlanOpts } from './transformer/skill-generator';
export { writeSkillPack } from './transformer/write-skill-pack';
export { normalizeTranscript } from './transformer/normalize-transcript';
export { validateSkillMarkdown } from './transformer/validators/skill-md';
export type { RawContent, ExtractionOptions } from './extractor/types';
export type { StructuredSkill, SkillPlan, SkillSegment } from './transformer/types';
export type { FormattedOutput, OutputFormat } from './formatter/types';
export { SkillJackError, ExtractionError, TransformError, ValidationError, SegmenterParseError } from './utils/errors';
export type { TransformErrorDetails } from './utils/errors';
export { withRetry, type RetryOpts } from './utils/retry';
export { createLimiter, type Limiter } from './utils/concurrency';
export { dedupSegments } from './utils/dedup';
