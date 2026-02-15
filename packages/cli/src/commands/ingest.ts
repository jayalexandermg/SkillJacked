import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  extract,
  segmentTranscript,
  generateSkillsFromPlan,
  writeSkillPack,
  SkillJackError,
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
  .option('-o, --output <dir>', 'Output directory', '.')
  .action(async (url: string, opts: {
    multi?: boolean;
    max: string;
    transcriptFile?: string;
    output: string;
  }) => {
    const apiKey = resolveApiKey();
    const maxSegments = parseInt(opts.max, 10);

    if (isNaN(maxSegments) || maxSegments < 1) {
      console.error(chalk.red('--max must be a positive integer'));
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

      console.log('');
      console.log(chalk.bold('Topics found:'));
      for (const seg of plan.segments) {
        const pri = seg.priority === 1 ? chalk.green('P1') : seg.priority === 2 ? chalk.yellow('P2') : chalk.dim('P3');
        console.log(`  ${pri} ${chalk.cyan(seg.proposed_slug)} — ${seg.proposed_name}`);
      }
      console.log('');

      // --- Step 3: Generate skills ---
      const count = opts.multi ? Math.min(plan.segments.length, maxSegments) : 1;
      spinner.start(`Generating ${count} skill${count > 1 ? 's' : ''}...`);
      const skills = await generateSkillsFromPlan(rawContent, plan, { apiKey, count });
      spinner.succeed(`Generated ${skills.length} skill${skills.length > 1 ? 's' : ''}`);

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
      process.exit(1);
    }
  });
