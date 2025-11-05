// fetchWithRefresh: central fetch wrapper with automatic refresh and subscription event dispatch

export async function fetchWithRefresh(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const fetchInit = { ...init, credentials: 'include' as RequestCredentials };

  // helper: sleep
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // helper: parse Retry-After header value (either seconds or HTTP date)
  const parseRetryAfter = (header: string | null): number | null => {
    if (!header) return null;
    const s = header.trim();
    // numeric seconds
    if (/^\d+$/.test(s)) return parseInt(s, 10) * 1000;
    // try HTTP-date
    const ts = Date.parse(s);
    if (!Number.isNaN(ts)) {
      const delta = ts - Date.now();
      return delta > 0 ? delta : 0;
    }
    return null;
  };

  // Attempt initial fetch and transparently retry on 429 with exponential backoff + jitter
  const maxRetries = 3;
  let attempt = 0;
  let res: Response | null = null;
  while (attempt <= maxRetries) {
    try {
      // perform the fetch
      res = await fetch(input, fetchInit);
    } catch (err) {
      // network error: if we still have retries, backoff and retry
      if (attempt < maxRetries) {
        const backoff = Math.min(10000, 300 * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random() * 300);
        await sleep(backoff + jitter);
        attempt += 1;
        continue;
      }
      // out of retries — rethrow to let caller handle network failure
      throw err;
    }

    // If we got a response that's not 429, break and handle below
    if (res.status !== 429) break;

    // Received 429: check Retry-After header
    if (attempt >= maxRetries) break; // don't wait more
    const ra = parseRetryAfter(res.headers.get('Retry-After'));
    const backoffBase = Math.min(10000, 500 * Math.pow(2, attempt));
    const delay = ra !== null ? Math.min(10000, ra) : backoffBase + Math.floor(Math.random() * 300);
    await sleep(delay);
    attempt += 1;
    // loop to retry
  }

  // At this point `res` is set (or thrown). Type it for TypeScript
  if (!res) {
    // should not happen, but guard
    throw new Error('Unexpected fetch error: no response');
  }
  if (res.status === 402) {
    // Try to parse message and dispatch global event so UI can show upgrade modal
    try {
      const body = await res.clone().json().catch(() => ({}));
      const message = body?.error || body?.message || 'Abonnement requis';
      window.dispatchEvent(new CustomEvent('subscription:required', { detail: { message } }));
    } catch {
      window.dispatchEvent(new CustomEvent('subscription:required', { detail: { message: 'Abonnement requis' } }));
    }
    return res;
  }
  if (res.status !== 401) return res;

  // Avoid attempting refresh if caller opted out or if the original request was the refresh itself
  try {
    let skipRefresh = false;
    if (fetchInit.headers && typeof fetchInit.headers === 'object') {
      const h = fetchInit.headers as Record<string, string>;
      skipRefresh = !!(h['x-skip-refresh'] || h['X-Skip-Refresh']);
    }
    skipRefresh = skipRefresh || (typeof input === 'string' && input.includes('/api/auth/refresh'));
    if (skipRefresh) return res;

    // Use a relative refresh endpoint so the browser uses the current origin
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!refreshRes.ok) {
      // refresh failed (401 or other). Return the original 401 to caller for graceful handling.
      return res;
    }
    // retry original request after successful refresh
    res = await fetch(input, fetchInit);
    return res;
  } catch {
    // network or other error during refresh — return original response to caller
    return res;
  }
}
