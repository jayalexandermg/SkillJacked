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
  onDebug?: (msg: string) => void;
}

export async function jackSkills(url: string, options: JackSkillsOptions = {}): Promise<SkillOutput[]> {
  const { count = 10, concurrency = 3, onSkip, onDebug, ...baseOptions } = options;
  const outputFormat = baseOptions.format ?? 'claude-skill';

  const rawContent = await extract(url, baseOptions.extraction);

  // Segments a fresh SkillPlan from the transcript and generates skills from
  // it. Pulled into a closure so a totally-empty result (see below) can
  // retry with a brand new segmenter call rather than reusing the same
  // (possibly malformed) plan.
  const runOnce = async (): Promise<StructuredSkill[]> => {
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
        onDebug,
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

    return result.skills;
  };

  let skills = await runOnce();

  // The segmenter is an LLM call: it can occasionally return a plan whose
  // line-index boundaries don't line up with the transcript for that one
  // run, causing every segment to fail the excerpt guard even though the
  // same video succeeds on other runs. A single fresh attempt -- a new
  // segmenter call, not a retry of the same plan -- resolves this in the
  // overwhelming majority of cases without materially changing the
  // happy-path latency (this only triggers when the first pass produced
  // nothing at all).
  if (skills.length === 0) {
    onDebug?.('First pass produced 0 skills -- retrying with a fresh segmentation');
    skills = await runOnce();
  }

  return skills.map((skill) => ({
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
