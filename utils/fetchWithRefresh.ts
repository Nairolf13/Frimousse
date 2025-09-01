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

  // Use a relative refresh endpoint so the browser uses the current origin (and the Vite proxy in dev)
  // This avoids cookies not being sent when mixing explicit backend hosts (localhost vs LAN IP)
  const refreshRes = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!refreshRes.ok) {
    return res;
  }
  res = await fetch(input, fetchInit);
  return res;
}
