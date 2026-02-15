import Anthropic from '@anthropic-ai/sdk';
import { SKILL_EXTRACTION_PROMPT } from './prompts';
import { StructuredSkill } from './types';
import { RawContent } from '../extractor/types';
import { TransformError } from '../utils/errors';

// --- Fix 4: Anthropic API timeout ---
const ANTHROPIC_TIMEOUT_MS = 60_000; // 60s

// --- Fix 2: Sanitize LLM-controlled skill name ---
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
  apiKey?: string
): Promise<StructuredSkill> {
  const client = new Anthropic({ apiKey });

  const userMessage = `Video Title: ${rawContent.title}\nVideo URL: ${rawContent.sourceUrl}\nDuration: ${rawContent.duration}\n\nFull Transcript:\n${rawContent.transcript}`;

  let response;
  try {
    response = await client.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SKILL_EXTRACTION_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS) }
    );
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    if (error.status === 429) {
      throw new TransformError('Too many requests. Please wait a moment and try again.');
    }
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new TransformError('AI extraction timed out. Please try again.');
    }
    throw new TransformError('AI extraction failed. Please try again in a moment.');
  }

  // --- Fix 4: Guard for empty content array ---
  if (!response.content || response.content.length === 0) {
    throw new TransformError('AI returned no content. Please try again.');
  }

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new TransformError('AI extraction failed. Please try again in a moment.');
  }

  const text = content.text;

  // Extract name from YAML frontmatter and sanitize
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
