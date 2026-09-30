import { SignUpButton } from '@clerk/nextjs';
import { FREE_EXTRACTION_LIMIT } from '@/lib/usage-tracker';

// Only list work that is actually planned. No dates, no early-access list:
// nothing here may promise more than signing up really gives.
const features = [
  {
    title: 'Skill Chains',
    description: 'Link multiple skills together into powerful AI workflows.',
  },
  {
    title: 'One-command install',
    description: 'Copy one line and the skill lands in the right folder for your agent.',
  },
  {
    title: 'Search your library',
    description: 'Find any skill you have saved by name, topic or source video.',
  },
];

export default function ComingSoon({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">
          What&apos;s <span className="text-accent">next</span>
        </h2>
        <p className="text-text-secondary text-center mb-16 max-w-lg mx-auto">
          What we&apos;re building next.
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
                  Planned
                </span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {!signedIn && (
          <div className="text-center mt-12">
            <SignUpButton mode="modal">
              <button
                className="px-6 py-3 bg-accent text-primary font-body font-semibold
                           text-sm rounded-lg hover:bg-accent-hover hover:gold-glow
                           transition-all duration-200"
              >
                Sign up free: {FREE_EXTRACTION_LIMIT} videos a month
              </button>
            </SignUpButton>
          </div>
        )}
      </div>
    </section>
  );
}
