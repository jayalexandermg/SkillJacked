export interface RawContent {
  title: string;
  transcript: string;
  duration: string;
  sourceUrl: string;
  platform: 'youtube';
  transcriptMethod?: 'captions' | 'yt-dlp' | 'whisper' | 'metadata';
}

export interface ExtractionOptions {
  onDebug?: (msg: string) => void;
  openaiApiKey?: string;
  skipFallbacks?: boolean;
}
