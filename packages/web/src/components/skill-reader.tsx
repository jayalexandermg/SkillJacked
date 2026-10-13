'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import CopyButton from '@/components/copy-button';
import { classifyLines, renderFormattedLines } from '@/components/skill-lines';
import { LockIcon } from '@/components/skill-tile';
import {
  DEFAULT_TARGET,
  PRIMARY_TARGET_IDS,
  TARGETS,
  getTarget,
  installPath,
  unixInstallCommand,
  windowsInstallCommand,
  type TargetId,
} from '@/lib/install-targets';
import { skillFolderName } from '@/lib/skill-package';
import type { SkillTier } from '@/lib/jack-view';

const TARGET_KEY = 'skilljacked_target';

/** The tool the viewer installs into, remembered per browser. */
function useInstallTarget(): [TargetId, (id: TargetId) => void] {
  const [target, setTarget] = useState<TargetId>(DEFAULT_TARGET);

  useEffect(() => {
    try {
      setTarget(getTarget(localStorage.getItem(TARGET_KEY)).id);
    } catch {
      // Private mode or blocked storage: stay on the default.
    }
  }, []);

  const choose = (id: TargetId) => {
    setTarget(id);
    try {
      localStorage.setItem(TARGET_KEY, id);
    } catch {
      // Not remembered, still applied.
    }
  };

  return [target, choose];
}

function TargetTabs({ value, onChange }: { value: TargetId; onChange: (id: TargetId) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const more = TARGETS.filter((t) => !PRIMARY_TARGET_IDS.includes(t.id));
  const activeInMore = more.some((t) => t.id === value);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [moreOpen]);

  const tabClass = (active: boolean) =>
    `whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
      active ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-text-primary'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Install for">
      {PRIMARY_TARGET_IDS.map((id) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)} className={tabClass(value === id)}>
          {getTarget(id).label}
        </button>
      ))}
      <div ref={moreRef} className="relative">
        <button onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} className={tabClass(activeInMore)}>
          {activeInMore ? getTarget(value).label : 'More'} &#9662;
        </button>
        {moreOpen && (
          <div className="absolute right-0 z-20 mt-1 min-w-[8rem] rounded-lg border border-border-subtle bg-surface p-1 shadow-xl">
            {more.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onChange(t.id);
                  setMoreOpen(false);
                }}
                className="block w-full rounded-md px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface-hover"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InstallSteps({ folder, targetId }: { folder: string; targetId: TargetId }) {
  const [showCommands, setShowCommands] = useState(false);
  const target = getTarget(targetId);
  const path = installPath(target, folder);
  const zip = `${folder}.zip`;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3 text-xs text-text-secondary">
      <div className="flex flex-wrap items-center gap-2">
        <span>Goes in</span>
        <code className="min-w-0 break-all rounded border border-border-subtle bg-primary px-1.5 py-0.5 font-mono text-text-primary">
          {path}
        </code>
        <CopyButton
          text={path}
          label="Copy path"
          className="text-[11px] font-semibold text-accent hover:text-accent-hover transition-colors"
        />
      </div>
      <p className="mt-2">
        Download gives you <span className="text-text-primary">{zip}</span> with the{' '}
        <span className="text-text-primary">{folder}</span> folder inside. The folder must sit in{' '}
        <span className="text-text-primary">~/{target.folder}/</span>, not just the file. {target.runHint(folder)}
      </p>
      <button
        onClick={() => setShowCommands((s) => !s)}
        className="mt-2 text-[11px] font-semibold text-accent hover:text-accent-hover transition-colors"
      >
        {showCommands ? 'Hide' : 'Show'} one-line unzip commands
      </button>
      {showCommands && (
        <div className="mt-2 space-y-2">
          {[
            ['macOS / Linux', unixInstallCommand(target, zip)],
            ['Windows (PowerShell)', windowsInstallCommand(target, zip)],
          ].map(([label, command]) => (
            <div key={label}>
              <p className="mb-1 text-text-tertiary">{label}</p>
              <div className="flex items-stretch gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded border border-border-subtle bg-primary px-2 py-1.5 font-mono text-[11px] text-text-primary">
                  {command}
                </pre>
                <CopyButton text={command} />
              </div>
            </div>
          ))}
          <p className="text-text-tertiary">
            Safari unzips downloads for you: if you see a {folder} folder in Downloads instead of a .zip, move that folder.
          </p>
        </div>
      )}
    </div>
  );
}

// Stand-in lines for a gated skill. The real content never reaches the browser.
const PLACEHOLDER = [
  '---',
  'name: unlocked-after-sign-up',
  'description: The full skill appears here once you sign up.',
  '---',
  '',
  '# When to use',
  '- Step one of the workflow',
  '- Step two of the workflow',
  '',
  '# Instructions',
  '1. The complete procedure from the video',
  '2. With every command and check',
].join('\n');

interface SkillReaderProps {
  name: string;
  description?: string | null;
  /** Absent for a gated skill. */
  content?: string;
  tier?: SkillTier;
  /** Legacy Cursor/Windsurf rules rows: shown as-is, with no install targets. */
  legacyFilename?: string;
  actions?: ReactNode;
  /** Call to action shown over a gated skill. */
  gate?: ReactNode;
}

export default function SkillReader({ name, description, content, tier = 'full', legacyFilename, actions, gate }: SkillReaderProps) {
  const [target, setTarget] = useInstallTarget();
  const gated = content === undefined;
  const text = content ?? PLACEHOLDER;
  const lines = text.split('\n');
  const kinds = classifyLines(lines);
  const folder = skillFolderName({ slug: name, content: content ?? '' });

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-mono text-base font-semibold text-text-primary break-words sm:text-lg">{name}</h3>
          {tier !== 'full' && (
            <span className="inline-flex items-center gap-1 rounded border border-accent/40 px-1.5 py-0.5 text-[10px] font-mono text-accent">
              <LockIcon className="h-3 w-3" />
              {tier === 'preview' ? 'Preview' : 'Locked'}
            </span>
          )}
        </div>
        {tier !== 'locked' && description && <p className="mt-1.5 text-sm leading-6 text-text-secondary">{description}</p>}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}

      {!gated && !legacyFilename && (
        <div className="space-y-2">
          <TargetTabs value={target} onChange={setTarget} />
          <InstallSteps folder={folder} targetId={target} />
        </div>
      )}

      <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-code-bg">
        <div className="border-b border-border-subtle px-4 py-2 font-mono text-xs text-text-tertiary">
          {legacyFilename ?? `${folder}/SKILL.md`}
        </div>
        <pre
          className={`p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
            gated ? 'select-none blur-sm opacity-40 pointer-events-none' : ''
          }`}
          aria-hidden={gated}
        >
          {renderFormattedLines(lines, kinds)}
        </pre>
        {gated && gate && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl border border-accent/30 bg-surface/95 px-5 py-5 text-center shadow-xl">
              {gate}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
