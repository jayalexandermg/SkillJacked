import { RawContent } from './types';
import { extractYouTube } from './youtube';
import { parseUrl } from '../utils/url-parser';

export async function extract(url: string): Promise<RawContent> {
  const parsed = parseUrl(url);

  switch (parsed.platform) {
    case 'youtube':
      return extractYouTube(parsed.videoId, parsed.url);
    default:
      throw new Error(`Unsupported platform: ${parsed.platform}`);
  }
}

export type { RawContent } from './types';
