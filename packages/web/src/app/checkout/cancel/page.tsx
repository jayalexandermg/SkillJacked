import Footer from '@/components/footer';

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-xl w-full text-center">
          <p className="text-text-tertiary text-[11px] font-semibold uppercase tracking-[0.18em] mb-3 font-mono">
            No charge
          </p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Checkout canceled.
          </h1>
          <p className="text-text-secondary text-base leading-relaxed mb-10">
            You weren&apos;t charged. Your free plan is still active — come back when you&apos;re ready.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/pricing"
              className="px-6 py-3 bg-accent text-primary font-body font-semibold text-sm
                         rounded-lg hover:bg-accent-hover hover:gold-glow
                         transition-all duration-200"
            >
              See pricing
            </a>
            <a
              href="/"
              className="px-6 py-3 bg-surface border border-border-subtle text-text-primary
                         font-body font-semibold text-sm rounded-lg hover:border-border-focus
                         transition-all duration-200"
            >
              Back to home
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
