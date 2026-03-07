export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border-subtle">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-heading text-sm font-semibold text-text-primary">
            SkillJacked
          </span>
          <span className="text-text-tertiary text-xs">
            Built with Claude Code
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-xs font-mono text-accent-secondary bg-surface
                           px-3 py-1 rounded border border-border-subtle">
            BridgeMind Vibeathon 2026
          </span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-text-primary text-sm transition-colors duration-200"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
