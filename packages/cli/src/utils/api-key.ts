import chalk from 'chalk';
import { getApiKey } from './config';
import { isTTY, runWizard, printNonInteractiveHelp } from '../wizard';

export async function resolveApiKey(): Promise<string> {
  let key = getApiKey();

  if (!key) {
    if (isTTY()) {
      console.log(chalk.yellow('\nAPI key not set. Let\'s fix that.\n'));
      await runWizard('keyOnly');
      key = getApiKey();
    } else {
      printNonInteractiveHelp();
      process.exit(1);
    }
  }

  if (!key) {
    console.error(chalk.red('\nError: API key still not set.\n'));
    console.error(chalk.yellow('Run: skilljacked config set-key sk-ant-...'));
    console.error(chalk.dim('Or:  export ANTHROPIC_API_KEY=sk-ant-...\n'));
    process.exit(1);
  }

  return key;
}
