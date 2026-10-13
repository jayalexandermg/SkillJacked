'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import Hero from '@/components/hero';
import UrlInput from '@/components/url-input';
import LoadingState from '@/components/loading-state';
import JackResults from '@/components/jack-results';
import HowItWorks from '@/components/how-it-works';
import ComingSoon from '@/components/coming-soon';
import Footer from '@/components/footer';
import { ApiError, claimJack, getJack, runJack, saveJackSkills } from '@/lib/api-client';
import { clearStoredJack, getStoredJack, setStoredJack, type StoredJack } from '@/lib/jack-session';
import { FREE_EXTRACTION_LIMIT, PRO_EXTRACTION_LIMIT, videosLeft } from '@/lib/usage-tracker';

type AppState = 'idle' | 'loading' | 'results' | 'error';

interface UsageInfo {
  used: number;
  limit: number;
  tier: string;
  remaining: number;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const signedIn = isSignedIn === true;

  const [state, setState] = useState<AppState>('idle');
  const [current, setCurrent] = useState<StoredJack | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  // Jacks already unlocked (or tried) this session, so a failed claim can't loop.
  const unlockAttempted = useRef(new Set<string>());

  const show = useCallback((next: StoredJack | null) => {
    setCurrent(next);
    if (next) setStoredJack(next);
    else clearStoredJack();
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage');
      if (res.ok) setUsage((await res.json()) as UsageInfo);
    } catch {
      // Silent fail. The extraction flow should still work.
    }
  }, []);

  useEffect(() => {
    const stored = getStoredJack();
    if (stored) {
      setCurrent(stored);
      setState('results');
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

  // Signed out with a signed-in user's jack still on screen: clear it, so the
  // next person at this browser doesn't see it. Signed-out jacks carry a token.
  useEffect(() => {
    if (isLoaded && !signedIn && current && !current.claimToken) {
      show(null);
      setState('idle');
    }
  }, [current, isLoaded, show, signedIn]);

  // Opened from the library's "Recent jacks": /?jack=<id>
  useEffect(() => {
    if (!isLoaded || !signedIn) return;
    const id = new URLSearchParams(window.location.search).get('jack');
    if (!id) return;
    window.history.replaceState(null, '', '/');
    unlockAttempted.current.add(id);
    getJack(id)
      .then((jack) => {
        show({ jack });
        setState('results');
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .catch(() => {
        setErrorMessage("We couldn't open that jack. It may have been deleted.");
        setState('error');
      });
  }, [isLoaded, show, signedIn]);

  // Just signed up (or in): claim the signed-out jack, which unlocks every
  // skill, then save the ones ticked before signing up.
  useEffect(() => {
    if (!isLoaded || !signedIn || !current) return;
    const { jack, claimToken, pendingSave } = current;
    const gated = jack.skills.some((s) => s.tier !== 'full');
    if ((!claimToken && !gated) || unlockAttempted.current.has(jack.id)) return;
    unlockAttempted.current.add(jack.id);

    void (async () => {
      try {
        let unlocked = claimToken ? await claimJack(jack.id, claimToken) : await getJack(jack.id);
        if (pendingSave && pendingSave.length > 0) {
          unlocked = await saveJackSkills(jack.id, pendingSave);
          setNotice(`Saved ${plural(pendingSave.length, 'skill')} to your Library.`);
        }
        show({ jack: unlocked });
        void fetchUsage();
      } catch {
        show({ jack });
        setNotice("We couldn't unlock these results. Jack the video again to see every skill.");
      }
    })();
  }, [current, fetchUsage, isLoaded, show, signedIn]);

  const handleSubmit = useCallback(async (url: string) => {
    if (signedIn && usage?.remaining === 0) {
      setShowLimitModal(true);
      return;
    }

    setState('loading');
    setErrorMessage('');
    setNotice(null);

    try {
      const jack = await runJack(url);

      if (!jack) {
        setErrorMessage(
          "We couldn't extract any skills from this video. Try a different video, or one with more instructional/how-to content." +
            (signedIn ? " This didn't use one of your monthly videos." : ''),
        );
        setState('error');
        return;
      }

      const { claimToken, ...view } = jack;
      show({ jack: view, claimToken });
      setState('results');
      if (signedIn) void fetchUsage();
    } catch (err) {
      if (err instanceof ApiError && err.upgrade) {
        setState('idle');
        setShowLimitModal(true);
        void fetchUsage();
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }, [fetchUsage, show, signedIn, usage?.remaining]);

  const handleSave = useCallback(async (skillIds: string[]) => {
    if (!current) return;
    const jack = await saveJackSkills(current.jack.id, skillIds);
    show({ jack });
    setNotice(`Saved ${plural(skillIds.length, 'skill')} to your Library.`);
  }, [current, show]);

  const handleSignUpToSave = useCallback((skillIds: string[]) => {
    if (!current) return;
    show({ ...current, pendingSave: skillIds });
    // Unlock runs once the account exists, so allow it again for this jack.
    unlockAttempted.current.delete(current.jack.id);
  }, [current, show]);

  const handleReset = useCallback(() => {
    setState('idle');
    show(null);
    setErrorMessage('');
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [show]);

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 pt-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-5">
          <a href="/dashboard" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
            Library
          </a>
          <a href="/pricing" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-4">
          {signedIn && usage && (
            <>
              {usage.tier === 'pro' && (
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-accent/20 text-accent">
                  Pro
                </span>
              )}
              <span className="hidden sm:inline text-text-tertiary text-xs font-mono">
                {videosLeft(usage.used, usage.limit)}
              </span>
              {usage.tier !== 'pro' && (
                <a
                  href="/pricing"
                  className="px-3 py-1.5 bg-accent text-primary font-body font-semibold text-xs
                             rounded-lg hover:bg-accent-hover hover:gold-glow
                             transition-all duration-200"
                >
                  Upgrade to Pro
                </a>
              )}
            </>
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
        <div className="max-w-5xl mx-auto">
          <Hero />

          <UrlInput
            onSubmit={handleSubmit}
            disabled={state === 'loading'}
          />

          {showLimitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-surface border border-border-subtle rounded-lg p-8 max-w-md mx-4 text-center">
                <h3 className="font-heading text-xl font-bold text-text-primary mb-3">
                  No videos left this month
                </h3>
                <p className="text-text-secondary text-sm mb-6">
                  You&apos;ve used all {usage?.limit ?? FREE_EXTRACTION_LIMIT} free videos this month.
                  Pro gives you {PRO_EXTRACTION_LIMIT} videos a month, up to 10 skills each.
                </p>
                <div className="flex flex-col gap-3">
                  <a
                    href="/pricing"
                    className="px-6 py-3 bg-accent text-primary font-body font-semibold text-sm
                               rounded-lg hover:bg-accent-hover hover:gold-glow
                               transition-all duration-200"
                  >
                    Upgrade to Pro
                  </a>
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

          <div className="mt-10" ref={resultsRef}>
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

            {notice && state === 'results' && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text-primary">
                <span>{notice}</span>
                <a href="/dashboard" className="font-semibold text-accent hover:text-accent-hover">
                  Open Library &rarr;
                </a>
              </div>
            )}

            {state === 'results' && current && (
              <JackResults
                key={current.jack.id}
                jack={current.jack}
                signedIn={signedIn}
                onSave={handleSave}
                onSignUpToSave={handleSignUpToSave}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto border-t border-border-subtle" />

      <HowItWorks />

      <div className="max-w-5xl mx-auto border-t border-border-subtle" />

      <ComingSoon signedIn={signedIn} />

      <Footer />
    </main>
  );
}
