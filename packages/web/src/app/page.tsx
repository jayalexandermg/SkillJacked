'use client';

import { useState, useCallback, useMemo } from 'react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import Hero from '@/components/hero';
import UrlInput from '@/components/url-input';
import LoadingState from '@/components/loading-state';
import SkillPreview from '@/components/skill-preview';
import DownloadBar from '@/components/download-bar';
import InstallGuide from '@/components/install-guide';
import HowItWorks from '@/components/how-it-works';
import ComingSoon from '@/components/coming-soon';
import Footer from '@/components/footer';
import { jackSkills, type SkillData } from '@/lib/api-client';
import { saveSkill } from '@/lib/storage';
import { formatSkill, type Format } from '@/lib/client-formatter';
import {
  isAtExtractionLimit,
  recordExtraction,
  getRemainingExtractions,
  FREE_EXTRACTION_LIMIT,
} from '@/lib/usage-tracker';

/** Number of skills shown in full to anonymous users */
const ANON_FULL_SKILLS = 3;

type AppState = 'idle' | 'loading' | 'preview' | 'error';

export default function Home() {
  const { isSignedIn } = useUser();
  const [state, setState] = useState<AppState>('idle');
  // Raw skill data from API (format-independent)
  const [rawSkills, setRawSkills] = useState<SkillData[]>([]);
  const [activeSkillIndex, setActiveSkillIndex] = useState(0);
  const [format, setFormat] = useState<Format>('claw-skill');
  const [errorMessage, setErrorMessage] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Derive formatted skills client-side whenever rawSkills or format changes
  const formattedSkills = useMemo(() => {
    return rawSkills.map((s) =>
      formatSkill(
        s.skill.content,
        s.skill.name,
        s.skill.sourceTitle,
        s.skill.sourceUrl,
        format,
      ),
    );
  }, [rawSkills, format]);

  const handleSubmit = useCallback(async (url: string) => {
    // Check extraction limit for signed-in free users
    if (isSignedIn && isAtExtractionLimit()) {
      setShowLimitModal(true);
      return;
    }

    setState('loading');
    setErrorMessage('');

    try {
      const data = await jackSkills(url);
      setRawSkills(data);
      setActiveSkillIndex(0);
      setState('preview');

      // Track extraction for signed-in users
      if (isSignedIn) {
        recordExtraction();
      }

      // Save skills: Supabase for signed-in users, localStorage as fallback
      if (isSignedIn) {
        const formatted = data.map((item) =>
          formatSkill(
            item.skill.content,
            item.skill.name,
            item.skill.sourceTitle,
            item.skill.sourceUrl,
            'claw-skill',
          ),
        );
        fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skills: data.map((item, i) => ({
              name: item.skill.name,
              slug: formatted[i].filename.replace(/\.[^.]+$/, ''),
              content: formatted[i].content,
              source_title: item.skill.sourceTitle,
              source_url: item.skill.sourceUrl,
              format: formatted[i].format,
            })),
          }),
        }).catch(() => {});
      } else {
        const formatted = data.map((item) =>
          formatSkill(
            item.skill.content,
            item.skill.name,
            item.skill.sourceTitle,
            item.skill.sourceUrl,
            'claw-skill',
          ),
        );
        formatted.forEach((f, i) => {
          saveSkill({
            id: `skill_${Date.now()}_${i}`,
            name: data[i].skill.name,
            sourceTitle: data[i].skill.sourceTitle,
            sourceUrl: data[i].skill.sourceUrl,
            generatedAt: data[i].skill.generatedAt,
            content: f.content,
            format: f.format,
            filename: f.filename,
          });
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setErrorMessage(message);
      setState('error');
    }
  }, [isSignedIn]);

  // Format change is now instant -- no API call, just update format state
  const handleFormatChange = useCallback((newFormat: Format) => {
    setFormat(newFormat);
  }, []);

  const handleReset = useCallback(() => {
    setState('idle');
    setRawSkills([]);
    setActiveSkillIndex(0);
    setErrorMessage('');
  }, []);

  const activeFormatted = formattedSkills[activeSkillIndex] ?? null;
  const activeRaw = rawSkills[activeSkillIndex] ?? null;

  /** Whether this skill index should be blurred for anonymous users */
  const isSkillGated = (index: number): boolean => {
    return !isSignedIn && index >= ANON_FULL_SKILLS;
  };

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <nav className="flex items-center justify-between px-6 pt-6 max-w-5xl mx-auto">
        <a href="/dashboard" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
          My Skills
        </a>
        <div className="flex items-center gap-4">
          {isSignedIn && (
            <span className="text-text-tertiary text-xs font-mono">
              {getRemainingExtractions()}/{FREE_EXTRACTION_LIMIT} extractions left
            </span>
          )}
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button
                className="px-4 py-2 bg-accent text-primary font-body font-semibold text-sm
                           rounded-lg hover:bg-accent-hover hover:gold-glow
                           transition-all duration-200"
              >
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </nav>

      {/* Hero + Tool Section */}
      <section className="pt-12 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Hero />

          <UrlInput
            onSubmit={handleSubmit}
            disabled={state === 'loading'}
          />

          {/* Extraction limit modal */}
          {showLimitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-surface border border-border-subtle rounded-lg p-8 max-w-md mx-4 text-center">
                <h3 className="font-heading text-xl font-bold text-text-primary mb-3">
                  Monthly Limit Reached
                </h3>
                <p className="text-text-secondary text-sm mb-6">
                  You&apos;ve used all {FREE_EXTRACTION_LIMIT} free extractions this month.
                  Upgrade for unlimited extractions.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    className="px-6 py-3 bg-accent text-primary font-body font-semibold text-sm
                               rounded-lg opacity-60 cursor-not-allowed"
                    disabled
                  >
                    Upgrade (Coming Soon)
                  </button>
                  <button
                    onClick={() => setShowLimitModal(false)}
                    className="text-text-secondary hover:text-text-primary text-sm
                               underline underline-offset-4 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* State machine rendering */}
          <div className="mt-10">
            {state === 'loading' && <LoadingState />}

            {state === 'error' && (
              <div className="w-full max-w-2xl mx-auto text-center py-10">
                <div className="p-6 bg-surface border border-error/30 rounded-lg">
                  <p className="text-error font-body mb-4">{errorMessage}</p>
                  <button
                    onClick={handleReset}
                    className="text-text-secondary hover:text-text-primary text-sm
                               underline underline-offset-4 transition-colors duration-200"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {state === 'preview' && activeFormatted && activeRaw && (
              <div>
                {/* Skill selector tabs */}
                {rawSkills.length > 1 && (
                  <div className="mb-6">
                    <p className="text-text-secondary text-sm mb-3 text-center">
                      {rawSkills.length} skills extracted
                      {!isSignedIn && (
                        <span className="text-accent ml-1">
                          ({ANON_FULL_SKILLS} previewed free)
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {rawSkills.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSkillIndex(i)}
                          className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all duration-200 ${
                            i === activeSkillIndex
                              ? 'bg-accent text-primary border-accent font-semibold'
                              : isSkillGated(i)
                                ? 'bg-surface text-text-tertiary border-border-subtle opacity-60'
                                : 'bg-surface text-text-secondary border-border-subtle hover:border-border-focus hover:text-text-primary'
                          }`}
                        >
                          {s.skill.name}
                          {isSkillGated(i) && ' \uD83D\uDD12'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gated skill view for anonymous users */}
                {isSkillGated(activeSkillIndex) ? (
                  <div className="relative">
                    {/* Show skill name and teaser */}
                    <div className="w-full max-w-3xl mx-auto">
                      <div className="bg-code-bg border border-border-subtle rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
                          <div className="w-3 h-3 rounded-full bg-error opacity-60" />
                          <div className="w-3 h-3 rounded-full bg-accent opacity-60" />
                          <div className="w-3 h-3 rounded-full bg-success opacity-60" />
                          <span className="ml-3 text-text-tertiary text-xs font-mono">
                            {activeRaw.skill.name}
                          </span>
                        </div>
                        <div className="p-5">
                          {/* Show first 3 lines clearly */}
                          <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {activeFormatted.content
                              .split('\n')
                              .slice(0, 3)
                              .map((line, i) => (
                                <div key={i} className="text-text-secondary">
                                  {line || '\u00A0'}
                                </div>
                              ))}
                          </pre>
                          {/* Blurred section */}
                          <div className="relative mt-2">
                            <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words blur-sm select-none pointer-events-none opacity-40">
                              {activeFormatted.content
                                .split('\n')
                                .slice(3, 15)
                                .map((line, i) => (
                                  <div key={i} className="text-text-secondary">
                                    {line || '\u00A0'}
                                  </div>
                                ))}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CTA overlay */}
                    <div className="w-full max-w-3xl mx-auto mt-6 p-6 bg-surface border border-accent/30 rounded-lg text-center">
                      <p className="text-text-primary font-heading font-semibold text-lg mb-2">
                        Sign up free to see all {rawSkills.length} skills
                      </p>
                      <p className="text-text-secondary text-sm mb-4">
                        Get full access to every extracted skill, plus download and copy.
                      </p>
                      <SignInButton mode="modal">
                        <button
                          className="px-6 py-3 bg-accent text-primary font-body font-semibold text-sm
                                     rounded-lg hover:bg-accent-hover hover:gold-glow
                                     transition-all duration-200"
                        >
                          Sign Up Free
                        </button>
                      </SignInButton>
                    </div>
                  </div>
                ) : (
                  <>
                    <SkillPreview content={activeFormatted.content} />
                    <DownloadBar
                      content={activeFormatted.content}
                      filename={activeFormatted.filename}
                      format={format}
                      onFormatChange={handleFormatChange}
                      hideActions={!isSignedIn}
                    />
                    {isSignedIn && <InstallGuide format={format} />}
                  </>
                )}

                {/* Anonymous user: show sign-up CTA below ungated skills too */}
                {!isSignedIn && !isSkillGated(activeSkillIndex) && (
                  <div className="w-full max-w-3xl mx-auto mt-6 p-4 bg-surface border border-border-subtle rounded-lg text-center">
                    <p className="text-text-secondary text-sm mb-3">
                      Sign up to download, copy, and unlock all {rawSkills.length} skills
                    </p>
                    <SignInButton mode="modal">
                      <button
                        className="px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm
                                   rounded-lg hover:bg-accent-hover hover:gold-glow
                                   transition-all duration-200"
                      >
                        Sign Up Free
                      </button>
                    </SignInButton>
                  </div>
                )}

                <div className="text-center mt-8">
                  <button
                    onClick={handleReset}
                    className="text-text-secondary hover:text-text-primary text-sm
                               underline underline-offset-4 transition-colors duration-200"
                  >
                    Jack another skill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto border-t border-border-subtle" />

      {/* How It Works */}
      <HowItWorks />

      {/* Divider */}
      <div className="max-w-5xl mx-auto border-t border-border-subtle" />

      {/* Coming Soon */}
      <ComingSoon />

      {/* Footer */}
      <Footer />
    </main>
  );
}
