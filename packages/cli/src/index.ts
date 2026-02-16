import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command } from 'commander';
import { jackCommand } from './commands/jack';
import { ingestCommand } from './commands/ingest';
import { configCommand } from './commands/config';
import { initCommand } from './commands/init';
import { hasOnboarded } from './utils/config';
import { runWizard, isTTY, printNonInteractiveHelp } from './wizard';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

program
  .name('skilljacked')
  .description('Turn any YouTube video into a Claude Code skill')
  .version(pkg.version)
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
