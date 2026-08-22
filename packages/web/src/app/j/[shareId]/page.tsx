import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SkillPreview from '@/components/skill-preview';
import Footer from '@/components/footer';
import { getSupabase } from '@/lib/supabase';
import { isValidShareId } from '@/lib/share-id';

// This route renders on demand (no generateStaticParams, and the Supabase
// client is constructed per request), so unsharing takes effect immediately.
// That is the behaviour we want: an unshared extraction still being served from
// a cache is a privacy failure, not a staleness annoyance. If this is ever made
// cacheable for SEO, the revalidate window becomes the length of time an
// unshared page stays public — weigh it accordingly.

const FORMAT_LABELS: Record<string, string> = {
  'claude-skill': 'Claude Skill',
  'cursor-rules': 'Cursor Rules',
  'windsurf-rules': 'Windsurf Rules',
};

const FORMAT_EXTENSIONS: Record<string, string> = {
  'claude-skill': 'md',
  'cursor-rules': 'cursorrules',
  'windsurf-rules': 'windsurfrules',
};

interface SharedSkill {
  name: string;
  slug: string;
  description: string | null;
  content: string;
  source_title: string | null;
  source_url: string | null;
  format: string | null;
  created_at: string;
}

/**
 * Fetch one shared extraction.
 *
 * The column list is explicit and deliberately excludes user_id, and there is
 * no join to users — the page cannot leak the extracting account's name, email,
 * or id because it never loads them. is_public is part of the filter rather
 * than something checked afterwards, so an unpublished extraction produces no
 * rows at all.
 */
async function getSharedExtraction(shareId: string): Promise<SharedSkill[] | null> {
  if (!isValidShareId(shareId)) return null;

  const { data, error } = await getSupabase()
    .from('skills')
    .select('name, slug, description, content, source_title, source_url, format, created_at')
    .eq('share_id', shareId)
    .eq('is_public', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[/j/[shareId]] query error:', error);
    return null;
  }
  if (!data || data.length === 0) return null;

  return data as SharedSkill[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const skills = await getSharedExtraction(shareId);

  if (!skills) {
    return { title: 'Not found — SkillJacked', robots: { index: false, follow: false } };
  }

  const sourceTitle = skills[0].source_title || 'a video';
  const title = `${skills.length} AI skill${skills.length === 1 ? '' : 's'} from ${sourceTitle}`;
  const names = skills.slice(0, 3).map((s) => s.name).join(', ');
  const description =
    `Executable AI skills extracted from ${sourceTitle}` +
    (names ? `: ${names}${skills.length > 3 ? ', and more' : ''}.` : '.') +
    ' Ready for Claude Code, Cursor, and Windsurf.';

  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://skilljacked.com'}/j/${shareId}`;

  return {
    title: `${title} — SkillJacked`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'SkillJacked', type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function SharedExtractionPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const skills = await getSharedExtraction(shareId);

  // A share id that does not exist, is not public, or is malformed all 404
  // identically — guessing a nearby id reveals nothing about whether it is real.
  if (!skills) notFound();

  const sourceTitle = skills[0].source_title || 'Unknown source';
  const sourceUrl = skills[0].source_url;
  const extractedOn = new Date(skills[0].created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen">
      <header className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <a href="/" className="font-heading text-lg font-bold text-text-primary">
            SkillJacked
          </a>
          <a
            href="/"
            className="px-4 py-2 bg-accent text-primary font-body font-semibold text-sm
                       rounded-lg hover:bg-accent-hover transition-all duration-200 whitespace-nowrap"
          >
            Jack your own video &rarr;
          </a>
        </div>
      </header>

      <section className="pt-12 pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em] mb-3">
            Extracted skills
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            {sourceTitle}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-body text-sm text-text-secondary">
            <span>
              {skills.length} skill{skills.length === 1 ? '' : 's'}
            </span>
            <span className="text-text-tertiary">&middot;</span>
            <span>{extractedOn}</span>
            {sourceUrl && (
              <>
                <span className="text-text-tertiary">&middot;</span>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-accent hover:text-accent-hover underline underline-offset-4 transition-colors"
                >
                  Watch the source
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto space-y-10">
          {skills.map((skill, index) => {
            const format = skill.format ?? 'claude-skill';
            return (
              <div key={`${skill.slug}-${index}`}>
                <SkillPreview
                  content={skill.content}
                  name={skill.name}
                  description={skill.description ?? ''}
                  sourceTitle={sourceTitle}
                  sourceUrl={sourceUrl ?? ''}
                  formatLabel={FORMAT_LABELS[format] ?? format}
                  filename={`${skill.slug}.${FORMAT_EXTENSIONS[format] ?? 'md'}`}
                  previewMode="partial"
                />
                <p className="max-w-3xl mx-auto mt-3 text-center font-body text-sm text-text-secondary">
                  <a
                    href="/sign-up"
                    className="text-accent hover:text-accent-hover underline underline-offset-4 transition-colors"
                  >
                    Sign up free
                  </a>{' '}
                  to see the full skills.
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto rounded-xl border border-border-subtle bg-surface p-8 text-center">
          <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">
            Turn any video into skills
          </h2>
          <p className="font-body text-text-secondary mb-6">
            Paste a YouTube URL and get executable skill files for Claude Code,
            Cursor, and Windsurf.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-accent text-primary font-body font-semibold
                       rounded-lg hover:bg-accent-hover transition-all duration-200"
          >
            Jack your own video &rarr;
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
