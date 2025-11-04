export async function clearBrowserCacheAndLogout(opts?: { preserveCookieConsent?: boolean; redirectTo?: string }) {
  const preserveCookieConsent = opts?.preserveCookieConsent ?? true;
  const redirectTo = opts?.redirectTo ?? '/login';

  // Read cookie consent from localStorage/sessionStorage/cookie (best-effort)
  let savedLocal = null;
  let savedSession = null;
  let savedCookie = null;
  try { savedLocal = localStorage.getItem('cookie_consent'); } catch { savedLocal = null; }
  try { savedSession = sessionStorage.getItem('cookie_consent'); } catch { savedSession = null; }
  try {
    const m = document.cookie.match(/(?:^|; )cookie_consent=([^;]+)/);
    savedCookie = m ? m[1] : null;
  } catch { savedCookie = null; }

  // Unregister service workers
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
            try { await r.unregister(); } catch { void 0; }
      }
      // Also try single registration (older browsers)
          try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.unregister(); } catch { void 0; }
    }
  } catch { void 0; }

  // Clear Cache Storage
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch { void 0; }

  // Clear indexedDB databases (best-effort)
  try {
    if ('indexedDB' in window) {
      const maybeDatabases = (indexedDB as unknown as { databases?: () => Promise<Array<{ name?: string }>> }).databases;
      if (typeof maybeDatabases === 'function') {
        const dbs = await maybeDatabases();
        if (Array.isArray(dbs)) {
          await Promise.all(dbs.map((d: { name?: string }) => new Promise<void>((res) => {
            try { if (d && d.name) indexedDB.deleteDatabase(d.name); } catch { void 0; }
            res();
          })));
        }
      } else {
        // Fallback: try deleting common DB names (best-effort)
        const common = ['firebase_local_storage_v1', 'workbox-precache', 'workbox-runtime', 'idb'];
        await Promise.all(common.map(n => new Promise<void>((res) => { try { indexedDB.deleteDatabase(n); } catch { void 0; } res(); })));
      }
    }
  } catch { void 0; }

  // Clear storages
  try { localStorage.clear(); } catch { void 0; }
  try { sessionStorage.clear(); } catch { void 0; }

  // Clear cookies then restore cookie_consent if requested
  try {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const name = c.split('=')[0].trim();
      try { document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'; } catch { void 0; }
      try { document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname; } catch { void 0; }
    }
    if (preserveCookieConsent) {
      const val = savedLocal ?? savedSession ?? savedCookie;
      if (val) {
        try { document.cookie = `cookie_consent=${val};path=/;max-age=${60 * 60 * 24 * 365}`; } catch { void 0; }
        try { localStorage.setItem('cookie_consent', val); } catch { void 0; }
      }
    }
  } catch { void 0; }

  // Small delay to allow browser to settle then redirect
  try { await new Promise(r => setTimeout(r, 150)); } catch { void 0; }
  try { window.location.href = redirectTo; } catch { void 0; }
}

export default clearBrowserCacheAndLogout;
