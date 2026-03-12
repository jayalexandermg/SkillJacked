'use client';

import { useState, useCallback, useEffect } from 'react';
import Hero from '@/components/hero';
import UrlInput from '@/components/url-input';
import LoadingState from '@/components/loading-state';
import SkillPreview from '@/components/skill-preview';
import DownloadBar from '@/components/download-bar';
import InstallGuide from '@/components/install-guide';
import HowItWorks from '@/components/how-it-works';
import ComingSoon from '@/components/coming-soon';
import Footer from '@/components/footer';
import AuthModal from '@/components/auth-modal';
import { jackSkills, type SkillData, signup } from '@/lib/api-client';
import { saveSkill } from '@/lib/storage';
import { isAuthenticated, setToken } from '@/lib/auth';

type Format = 'claude-skill' | 'cursor-rules' | 'windsurf-rules';

type AppState = 'idle' | 'loading' | 'preview' | 'error';

export default function Home() {
  const [state, setState] = useState<AppState>('idle');
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [activeSkillIndex, setActiveSkillIndex] = useState(0);
  const [format, setFormat] = useState<Format>('claude-skill');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  const handleAuth = async (email: string) => {
    try {
      const res = await signup(email);
      setToken(res.token);
      setAuthed(true);
      setShowAuth(false);
    } catch {
      // silent fail for MVP
    }
  };

  const handleSubmit = useCallback(async (url: string) => {
    setState('loading');
    setErrorMessage('');

    try {
      const data = await jackSkills(url, format);
      setSkills(data);
      setActiveSkillIndex(0);
      setState('preview');

      // Auto-save all skills to localStorage
      data.forEach((item, i) => {
        saveSkill({
          id: `skill_${Date.now()}_${i}`,
          name: item.skill.name,
          sourceTitle: item.skill.sourceTitle,
          sourceUrl: item.skill.sourceUrl,
          generatedAt: item.skill.generatedAt,
          content: item.formatted.content,
          format: item.formatted.format,
          filename: item.formatted.filename,
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setErrorMessage(message);
      setState('error');
    }
  }, [format]);

  const handleFormatChange = useCallback(async (newFormat: Format) => {
    setFormat(newFormat);

    // If we already have skill data, re-fetch with new format
    if (skills.length > 0) {
      setState('loading');
      try {
        const data = await jackSkills(skills[0].skill.sourceUrl, newFormat);
        setSkills(data);
        setActiveSkillIndex(0);
        setState('preview');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Format change failed.';
        setErrorMessage(message);
        setState('error');
      }
    }
  }, [skills]);

  const handleReset = useCallback(() => {
    setState('idle');
    setSkills([]);
    setActiveSkillIndex(0);
    setErrorMessage('');
  }, []);

  const activeSkill = skills[activeSkillIndex] ?? null;

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <nav className="flex items-center justify-between px-6 pt-6 max-w-5xl mx-auto">
        <a href="/dashboard" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
          My Skills
        </a>
        {!authed && (
          <button
            onClick={() => setShowAuth(true)}
            className="px-4 py-2 bg-accent text-primary font-body font-semibold text-sm
                       rounded-lg hover:bg-accent-hover hover:gold-glow
                       transition-all duration-200"
          >
            Sign Up for Early Access
          </button>
        )}
      </nav>

      {/* Hero + Tool Section */}
      <section className="pt-12 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Hero />

          <UrlInput
            onSubmit={handleSubmit}
            disabled={state === 'loading'}
          />

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

            {state === 'preview' && activeSkill && (
              <div>
                {/* Skill selector tabs */}
                {skills.length > 1 && (
                  <div className="mb-6">
                    <p className="text-text-secondary text-sm mb-3 text-center">
                      {skills.length} skills extracted
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {skills.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSkillIndex(i)}
                          className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all duration-200 ${
                            i === activeSkillIndex
                              ? 'bg-accent text-primary border-accent font-semibold'
                              : 'bg-surface text-text-secondary border-border-subtle hover:border-border-focus hover:text-text-primary'
                          }`}
                        >
                          {s.skill.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <SkillPreview content={activeSkill.formatted.content} />
                <DownloadBar
                  content={activeSkill.formatted.content}
                  filename={activeSkill.formatted.filename}
                  format={format}
                  onFormatChange={handleFormatChange}
                />
                <InstallGuide format={format} />

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

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSubmit={handleAuth}
      />
    </main>
  );
}
