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

export async function jackSkills(url: string, format?: string): Promise<SkillData[]> {
  const res = await fetch('/api/jack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${res.status}`);
  }

  const data = await res.json();
  return data.skills;
}

export async function signup(email: string) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Signup failed with status ${res.status}`);
  }

  return res.json();
}
