import { StructuredSkill } from '../transformer/types';
import { FormattedOutput } from './types';

export function formatClaudeSkill(skill: StructuredSkill): FormattedOutput {
  return {
    content: skill.content,
    filename: `${skill.name}.md`,
    format: 'claude-skill',
  };
}
