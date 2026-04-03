import type { SkillData } from '@/lib/api-client';

const EXTRACTION_KEY = 'skilljack_extraction';
const PENDING_ANON_KEY = 'skilljack_pending_anonymous';

function isSkillData(value: unknown): value is SkillData {
  if (!value || typeof value !== 'object') return false;

  const maybeSkill = value as Partial<SkillData>;
  return (
    !!maybeSkill.skill &&
    typeof maybeSkill.skill.name === 'string' &&
    typeof maybeSkill.skill.content === 'string' &&
    typeof maybeSkill.skill.sourceTitle === 'string' &&
    typeof maybeSkill.skill.sourceUrl === 'string' &&
    typeof maybeSkill.skill.generatedAt === 'string'
  );
}

function normalizeStoredExtraction(value: unknown): SkillData[] {
  if (Array.isArray(value)) {
    return value.filter(isSkillData);
  }

  if (value && typeof value === 'object' && 'skills' in value) {
    return normalizeStoredExtraction((value as { skills?: unknown }).skills);
  }

  return isSkillData(value) ? [value] : [];
}

export function getStoredExtraction(): SkillData[] {
  if (typeof window === 'undefined') return [];

  const raw = sessionStorage.getItem(EXTRACTION_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    const skills = normalizeStoredExtraction(parsed);

    if (skills.length === 0) {
      sessionStorage.removeItem(EXTRACTION_KEY);
      return [];
    }

    if (!Array.isArray(parsed)) {
      sessionStorage.setItem(EXTRACTION_KEY, JSON.stringify(skills));
    }

    return skills;
  } catch {
    sessionStorage.removeItem(EXTRACTION_KEY);
    return [];
  }
}

export function setStoredExtraction(
  skills: SkillData[],
  options?: { pendingAnonymousImport?: boolean },
): void {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem(EXTRACTION_KEY, JSON.stringify(skills));

  if (options?.pendingAnonymousImport) {
    sessionStorage.setItem(PENDING_ANON_KEY, '1');
  } else {
    sessionStorage.removeItem(PENDING_ANON_KEY);
  }
}

export function clearStoredExtraction(): void {
  if (typeof window === 'undefined') return;

  sessionStorage.removeItem(EXTRACTION_KEY);
  sessionStorage.removeItem(PENDING_ANON_KEY);
}

export function hasPendingAnonymousExtraction(): boolean {
  if (typeof window === 'undefined') return false;

  return sessionStorage.getItem(PENDING_ANON_KEY) === '1';
}
