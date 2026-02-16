import { RawContent } from '../extractor/types';
import { StructuredSkill } from './types';
import { generateSkill } from './skill-generator';
import { type RetryOpts } from '../utils/retry';

export async function transform(rawContent: RawContent, apiKey?: string, retryOpts?: RetryOpts): Promise<StructuredSkill> {
  return generateSkill(rawContent, apiKey, retryOpts);
}

export type { StructuredSkill } from './types';
