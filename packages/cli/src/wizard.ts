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
  console.log('');
  console.log(chalk.green('  Setup complete.'));
  console.log('');
  console.log('  Paste a YouTube URL to extract skills.');
  console.log('');
  console.log(chalk.bold('  Example:'));
  console.log(chalk.white('  skilljacked https://youtube.com/watch?v=abc123'));
  console.log('');
  console.log(chalk.dim('  Run "skilljacked commands" to see all options.'));
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
  console.log('  skilljacked https://youtube.com/watch?v=abc123');
  console.log('');
  console.log('Run "skilljacked commands" for all options.');
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
