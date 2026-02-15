'use client';

import { useState, useCallback } from 'react';
import Hero from '@/components/hero';
import UrlInput from '@/components/url-input';
import LoadingState from '@/components/loading-state';
import SkillPreview from '@/components/skill-preview';
import DownloadBar from '@/components/download-bar';
import InstallGuide from '@/components/install-guide';
import HowItWorks from '@/components/how-it-works';
import ComingSoon from '@/components/coming-soon';
import Footer from '@/components/footer';
import { jackSkill } from '@/lib/api-client';
import { saveSkill } from '@/lib/storage';

type Format = 'claude-skill' | 'cursor-rules' | 'windsurf-rules';

interface SkillData {
  skill: {
    name: string;
    sourceTitle: string;
    sourceUrl: string;
    generatedAt: string;
    content: string;
  };
  formatted: {
    content: string;
    filename: string;
    format: string;
  };
}

type AppState = 'idle' | 'loading' | 'preview' | 'error';

export default function Home() {
  const [state, setState] = useState<AppState>('idle');
  const [skillData, setSkillData] = useState<SkillData | null>(null);
  const [format, setFormat] = useState<Format>('claude-skill');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = useCallback(async (url: string) => {
    setState('loading');
    setErrorMessage('');

    try {
      const data = await jackSkill(url, format);
      setSkillData(data);
      setState('preview');

      // Auto-save to localStorage
      saveSkill({
        id: `skill_${Date.now()}`,
        name: data.skill.name,
        sourceTitle: data.skill.sourceTitle,
        sourceUrl: data.skill.sourceUrl,
        generatedAt: data.skill.generatedAt,
        content: data.formatted.content,
        format: data.formatted.format,
        filename: data.formatted.filename,
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
    if (skillData) {
      setState('loading');
      try {
        const data = await jackSkill(skillData.skill.sourceUrl, newFormat);
        setSkillData(data);
        setState('preview');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Format change failed.';
        setErrorMessage(message);
        setState('error');
      }
    }
  }, [skillData]);

  const handleReset = useCallback(() => {
    setState('idle');
    setSkillData(null);
    setErrorMessage('');
  }, []);

  return (
    <main className="min-h-screen">
      {/* Hero + Tool Section */}
      <section className="pt-24 pb-16 px-6">
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

            {state === 'preview' && skillData && (
              <div>
                <SkillPreview content={skillData.formatted.content} />
                <DownloadBar
                  content={skillData.formatted.content}
                  filename={skillData.formatted.filename}
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
    </main>
  );
}
