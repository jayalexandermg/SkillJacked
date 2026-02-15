export type OutputFormat = 'claude-skill' | 'cursor-rules' | 'windsurf-rules';

export interface FormattedOutput {
  content: string;
  filename: string;
  format: OutputFormat;
}
