export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border-subtle">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-heading text-sm font-semibold text-accent">
            SkillJacked
          </span>
          <span className="text-text-tertiary text-xs">
            Built with Claude Code
          </span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="/pricing"
            className="text-text-secondary hover:text-text-primary text-sm transition-colors duration-200"
          >
            Pricing
          </a>
          <a
            href="https://github.com/jayalexandermg/SkillJacked"
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
