import { getSubtitles } from 'youtube-caption-extractor';
import { RawContent, ExtractionOptions } from './types';
import { ExtractionError } from '../utils/errors';
import { extractWithYtDlp, transcribeWithWhisper, extractMetadataFallback, fetchFromSupadata } from './fallbacks';

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

const OEMBED_TIMEOUT_MS = 15_000;
const MAX_TRANSCRIPT_WORDS = 50_000;
const MIN_TRANSCRIPT_WORDS = 100;

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

  // --- Stage 1: YouTube captions via youtube-caption-extractor ---
  // Free, open-source, no API key. Fetches manual AND auto-generated (ASR)
  // caption tracks directly from YouTube -- unlike the library this
  // replaced, which only reliably surfaced manual tracks.
  try {
    onDebug?.('Stage 1: Fetching YouTube captions...');
    const subtitles = await getSubtitles({ videoID: videoId, lang: 'en' });

    if (!subtitles || subtitles.length === 0) {
      throw new Error('No captions returned');
    }

    const segments = subtitles.map((s) => ({
      text: s.text || '',
      start: parseFloat(s.start) || 0,
      duration: parseFloat(s.dur) || 0,
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

  // --- Stage 2: Supadata (managed API, ASR fallback for caption-less videos) ---
  // No-op until SUPADATA_API_KEY is set -- free tier (100 credits/mo) as of
  // writing, safety net for the auto-caption/no-caption cases Stage 1 misses.
  const supadataKey = opts?.supadataApiKey || process.env.SUPADATA_API_KEY;
  if (supadataKey) {
    onDebug?.('Stage 2: Trying Supadata...');
    const supadataResult = await fetchFromSupadata(videoId, supadataKey, onDebug);
    if (supadataResult) {
      const text = validateAndCap(supadataResult.transcript);
      if (text.split(/\s+/).length >= MIN_TRANSCRIPT_WORDS) {
        return {
          title: metadata.title,
          transcript: text,
          duration: supadataResult.duration,
          sourceUrl,
          platform: 'youtube',
          transcriptMethod: 'supadata',
        };
      }
      onDebug?.('Supadata result too short, continuing to next stage');
    }
  } else {
    onDebug?.('Stage 2: Supadata API key not configured, skipping');
  }

  // --- Stage 3: yt-dlp subtitle extraction ---
  onDebug?.('Stage 3: Trying yt-dlp subtitles...');
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

  // --- Stage 4: Whisper transcription ---
  onDebug?.('Stage 4: Trying Whisper transcription...');
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

  // --- Stage 5: Metadata fallback ---
  onDebug?.('Stage 5: Metadata fallback...');
  const metaResult = await extractMetadataFallback(videoId, metadata.title, onDebug);
  // This branch always returns a non-null object even in its worst case (a
  // title-only placeholder sentence, ~20 words) -- so it needs the same
  // minimum-substance gate every other stage already enforces. Without it,
  // a video that exhausted every real transcript source would "succeed"
  // with a couple sentences of content, and the segmenter would be asked to
  // split that into up to 10 topics -- producing 0-1 wildly inconsistent,
  // low-quality "skills" instead of a clear failure.
  if (metaResult && metaResult.transcript.split(/\s+/).length >= MIN_TRANSCRIPT_WORDS) {
    onDebug?.(`Stage 5 succeeded (${metaResult.transcript.split(/\s+/).length} words via metadata)`);
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
    supadataKey
      ? "We couldn't get a transcript for this video through any method (captions, AI transcription, or video description). It may not have enough spoken/instructional content to work with. Try a different video."
      : "This video's captions aren't accessible right now. Try a video with manually-added captions, or a video with a detailed description."
  );
}
