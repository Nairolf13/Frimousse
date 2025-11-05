// Lightweight concurrency runner: run async worker over items with limited parallelism
export async function runWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency = 4): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;

  return new Promise((resolve, reject) => {
    let active = 0;
    let finished = 0;

    const next = () => {
      if (finished === items.length) return resolve(results);
      while (active < concurrency && idx < items.length) {
        const currentIndex = idx++;
        const item = items[currentIndex];
        active++;
        Promise.resolve()
          .then(() => worker(item))
          .then((res) => {
            results[currentIndex] = res as R;
          })
          .catch((err) => {
            // propagate first error
            reject(err);
          })
          .finally(() => {
            active--;
            finished++;
            next();
          });
      }
    };

    // handle empty
    if (items.length === 0) return resolve(results);
    next();
  });
}
