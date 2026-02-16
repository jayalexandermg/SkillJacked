import { Command } from 'commander';
import { jackCommand } from './commands/jack';
import { ingestCommand } from './commands/ingest';
import { configCommand } from './commands/config';
import { initCommand } from './commands/init';
import { hasOnboarded } from './utils/config';
import { runWizard, isTTY, printNonInteractiveHelp } from './wizard';

const program = new Command();

program
  .name('skilljacked')
  .description('Turn any YouTube video into a Claude Code skill')
  .version('0.1.0')
  .option('--wizard', 'Force the setup wizard')
  .option('--no-wizard', 'Skip the setup wizard')
  .addCommand(jackCommand)
  .addCommand(ingestCommand)
  .addCommand(configCommand)
  .addCommand(initCommand);

// Detect no-args: only the node binary and script path, no subcommand or arguments
const args = process.argv.slice(2);
const hasNoArgs = args.length === 0;
const hasOnlyGlobalFlags = args.length > 0 && args.every(a => a === '--wizard' || a === '--no-wizard');
const isNoCommand = hasNoArgs || hasOnlyGlobalFlags;

async function main() {
  const forceWizard = args.includes('--wizard');
  const skipWizard = args.includes('--no-wizard');

  // Wizard trigger: no-args and not onboarded, OR --wizard flag
  if ((isNoCommand && !hasOnboarded() && !skipWizard) || forceWizard) {
    if (!isTTY()) {
      printNonInteractiveHelp();
      process.exit(1);
    }
    await runWizard('full');
    if (isNoCommand) return;
  }

  // No command given and already onboarded — show help
  if (isNoCommand) {
    program.outputHelp();
    return;
  }

  program.parse();
}

main();
