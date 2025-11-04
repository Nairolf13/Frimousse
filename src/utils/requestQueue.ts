// Lightweight concurrency queue for scheduling async tasks
export async function runWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency = 4): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  const running: Promise<void>[] = [];

  async function runOne() {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      try {
        const r = await worker(items[i]);
        results[i] = r as unknown as R;
      } catch {
        // preserve hole but don't throw to let other tasks finish
        // store undefined for failures
        // @ts-expect-error allow undefined on error
        results[i] = undefined;
      }
    }
  }

  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    running.push(runOne());
  }
  await Promise.all(running);
  return results;
}
