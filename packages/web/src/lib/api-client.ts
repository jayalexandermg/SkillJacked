export interface SkillData {
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

export async function jackSkills(url: string): Promise<SkillData[]> {
  const res = await fetch('/api/jack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format: 'claude-skill' }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${res.status}`);
  }

  const data = await res.json();
  return data.skills;
}
