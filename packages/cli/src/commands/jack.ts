import { Command } from 'commander';
import chalk from 'chalk';
import {
  jackSkill,
  SkillJackError,
  TransformError,
  type OutputFormat,
  type FormattedOutput,
} from '@skilljack/core';
import { resolveApiKey } from '../utils/api-key';
import { writeSkillFile } from '../utils/file-writer';

const FORMAT_MAP: Record<string, OutputFormat> = {
  claude: 'claude-skill',
  cursor: 'cursor-rules',
  windsurf: 'windsurf-rules',
};

const SPINNER_MESSAGES = [
  'Extracting transcript...',
  'Analyzing frameworks...',
  'Distilling techniques...',
  'Formatting skill file...',
];

export const jackCommand = new Command('jack')
  .description('Turn a YouTube video into a skill file')
  .argument('<url>', 'YouTube video URL')
  .option('-f, --format <format>', 'Output format: claude, cursor, windsurf', 'claude')
  .option('-a, --all', 'Generate all formats')
  .option('--retries <n>', 'Max retries per API call', '3')
  .option('--debug', 'Show detailed error diagnostics')
  .option('-o, --output <dir>', 'Output directory', '.')
  .action(async (url: string, opts: { format: string; all?: boolean; retries: string; debug?: boolean; output: string }) => {
    const apiKey = await resolveApiKey();
    const maxRetries = parseInt(opts.retries, 10);

    if (isNaN(maxRetries) || maxRetries < 0) {
      console.error(chalk.red('--retries must be a non-negative integer'));
      process.exit(1);
    }

    // Validate format flag
    if (!opts.all && !FORMAT_MAP[opts.format]) {
      console.error(
        chalk.red(`\nUnknown format: "${opts.format}"\n`),
      );
      console.error(
        chalk.yellow(`Valid formats: ${Object.keys(FORMAT_MAP).join(', ')}\n`),
      );
      process.exit(1);
    }

    // Dynamic import for ESM-only ora
    const { default: ora } = await import('ora');
    const spinner = ora({
      text: SPINNER_MESSAGES[0],
      color: 'cyan',
    }).start();

    // Cycle through spinner messages
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % SPINNER_MESSAGES.length;
      spinner.text = SPINNER_MESSAGES[messageIndex];
    }, 3000);

    try {
      const formats: OutputFormat[] = opts.all
        ? ['claude-skill', 'cursor-rules', 'windsurf-rules']
        : [FORMAT_MAP[opts.format]];

      const writtenPaths: string[] = [];

      for (const format of formats) {
        const { formatted } = await jackSkill(url, {
          format,
          apiKey,
          maxRetries,
          onRetry: opts.debug ? (msg) => { spinner.info(chalk.dim(msg)); spinner.start(SPINNER_MESSAGES[messageIndex]); } : undefined,
        });
        const filePath = await writeSkillFile(formatted, opts.output);
        writtenPaths.push(filePath);
      }

      clearInterval(messageInterval);
      spinner.succeed(chalk.green('Skill file created!'));

      console.log('');
      for (const filePath of writtenPaths) {
        console.log(chalk.white('  ->'), chalk.cyan(filePath));
      }
      console.log('');
      console.log(chalk.dim('Add the skill file to your AI coding assistant to start using it.'));
    } catch (error) {
      clearInterval(messageInterval);

      if (error instanceof SkillJackError) {
        spinner.fail(chalk.red(formatSkillJackError(error)));
      } else if (error instanceof Error) {
        spinner.fail(chalk.red(`Unexpected error: ${error.message}`));
      } else {
        spinner.fail(chalk.red('An unknown error occurred.'));
      }

      if (opts.debug && error instanceof TransformError && error.details) {
        const d = error.details;
        console.error('');
        console.error(chalk.yellow('Debug diagnostics:'));
        console.error(chalk.dim(`  Error kind:   ${d.kind}`));
        if (d.statusCode) console.error(chalk.dim(`  Status code:  ${d.statusCode}`));
        if (d.errorType) console.error(chalk.dim(`  Error type:   ${d.errorType}`));
        if (d.detail)    console.error(chalk.dim(`  Detail:       ${d.detail}`));
        if (d.requestId) console.error(chalk.dim(`  Request ID:   ${d.requestId}`));
      } else if (opts.debug && error instanceof Error) {
        console.error('');
        console.error(chalk.yellow('Debug diagnostics:'));
        console.error(chalk.dim(`  Error class:  ${error.constructor.name}`));
        console.error(chalk.dim(`  Message:      ${error.message}`));
      }

      process.exit(1);
    }
  });

function formatSkillJackError(error: SkillJackError): string {
  switch (error.code) {
    case 'EXTRACTION_ERROR':
      return `Failed to extract video content: ${error.message}\n\n${chalk.yellow('Make sure the URL is a valid YouTube video with available captions.')}`;
    case 'TRANSFORM_ERROR':
      return `Failed to analyze content: ${error.message}\n\n${chalk.yellow('This may be a temporary issue. Try again in a moment.')}`;
    case 'VALIDATION_ERROR':
      return `Invalid input: ${error.message}`;
    default:
      return error.message;
  }
}
