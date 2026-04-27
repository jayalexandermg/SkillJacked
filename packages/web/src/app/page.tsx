'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { FREE_EXTRACTION_LIMIT } from '@/lib/usage-tracker';
import {
  clearStoredExtraction,
  getStoredExtraction,
  hasPendingAnonymousExtraction,
  setStoredExtraction,
} from '@/lib/client-skill-store';

type AppState = 'idle' | 'loading' | 'preview' | 'error';
type SkillTier = 'full' | 'partial' | 'locked';

interface UsageInfo {
  used: number;
  limit: number;
  tier: string;
  remaining: number;
}

const formatLabels: Record<Format, string> = {
  'claude-skill': 'Claude Skill',
  'cursor-rules': 'Cursor Rules',
  'windsurf-rules': 'Windsurf Rules',
};

function getGateTier(index: number, isSignedIn: boolean): SkillTier {
  if (isSignedIn) return 'full';
  if (index === 0) return 'full';
  if (index <= 2) return 'partial';
  return 'locked';
}

function getSkillDescription(content: string): string {
  const match = content.match(/^description:\s*(.+)$/m);
  if (!match) {
    return 'AI skill extracted from this video.';
  }

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function buildSkillSavePayload(skills: SkillData[]) {
  return skills.map((item) => ({
    name: item.skill.name,
    slug: item.skill.name,
    content: item.skill.content,
    source_title: item.skill.sourceTitle,
    source_url: item.skill.sourceUrl,
    format: 'claude-skill',
  }));
}

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const signedIn = isSignedIn === true;

  const [state, setState] = useState<AppState>('idle');
  const [rawSkills, setRawSkills] = useState<SkillData[]>([]);
  const [activeSkillIndex, setActiveSkillIndex] = useState(0);
  const [format, setFormat] = useState<Format>('claude-skill');
  const [errorMessage, setErrorMessage] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [upgradeBanner, setUpgradeBanner] = useState(false);
  useEffect(() => {
    const restoredSkills = getStoredExtraction();

    if (restoredSkills.length > 0) {
      setRawSkills(restoredSkills);
      setState('preview');
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const data = (await res.json()) as UsageInfo;
        setUsage(data);
      }
    } catch {
      // Silent fail. The extraction flow should still work.
    }
  }, []);

  const saveSkillsToApi = useCallback(async (skills: SkillData[]) => {
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills: buildSkillSavePayload(skills) }),
    });

    if (!res.ok) {
      throw new Error(`Failed to save skills: ${res.status}`);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (signedIn) {
      void fetchUsage();
      return;
    }

    setUsage(null);
  }, [fetchUsage, isLoaded, signedIn]);

  useEffect(() => {
    if (!isLoaded || !signedIn || rawSkills.length === 0) return;
    if (!hasPendingAnonymousExtraction()) return;

    void saveSkillsToApi(rawSkills)
      .then(() => {
        setStoredExtraction(rawSkills, { pendingAnonymousImport: false });
        void fetchUsage();
      })
      .catch((err) => console.error('[auto-save] Error:', err));
  }, [fetchUsage, isLoaded, rawSkills, saveSkillsToApi, signedIn]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') !== '1') return;

    setUpgradeBanner(true);
    window.history.replaceState({}, '', '/');

    if (signedIn) {
      void fetchUsage();
    }

    const timer = setTimeout(() => setUpgradeBanner(false), 5000);
    return () => clearTimeout(timer);
  }, [fetchUsage, signedIn]);

  useEffect(() => {
    if (rawSkills.length === 0) return;
    if (activeSkillIndex < rawSkills.length) return;

    setActiveSkillIndex(0);
  }, [activeSkillIndex, rawSkills.length]);

  const formattedSkills = useMemo(() => {
    return rawSkills.map((skill) =>
      formatSkill(
        skill.skill.content,
        skill.skill.name,
        skill.skill.sourceTitle,
        skill.skill.sourceUrl,
        format,
      ),
    );
  }, [format, rawSkills]);

  const displaySkills = useMemo(() => {
    return rawSkills.map((skill, index) => ({
      raw: skill,
      formatted: formattedSkills[index],
      tier: getGateTier(index, signedIn),
      description: getSkillDescription(skill.skill.content),
    }));
  }, [formattedSkills, rawSkills, signedIn]);

  const fullSkillsCount = rawSkills.length;
  const activeDisplaySkill =
    displaySkills[Math.min(activeSkillIndex, Math.max(displaySkills.length - 1, 0))] ?? null;
  const gatedOverlayMessage =
    !signedIn && activeDisplaySkill
      ? activeDisplaySkill.tier === 'partial'
        ? `Sign up free to see the full skill and unlock all ${fullSkillsCount}`
        : activeDisplaySkill.tier === 'locked'
          ? `Sign up free to unlock all ${fullSkillsCount} skills`
          : null
      : null;

  const handleSubmit = useCallback(async (url: string) => {
    if (signedIn && usage?.tier !== 'pro' && usage?.remaining === 0) {
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
      setStoredExtraction(data, { pendingAnonymousImport: !signedIn });

      if (signedIn) {
        void saveSkillsToApi(data)
          .then(() => fetchUsage())
          .catch((err) => console.error('[save] Error:', err));
      } else {
        data.forEach((item, index) => {
          saveSkill({
            id: `skill_${Date.now()}_${index}`,
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
  }, [fetchUsage, saveSkillsToApi, signedIn, usage?.remaining, usage?.tier]);

  const handleFormatChange = useCallback((newFormat: Format) => {
    setFormat(newFormat);
  }, []);

  const handleReset = useCallback(() => {
    setState('idle');
    setRawSkills([]);
    setActiveSkillIndex(0);
    setErrorMessage('');
    clearStoredExtraction();
  }, []);

  return (
    <main className="min-h-screen">
      {upgradeBanner && (
        <div className="bg-success/20 border-b border-success/40 px-6 py-3 text-center">
          <p className="text-success text-sm font-medium">
            Welcome to Pro! You now have 50 extractions/month.
          </p>
        </div>
      )}

      <nav className="flex items-center justify-between px-6 pt-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-5">
          <a href="/dashboard" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
            My Skills
          </a>
          <a href="/pricing" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-4">
          {signedIn && usage && (
            usage.tier === 'pro' ? (
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-accent/20 text-accent">
                Pro
              </span>
            ) : (
              <>
                <span className="text-text-tertiary text-xs font-mono">
                  {usage.remaining}/{usage.limit} extractions left
                </span>
                <button
                  onClick={async () => {
                    setCheckoutLoading(true);
                    try {
                      const res = await fetch('/api/checkout', { method: 'POST' });
                      if (res.ok) {
                        const { url } = await res.json();
                        window.location.href = url;
                      } else {
                        console.error('[checkout] Failed:', res.status);
                        setCheckoutLoading(false);
                      }
                    } catch (err) {
                      console.error('[checkout] Error:', err);
                      setCheckoutLoading(false);
                    }
                  }}
                  disabled={checkoutLoading}
                  className={`px-3 py-1.5 bg-accent text-primary font-body font-semibold text-xs
                             rounded-lg hover:bg-accent-hover hover:gold-glow
                             transition-all duration-200
                             ${checkoutLoading ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {checkoutLoading ? 'Redirecting...' : 'Upgrade to Pro'}
                </button>
              </>
            )
          )}
          {signedIn ? (
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

      <section className="pt-12 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Hero />

          <UrlInput
            onSubmit={handleSubmit}
            disabled={state === 'loading'}
          />

          {showLimitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-surface border border-border-subtle rounded-lg p-8 max-w-md mx-4 text-center">
                <h3 className="font-heading text-xl font-bold text-text-primary mb-3">
                  Monthly Limit Reached
                </h3>
                <p className="text-text-secondary text-sm mb-6">
                  You&apos;ve used all {usage?.limit ?? FREE_EXTRACTION_LIMIT} free extractions this month.
                  Upgrade to Pro for 50 extractions/month.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      setCheckoutLoading(true);
                      try {
                        const res = await fetch('/api/checkout', { method: 'POST' });
                        if (res.ok) {
                          const { url } = await res.json();
                          window.location.href = url;
                        } else {
                          console.error('[checkout] Failed:', res.status);
                          setCheckoutLoading(false);
                        }
                      } catch (err) {
                        console.error('[checkout] Error:', err);
                        setCheckoutLoading(false);
                      }
                    }}
                    disabled={checkoutLoading}
                    className={`px-6 py-3 bg-accent text-primary font-body font-semibold text-sm
                               rounded-lg hover:bg-accent-hover hover:gold-glow
                               transition-all duration-200 ${checkoutLoading ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    {checkoutLoading ? 'Redirecting...' : 'Upgrade to Pro'}
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

            {state === 'preview' && activeDisplaySkill && (
              <div>
                <div className="mb-8">
                  <p className="text-text-secondary text-sm mb-4 text-center">
                    {fullSkillsCount} skills extracted
                    {!signedIn && (
                      <SignInButton mode="modal">
                        <button
                          type="button"
                          className="text-accent ml-1 inline underline-offset-4 transition-all duration-200 hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:underline"
                        >
                          (sign up to unlock them all)
                        </button>
                      </SignInButton>
                    )}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displaySkills.map((skill, index) => {
                      const isActive = index === activeSkillIndex;
                      const blurClass =
                        skill.tier === 'locked'
                          ? 'blur-sm opacity-35 select-none'
                          : skill.tier === 'partial'
                            ? 'blur-[1px] opacity-75 select-none'
                            : '';

                      return (
                        <button
                          key={`${skill.raw.skill.name}-${index}`}
                          onClick={() => setActiveSkillIndex(index)}
                          className={`text-left p-5 rounded-lg border transition-all duration-200 ${
                            isActive
                              ? 'border-accent bg-surface shadow-[0_0_0_1px_rgba(224,200,102,0.25)]'
                              : 'border-border-subtle bg-surface hover:border-border-focus'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em] mb-2">
                                Skill {index + 1}
                              </p>
                              <h3 className="font-heading text-base font-semibold text-text-primary break-words">
                                {skill.raw.skill.name}
                              </h3>
                            </div>
                            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                              skill.tier === 'full'
                                ? 'border-success/40 text-success'
                                : skill.tier === 'partial'
                                  ? 'border-accent/40 text-accent'
                                  : 'border-border-subtle text-text-tertiary'
                            }`}>
                              {skill.tier === 'full' ? 'Open' : skill.tier === 'partial' ? 'Preview' : 'Locked'}
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div>
                              <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em] mb-1">
                                Description
                              </p>
                              <p className={`text-sm leading-6 text-text-secondary break-words ${blurClass}`}>
                                {skill.description}
                              </p>
                            </div>

                            <div>
                              <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.18em] mb-1">
                                Source
                              </p>
                              <p className={`text-sm leading-6 text-text-secondary break-words ${blurClass}`}>
                                {skill.raw.skill.sourceTitle || 'Unknown source'}
                              </p>
                            </div>
                          </div>

                          {skill.tier !== 'full' && (
                            <p className="mt-4 text-xs text-text-tertiary">
                              {skill.tier === 'partial'
                                ? 'Sign up to reveal the full skill and actions.'
                                : 'This skill stays locked until you sign up.'}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <SkillPreview
                  content={activeDisplaySkill.formatted.content}
                  name={activeDisplaySkill.raw.skill.name}
                  description={activeDisplaySkill.description}
                  sourceTitle={activeDisplaySkill.raw.skill.sourceTitle || 'Unknown source'}
                  sourceUrl={activeDisplaySkill.raw.skill.sourceUrl}
                  formatLabel={formatLabels[format]}
                  filename={activeDisplaySkill.formatted.filename}
                  overlay={gatedOverlayMessage ? (
                    <>
                      <p className="text-text-primary font-heading font-semibold text-lg leading-7">
                        {gatedOverlayMessage}
                      </p>
                      <div className="mt-4 flex justify-center">
                        <SignInButton mode="modal">
                          <button className="px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm rounded-lg hover:bg-accent-hover hover:gold-glow transition-all duration-200">
                            Sign Up Free
                          </button>
                        </SignInButton>
                      </div>
                    </>
                  ) : null}
                  previewMode={activeDisplaySkill.tier}
                />

                {activeDisplaySkill.tier === 'full' ? (
                  <>
                    <DownloadBar
                      content={activeDisplaySkill.formatted.content}
                      filename={activeDisplaySkill.formatted.filename}
                      format={format}
                      onFormatChange={handleFormatChange}
                      hideActions={!signedIn}
                    />
                    {signedIn && <InstallGuide format={format} />}
                    {!signedIn && (
                      <div className="w-full max-w-3xl mx-auto mt-6 p-4 bg-surface border border-border-subtle rounded-lg text-center">
                        <p className="text-text-secondary text-sm mb-3">
                          Sign up to download, copy, and unlock all {fullSkillsCount} skills
                        </p>
                        <SignInButton mode="modal">
                          <button className="px-5 py-2.5 bg-accent text-primary font-body font-semibold text-sm rounded-lg hover:bg-accent-hover hover:gold-glow transition-all duration-200">
                            Sign Up Free
                          </button>
                        </SignInButton>
                      </div>
                    )}
                  </>
                ) : null}

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

      <div className="max-w-5xl mx-auto border-t border-border-subtle" />

      <HowItWorks />

      <div className="max-w-5xl mx-auto border-t border-border-subtle" />

      <ComingSoon />

      <Footer />
    </main>
  );
}
