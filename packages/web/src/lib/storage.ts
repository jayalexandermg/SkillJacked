const SKILLS_KEY = 'skilljack_skills';

export interface StoredSkill {
  id: string;
  name: string;
  sourceTitle: string;
  sourceUrl: string;
  generatedAt: string;
  content: string;
  format: string;
  filename: string;
}

export function saveSkill(skill: StoredSkill): void {
  if (typeof window === 'undefined') return;
  const skills = getSkills();
  skills.unshift(skill);
  localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
}

export function getSkills(): StoredSkill[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SKILLS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function deleteSkill(id: string): void {
  if (typeof window === 'undefined') return;
  const skills = getSkills().filter((s) => s.id !== id);
  localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
}
