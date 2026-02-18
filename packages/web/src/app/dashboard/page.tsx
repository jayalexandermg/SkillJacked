'use client';

import { useState, useEffect } from 'react';
import { isAuthenticated } from '@/lib/auth';
import { getSkills, deleteSkill, StoredSkill } from '@/lib/storage';
import SkillCard from '@/components/skill-card';
import AuthModal from '@/components/auth-modal';
import { signup } from '@/lib/api-client';
import { setToken } from '@/lib/auth';
import Footer from '@/components/footer';

export default function DashboardPage() {
  const [skills, setSkills] = useState<StoredSkill[]>([]);
  const [authed, setAuthed] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [signupState, setSignupState] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    setMounted(true);
    setAuthed(isAuthenticated());
    setSkills(getSkills());
  }, []);

  const handleDelete = (id: string) => {
    deleteSkill(id);
    setSkills(getSkills());
  };

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

  const handleInlineSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSignupState('loading');
    try {
      const res = await signup(email.trim());
      setToken(res.token);
      setAuthed(true);
      setSignupState('done');
    } catch {
      setSignupState('done'); // show success even on error — it's a waitlist
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <section className="pt-16 pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <a href="/" className="font-heading text-sm text-text-secondary hover:text-text-primary transition-colors">
                &larr; Back
              </a>
              <h1 className="font-heading text-3xl font-bold mt-2">
                Your <span className="text-accent">Skills</span>
              </h1>
            </div>

            {!authed && (
              signupState === 'done' ? (
                <p className="text-accent text-sm font-medium">You&apos;re on the list ✓</p>
              ) : (
                <form onSubmit={handleInlineSignup} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="px-3 py-2 bg-surface border border-border-subtle rounded-lg
                               text-text-primary text-sm placeholder:text-text-tertiary
                               focus:outline-none focus:ring-2 focus:ring-accent/40
                               transition-all duration-200 w-48"
                  />
                  <button
                    type="submit"
                    disabled={signupState === 'loading'}
                    className="px-4 py-2 bg-accent text-primary font-body font-semibold text-sm
                               rounded-lg hover:bg-accent-hover hover:gold-glow
                               transition-all duration-200 disabled:opacity-60"
                  >
                    {signupState === 'loading' ? '...' : 'Join Early'}
                  </button>
                </form>
              )
            )}
          </div>

          {/* Skills grid */}
          {skills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  id={skill.id}
                  name={skill.name}
                  sourceTitle={skill.sourceTitle}
                  generatedAt={skill.generatedAt}
                  format={skill.format}
                  content={skill.content}
                  filename={skill.filename}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-text-secondary text-lg mb-2">No skills yet.</p>
              <p className="text-text-tertiary text-sm mb-6">
                Go jack a skill from a YouTube video to get started.
              </p>
              <a
                href="/"
                className="inline-block px-6 py-3 bg-accent text-primary font-body font-semibold
                           text-sm rounded-lg hover:bg-accent-hover hover:gold-glow
                           transition-all duration-200"
              >
                Jack a Skill
              </a>
            </div>
          )}

          {/* Coming Soon teaser */}
          <div className="mt-16 p-6 bg-surface border border-border-subtle rounded-lg text-center">
            <p className="text-text-secondary text-sm">
              Cloud sync, skill sharing, and team libraries are{' '}
              <span className="text-accent font-medium">coming soon</span>.
            </p>
          </div>
        </div>
      </section>

      <Footer />

      <AuthModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        onSubmit={handleAuth}
      />
    </main>
  );
}
