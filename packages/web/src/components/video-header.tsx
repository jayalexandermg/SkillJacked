import { thumbnailUrl } from '@/lib/jack-view';

interface VideoHeaderProps {
  sourceTitle: string;
  sourceChannel?: string | null;
  sourceUrl?: string | null;
  videoId?: string | null;
  /** Small is the library's group header; large is the results page. */
  size?: 'sm' | 'lg';
  children?: React.ReactNode;
}

export function VideoThumb({ videoId, className }: { videoId?: string | null; className: string }) {
  if (!videoId) {
    return <div className={`${className} shrink-0 rounded-md border border-border-subtle bg-surface`} aria-hidden />;
  }
  return (
    // A plain img: next/image would proxy every thumbnail through our serverless budget.
    <img
      src={thumbnailUrl(videoId)}
      alt=""
      loading="lazy"
      className={`${className} shrink-0 rounded-md border border-border-subtle object-cover`}
    />
  );
}

export default function VideoHeader({ sourceTitle, sourceChannel, sourceUrl, videoId, size = 'lg', children }: VideoHeaderProps) {
  const large = size === 'lg';
  return (
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <VideoThumb videoId={videoId} className={large ? 'h-14 w-24 sm:h-20 sm:w-36' : 'h-10 w-16'} />
      <div className="min-w-0">
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`block font-heading font-semibold text-text-primary hover:text-accent transition-colors ${
              large ? 'text-base sm:text-lg line-clamp-2' : 'text-sm truncate'
            }`}
          >
            {sourceTitle}
          </a>
        ) : (
          <p className={`font-heading font-semibold text-text-primary ${large ? 'text-base sm:text-lg line-clamp-2' : 'text-sm truncate'}`}>
            {sourceTitle}
          </p>
        )}
        {(sourceChannel || children) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
            {sourceChannel && <span className="truncate">{sourceChannel}</span>}
            {sourceChannel && children && <span className="text-text-tertiary">&middot;</span>}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
