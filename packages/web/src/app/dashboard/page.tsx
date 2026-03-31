'use client';

import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import { getSkills, deleteSkill, StoredSkill } from '@/lib/storage';
import SkillCard from '@/components/skill-card';
import Footer from '@/components/footer';

export default function DashboardPage() {
  const [skills, setSkills] = useState<StoredSkill[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSkills(getSkills());
  }, []);

  const handleDelete = (id: string) => {
    deleteSkill(id);
    setSkills(getSkills());
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

            <UserButton  />
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
    </main>
  );
}
