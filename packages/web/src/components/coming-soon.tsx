const features = [
  {
    title: 'Skill Chains',
    description: 'Link multiple skills together into powerful AI workflows.',
  },
  {
    title: 'Goal-to-Chain Builder',
    description: 'Describe your goal and let AI assemble the right skill chain.',
  },
  {
    title: 'Skill Analytics',
    description: 'Track which skills you use most and how they improve your output.',
  },
];

export default function ComingSoon() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">
          What&apos;s <span className="text-accent">next</span>
        </h2>
        <p className="text-text-secondary text-center mb-16 max-w-lg mx-auto">
          We&apos;re building more ways to supercharge your AI coding workflow.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-surface border border-border-subtle rounded-lg
                         hover:border-border-focus hover:translate-y-[-2px]
                         transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <span className="text-xs font-mono text-accent-secondary bg-primary
                                 px-2 py-1 rounded border border-border-subtle">
                  Soon
                </span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-text-tertiary text-sm">
            Create a free account to save your skills and get early access.
          </p>
        </div>
      </div>
    </section>
  );
}
