import type { SkillTier } from '@/lib/jack-view';

interface SkillTileProps {
  name: string;
  description?: string | null;
  tier?: SkillTier;
  /** Small status chip, e.g. "In library" or "Edited". */
  badge?: string;
  selected?: boolean;
  /** Checkbox is rendered only when this is passed. */
  onToggleSelect?: () => void;
  onOpen: () => void;
}

export function LockIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export default function SkillTile({ name, description, tier = 'full', badge, selected = false, onToggleSelect, onOpen }: SkillTileProps) {
  return (
    <div
      className={`group relative flex flex-col rounded-lg border bg-surface p-4 transition-all duration-200 ${
        selected ? 'border-accent/70 shadow-[0_0_0_1px_rgba(224,200,102,0.2)]' : 'border-border-subtle hover:border-border-focus/60'
      }`}
    >
      <div className="flex items-start gap-3">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${name}`}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-accent"
          />
        )}
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="flex items-start justify-between gap-2">
            <span className="font-mono text-sm font-semibold text-text-primary break-words group-hover:text-accent transition-colors">
              {name}
            </span>
            {tier !== 'full' ? (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono ${
                  tier === 'preview' ? 'border-accent/40 text-accent' : 'border-border-subtle text-text-tertiary'
                }`}
              >
                <LockIcon className="h-3 w-3" />
                {tier === 'preview' ? 'Preview' : 'Locked'}
              </span>
            ) : (
              badge && (
                <span className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-accent">
                  {badge}
                </span>
              )
            )}
          </span>
          <span className="mt-2 block text-sm leading-6 text-text-secondary line-clamp-3">
            {tier === 'locked' ? 'Sign up free to see what this skill does.' : description || 'No description.'}
          </span>
        </button>
      </div>
    </div>
  );
}
