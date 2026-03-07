import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { jackCommand } from './commands/jack';
import { ingestCommand } from './commands/ingest';
import { configCommand } from './commands/config';
import { initCommand } from './commands/init';
import { versionCommand, doctorCommand, libraryCommand, openCommand } from './commands/dev';
import { hasOnboarded } from './utils/config';
import { runWizard, isTTY, printNonInteractiveHelp } from './wizard';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as { version: string };

function isUrl(s: string): boolean {
  return s.startsWith('https://') || s.startsWith('http://') || s.startsWith('www.');
}

function buildHelp(): string {
  const v = pkg.version;
  const c = chalk.cyan;
  const d = chalk.dim;
  const b = chalk.bold;

  const entry = (cmd: string, desc: string) =>
    `  ${c(cmd)}\n  ${d(desc)}`;
  const adv = (cmd: string, desc: string) =>
    `  ${d(cmd)}\n  ${d(desc)}`;

  return [
    '',
    b(`  skilljacked v${v}`) + d(' — Turn any YouTube video into a Claude Code skill'),
    '',
    b('  QUICK START'),
    '',
    `  ${chalk.white('skilljacked https://youtube.com/watch?v=abc123')}`,
    `  ${d('Extract skills from a video (multi mode, up to 10)')}`,
    '',
    b('  COMMON COMMANDS'),
    '',
    entry('skilljacked <url>', 'Extract skills (multi mode, max 10)'),
    '',
    entry('skilljacked version', 'Print CLI version'),
    '',
    entry('skilljacked doctor', 'Check API key, config, and dependencies'),
    '',
    entry('skilljacked library', 'List saved skills'),
    '',
    entry('skilljacked open', 'Open the skills folder'),
    '',
    entry('skilljacked commands', 'Show help and all commands'),
    '',
    b('  ADVANCED EXTRACTION'),
    '',
    adv('skilljacked ingest <url>', 'Preview — top 3 skills'),
    '',
    adv('skilljacked ingest <url> --multi --max 10', 'Full extraction'),
    '',
    adv('skilljacked ingest <url> --multi --max 20 --concurrency 2 --retries 4 --debug', 'Power extraction'),
    '',
    adv('skilljacked jack <url>', 'Single skill (v1 pipeline)'),
    '',
    b('  CONFIGURATION'),
    '',
    adv('skilljacked config set-key sk-ant-...', 'Save API key'),
    '',
    adv('skilljacked config status', 'Show current config'),
    '',
    adv('skilljacked config unset-key', 'Remove API key'),
    '',
    adv('skilljacked init', 'Re-run setup wizard'),
    '',
  ].join('\n');
}

const program = new Command();

program
  .name('skilljacked')
  .description('Turn any YouTube video into a Claude Code skill')
  .version(pkg.version)
  .option('--wizard', 'Force the setup wizard')
  .option('--no-wizard', 'Skip the setup wizard')
  .configureHelp({
    formatHelp: (_cmd, _helper) => buildHelp(),
  })
  .addCommand(jackCommand)
  .addCommand(ingestCommand)
  .addCommand(configCommand)
  .addCommand(initCommand)
  .addCommand(versionCommand)
  .addCommand(doctorCommand)
  .addCommand(libraryCommand)
  .addCommand(openCommand)
  .addCommand(
    new Command('commands')
      .description('Show all available commands')
      .action(() => {
        console.log(buildHelp());
      }),
  );

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

  // No command given and already onboarded — show prompt then help
  if (isNoCommand) {
    console.log('');
    console.log('  Paste a YouTube URL to extract skills.');
    console.log('');
    console.log('  Example:');
    console.log(`  ${chalk.white('skilljacked https://youtube.com/watch?v=abc123')}`);
    console.log('');
    console.log(chalk.dim('  Run "skilljacked commands" to see all options.'));
    console.log(buildHelp());
    return;
  }

  // Fast-path: first arg is a URL → route to ingest --multi --max 10
  const firstArg = args[0];
  if (firstArg && isUrl(firstArg)) {
    await program.parseAsync(['ingest', firstArg, '--multi', '--max', '10'], { from: 'user' });
    return;
  }

  await program.parseAsync();
}

main();
