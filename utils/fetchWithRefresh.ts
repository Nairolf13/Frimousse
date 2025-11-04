// fetchWithRefresh: central fetch wrapper with automatic refresh and subscription event dispatch

export async function fetchWithRefresh(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const fetchInit = { ...init, credentials: 'include' as RequestCredentials };
  // Helper: determine if the request method is safe to retry
  const method = (fetchInit.method || 'GET').toUpperCase();
  const isIdempotent = ['GET', 'HEAD', 'OPTIONS'].includes(method);

  // Retry logic for 429 Too Many Requests on idempotent requests
  const maxRetries = 3;
  let attempt = 0;
  let res: Response;
  while (true) {
    attempt += 1;
    res = await fetch(input, fetchInit);

    if (res.status !== 429 || !isIdempotent || attempt > maxRetries) break;

    // Respect Retry-After header when provided (seconds or HTTP-date)
    const ra = res.headers.get('Retry-After');
    let waitMs = 0;
    if (ra) {
      const seconds = parseInt(ra, 10);
      if (!isNaN(seconds)) {
        waitMs = seconds * 1000;
      } else {
        const date = Date.parse(ra);
        if (!isNaN(date)) {
          waitMs = Math.max(0, date - Date.now());
        }
      }
    }

    // Exponential backoff with jitter
    if (waitMs === 0) {
      const base = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms...
      const jitter = Math.floor(Math.random() * 100);
      waitMs = base + jitter;
    }

    await new Promise((resolve) => setTimeout(resolve, waitMs));
    // loop to retry
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
