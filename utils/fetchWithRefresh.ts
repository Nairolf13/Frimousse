// fetchWithRefresh: central fetch wrapper with automatic refresh and subscription event dispatch

export async function fetchWithRefresh(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const fetchInit = { ...init, credentials: 'include' as RequestCredentials };
  let res = await fetch(input, fetchInit);
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
