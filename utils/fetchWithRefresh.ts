// fetchWithRefresh: central fetch wrapper with automatic refresh and subscription event dispatch

// Mutex to ensure only one refresh runs at a time — prevents race conditions when
// multiple parallel requests all hit 401 simultaneously and each try to rotate the token
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      return refreshRes.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function fetchWithRefresh(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const fetchInit = { ...init, credentials: 'include' as RequestCredentials };

  // helper: sleep
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // helper: parse Retry-After header value (either seconds or HTTP date)
  const parseRetryAfter = (header: string | null): number | null => {
    if (!header) return null;
    const s = header.trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10) * 1000;
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
      res = await fetch(input, fetchInit);
    } catch (err) {
      if (attempt < maxRetries) {
        const backoff = Math.min(10000, 300 * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random() * 300);
        await sleep(backoff + jitter);
        attempt += 1;
        continue;
      }
      throw err;
    }

    if (res.status !== 429) break;

    if (attempt >= maxRetries) break;
    const ra = parseRetryAfter(res.headers.get('Retry-After'));
    const backoffBase = Math.min(10000, 500 * Math.pow(2, attempt));
    const delay = ra !== null ? Math.min(10000, ra) : backoffBase + Math.floor(Math.random() * 300);
    await sleep(delay);
    attempt += 1;
  }

  if (!res) throw new Error('Unexpected fetch error: no response');

  if (res.status === 402) {
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

  // Skip refresh if caller opted out or if the request is the refresh itself
  try {
    let skipRefresh = false;
    if (fetchInit.headers && typeof fetchInit.headers === 'object') {
      const h = fetchInit.headers as Record<string, string>;
      skipRefresh = !!(h['x-skip-refresh'] || h['X-Skip-Refresh']);
    }
    skipRefresh = skipRefresh || (typeof input === 'string' && input.includes('/api/auth/refresh'));
    if (skipRefresh) return res;

    // Use shared mutex — if another request is already refreshing, wait for it
    const refreshed = await doRefresh();
    if (!refreshed) {
      // refresh failed — session truly expired
      try { window.dispatchEvent(new CustomEvent('auth:session-expired')); } catch { /* non-browser env */ }
      return res;
    }

    // retry original request with new access token cookie
    res = await fetch(input, fetchInit);
    return res;
  } catch {
    return res;
  }
}
