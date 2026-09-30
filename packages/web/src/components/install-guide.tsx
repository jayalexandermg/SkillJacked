'use client';

import { useState } from 'react';
import type { Format } from '@/lib/client-formatter';

interface InstallGuideProps {
  format: Format;
  /** The skill's folder name. Omitted on the library, where it covers any skill. */
  skillName?: string;
  className?: string;
}

const legacyInstructions: Record<Exclude<Format, 'claude-skill'>, { title: string; steps: string[] }> = {
  'cursor-rules': {
    title: 'Install for Cursor',
    steps: [
      'Download the .cursorrules file.',
      'Drop the file into your project root directory.',
      'Cursor will automatically load the rules on next session.',
    ],
  },
  'windsurf-rules': {
    title: 'Install for Windsurf',
    steps: [
      'Download the .windsurfrules file.',
      'Drop the file into your project root directory.',
      'Windsurf will pick up the rules automatically.',
    ],
  },
};

function Code({ children }: { children: string }) {
  return (
    <code className="font-mono text-[13px] text-text-primary bg-primary px-1.5 py-0.5 rounded border border-border-subtle break-all">
      {children}
    </code>
  );
}

function Command({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The command stays selectable, so a failed copy is recoverable by hand.
    }
  };

  return (
    <div className="mt-2">
      <p className="text-text-tertiary text-xs mb-1">{label}</p>
      <div className="flex items-stretch gap-2">
        <pre className="flex-1 min-w-0 overflow-x-auto font-mono text-xs text-text-primary bg-primary border border-border-subtle rounded px-3 py-2">
          {command}
        </pre>
        <button
          onClick={copy}
          className="shrink-0 px-3 text-xs font-medium text-text-primary border border-border-subtle rounded
                     hover:border-border-focus transition-all duration-200"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function ClaudeCodeSteps({ skillName }: { skillName?: string }) {
  const name = skillName ?? 'skill-name';
  const zip = skillName ? `${skillName}.zip` : 'the .zip';

  return (
    <ol className="list-decimal list-outside pl-5 space-y-4 text-text-secondary text-sm font-body">
      <li>
        Click <span className="text-text-primary">Download</span>. You get {zip}, which holds a{' '}
        <Code>{name}</Code> folder with a <Code>SKILL.md</Code> inside.
      </li>
      <li>
        Put the <Code>{name}</Code> folder in <Code>~/.claude/skills/</Code> (every project) or in{' '}
        <Code>.claude/skills/</Code> inside one project. The folder itself must be there, not just the
        file:
        <div className="mt-2">
          <Code>{`~/.claude/skills/${name}/SKILL.md`}</Code>
        </div>
        {skillName && (
          <>
            <Command
              label="macOS / Linux — unzip straight into place"
              command={`mkdir -p ~/.claude/skills && unzip -o ~/Downloads/${skillName}.zip -d ~/.claude/skills/`}
            />
            <Command
              label="Windows (PowerShell)"
              command={`Expand-Archive -Force "$HOME\\Downloads\\${skillName}.zip" "$HOME\\.claude\\skills"`}
            />
          </>
        )}
        <p className="mt-2 text-text-tertiary text-xs">
          Safari unzips downloads for you. If you see a <Code>{name}</Code> folder in Downloads instead
          of a .zip, move that folder. For a multi-skill ZIP, move every folder inside it.
        </p>
      </li>
      <li>
        Start a new Claude Code session. Type <Code>{`/${name}`}</Code> to run the skill, or just
        describe the task and Claude loads it when it&apos;s relevant.
      </li>
    </ol>
  );
}

export default function InstallGuide({
  format,
  skillName,
  className = 'w-full max-w-3xl mx-auto mt-4',
}: InstallGuideProps) {
  const [open, setOpen] = useState(false);
  const legacy = format === 'claude-skill' ? null : legacyInstructions[format];
  const title = legacy?.title ?? 'Install for Claude Code';

  return (
    <div className={className}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary
                   font-body text-sm transition-colors duration-200"
      >
        <span
          className="inline-block transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &#9656;
        </span>
        {title}
      </button>

      {open && (
        <div className="mt-3 p-4 bg-surface border border-border-subtle rounded-lg">
          {legacy ? (
            <ol className="list-decimal list-inside space-y-2">
              {legacy.steps.map((step, i) => (
                <li key={i} className="text-text-secondary text-sm font-body">
                  {step}
                </li>
              ))}
            </ol>
          ) : (
            <>
              <ClaudeCodeSteps skillName={skillName} />
              <p className="mt-4 pt-3 border-t border-border-subtle text-text-tertiary text-xs">
                No zip? Click <span className="text-text-secondary">Copy</span>, create the folder{' '}
                <Code>{`~/.claude/skills/${skillName ?? 'skill-name'}/`}</Code>, and save the text inside it as{' '}
                <Code>SKILL.md</Code>.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
