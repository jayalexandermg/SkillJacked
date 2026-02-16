import { Command } from 'commander';
import { runWizard, isTTY, printNonInteractiveHelp } from '../wizard';

export const initCommand = new Command('init')
  .description('Run the setup wizard')
  .action(async () => {
    if (!isTTY()) {
      printNonInteractiveHelp();
      process.exit(1);
    }
    await runWizard('full');
  });
