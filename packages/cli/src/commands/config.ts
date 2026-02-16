import { Command } from 'commander';
import chalk from 'chalk';
import { setApiKey, unsetApiKey, getApiKey, configPath, hasOnboarded } from '../utils/config';

export const configCommand = new Command('config')
  .description('Manage SkillJacked configuration');

configCommand
  .command('set-key <key>')
  .description('Save your Anthropic API key locally')
  .action((key: string) => {
    setApiKey(key);
    console.log(chalk.green('\u2714 API key saved locally.'));
  });

configCommand
  .command('unset-key')
  .description('Remove saved API key')
  .action(() => {
    unsetApiKey();
    console.log(chalk.green('\u2714 API key removed.'));
  });

configCommand
  .command('status')
  .description('Show current configuration')
  .action(() => {
    const key = getApiKey();
    const onboarded = hasOnboarded();
    const cfgPath = configPath();

    console.log('');
    console.log(chalk.bold('SkillJacked Config'));
    console.log('');
    if (key) {
      const last4 = key.slice(-4);
      const source = process.env.ANTHROPIC_API_KEY ? 'env' : 'config';
      console.log(`  API key:    ${chalk.green(`***${last4}`)} ${chalk.dim(`(${source})`)}`);
    } else {
      console.log(`  API key:    ${chalk.red('not set')}`);
    }
    console.log(`  Onboarded:  ${onboarded ? chalk.green('yes') : chalk.dim('no')}`);
    console.log(`  Config:     ${chalk.dim(cfgPath)}`);
    console.log('');
  });

configCommand
  .command('path')
  .description('Show config file path')
  .action(() => {
    console.log(configPath());
  });
