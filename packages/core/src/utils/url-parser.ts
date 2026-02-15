import { ValidationError } from './errors';

export interface ParsedUrl {
  platform: 'youtube';
  videoId: string;
  url: string;
}

// --- Fix 5: Strict URL validation ---
const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);

export function parseUrl(rawUrl: string): ParsedUrl {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new ValidationError("That doesn't look like a YouTube URL. Try pasting a full video link.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ValidationError("That doesn't look like a YouTube URL. Try pasting a full video link.");
  }

  if (parsed.protocol !== 'https:') {
    throw new ValidationError('Only HTTPS YouTube URLs are supported.');
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new ValidationError("That doesn't look like a YouTube URL. Try pasting a full video link.");
  }

  let videoId: string | null = null;

  if (parsed.hostname === 'youtu.be') {
    // https://youtu.be/VIDEO_ID
    videoId = parsed.pathname.slice(1);
  } else if (parsed.pathname === '/watch') {
    // https://www.youtube.com/watch?v=VIDEO_ID
    videoId = parsed.searchParams.get('v');
  } else if (parsed.pathname.startsWith('/embed/')) {
    // https://www.youtube.com/embed/VIDEO_ID
    videoId = parsed.pathname.split('/')[2];
  } else if (parsed.pathname.startsWith('/shorts/')) {
    // https://www.youtube.com/shorts/VIDEO_ID
    videoId = parsed.pathname.split('/')[2];
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new ValidationError("Couldn't find a video ID in that URL. Try pasting a full YouTube video link.");
  }

  return {
    platform: 'youtube',
    videoId,
    url: trimmed,
  };
}
