const steps = [
  {
    number: '01',
    title: 'Paste URL',
    description: 'Drop any YouTube video URL into the input field.',
  },
  {
    number: '02',
    title: 'AI Extracts',
    description: 'We pull the transcript and distill it into a structured skill.',
  },
  {
    number: '03',
    title: 'Install Skill',
    description: 'Download the file and drop it into your AI coding tool.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-16">
          How it <span className="text-accent">works</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center group">
              <div className="w-14 h-14 mx-auto mb-5 rounded-full border-2 border-border-subtle
                              flex items-center justify-center
                              group-hover:border-accent group-hover:gold-glow-subtle
                              transition-all duration-300">
                <span className="font-mono text-lg font-semibold text-accent">
                  {step.number}
                </span>
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3 text-text-primary">
                {step.title}
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
