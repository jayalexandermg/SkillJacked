import { fetchTranscript as fetchTranscriptPlus } from 'youtube-transcript-plus';
import { RawContent } from './types';
import { ExtractionError } from '../utils/errors';

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

const OEMBED_TIMEOUT_MS = 15_000;
const MAX_TRANSCRIPT_WORDS = 50_000;

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

export async function extractYouTube(videoId: string, sourceUrl: string): Promise<RawContent> {
  let metadata: { title: string };
  let transcriptSegments: Array<{ text: string; start: number; duration: number }>;

  try {
    metadata = await fetchVideoMetadata(sourceUrl);
  } catch (err) {
    throw new ExtractionError('Could not fetch video metadata. Check that the URL is valid.');
  }

  try {
    const transcript = await fetchTranscriptPlus(videoId, { lang: 'en' });

    if (!transcript || transcript.length === 0) {
      throw new ExtractionError("This video doesn't have captions. Try a different video.");
    }

    transcriptSegments = transcript.map((s: any) => ({
      text: decodeHtmlEntities(s.text || ''),
      start: typeof s.offset === 'number' ? s.offset : (s.start || 0),
      duration: typeof s.duration === 'number' ? s.duration : 0,
    }));
  } catch (err: any) {
    if (err.name === 'ExtractionError') throw err;

    const errorMsg = err.message || String(err);
    if (errorMsg.includes('No transcripts') || errorMsg.includes('not available')) {
      throw new ExtractionError("This video doesn't have captions or they are not accessible. This may be due to YouTube restrictions. Try a different video.");
    }
    throw new ExtractionError(`Failed to fetch transcript: ${errorMsg.substring(0, 100)}`);
  }

  let transcript = transcriptSegments.map((s) => s.text).join(' ');

  const words = transcript.split(/\s+/);
  if (words.length > MAX_TRANSCRIPT_WORDS) {
    transcript = words.slice(0, MAX_TRANSCRIPT_WORDS).join(' ');
  }

  if (words.length < 100) {
    throw new ExtractionError("This video's transcript is too short to extract meaningful skills.");
  }

  const lastSegment = transcriptSegments[transcriptSegments.length - 1];
  const durationSec = Math.ceil(lastSegment.start + lastSegment.duration);
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return {
    title: metadata.title,
    transcript,
    duration,
    sourceUrl,
    platform: 'youtube',
  };
}
