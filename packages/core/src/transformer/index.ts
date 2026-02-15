import { RawContent } from '../extractor/types';
import { StructuredSkill } from './types';
import { generateSkill } from './skill-generator';

export async function transform(rawContent: RawContent, apiKey?: string): Promise<StructuredSkill> {
  return generateSkill(rawContent, apiKey);
}

export type { StructuredSkill } from './types';
