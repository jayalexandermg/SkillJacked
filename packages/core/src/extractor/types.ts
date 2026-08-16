export interface RawContent {
  title: string;
  transcript: string;
  duration: string;
  sourceUrl: string;
  platform: 'youtube';
  transcriptMethod?:
    | 'captions' // Stage 1: native HTML/XML caption fetcher
    | 'transcript-plus' // Stage 2: youtube-transcript-plus
    | 'supadata' // Stage 3: Supadata managed API
    | 'raw' // caller-supplied transcript (manual paste path)
    | 'yt-dlp' // legacy: kept for fallbacks.ts consumers (not in the web pipeline)
    | 'whisper' // legacy: kept for fallbacks.ts consumers (not in the web pipeline)
    | 'metadata'; // legacy: kept for fallbacks.ts consumers (not in the web pipeline)
}

export interface ExtractionOptions {
  onDebug?: (msg: string) => void;
  openaiApiKey?: string;
  supadataApiKey?: string;
  skipFallbacks?: boolean;
}
