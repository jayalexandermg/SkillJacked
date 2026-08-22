export interface RawContent {
  title: string;
  transcript: string;
  duration: string;
  sourceUrl: string;
  platform: 'youtube';
  transcriptMethod?: 'captions' | 'supadata' | 'yt-dlp' | 'whisper' | 'metadata';
}

export interface ExtractionOptions {
  onDebug?: (msg: string) => void;
  openaiApiKey?: string;
  supadataApiKey?: string;
  skipFallbacks?: boolean;
}
