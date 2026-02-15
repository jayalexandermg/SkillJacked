import Anthropic from '@anthropic-ai/sdk';
import { SkillPlan } from './types';
import { SEGMENTER_SYSTEM_PROMPT, SEGMENTER_REPAIR_SYSTEM_PROMPT } from './runtime-prompts';
import { normalizeTranscript } from './normalize-transcript';
import { SegmenterParseError } from '../utils/errors';

const ANTHROPIC_TIMEOUT_MS = 90_000;

export interface SegmenterInput {
  title: string;
  sourceUrl: string;
  duration?: string;
  transcript: string;
}

export interface SegmenterOpts {
  maxSegments?: number;
  minLines?: number;
  apiKey?: string;
}

function extractJSON(raw: string): string {
  // Strip markdown code fences if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

function parseSkillPlan(raw: string): SkillPlan {
  const json = extractJSON(raw);
  const parsed = JSON.parse(json);

  // Basic structural validation
  if (!parsed.video || !Array.isArray(parsed.segments)) {
    throw new Error('Missing required fields: video, segments');
  }
  return parsed as SkillPlan;
}

async function callClaude(
  client: Anthropic,
  system: string,
  userMessage: string,
): Promise<string> {
  const response = await client.messages.create(
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: userMessage }],
    },
    { signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS) },
  );

  if (!response.content || response.content.length === 0) {
    throw new Error('Claude returned no content');
  }
  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Claude returned non-text content');
  }
  return block.text;
}

export async function segmentTranscript(
  input: SegmenterInput,
  opts: SegmenterOpts = {},
): Promise<SkillPlan> {
  const { maxSegments = 12, minLines = 5, apiKey } = opts;
  const client = new Anthropic({ apiKey });

  const normalized = normalizeTranscript(input.transcript);

  const userMessage = [
    `TITLE: ${input.title}`,
    `URL: ${input.sourceUrl}`,
    input.duration ? `DURATION: ${input.duration}` : null,
    `MAX_SEGMENTS: ${maxSegments}`,
    `MIN_LINES: ${minLines}`,
    '',
    'TRANSCRIPT (normalized; line indices refer to this exact text):',
    normalized,
  ]
    .filter((line) => line !== null)
    .join('\n');

  let rawOutput: string;
  try {
    rawOutput = await callClaude(client, SEGMENTER_SYSTEM_PROMPT, userMessage);
  } catch (err) {
    throw new SegmenterParseError(
      `Segmenter API call failed: ${(err as Error).message}`,
      '',
    );
  }

  // First parse attempt
  try {
    return parseSkillPlan(rawOutput);
  } catch {
    // Repair attempt
  }

  // Retry with repair prompt
  let repairOutput: string;
  try {
    repairOutput = await callClaude(
      client,
      SEGMENTER_REPAIR_SYSTEM_PROMPT,
      `The following output was invalid JSON. Fix it:\n\n${rawOutput}`,
    );
  } catch (err) {
    throw new SegmenterParseError(
      `Repair API call failed: ${(err as Error).message}`,
      rawOutput,
    );
  }

  try {
    return parseSkillPlan(repairOutput);
  } catch {
    throw new SegmenterParseError(
      'Failed to parse SkillPlan JSON after repair attempt',
      repairOutput,
    );
  }
}
