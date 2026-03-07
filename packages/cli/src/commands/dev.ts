import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readdirSync, statSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getApiKey, configPath } from '../utils/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as { version: string };
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

export const versionCommand = new Command('version')
  .description('Print CLI version')
  .action(() => {
    console.log(`skilljacked v${getVersion()}`);
  });

function checkTool(cmd: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    exec(`${cmd} ${args.join(' ')}`, { timeout: 5000 }, (err, stdout) => {
      if (err) resolve(null);
      else resolve(stdout.trim().split('\n')[0] || 'installed');
    });
  });
}

export const doctorCommand = new Command('doctor')
  .description('Verify API key, config path, and dependencies')
  .action(async () => {
    const apiKey = getApiKey();
    const cfgPath = configPath();
    const cfgExists = existsSync(cfgPath);

    console.log('');
    console.log(chalk.bold('SkillJacked Doctor'));
    console.log('');

    if (apiKey) {
      const last4 = apiKey.slice(-4);
      const source = process.env.ANTHROPIC_API_KEY ? 'env var' : 'config file';
      console.log(`  ${chalk.green('\u2714')} API key       ***${last4} (${source})`);
    } else {
      console.log(`  ${chalk.red('\u2718')} API key       not set`);
      console.log(chalk.dim('    Fix: skilljacked config set-key sk-ant-...'));
    }

    if (cfgExists) {
      console.log(`  ${chalk.green('\u2714')} Config file   ${chalk.dim(cfgPath)}`);
    } else {
      console.log(`  ${chalk.yellow('!')} Config file   not found (will be created on first save)`);
    }

    const skillsDir = resolve('.', 'skills');
    if (existsSync(skillsDir)) {
      let packCount = 0;
      try { packCount = readdirSync(skillsDir).filter(e => { try { return statSync(join(skillsDir, e)).isDirectory(); } catch { return false; } }).length; } catch { /* ignore */ }
      console.log(`  ${chalk.green('\u2714')} Skills dir    ${chalk.dim(skillsDir)} ${chalk.dim(`(${packCount} pack${packCount !== 1 ? 's' : ''})`)}`);
    } else {
      console.log(`  ${chalk.dim('–')} Skills dir    ${chalk.dim('none yet — run skilljacked <url> to create one')}`);
    }

    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1));
    if (nodeMajor >= 18) {
      console.log(`  ${chalk.green('\u2714')} Node.js       ${nodeVersion}`);
    } else {
      console.log(`  ${chalk.red('\u2718')} Node.js       ${nodeVersion} ${chalk.red('(requires v18+)')}`);
    }

    // Optional tools for transcript fallback pipeline
    console.log('');
    console.log(chalk.bold('  Optional tools') + chalk.dim(' (for transcript fallbacks)'));

    const [ytdlp, ffmpeg, whisper] = await Promise.all([
      checkTool('yt-dlp', ['--version']),
      checkTool('ffmpeg', ['-version']),
      checkTool('whisper', ['--help']),
    ]);

    if (ytdlp) {
      console.log(`  ${chalk.green('\u2714')} yt-dlp        ${chalk.dim(ytdlp)}`);
    } else {
      console.log(`  ${chalk.dim('–')} yt-dlp        ${chalk.dim('not found (needed for subtitle/audio fallbacks)')}`);
    }

    if (ffmpeg) {
      console.log(`  ${chalk.green('\u2714')} ffmpeg        ${chalk.dim('installed')}`);
    } else {
      console.log(`  ${chalk.dim('–')} ffmpeg        ${chalk.dim('not found (needed for audio processing)')}`);
    }

    if (whisper) {
      console.log(`  ${chalk.green('\u2714')} whisper       ${chalk.dim('installed')}`);
    } else {
      console.log(`  ${chalk.dim('–')} whisper       ${chalk.dim('not found (local transcription unavailable)')}`);
    }

    console.log('');
  });

export const libraryCommand = new Command('library')
  .description('List saved skills in the current directory')
  .option('-d, --dir <path>', 'Base directory to scan for skills', '.')
  .action((opts: { dir: string }) => {
    const skillsDir = resolve(opts.dir, 'skills');

    if (!existsSync(skillsDir)) {
      try { mkdirSync(skillsDir, { recursive: true }); } catch { /* ignore */ }
      console.log('');
      console.log('  No skills saved yet.');
      console.log('');
      console.log('  Run:');
      console.log(`  ${chalk.white('skilljacked https://youtube.com/watch?v=abc123')}`);
      console.log('');
      console.log(chalk.dim('  to create your first skill.'));
      console.log('');
      return;
    }

    let entries: string[];
    try {
      entries = readdirSync(skillsDir);
    } catch {
      console.error(chalk.red(`Cannot read skills directory: ${skillsDir}`));
      return;
    }

    const packs = entries.filter(e => {
      try {
        return statSync(join(skillsDir, e)).isDirectory();
      } catch {
        return false;
      }
    });

    console.log('');
    console.log(chalk.bold('Skill Library'));
    console.log(chalk.dim(`  ${skillsDir}`));
    console.log('');

    if (packs.length === 0) {
      console.log(chalk.dim('  No skill packs found.'));
    } else {
      for (const pack of packs) {
        const packDir = join(skillsDir, pack);
        let skillCount = 0;
        try {
          skillCount = readdirSync(packDir).filter(f => f.endsWith('.md')).length;
        } catch { /* ignore */ }
        console.log(`  ${chalk.cyan(pack)}  ${chalk.dim(`${skillCount} skill${skillCount !== 1 ? 's' : ''}`)}`);
      }
    }
    console.log('');
  });

export const openCommand = new Command('open')
  .description('Open the skills folder in the OS file explorer')
  .option('-d, --dir <path>', 'Base directory containing the skills folder', '.')
  .action((opts: { dir: string }) => {
    const skillsDir = resolve(opts.dir, 'skills');
    const targetDir = existsSync(skillsDir) ? skillsDir : resolve(opts.dir);

    const platform = process.platform;
    let cmd: string;
    if (platform === 'darwin') {
      cmd = `open "${targetDir}"`;
    } else if (platform === 'win32') {
      cmd = `explorer "${targetDir}"`;
    } else {
      cmd = `xdg-open "${targetDir}"`;
    }

    exec(cmd, (err) => {
      if (err) {
        console.log('');
        console.error(chalk.red(`Could not open folder: ${targetDir}`));
        console.log(chalk.dim(`Manual path: ${targetDir}`));
        console.log('');
      }
    });

    console.log(chalk.dim(`Opening: ${targetDir}`));
  });
