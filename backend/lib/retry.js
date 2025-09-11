// Simple exponential-backoff retry helper
module.exports = async function retryAsync(fn, attempts = 3, delayMs = 500) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const shouldRetry = i < attempts - 1;
      if (!shouldRetry) break;
      const wait = delayMs * Math.pow(2, i);
      // eslint-disable-next-line no-console
      console.warn(`retryAsync attempt ${i + 1} failed, retrying after ${wait}ms`, e && e.message ? e.message : e);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
};
