interface SkillPreviewProps {
  content: string;
}

export default function SkillPreview({ content }: SkillPreviewProps) {
  const lines = content.split('\n');

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-code-bg border border-border-subtle rounded-lg overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          <div className="w-3 h-3 rounded-full bg-error opacity-60" />
          <div className="w-3 h-3 rounded-full bg-accent opacity-60" />
          <div className="w-3 h-3 rounded-full bg-success opacity-60" />
          <span className="ml-3 text-text-tertiary text-xs font-mono">skill-preview</span>
        </div>

        {/* Content */}
        <div className="p-5 max-h-96 overflow-y-auto">
          <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
            {lines.map((line, i) => {
              let className = 'text-text-secondary';

              if (line.startsWith('---')) {
                className = 'text-accent font-semibold';
              } else if (line.startsWith('#')) {
                className = 'text-accent font-semibold';
              } else if (line.startsWith('- ') || line.startsWith('* ')) {
                className = 'text-text-primary';
              } else if (line.includes(':') && !line.startsWith(' ') && lines.indexOf(line) < 10) {
                className = 'text-text-primary';
              }

              return (
                <div key={i} className={className}>
                  {line || '\u00A0'}
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    </div>
  );
}
