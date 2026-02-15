import { StructuredSkill } from '../transformer/types';
import { FormattedOutput, OutputFormat } from './types';
import { formatClaudeSkill } from './claude-skill';
import { formatCursorRules } from './cursor-rules';
import { formatWindsurfRules } from './windsurf-rules';

export function format(skill: StructuredSkill, outputFormat: OutputFormat): FormattedOutput {
  switch (outputFormat) {
    case 'claude-skill':
      return formatClaudeSkill(skill);
    case 'cursor-rules':
      return formatCursorRules(skill);
    case 'windsurf-rules':
      return formatWindsurfRules(skill);
    default:
      throw new Error(`Unsupported format: ${outputFormat}`);
  }
}

export type { FormattedOutput, OutputFormat } from './types';
