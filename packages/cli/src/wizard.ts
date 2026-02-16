import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import chalk from 'chalk';
import { setApiKey, getApiKey, configPath, setOnboarded } from './utils/config';

export function isTTY(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function readHidden(prompt: string): Promise<string> {
  const muted = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output: muted,
    terminal: true,
  });
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

function readLine(prompt: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function printWelcome(): void {
  console.log('');
  console.log(chalk.bold.cyan('  Welcome to SkillJacked'));
  console.log(chalk.dim('  Stop watching. Start doing.'));
  console.log('');
}

function printHowItWorks(): void {
  console.log(chalk.bold('  How it works:'));
  console.log('');
  console.log(`  ${chalk.cyan('1.')} Paste any YouTube URL`);
  console.log(`  ${chalk.cyan('2.')} AI extracts every strategy`);
  console.log(`  ${chalk.cyan('3.')} Get ready-to-use skill files ${chalk.dim('(skills/<video-slug>/...)')}`);
  console.log('');
}

async function promptApiKey(): Promise<boolean> {
  console.log(chalk.bold('  API Key Setup'));
  console.log(chalk.dim('  Get a key at: https://console.anthropic.com/'));
  console.log('');

  const key = await readHidden(chalk.white('  Anthropic API key: '));
  const trimmed = key.trim();

  if (!trimmed) {
    console.log(chalk.yellow('  Skipped. Set it later:'));
    console.log(chalk.dim(`  skilljacked config set-key sk-ant-...`));
    console.log('');
    return false;
  }

  if (!trimmed.startsWith('sk-ant-')) {
    console.log(chalk.yellow('  Warning: key doesn\'t start with "sk-ant-". Saving anyway.'));
  }

  setApiKey(trimmed);
  const last4 = trimmed.slice(-4);
  console.log(chalk.green(`  Saved (***${last4})`));
  console.log(chalk.dim(`  Config: ${configPath()}`));
  console.log('');
  return true;
}

export function printQuickstart(): void {
  console.log(chalk.bold('  Quick start:'));
  console.log('');
  console.log(chalk.white('  skilljacked ingest "<url>"'));
  console.log(chalk.dim('    Preview mode — generates top 3 skills'));
  console.log('');
  console.log(chalk.white('  skilljacked ingest "<url>" --multi --max 10'));
  console.log(chalk.dim('    Full extraction — up to 10 skills'));
  console.log('');
  console.log(chalk.white('  skilljacked ingest "<url>" --multi --max 20 --concurrency 1 --retries 4 --debug'));
  console.log(chalk.dim('    Power mode — max extraction with debug output'));
  console.log('');
  console.log(chalk.white('  skilljacked ingest "<url>" --transcript-file ./transcript.txt --multi --max 10'));
  console.log(chalk.dim('    Use a local transcript file'));
  console.log('');
  console.log(chalk.bold('  Config:'));
  console.log(chalk.dim('  skilljacked config status       Show current config'));
  console.log(chalk.dim('  skilljacked config unset-key    Remove saved API key'));
  console.log(chalk.dim('  skilljacked config path         Show config file path'));
  console.log('');
}

export function printNonInteractiveHelp(): void {
  console.log('');
  console.log(chalk.bold('SkillJacked — Stop watching. Start doing.'));
  console.log('');
  console.log('Setup:');
  console.log('  skilljacked config set-key sk-ant-...');
  console.log('  OR: export ANTHROPIC_API_KEY=sk-ant-...');
  console.log('');
  console.log('Get a key at: https://console.anthropic.com/');
  console.log('');
  console.log('Quick start:');
  console.log('  skilljacked ingest "<url>"');
  console.log('  skilljacked ingest "<url>" --multi --max 10');
  console.log('');
  console.log('Run "skilljacked --help" for all options.');
}

export async function runWizard(mode: 'full' | 'keyOnly' = 'full'): Promise<boolean> {
  if (!isTTY()) {
    printNonInteractiveHelp();
    return false;
  }

  if (mode === 'full') {
    printWelcome();

    await readLine(chalk.dim('  Press Enter to continue...'));
    console.log('');

    printHowItWorks();

    await readLine(chalk.dim('  Press Enter to continue...'));
    console.log('');
  }

  // API key screen (both full and keyOnly)
  const existingKey = getApiKey();
  let keySet = Boolean(existingKey);

  if (!existingKey) {
    keySet = await promptApiKey();
  } else {
    const last4 = existingKey.slice(-4);
    console.log(chalk.green(`  API key already configured (***${last4})`));
    console.log('');
  }

  printQuickstart();

  if (mode === 'full') {
    setOnboarded();
  }

  return keySet;
}
