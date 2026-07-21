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

// Slightly above the API route's maxDuration (150s) so a server-side timeout
// surfaces as a clean error before the client's own wait gives up first.
const JACK_TIMEOUT_MS = 155_000;

export async function jackSkills(url: string): Promise<SkillData[]> {
  let res: Response;
  try {
    res = await fetch('/api/jack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format: 'claude-skill' }),
      signal: AbortSignal.timeout(JACK_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error('Extraction is taking longer than expected. Try a shorter video or try again.');
    }
    throw new Error('Network error. Please check your connection and try again.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${res.status}`);
  }

  const data = await res.json();
  return data.skills;
}
