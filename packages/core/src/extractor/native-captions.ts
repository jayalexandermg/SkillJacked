import { ExtractionError } from '../utils/errors';

// Native YouTube caption fetcher (SPEC-R1 §4.A1).
//
// Uses only Node-native fetch: GET the watch page with browser-like headers,
// parse the embedded ytInitialPlayerResponse JSON out of the HTML, locate
// captions.playerCaptionsTracklistRenderer.captionTracks, pick the best
// English track (manual preferred over ASR), fetch the track's baseUrl XML,
// decode entities, and join the text. Every parsing step is defensive:
// missing or renamed fields throw ExtractionError — never a crash, never
// partial garbage.

type DebugFn = (msg: string) => void;

export type FetchImpl = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface NativeCaptionResult {
  transcript: string;
  duration: string;
}

export interface CaptionTrack {
  baseUrl?: string;
  languageCode?: string;
  kind?: string; // 'asr' for auto-generated tracks; absent for manual tracks
  name?: unknown;
}

const WATCH_PAGE_TIMEOUT_MS = 15_000;
const CAPTION_XML_TIMEOUT_MS = 15_000;

// A realistic desktop browser UA. YouTube serves the full watch-page HTML
// (including ytInitialPlayerResponse) to browser-like clients.
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

/**
 * Extract the ytInitialPlayerResponse JSON object from watch-page HTML.
 * Scans for the assignment marker, then walks the braces with string/escape
 * awareness so nested objects and embedded braces in strings don't break it.
 * Throws ExtractionError if the object cannot be located or parsed.
 */
export function parsePlayerResponse(html: string): Record<string, any> {
  const marker = 'ytInitialPlayerResponse';
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) {
    throw new ExtractionError(
      'Could not read video data from YouTube (player response missing).',
    );
  }

  const braceStart = html.indexOf('{', markerIdx);
  if (braceStart === -1) {
    throw new ExtractionError(
      'Could not read video data from YouTube (player response malformed).',
    );
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const jsonText = html.slice(braceStart, i + 1);
        try {
          return JSON.parse(jsonText);
        } catch {
          throw new ExtractionError(
            'Could not read video data from YouTube (player response unparseable).',
          );
        }
      }
    }
  }

  throw new ExtractionError(
    'Could not read video data from YouTube (player response truncated).',
  );
}

/**
 * Pick the best caption track: English manual > English ASR > any manual > any.
 * Throws ExtractionError when the list is empty or no track has a baseUrl.
 */
export function selectCaptionTrack(tracks: CaptionTrack[]): CaptionTrack {
  const usable = (Array.isArray(tracks) ? tracks : []).filter(
    (t) => t && typeof t.baseUrl === 'string' && t.baseUrl.length > 0,
  );
  if (usable.length === 0) {
    throw new ExtractionError('This video has no usable caption tracks.');
  }

  const isEnglish = (t: CaptionTrack) =>
    typeof t.languageCode === 'string' && t.languageCode.toLowerCase().startsWith('en');
  const isManual = (t: CaptionTrack) => t.kind !== 'asr';

  return (
    usable.find((t) => isEnglish(t) && isManual(t)) ??
    usable.find((t) => isEnglish(t)) ??
    usable.find((t) => isManual(t)) ??
    usable[0]
  );
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Parse a YouTube timedtext XML document into a transcript string plus a
 * display duration derived from the last cue. Throws ExtractionError when
 * no text cues are present.
 */
export function parseCaptionXml(xml: string): NativeCaptionResult {
  const cueRe = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  const attrRe = /(\w+)="([^"]*)"/g;

  const lines: string[] = [];
  let lastStart = 0;
  let lastDur = 0;
  let match: RegExpExecArray | null;

  while ((match = cueRe.exec(xml)) !== null) {
    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    attrRe.lastIndex = 0;
    while ((attrMatch = attrRe.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    // Cue bodies can contain entity-escaped markup; decode twice-nested
    // escapes (&amp;#39;) by decoding, stripping tags, then decoding again.
    const decoded = decodeXmlEntities(
      decodeXmlEntities(match[2]).replace(/<[^>]+>/g, ' '),
    )
      .replace(/\s+/g, ' ')
      .trim();

    if (decoded) {
      lines.push(decoded);
      lastStart = parseFloat(attrs['start'] ?? '0') || 0;
      lastDur = parseFloat(attrs['dur'] ?? '0') || 0;
    }
  }

  if (lines.length === 0) {
    throw new ExtractionError('This video\'s caption track contained no text.');
  }

  const durationSec = Math.ceil(lastStart + lastDur);
  const m = Math.floor(durationSec / 60);
  const s = durationSec % 60;

  return {
    transcript: lines.join('\n'),
    duration: `${m}:${s.toString().padStart(2, '0')}`,
  };
}

/**
 * Full native caption fetch for a video id. `fetchImpl` is injectable for
 * fixture-based tests; production callers use the global fetch.
 * Throws ExtractionError on any failure — callers treat a throw as
 * "this stage failed, try the next one".
 */
export async function fetchNativeCaptions(
  videoId: string,
  opts?: { fetchImpl?: FetchImpl; onDebug?: DebugFn },
): Promise<NativeCaptionResult> {
  const fetchImpl: FetchImpl = opts?.fetchImpl ?? (fetch as unknown as FetchImpl);
  const onDebug = opts?.onDebug;

  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const pageRes = await fetchImpl(watchUrl, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(WATCH_PAGE_TIMEOUT_MS),
  });
  if (!pageRes.ok) {
    throw new ExtractionError(
      `YouTube returned ${pageRes.status} for the video page.`,
    );
  }
  const html = await pageRes.text();

  const player = parsePlayerResponse(html);
  const tracks: CaptionTrack[] | undefined =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new ExtractionError('This video has no caption tracks available.');
  }

  const track = selectCaptionTrack(tracks);
  onDebug?.(
    `Native captions: selected track lang=${track.languageCode ?? '?'} kind=${track.kind ?? 'manual'}`,
  );

  const xmlRes = await fetchImpl(track.baseUrl as string, {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(CAPTION_XML_TIMEOUT_MS),
  });
  if (!xmlRes.ok) {
    throw new ExtractionError(
      `YouTube returned ${xmlRes.status} for the caption track.`,
    );
  }
  const xml = await xmlRes.text();

  return parseCaptionXml(xml);
}
