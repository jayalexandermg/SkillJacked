import Anthropic from '@anthropic-ai/sdk';
import { SKILL_EXTRACTION_PROMPT } from './prompts';
import { SKILL_GENERATOR_SYSTEM_PROMPT } from './runtime-prompts';
import { StructuredSkill, SkillPlan, SkillSegment } from './types';
import { RawContent } from '../extractor/types';
import { TransformError, type TransformErrorDetails } from '../utils/errors';
import { normalizeTranscript } from './normalize-transcript';
import { withRetry, type RetryOpts } from '../utils/retry';
import { createLimiter } from '../utils/concurrency';

const ANTHROPIC_TIMEOUT_MS = 60_000; // 60s
const ANTHROPIC_MODEL = 'claude-sonnet-5';
const MIN_EXCERPT_LENGTH = 50;

function sanitizeSkillName(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `skill-${Date.now()}`;
}

export async function generateSkill(
  rawContent: RawContent,
  apiKey?: string,
  retryOpts?: RetryOpts,
): Promise<StructuredSkill> {
  const client = new Anthropic({ apiKey });

  const userMessage = `Video Title: ${rawContent.title}\nVideo URL: ${rawContent.sourceUrl}\nDuration: ${rawContent.duration}\n\nFull Transcript:\n${rawContent.transcript}`;

  const response = await withRetry(
    async () => {
      try {
        return await client.messages.create(
          {
            model: ANTHROPIC_MODEL,
            max_tokens: 4096,
            thinking: { type: 'disabled' },
            system: SKILL_EXTRACTION_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
          },
          { signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS) },
        );
      } catch (err: unknown) {
        const error = err as Error & { status?: number; error?: { type?: string; message?: string }; request_id?: string };
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw new TransformError('AI extraction timed out. Please try again.', { kind: 'timeout' });
        }
        throw new TransformError('AI extraction failed. Please try again in a moment.', {
          kind: 'api',
          statusCode: error.status,
          errorType: error.error?.type,
          detail: error.error?.message || error.message,
          requestId: error.request_id,
        });
      }
    },
    retryOpts,
  );

  if (!response.content || response.content.length === 0) {
    throw new TransformError('AI returned no content. Please try again.', { kind: 'parse', detail: 'Empty content array' });
  }

  const content = response.content.find((b) => b.type === 'text');
  if (!content) {
    throw new TransformError('AI extraction failed. Please try again in a moment.', {
      kind: 'parse', detail: 'No text content in response',
    });
  }

  const text = content.text;
  const nameMatch = text.match(/^name:\s*(.+)$/m);
  const rawName = nameMatch ? nameMatch[1].trim() : rawContent.title;
  const name = sanitizeSkillName(rawName);

  return {
    name,
    sourceTitle: rawContent.title,
    sourceUrl: rawContent.sourceUrl,
    generatedAt: new Date().toISOString(),
    content: text,
  };
}

export interface SkippedSegment {
  slug: string;
  reason: string;
}

export interface GenerateFromPlanResult {
  skills: StructuredSkill[];
  skipped: SkippedSegment[];
}

export interface GenerateFromPlanOpts {
  apiKey?: string;
  /** How many skills to generate. Defaults to 1 (highest priority). */
  count?: number;
  /** Max concurrent API calls. Defaults to 1 (sequential). */
  concurrency?: number;
  /** Max retries per API call. Defaults to 3. */
  maxRetries?: number;
  /** Called on each retry attempt. */
  onRetry?: (msg: string) => void;
  /** Called when a segment is skipped. */
  onSkip?: (msg: string) => void;
}

/**
 * Try to recover a usable excerpt when the line-based slice is too short.
 */
function recoverExcerpt(
  segment: SkillSegment,
  lines: string[],
  fullTranscript: string,
  segmentIndex: number,
  totalSegments: number,
): string {
  // Attempt 1: Expand the line window by ±10 lines
  const expandedStart = Math.max(0, segment.start_line - 10);
  const expandedEnd = Math.min(lines.length - 1, segment.end_line + 10);
  const expanded = lines.slice(expandedStart, expandedEnd + 1).join('\n');
  if (expanded.trim().length >= MIN_EXCERPT_LENGTH) return expanded;

  // Attempt 2: Character window around the approximate position
  const approxCharPos = lines.slice(0, segment.start_line).join('\n').length;
  const windowStart = Math.max(0, approxCharPos - 500);
  const windowEnd = Math.min(fullTranscript.length, approxCharPos + 500);
  const charWindow = fullTranscript.slice(windowStart, windowEnd);
  if (charWindow.trim().length >= MIN_EXCERPT_LENGTH) return charWindow;

  // Attempt 3: Use topic title + larger transcript window
  const largerStart = Math.max(0, approxCharPos - 1500);
  const largerEnd = Math.min(fullTranscript.length, approxCharPos + 1500);
  const largerWindow = fullTranscript.slice(largerStart, largerEnd);
  if (largerWindow.trim().length >= MIN_EXCERPT_LENGTH) {
    return `Topic: ${segment.proposed_name}\n\n${largerWindow}`;
  }

  // Attempt 4: Guaranteed fallback. Attempts 1-3 all key off the segmenter's
  // start_line/end_line -- if the model's line-index output was wrong for
  // this run (a known LLM failure mode: miscounting exact line numbers
  // across a long transcript), every attempt keyed off that same bad
  // position fails the same way. This ignores the model's line indices
  // entirely and slices a proportional chunk of the transcript by the
  // segment's position in the plan, so a segment is never skipped outright
  // as long as the transcript itself has enough content.
  const chunkSize = Math.floor(fullTranscript.length / totalSegments) || fullTranscript.length;
  const chunkStart = segmentIndex * chunkSize;
  const chunkEnd = segmentIndex === totalSegments - 1 ? fullTranscript.length : chunkStart + chunkSize;
  const proportionalChunk = fullTranscript.slice(chunkStart, chunkEnd);
  if (proportionalChunk.trim().length >= MIN_EXCERPT_LENGTH) {
    return `Topic: ${segment.proposed_name}\n\n${proportionalChunk}`;
  }

  return '';
}

/**
 * Generate StructuredSkill(s) from a SkillPlan by slicing transcript excerpts
 * and calling the per-segment SKILL_GENERATOR_SYSTEM_PROMPT.
 */
export async function generateSkillsFromPlan(
  rawContent: RawContent,
  plan: SkillPlan,
  opts: GenerateFromPlanOpts = {},
): Promise<GenerateFromPlanResult> {
  const { apiKey, count = 1, concurrency = 1, maxRetries = 3, onRetry, onSkip } = opts;
  const client = new Anthropic({ apiKey });
  const retryOpts: RetryOpts = { maxRetries, onRetry };
  const limiter = createLimiter(concurrency);

  const normalized = normalizeTranscript(rawContent.transcript);
  const lines = normalized.split('\n');

  // Pick the top segment(s) by priority (lower number = higher priority), then by order
  const sorted = [...plan.segments].sort(
    (a: SkillSegment, b: SkillSegment) => a.priority - b.priority || a.start_line - b.start_line,
  );
  const targets = sorted.slice(0, count);

  const skills: StructuredSkill[] = [];
  const skipped: SkippedSegment[] = [];

  // Process segments through the concurrency limiter, preserving order
  const results = await Promise.all(
    targets.map((segment, segmentIndex) =>
      limiter.run(async () => {
        // --- Excerpt guard ---
        let excerpt = lines.slice(segment.start_line, segment.end_line + 1).join('\n');

        if (excerpt.trim().length < MIN_EXCERPT_LENGTH) {
          excerpt = recoverExcerpt(segment, lines, rawContent.transcript, segmentIndex, targets.length);
        }

        if (excerpt.trim().length < MIN_EXCERPT_LENGTH) {
          const reason = 'empty excerpt';
          onSkip?.(`Skipping "${segment.proposed_slug}": ${reason}`);
          return { type: 'skipped' as const, slug: segment.proposed_slug, reason };
        }

        // Build user message — verify TRANSCRIPT EXCERPT is non-empty
        const userMessage = [
          `Video Title: ${rawContent.title}`,
          `Video URL: ${rawContent.sourceUrl}`,
          rawContent.duration ? `Duration: ${rawContent.duration}` : null,
          `Segment: ${segment.proposed_name}`,
          `Segment Description: ${segment.description}`,
          '',
          'TRANSCRIPT EXCERPT:',
          excerpt,
        ]
          .filter((l) => l !== null)
          .join('\n');

        const response = await withRetry(
          async () => {
            try {
              return await client.messages.create(
                {
                  model: ANTHROPIC_MODEL,
                  max_tokens: 4096,
                  thinking: { type: 'disabled' },
                  system: SKILL_GENERATOR_SYSTEM_PROMPT,
                  messages: [{ role: 'user', content: userMessage }],
                },
                { signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS) },
              );
            } catch (err: unknown) {
              const error = err as Error & { status?: number; error?: { type?: string; message?: string }; request_id?: string };
              if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                throw new TransformError('AI extraction timed out. Please try again.', { kind: 'timeout' });
              }
              throw new TransformError('AI extraction failed. Please try again in a moment.', {
                kind: 'api',
                statusCode: error.status,
                errorType: error.error?.type,
                detail: error.error?.message || error.message,
                requestId: error.request_id,
              });
            }
          },
          retryOpts,
        );

        if (!response.content || response.content.length === 0) {
          throw new TransformError('AI returned no content. Please try again.', { kind: 'parse', detail: 'Empty content array' });
        }
        const block = response.content.find((b) => b.type === 'text');
        if (!block) {
          throw new TransformError('AI extraction failed. Please try again in a moment.', {
            kind: 'parse', detail: 'No text content in response',
          });
        }

        const text = block.text;
        const nameMatch = text.match(/^name:\s*(.+)$/m);
        const rawName = nameMatch ? nameMatch[1].trim() : segment.proposed_slug;
        const name = sanitizeSkillName(rawName);

        return {
          type: 'skill' as const,
          skill: {
            name,
            sourceTitle: rawContent.title,
            sourceUrl: rawContent.sourceUrl,
            generatedAt: new Date().toISOString(),
            content: text,
          },
        };
      }),
    ),
  );

  // Collect results preserving order
  for (const result of results) {
    if (result.type === 'skill') {
      skills.push(result.skill);
    } else {
      skipped.push({ slug: result.slug, reason: result.reason });
    }
  }

  return { skills, skipped };
}
