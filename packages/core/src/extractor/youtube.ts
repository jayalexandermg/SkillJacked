import { YoutubeTranscript } from 'youtube-transcript';
import { RawContent } from './types';
import { ExtractionError } from '../utils/errors';

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

// --- Fix 4: Transcript word cap + oEmbed timeout ---
const OEMBED_TIMEOUT_MS = 15_000; // 15s
const MAX_TRANSCRIPT_WORDS = 50_000; // ~90 min video

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
  const [metadata, transcriptSegments] = await Promise.all([
    fetchVideoMetadata(sourceUrl),
    YoutubeTranscript.fetchTranscript(videoId).catch(() => {
      throw new ExtractionError("This video doesn't have captions. Try a different video.");
    }),
  ]);

  if (!transcriptSegments || transcriptSegments.length === 0) {
    throw new ExtractionError("This video doesn't have captions. Try a different video.");
  }

  let transcript = transcriptSegments.map((s) => s.text).join(' ');

  // Cap transcript length to prevent resource exhaustion
  const words = transcript.split(/\s+/);
  if (words.length > MAX_TRANSCRIPT_WORDS) {
    transcript = words.slice(0, MAX_TRANSCRIPT_WORDS).join(' ');
  }

  if (words.length < 100) {
    throw new ExtractionError("This video's transcript is too short to extract meaningful skills.");
  }

  const lastSegment = transcriptSegments[transcriptSegments.length - 1];
  const durationSec = Math.ceil((lastSegment.offset + lastSegment.duration) / 1000);
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
