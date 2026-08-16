import { fetchTranscript } from 'youtube-transcript-plus';
import { RawContent, ExtractionOptions } from './types';
import { ExtractionError } from '../utils/errors';
import { fetchFromSupadata } from './fallbacks';
import { fetchNativeCaptions } from './native-captions';

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

const OEMBED_TIMEOUT_MS = 15_000;
export const MAX_TRANSCRIPT_WORDS = 50_000;
// Character bound (SPEC-R1 §4.H1): measured in UTF-16 code units — what
// String.prototype.length returns and what every downstream consumer of the
// string operates on. A word-only cap is evaded by whitespace-free input and
// never binds for non-space-delimited languages (CJK); this bound covers both.
export const MAX_TRANSCRIPT_UNITS = 500_000;

/**
 * Best-effort oEmbed title lookup. Throws a plain Error on failure — callers
 * on every path treat metadata failure as degradable, never fatal
 * (SPEC-R1 §4.H2-RESOLUTION).
 */
async function fetchVideoMetadata(url: string): Promise<{ title: string }> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`oEmbed returned ${res.status}`);
  }
  const data = (await res.json()) as OEmbedResponse;
  return { title: data.title };
}

/**
 * Cap a transcript at min(MAX_TRANSCRIPT_WORDS, MAX_TRANSCRIPT_UNITS) by
 * truncation, whichever bound binds first (SPEC-R1 §4.H1). This is the single
 * upper bound applied to every transcript that enters the segmentation
 * pipeline — extraction stages and the raw-transcript path both go through it.
 * Leading/trailing whitespace is trimmed before word-splitting so padding
 * can't shift the cut point (CR-S8).
 */
export function capTranscript(transcript: string): string {
  const trimmed = transcript.trim();

  // Word bound: whitespace-delimited words.
  const words = trimmed.split(/\s+/).filter(Boolean);
  let out =
    words.length > MAX_TRANSCRIPT_WORDS
      ? words.slice(0, MAX_TRANSCRIPT_WORDS).join(' ')
      : trimmed;

  // Character bound: binds for whitespace-free and CJK input the word bound
  // cannot see. Slice by code units, then back off one unit if the cut would
  // split a surrogate pair.
  if (out.length > MAX_TRANSCRIPT_UNITS) {
    out = out.slice(0, MAX_TRANSCRIPT_UNITS);
    const last = out.charCodeAt(out.length - 1);
    if (last >= 0xd800 && last <= 0xdbff) {
      out = out.slice(0, -1);
    }
  }
  return out;
}

export interface StageResult {
  transcript: string;
  duration: string;
}

export interface TranscriptStage {
  name: string;
  method: NonNullable<RawContent['transcriptMethod']>;
  run: () => Promise<StageResult | null>;
}

// Honest terminal failure (SPEC-R1 §4.A8): says what actually happened and
// points at the manual-paste escape hatch instead of pretending success.
export const EXTRACTION_FAILED_MESSAGE =
  "We couldn't retrieve this video's transcript automatically — YouTube may be blocking our server, or the video may have no usable captions. You can paste the transcript manually to generate skills anyway.";

/**
 * Stage 2: youtube-transcript-plus (SPEC-R1 §4.A2). A second, independently
 * implemented scraper path (watch page + Innertube API) that succeeds on some
 * videos/paths the native fetcher misses. Returns null on failure so the
 * pipeline falls through.
 */
// Caller-imposed timeout on the stage 2 library call (SPEC-R1 §4.H3a),
// consistent with Stage 1's 15s bounds — we don't trust the library's
// internal default.
const TRANSCRIPT_PLUS_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  }) as Promise<T>;
}

async function fetchViaTranscriptPlus(
  videoId: string,
  onDebug?: (msg: string) => void,
): Promise<StageResult | null> {
  try {
    const segments = await withTimeout(
      fetchTranscript(videoId, { lang: 'en' }),
      TRANSCRIPT_PLUS_TIMEOUT_MS,
      'youtube-transcript-plus',
    );
    if (!Array.isArray(segments) || segments.length === 0) {
      onDebug?.('youtube-transcript-plus returned no segments');
      return null;
    }

    const transcript = segments
      .map((s: { text?: string }) => (s.text ?? '').trim())
      .filter(Boolean)
      .join('\n');
    if (!transcript) {
      onDebug?.('youtube-transcript-plus returned empty text');
      return null;
    }

    const last = segments[segments.length - 1] as { offset?: number; duration?: number };
    // offset/duration are seconds in current releases; guard against a
    // milliseconds-shaped value so a unit change upstream can only distort
    // the display duration, never the transcript.
    let endSec = Math.ceil((last.offset ?? 0) + (last.duration ?? 0));
    if (endSec > 86_400) endSec = Math.ceil(endSec / 1000);
    const m = Math.floor(endSec / 60);
    const s = endSec % 60;

    onDebug?.(`youtube-transcript-plus succeeded (${transcript.split(/\s+/).length} words)`);
    return { transcript, duration: `${m}:${s.toString().padStart(2, '0')}` };
  } catch (err: any) {
    onDebug?.(`youtube-transcript-plus failed: ${err?.message?.substring(0, 100) ?? err}`);
    return null;
  }
}

/**
 * The ordered transcript pipeline (SPEC-R1 §4.A):
 *   Stage 1 — native HTML/XML caption fetcher (Node fetch only)
 *   Stage 2 — youtube-transcript-plus
 *   Stage 3 — Supadata (unchanged; env-gated on SUPADATA_API_KEY, no-op without it)
 * yt-dlp, Whisper, and the metadata fallback are intentionally NOT part of
 * this pipeline anymore; their implementations remain in fallbacks.ts for
 * possible CLI consumers (roadmap item 1 owns their proper separation).
 */
export function buildDefaultStages(
  videoId: string,
  opts?: ExtractionOptions,
): TranscriptStage[] {
  const onDebug = opts?.onDebug;
  const stages: TranscriptStage[] = [
    {
      name: 'native-captions',
      method: 'captions',
      run: () => fetchNativeCaptions(videoId, { onDebug }),
    },
    {
      name: 'youtube-transcript-plus',
      method: 'transcript-plus',
      run: () => fetchViaTranscriptPlus(videoId, onDebug),
    },
  ];

  const supadataKey = opts?.supadataApiKey || process.env.SUPADATA_API_KEY;
  if (supadataKey) {
    stages.push({
      name: 'supadata',
      method: 'supadata',
      run: () => fetchFromSupadata(videoId, supadataKey, onDebug),
    });
  }

  return stages;
}

/**
 * Run stages in order until one yields a non-empty transcript. A stage that
 * throws or returns null/empty falls through to the next. When every stage
 * fails, throws ExtractionError with an honest, user-actionable message.
 * There is deliberately no minimum-word gate (SPEC-R1 §4.A7): short
 * transcripts flow through; only the 50k-word MAX cap applies (at the caller).
 */
export async function runTranscriptStages(
  stages: TranscriptStage[],
  opts?: ExtractionOptions,
): Promise<{ result: StageResult; method: NonNullable<RawContent['transcriptMethod']> }> {
  const onDebug = opts?.onDebug;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    try {
      onDebug?.(`Stage ${i + 1}: ${stage.name}...`);
      const result = await stage.run();
      if (result && result.transcript.trim().length > 0) {
        onDebug?.(
          `Stage ${i + 1} succeeded (${result.transcript.split(/\s+/).length} words via ${stage.name})`,
        );
        return { result, method: stage.method };
      }
      onDebug?.(`Stage ${i + 1} (${stage.name}) produced no transcript`);
    } catch (err: any) {
      onDebug?.(`Stage ${i + 1} (${stage.name}) failed: ${err?.message?.substring(0, 100) ?? err}`);
    }

    if (i === 0 && opts?.skipFallbacks) {
      break;
    }
  }

  throw new ExtractionError(EXTRACTION_FAILED_MESSAGE);
}

export async function extractYouTube(
  videoId: string,
  sourceUrl: string,
  opts?: ExtractionOptions,
  stagesOverride?: TranscriptStage[],
  metadataFetcher: (url: string) => Promise<{ title: string }> = fetchVideoMetadata,
): Promise<RawContent> {
  // Best-effort title (SPEC-R1 §4.H2-RESOLUTION): oEmbed is NOT a
  // precondition for extraction. It runs from the same egress IP the caption
  // stages do, so under the exact failure mode this pipeline exists to
  // survive it would otherwise kill extraction before Supadata can run and
  // misattribute the cause to the user's URL. On failure the stage pipeline
  // runs anyway and the title degrades to the same URL-derived value the
  // raw-transcript path uses.
  let title: string;
  try {
    title = (await metadataFetcher(sourceUrl)).title;
  } catch (err: any) {
    opts?.onDebug?.(
      `oEmbed metadata failed (${err?.message?.substring(0, 100) ?? err}); using URL-derived title`,
    );
    title = `YouTube video ${videoId}`;
  }

  const stages = stagesOverride ?? buildDefaultStages(videoId, opts);
  const { result, method } = await runTranscriptStages(stages, opts);

  return {
    title,
    transcript: capTranscript(result.transcript),
    duration: result.duration,
    sourceUrl,
    platform: 'youtube',
    transcriptMethod: method,
  };
}
