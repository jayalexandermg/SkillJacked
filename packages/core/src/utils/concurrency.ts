export interface Limiter {
  run<T>(fn: () => Promise<T>): Promise<T>;
}

interface QueueEntry {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

export function createLimiter(concurrency: number): Limiter {
  const queue: QueueEntry[] = [];
  let running = 0;

  function dequeue(): void {
    while (running < concurrency && queue.length > 0) {
      const entry = queue.shift()!;
      running++;
      entry
        .fn()
        .then((value) => {
          entry.resolve(value);
        })
        .catch((err) => {
          entry.reject(err);
        })
        .finally(() => {
          running--;
          dequeue();
        });
    }
  }

  return {
    run<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push({
          fn: fn as () => Promise<unknown>,
          resolve: resolve as (value: unknown) => void,
          reject,
        });
        dequeue();
      });
    },
  };
}
