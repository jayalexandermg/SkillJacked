import type { JackView, RecentJack } from '@/lib/jack-view';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly upgrade = false) {
    super(message);
  }
}

// Slightly above the API route's maxDuration (280s) so a server-side timeout
// surfaces as a clean error before the client's own wait gives up first.
const JACK_TIMEOUT_MS = 285_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new ApiError('Extraction is taking longer than expected. Try a shorter video or try again.', 0);
    }
    throw new ApiError('Network error. Please check your connection and try again.', 0);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.error || `Request failed with status ${res.status}`, res.status, body?.upgrade === true);
  }
  return body as T;
}

function post<T>(path: string, payload: unknown, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    ...init,
  });
}

/** Run a jack. Null when the video yielded no skills (and cost nothing). */
export async function runJack(url: string): Promise<JackView | null> {
  const { jack } = await post<{ jack: JackView | null }>('/api/jack', { url }, {
    signal: AbortSignal.timeout(JACK_TIMEOUT_MS),
  });
  return jack;
}

export async function getJack(id: string): Promise<JackView> {
  return (await request<{ jack: JackView }>(`/api/jacks/${id}`)).jack;
}

export async function claimJack(id: string, token: string): Promise<JackView> {
  return (await post<{ jack: JackView }>(`/api/jacks/${id}/claim`, { token })).jack;
}

export async function saveJackSkills(id: string, skillIds: string[]): Promise<JackView> {
  return (await post<{ jack: JackView }>(`/api/jacks/${id}/save`, { skillIds })).jack;
}

export async function getRecentJacks(): Promise<RecentJack[]> {
  return (await request<{ jacks: RecentJack[] }>('/api/jacks')).jacks;
}
