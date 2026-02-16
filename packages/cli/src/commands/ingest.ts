import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  extract,
  segmentTranscript,
  generateSkillsFromPlan,
  writeSkillPack,
  dedupSegments,
  SkillJackError,
  TransformError,
  type RawContent,
  type SkillPlan,
} from '@skilljack/core';
import { resolveApiKey } from '../utils/api-key';

export const ingestCommand = new Command('ingest')
  .description('Segment a YouTube video into multiple skills (v2 pipeline)')
  .argument('<url>', 'YouTube video URL (used as sourceUrl even with --transcript-file)')
  .option('--multi', 'Generate skills for ALL segments (up to --max)')
  .option('--max <n>', 'Max segments to generate when --multi is used', '12')
  .option('--transcript-file <path>', 'Read transcript from a local file instead of fetching')
  .option('--concurrency <n>', 'Max concurrent API calls', '1')
  .option('--retries <n>', 'Max retries per API call', '3')
  .option('--debug', 'Show detailed error diagnostics')
  .option('-o, --output <dir>', 'Output directory', '.')
  .action(async (url: string, opts: {
    multi?: boolean;
    max: string;
    transcriptFile?: string;
    concurrency: string;
    retries: string;
    debug?: boolean;
    output: string;
  }) => {
    const apiKey = await resolveApiKey();
    const maxSegments = parseInt(opts.max, 10);
    const concurrency = parseInt(opts.concurrency, 10);
    const maxRetries = parseInt(opts.retries, 10);

    if (isNaN(maxSegments) || maxSegments < 1) {
      console.error(chalk.red('--max must be a positive integer'));
      process.exit(1);
    }

    if (maxSegments > 10) {
      console.log(chalk.yellow('Note: Higher max may increase overlap. Consider --max 10 for cleaner output.'));
    }

    if (isNaN(concurrency) || concurrency < 1) {
      console.error(chalk.red('--concurrency must be a positive integer'));
      process.exit(1);
    }

    if (isNaN(maxRetries) || maxRetries < 0) {
      console.error(chalk.red('--retries must be a non-negative integer'));
      process.exit(1);
    }

    const { default: ora } = await import('ora');
    const spinner = ora({ color: 'cyan' });

    try {
      // --- Step 1: Get transcript ---
      let rawContent: RawContent;

      if (opts.transcriptFile) {
        spinner.start('Reading transcript from file...');
        const filePath = resolve(opts.transcriptFile);
        const transcript = await readFile(filePath, 'utf-8');
        rawContent = {
          title: 'Transcript File Import',
          transcript,
          duration: '',
          sourceUrl: url,
          platform: 'youtube',
        };
        spinner.succeed('Transcript loaded from file');
      } else {
        spinner.start('Fetching transcript...');
        rawContent = await extract(url);
        spinner.succeed(`Transcript fetched: ${rawContent.title}`);
      }

      console.log('');
      console.log(chalk.bold('Video:'), rawContent.title);
      console.log(chalk.dim(rawContent.sourceUrl));
      console.log('');

      // --- Step 2: Segment ---
      spinner.start('Segmenting transcript...');
      const plan: SkillPlan = await segmentTranscript(
        {
          title: rawContent.title,
          sourceUrl: rawContent.sourceUrl,
          duration: rawContent.duration || undefined,
          transcript: rawContent.transcript,
        },
        { maxSegments, apiKey },
      );
      spinner.succeed(`Segmentation complete: ${plan.segments.length} topics found`);

      // --- Dedup ---
      const { kept, removed } = dedupSegments(plan.segments);
      plan.segments = kept;
      if (removed > 0) {
        console.log(chalk.dim(`Deduped topics: ${kept.length + removed} → ${kept.length} (removed ${removed} overlaps)`));
      }

      console.log('');
      console.log(chalk.bold('Topics found:'));
      for (const seg of plan.segments) {
        const pri = seg.priority === 1 ? chalk.green('P1') : seg.priority === 2 ? chalk.yellow('P2') : chalk.dim('P3');
        console.log(`  ${pri} ${chalk.cyan(seg.proposed_slug)} — ${seg.proposed_name}`);
      }
      console.log('');

      // --- Step 3: Generate skills ---
      const DEFAULT_PREVIEW_COUNT = 3;
      const count = opts.multi
        ? Math.min(plan.segments.length, maxSegments)
        : Math.min(plan.segments.length, DEFAULT_PREVIEW_COUNT);

      if (opts.multi) {
        console.log(chalk.cyan(`Multi mode: generating up to ${maxSegments} skill(s).`));
      } else {
        console.log(chalk.cyan(`Preview mode: generating ${count} skill(s). Use --multi --max N to generate more.`));
      }
      console.log('');
      spinner.start(`Generating ${count} skill${count > 1 ? 's' : ''}...`);
      const { skills, skipped } = await generateSkillsFromPlan(rawContent, plan, {
        apiKey,
        count,
        concurrency,
        maxRetries,
        onRetry: (msg) => {
          if (opts.debug) {
            spinner.info(chalk.dim(msg));
            spinner.start(`Generating skills...`);
          }
        },
        onSkip: (msg) => {
          spinner.warn(chalk.yellow(msg));
          spinner.start(`Generating skills...`);
        },
      });
      spinner.succeed(`Generated ${skills.length} skill${skills.length > 1 ? 's' : ''}`);

      if (skipped.length > 0) {
        console.log(chalk.yellow(`Skipped ${skipped.length} segment${skipped.length > 1 ? 's' : ''}:`));
        for (const s of skipped) {
          console.log(chalk.dim(`  - ${s.slug}: ${s.reason}`));
        }
      }

      // --- Step 4: Write to disk ---
      spinner.start('Writing files...');
      const result = await writeSkillPack(plan, skills, resolve(opts.output));
      spinner.succeed('Files written');

      console.log('');
      console.log(chalk.bold('Generated:'));
      for (const p of result.skillPaths) {
        console.log(`  ${chalk.green('SKILL')} ${p}`);
      }
      console.log(`  ${chalk.blue('INDEX')} ${result.indexPath}`);
      console.log('');
      console.log(chalk.dim(`Output directory: ${result.baseDir}`));
    } catch (error) {
      spinner.fail(
        error instanceof SkillJackError
          ? chalk.red(error.message)
          : chalk.red(`Error: ${(error as Error).message}`),
      );

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
