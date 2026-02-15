import chalk from 'chalk';

export function resolveApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    console.error(chalk.red('\nError: ANTHROPIC_API_KEY is not set.\n'));
    console.error(chalk.yellow('To use SkillJack, set your Anthropic API key:\n'));
    console.error(chalk.white('  export ANTHROPIC_API_KEY=sk-ant-...'));
    console.error(chalk.dim('\nYou can get a key at: https://console.anthropic.com/\n'));
    process.exit(1);
  }

  return key;
}
