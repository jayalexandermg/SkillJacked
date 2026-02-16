export interface RetryOpts {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (msg: string) => void;
}

interface ErrorWithStatus {
  status?: number;
  name?: string;
}

function isRetryable(error: unknown): boolean {
  const err = error as ErrorWithStatus;

  if (err.name === 'AbortError' || err.name === 'TimeoutError') {
    return true;
  }

  if (typeof err.status === 'number') {
    if (err.status === 429 || err.status === 529 || err.status >= 500) {
      return true;
    }
  }

  return false;
}

function formatRetryMessage(error: unknown, delaySec: string, attempt: number, maxRetries: number): string {
  const err = error as ErrorWithStatus;

  if (err.name === 'AbortError' || err.name === 'TimeoutError') {
    return `Timeout. Retrying in ${delaySec}s (attempt ${attempt}/${maxRetries})\u2026`;
  }

  if (err.status === 429) {
    return `Rate limited. Retrying in ${delaySec}s (attempt ${attempt}/${maxRetries})\u2026`;
  }

  if (err.status === 529) {
    return `Overloaded (529). Retrying in ${delaySec}s (attempt ${attempt}/${maxRetries})\u2026`;
  }

  if (typeof err.status === 'number' && err.status >= 500) {
    return `Server error (${err.status}). Retrying in ${delaySec}s (attempt ${attempt}/${maxRetries})\u2026`;
  }

  return `Error. Retrying in ${delaySec}s (attempt ${attempt}/${maxRetries})\u2026`;
}

export async function withRetry<T>(fn: () => Promise<T>, opts?: RetryOpts): Promise<T> {
  const maxRetries = opts?.maxRetries ?? 3;
  const baseDelay = opts?.baseDelay ?? 1000;
  const maxDelay = opts?.maxDelay ?? 30000;
  const onRetry = opts?.onRetry;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt === maxRetries || !isRetryable(error)) {
        throw error;
      }

      const jitter = Math.random() * 500;
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
      const delaySec = (delay / 1000).toFixed(1);

      if (onRetry) {
        onRetry(formatRetryMessage(error, delaySec, attempt + 1, maxRetries));
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
