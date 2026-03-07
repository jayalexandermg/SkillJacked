import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseVtt } from './vtt-parser';

type DebugFn = (msg: string) => void;

interface FallbackResult {
  transcript: string;
  duration: string;
}

function execAsync(
  cmd: string,
  args: string[],
  opts?: { timeout?: number },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: opts?.timeout ?? 120_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    await execAsync(which, [cmd], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Stage 2: Extract subtitles using yt-dlp.
 * Returns null if yt-dlp is not installed or no subtitles are available.
 */
export async function extractWithYtDlp(
  videoId: string,
  onDebug?: DebugFn,
): Promise<FallbackResult | null> {
  if (!(await commandExists('yt-dlp'))) {
    onDebug?.('yt-dlp not found, skipping subtitle extraction');
    return null;
  }

  let tmpDir: string | undefined;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'skilljacked-subs-'));
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    onDebug?.('Attempting yt-dlp subtitle extraction...');

    await execAsync('yt-dlp', [
      '--skip-download',
      '--write-auto-sub',
      '--write-sub',
      '--sub-lang', 'en',
      '--sub-format', 'vtt',
      '-o', join(tmpDir, 'subs'),
      url,
    ], { timeout: 60_000 });

    // Find the .vtt file
    const files = await readdir(tmpDir);
    const vttFile = files.find(f => f.endsWith('.vtt'));
    if (!vttFile) {
      onDebug?.('yt-dlp ran but no .vtt file produced');
      return null;
    }

    const vttContent = await readFile(join(tmpDir, vttFile), 'utf-8');
    const transcript = parseVtt(vttContent);

    if (!transcript || transcript.split(/\s+/).length < 20) {
      onDebug?.('yt-dlp subtitles too short or empty');
      return null;
    }

    // Get duration via yt-dlp
    let duration = '';
    try {
      const { stdout } = await execAsync('yt-dlp', [
        '--skip-download', '--print', 'duration', url,
      ], { timeout: 15_000 });
      const secs = parseInt(stdout.trim(), 10);
      if (!isNaN(secs)) {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        duration = `${m}:${s.toString().padStart(2, '0')}`;
      }
    } catch { /* duration is optional */ }

    onDebug?.(`yt-dlp subtitles extracted (${transcript.split(/\s+/).length} words)`);
    return { transcript, duration };
  } catch (err: any) {
    onDebug?.(`yt-dlp subtitle extraction failed: ${err.message?.substring(0, 100) ?? err}`);
    return null;
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/**
 * Stage 3: Transcribe audio using Whisper (local CLI or OpenAI API).
 * Returns null if neither is available.
 */
export async function transcribeWithWhisper(
  videoId: string,
  opts?: { openaiApiKey?: string; onDebug?: DebugFn },
): Promise<FallbackResult | null> {
  const onDebug = opts?.onDebug;

  if (!(await commandExists('yt-dlp'))) {
    onDebug?.('yt-dlp not found, cannot download audio for whisper');
    return null;
  }

  let tmpDir: string | undefined;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), 'skilljacked-whisper-'));
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const audioOut = join(tmpDir, 'audio');

    onDebug?.('Downloading audio for transcription...');
    await execAsync('yt-dlp', [
      '-f', 'bestaudio',
      '-o', audioOut + '.%(ext)s',
      url,
    ], { timeout: 120_000 });

    // Find downloaded audio file
    const files = await readdir(tmpDir);
    const audioFile = files.find(f => f.startsWith('audio.'));
    if (!audioFile) {
      onDebug?.('Audio download produced no file');
      return null;
    }
    const audioPath = join(tmpDir, audioFile);

    // Try local whisper first
    const hasLocalWhisper = await commandExists('whisper');
    if (hasLocalWhisper) {
      onDebug?.('Using local Whisper CLI for transcription...');
      try {
        await execAsync('whisper', [
          audioPath,
          '--output_format', 'txt',
          '--output_dir', tmpDir,
          '--language', 'en',
        ], { timeout: 600_000 }); // Whisper can be slow

        const txtFiles = await readdir(tmpDir);
        const txtFile = txtFiles.find(f => f.endsWith('.txt'));
        if (txtFile) {
          const transcript = (await readFile(join(tmpDir, txtFile), 'utf-8')).trim();
          if (transcript && transcript.split(/\s+/).length >= 20) {
            let duration = '';
            try {
              const { stdout } = await execAsync('yt-dlp', [
                '--skip-download', '--print', 'duration', url,
              ], { timeout: 15_000 });
              const secs = parseInt(stdout.trim(), 10);
              if (!isNaN(secs)) {
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                duration = `${m}:${s.toString().padStart(2, '0')}`;
              }
            } catch { /* duration is optional */ }
            onDebug?.(`Local whisper transcription complete (${transcript.split(/\s+/).length} words)`);
            return { transcript, duration };
          }
        }
      } catch (err: any) {
        onDebug?.(`Local whisper failed: ${err.message?.substring(0, 100) ?? err}`);
      }
    }

    // Try OpenAI Whisper API
    const openaiKey = opts?.openaiApiKey || process.env.OPENAI_API_KEY;
    if (openaiKey) {
      onDebug?.('Using OpenAI Whisper API for transcription...');
      try {
        const audioData = await readFile(audioPath);
        const formData = new FormData();
        formData.append('file', new Blob([audioData]), audioFile);
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: formData,
          signal: AbortSignal.timeout(300_000),
        });

        if (res.ok) {
          const data = (await res.json()) as { text: string };
          const transcript = data.text?.trim();
          if (transcript && transcript.split(/\s+/).length >= 20) {
            let duration = '';
            try {
              const { stdout } = await execAsync('yt-dlp', [
                '--skip-download', '--print', 'duration', url,
              ], { timeout: 15_000 });
              const secs = parseInt(stdout.trim(), 10);
              if (!isNaN(secs)) {
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                duration = `${m}:${s.toString().padStart(2, '0')}`;
              }
            } catch { /* duration is optional */ }
            onDebug?.(`OpenAI Whisper transcription complete (${transcript.split(/\s+/).length} words)`);
            return { transcript, duration };
          }
        } else {
          const errText = await res.text().catch(() => 'unknown');
          onDebug?.(`OpenAI Whisper API error: ${res.status} ${errText.substring(0, 100)}`);
        }
      } catch (err: any) {
        onDebug?.(`OpenAI Whisper API failed: ${err.message?.substring(0, 100) ?? err}`);
      }
    } else {
      onDebug?.('No local whisper or OpenAI API key available, skipping transcription');
    }

    return null;
  } catch (err: any) {
    onDebug?.(`Whisper transcription failed: ${err.message?.substring(0, 100) ?? err}`);
    return null;
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/**
 * Stage 4: Extract video metadata (title, description, chapters) as last resort.
 * Returns null only if even metadata extraction fails entirely.
 */
export async function extractMetadataFallback(
  videoId: string,
  title: string,
  onDebug?: DebugFn,
): Promise<FallbackResult | null> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // Try yt-dlp --dump-json first
  if (await commandExists('yt-dlp')) {
    onDebug?.('Attempting metadata extraction via yt-dlp...');
    try {
      const { stdout } = await execAsync('yt-dlp', [
        '--skip-download', '--dump-json', url,
      ], { timeout: 30_000 });

      const info = JSON.parse(stdout) as {
        title?: string;
        description?: string;
        duration?: number;
        chapters?: Array<{ title: string; start_time: number }>;
      };

      const parts: string[] = [];
      parts.push(`VIDEO: ${info.title || title}`);

      if (info.description) {
        parts.push(`\nDESCRIPTION:\n${info.description}`);
      }

      if (info.chapters && info.chapters.length > 0) {
        parts.push('\nCHAPTERS:');
        for (const ch of info.chapters) {
          const m = Math.floor(ch.start_time / 60);
          const s = Math.floor(ch.start_time % 60);
          parts.push(`- ${m}:${s.toString().padStart(2, '0')} ${ch.title}`);
        }
      }

      const transcript = parts.join('\n');

      let duration = '';
      if (info.duration) {
        const m = Math.floor(info.duration / 60);
        const s = Math.floor(info.duration % 60);
        duration = `${m}:${s.toString().padStart(2, '0')}`;
      }

      onDebug?.('Metadata fallback: using video description and chapters');
      return { transcript, duration };
    } catch (err: any) {
      onDebug?.(`yt-dlp metadata extraction failed: ${err.message?.substring(0, 100) ?? err}`);
    }
  }

  // Last resort: oEmbed title only
  onDebug?.('Metadata fallback: using title only (minimal content)');
  return {
    transcript: `VIDEO: ${title}\n\nNo transcript or description available. Skills will be derived from the video title only.`,
    duration: '',
  };
}
