import { Command } from 'commander';
import chalk from 'chalk';
import { setApiKey } from '../utils/config';

export const configCommand = new Command('config')
  .description('Manage SkillJack configuration');

configCommand
  .command('set-key <key>')
  .description('Save your Anthropic API key locally')
  .action((key: string) => {
    setApiKey(key);
    console.log(chalk.green('\u2714 API key saved locally.'));
  });
