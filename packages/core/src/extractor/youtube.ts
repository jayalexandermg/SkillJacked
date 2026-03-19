import { fetchTranscript as fetchTranscriptPlus } from 'youtube-transcript-plus';
import { RawContent, ExtractionOptions } from './types';
import { ExtractionError } from '../utils/errors';
import { extractWithYtDlp, transcribeWithWhisper, extractMetadataFallback } from './fallbacks';

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

const OEMBED_TIMEOUT_MS = 15_000;
const MAX_TRANSCRIPT_WORDS = 50_000;
const MIN_TRANSCRIPT_WORDS = 100;

// HTML entity decoder
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function fetchVideoMetadata(url: string): Promise<{ title: string }> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) });
  if (!res.ok) {
    throw new ExtractionError('Could not fetch video metadata. Check that the URL is valid.');
  }
  const data = (await res.json()) as OEmbedResponse;
  return { title: data.title };
}

function validateAndCap(transcript: string): string {
  const words = transcript.split(/\s+/);
  if (words.length > MAX_TRANSCRIPT_WORDS) {
    return words.slice(0, MAX_TRANSCRIPT_WORDS).join(' ');
  }
  return transcript;
}

export async function extractYouTube(
  videoId: string,
  sourceUrl: string,
  opts?: ExtractionOptions,
): Promise<RawContent> {
  const onDebug = opts?.onDebug;

  let metadata: { title: string };
  try {
    metadata = await fetchVideoMetadata(sourceUrl);
  } catch {
    throw new ExtractionError('Could not fetch video metadata. Check that the URL is valid.');
  }

  // --- Stage 1: YouTube captions via youtube-transcript-plus ---
  try {
    onDebug?.('Stage 1: Fetching YouTube captions...');
    const transcript = await fetchTranscriptPlus(videoId, { lang: 'en' });

    if (!transcript || transcript.length === 0) {
      throw new Error('No captions returned');
    }

    const segments = transcript.map((s: any) => ({
      text: decodeHtmlEntities(s.text || ''),
      start: typeof s.offset === 'number' ? s.offset : (s.start || 0),
      duration: typeof s.duration === 'number' ? s.duration : 0,
    }));

    let text = segments.map((s) => s.text).join('\n');
    const words = text.split(/\s+/);

    if (words.length < MIN_TRANSCRIPT_WORDS) {
      throw new Error('Transcript too short');
    }

    text = validateAndCap(text);

    const lastSeg = segments[segments.length - 1];
    const durationSec = Math.ceil(lastSeg.start + lastSeg.duration);
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;

    onDebug?.(`Stage 1 succeeded (${words.length} words via captions)`);
    return {
      title: metadata.title,
      transcript: text,
      duration: `${m}:${s.toString().padStart(2, '0')}`,
      sourceUrl,
      platform: 'youtube',
      transcriptMethod: 'captions',
    };
  } catch (err: any) {
    onDebug?.(`Stage 1 failed: ${err.message?.substring(0, 100) ?? err}`);
    if (opts?.skipFallbacks) {
      const errorMsg = err.message || String(err);
      if (errorMsg.includes('No transcripts') || errorMsg.includes('not available') || errorMsg.includes('disabled')) {
        throw new ExtractionError(
          "Transcripts are disabled for this video. Try another video or provide a local transcript file:\n  skilljacked ingest <url> --transcript-file ./path/to/transcript.txt --multi --max 10"
        );
      }
      throw new ExtractionError(`Failed to fetch transcript: ${errorMsg.substring(0, 100)}`);
    }
  }

  // --- Stage 2: yt-dlp subtitle extraction ---
  onDebug?.('Stage 2: Trying yt-dlp subtitles...');
  const ytdlpResult = await extractWithYtDlp(videoId, onDebug);
  if (ytdlpResult) {
    const text = validateAndCap(ytdlpResult.transcript);
    if (text.split(/\s+/).length >= MIN_TRANSCRIPT_WORDS) {
      return {
        title: metadata.title,
        transcript: text,
        duration: ytdlpResult.duration,
        sourceUrl,
        platform: 'youtube',
        transcriptMethod: 'yt-dlp',
      };
    }
    onDebug?.('yt-dlp result too short, continuing to next stage');
  }

  // --- Stage 3: Whisper transcription ---
  onDebug?.('Stage 3: Trying Whisper transcription...');
  const whisperResult = await transcribeWithWhisper(videoId, {
    openaiApiKey: opts?.openaiApiKey,
    onDebug,
  });
  if (whisperResult) {
    const text = validateAndCap(whisperResult.transcript);
    if (text.split(/\s+/).length >= MIN_TRANSCRIPT_WORDS) {
      return {
        title: metadata.title,
        transcript: text,
        duration: whisperResult.duration,
        sourceUrl,
        platform: 'youtube',
        transcriptMethod: 'whisper',
      };
    }
    onDebug?.('Whisper result too short, continuing to metadata fallback');
  }

  // --- Stage 4: Metadata fallback ---
  onDebug?.('Stage 4: Metadata fallback...');
  const metaResult = await extractMetadataFallback(videoId, metadata.title, onDebug);
  if (metaResult) {
    return {
      title: metadata.title,
      transcript: metaResult.transcript,
      duration: metaResult.duration,
      sourceUrl,
      platform: 'youtube',
      transcriptMethod: 'metadata',
    };
  }

  throw new ExtractionError(
    'Could not obtain transcript through any method (captions, yt-dlp, whisper, or metadata).'
  );
}
