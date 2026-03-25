export type ConsentState = 'unknown' | 'all' | 'essential';

export function readLocalConsent(): ConsentState {
  try {
    let v: string | null = null;
    try { v = localStorage.getItem('cookie_consent'); } catch { /* ignore */ }
    if (!v) {
      try {
        const m = document.cookie.match(/(?:^|; )cookie_consent=([^;]+)/);
        if (m?.[1]) v = decodeURIComponent(m[1]);
      } catch { /* ignore */ }
    }
    if (!v) return 'unknown';
    return v === 'all' ? 'all' : 'essential';
  } catch {
    return 'unknown';
  }
}

export function writeLocalConsent(consent: 'all' | 'essential') {
  try { localStorage.setItem('cookie_consent', consent); } catch { /* ignore */ }
  try { document.cookie = `cookie_consent=${encodeURIComponent(consent)};path=/;max-age=${60 * 60 * 24 * 365}`; } catch { /* ignore */ }
}
