import type { ReactNode } from 'react';
import Footer from '@/components/footer';
import { LEGAL_UPDATED } from '@/lib/legal';

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-xl font-semibold text-text-primary mb-3">{title}</h2>
      <div className="space-y-3 text-text-secondary text-[15px] leading-7 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text-primary">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 pt-6 max-w-3xl mx-auto">
        <a href="/" className="font-heading text-sm text-text-secondary hover:text-text-primary transition-colors">
          &larr; SkillJacked
        </a>
      </nav>

      <article className="px-6 pt-12 pb-20 max-w-3xl mx-auto">
        <h1 className="font-heading text-4xl font-bold text-text-primary mb-2">{title}</h1>
        <p className="text-text-tertiary text-sm font-mono mb-8">Last updated {LEGAL_UPDATED}</p>
        <div className="text-text-secondary text-[15px] leading-7">{intro}</div>
        {children}
      </article>

      <Footer />
    </main>
  );
}
