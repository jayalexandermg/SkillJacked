'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

const SESSION_KEY = 'skilljack_extraction';

type AppState = 'idle' | 'loading' | 'preview' | 'error';

export default function Home() {
  const { isSignedIn } = useUser();
  const [state, setState] = useState<AppState>('idle');
  const [rawSkills, setRawSkills] = useState<SkillData[]>([]);
  const [activeSkillIndex, setActiveSkillIndex] = useState(0);
  const [format, setFormat] = useState<Format>('claude-skill');
  const [errorMessage, setErrorMessage] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const restoredRef = useRef(false);

  // Restore extraction from sessionStorage on mount (handles nav away + back, and post-signup restore)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const data = JSON.parse(saved) as SkillData[];
        if (data.length > 0) {
          setRawSkills(data);
          setState('preview');
        }
      }
    } catch {}
  }, []);

  // When user signs in after extracting anonymously, auto-save to Supabase
  useEffect(() => {
    if (!isSignedIn || rawSkills.length === 0) return;
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    // Save to Supabase
    fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skills: rawSkills.map((item) => ({
          name: item.skill.name,
          slug: item.skill.name,
          content: item.skill.content,
          source_title: item.skill.sourceTitle,
          source_url: item.skill.sourceUrl,
          format: 'claude-skill',
        })),
      }),
    })
      .then((res) => { if (!res.ok) console.error('[auto-save] Failed:', res.status); })
      .catch((err) => console.error('[auto-save] Error:', err));
  }, [isSignedIn, rawSkills]);

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

      // Persist to sessionStorage so navigation doesn't lose results
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));

      if (isSignedIn) {
        recordExtraction();
        // Save to Supabase
        fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skills: data.map((item) => ({
              name: item.skill.name,
              slug: item.skill.name,
              content: item.skill.content,
              source_title: item.skill.sourceTitle,
              source_url: item.skill.sourceUrl,
              format: 'claude-skill',
            })),
          }),
        })
          .then((res) => { if (!res.ok) console.error('[save] Failed:', res.status); })
          .catch((err) => console.error('[save] Error:', err));
      } else {
        // localStorage fallback for anon users
        data.forEach((item, i) => {
          saveSkill({
            id: `skill_${Date.now()}_${i}`,
            name: item.skill.name,
            sourceTitle: item.skill.sourceTitle,
            sourceUrl: item.skill.sourceUrl,
            generatedAt: item.skill.generatedAt,
            content: item.skill.content,
            format: 'claude-skill',
            filename: `${item.skill.name}.md`,
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
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const activeFormatted = formattedSkills[activeSkillIndex] ?? null;
  const activeRaw = rawSkills[activeSkillIndex] ?? null;

  /** Gating tier for anonymous users: 'full' | 'partial' | 'locked' */
  const getGateTier = (index: number): 'full' | 'partial' | 'locked' => {
    if (isSignedIn) return 'full';
    if (index === 0) return 'full';
    if (index <= 2) return 'partial';
    return 'locked';
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
                          (sign up to unlock all)
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {rawSkills.map((s, i) => {
                        const tier = getGateTier(i);
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveSkillIndex(i)}
                            className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all duration-200 ${
                              i === activeSkillIndex
                                ? 'bg-accent text-primary border-accent font-semibold'
                                : tier === 'locked'
                                  ? 'bg-surface text-text-tertiary border-border-subtle opacity-40'
                                  : tier === 'partial'
                                    ? 'bg-surface text-text-tertiary border-border-subtle opacity-60'
                                    : 'bg-surface text-text-secondary border-border-subtle hover:border-border-focus hover:text-text-primary'
                            }`}
                          >
                            {s.skill.name}
                            {tier === 'locked' && ' \uD83D\uDD12'}
                            {tier === 'partial' && ' \uD83D\uDD13'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Skill display based on gate tier */}
                {(() => {
                  const tier = getGateTier(activeSkillIndex);

                  if (tier === 'locked') {
                    // Fully locked: name only + heavy blur
                    return (
                      <div className="relative">
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
                              <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words blur-md select-none pointer-events-none opacity-30">
                                {activeFormatted.content.split('\n').slice(0, 12).map((line, i) => (
                                  <div key={i} className="text-text-secondary">{line || '\u00A0'}</div>
                                ))}
                              </pre>
                            </div>
                          </div>
                        </div>
                        <div className="w-full max-w-3xl mx-auto mt-6 p-6 bg-surface border border-accent/30 rounded-lg text-center">
                          <p className="text-text-primary font-heading font-semibold text-lg mb-2">
                            Sign up free to see all {rawSkills.length} skills
                          </p>
                          <p className="text-text-secondary text-sm mb-4">
                            Full access to every skill, plus download and copy.
                          </p>
                          <SignInButton mode="modal">
                            <button className="px-6 py-3 bg-accent text-primary font-body font-semibold text-sm rounded-lg hover:bg-accent-hover hover:gold-glow transition-all duration-200">
                              Sign Up Free
                            </button>
                          </SignInButton>
                        </div>
                      </div>
                    );
                  }

                  if (tier === 'partial') {
                    // Partial: name + first 3 lines visible, rest blurred
                    return (
                      <div className="relative">
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
                              <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {activeFormatted.content.split('\n').slice(0, 3).map((line, i) => (
                                  <div key={i} className="text-text-secondary">{line || '\u00A0'}</div>
                                ))}
                              </pre>
                              <div className="relative mt-2">
                                <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words blur-sm select-none pointer-events-none opacity-40">
                                  {activeFormatted.content.split('\n').slice(3, 15).map((line, i) => (
                                    <div key={i} className="text-text-secondary">{line || '\u00A0'}</div>
                                  ))}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="w-full max-w-3xl mx-auto mt-6 p-4 bg-surface border border-border-subtle rounded-lg text-center">
                          <p className="text-text-secondary text-sm mb-3">
                            Sign up to see the full skill and unlock all {rawSkills.length}
                          </p>
                          <SignInButton mode="modal">
                            <button className="px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm rounded-lg hover:bg-accent-hover hover:gold-glow transition-all duration-200">
                              Sign Up Free
                            </button>
                          </SignInButton>
                        </div>
                      </div>
                    );
                  }

                  // Full access (signed-in, or first skill for anon)
                  return (
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
                      {!isSignedIn && (
                        <div className="w-full max-w-3xl mx-auto mt-6 p-4 bg-surface border border-border-subtle rounded-lg text-center">
                          <p className="text-text-secondary text-sm mb-3">
                            Sign up to download, copy, and unlock all {rawSkills.length} skills
                          </p>
                          <SignInButton mode="modal">
                            <button className="px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm rounded-lg hover:bg-accent-hover hover:gold-glow transition-all duration-200">
                              Sign Up Free
                            </button>
                          </SignInButton>
                        </div>
                      )}
                    </>
                  );
                })()}

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
