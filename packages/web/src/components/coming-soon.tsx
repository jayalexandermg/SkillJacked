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
          More power is on the way — here&apos;s what&apos;s coming next.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-surface border border-border-subtle rounded-lg
                         hover:-translate-y-1 hover:border-accent/50
                         hover:shadow-[0_0_12px_rgba(var(--color-accent),0.2)]
                         transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <span className="text-xs font-mono text-accent-secondary bg-primary
                                 px-2 py-1 rounded border border-border-subtle
                                 animate-[pulse-glow_2s_ease-in-out_infinite]">
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
          <p className="text-text-secondary text-sm mb-4">
            Join early. Save your skills. Shape what gets built next.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-accent text-primary font-body font-semibold
                       text-sm rounded-lg hover:bg-accent-hover hover:gold-glow
                       transition-all duration-200"
          >
            Sign Up for Early Access
          </a>
        </div>
      </div>
    </section>
  );
}
