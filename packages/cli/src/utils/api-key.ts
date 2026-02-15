import chalk from 'chalk';
import { getApiKey } from './config';

export function resolveApiKey(): string {
  const key = getApiKey();

  if (!key) {
    console.error(chalk.red('\nError: API key not set.\n'));
    console.error(chalk.yellow('Run one of the following:\n'));
    console.error(chalk.white('  skilljack config set-key sk-ant-...'));
    console.error(chalk.dim('  (saves locally, persists across sessions)\n'));
    console.error(chalk.white('  export ANTHROPIC_API_KEY=sk-ant-...'));
    console.error(chalk.dim('  (env var override, current session only)\n'));
    console.error(chalk.dim('Get a key at: https://console.anthropic.com/\n'));
    process.exit(1);
  }

  return key;
}
