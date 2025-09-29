import { useEffect, useState } from 'react';

type ConsentState = 'unknown' | 'all' | 'essential';

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(() => {
    try {
      let v = null;
      try { v = localStorage.getItem('cookie_consent'); } catch { v = null; }
      if (!v) {
        // fallback: try reading a non-HTTP-only cookie so the preference survives localStorage.clear()
        try {
          const m = document.cookie.match(/(?:^|; )cookie_consent=([^;]+)/);
          if (m && m[1]) v = decodeURIComponent(m[1]);
        } catch { /* ignore cookie read failures */ }
      }
      if (!v) return 'unknown';
      return v === 'all' ? 'all' : 'essential';
    } catch (e) {
      console.warn('cookie consent read failed', e);
      return 'unknown';
    }
  });

  useEffect(() => {
    if (consent === 'unknown') return;
    try { localStorage.setItem('cookie_consent', consent); } catch (e) { console.warn('cookie consent write failed', e); }
    try {
      // also write a non-HTTP-only cookie so the preference survives localStorage.clear() and redirects
      // 60 * 60 * 24 * 365 = 31536000 (1 year)
      document.cookie = `cookie_consent=${encodeURIComponent(consent)};path=/;max-age=31536000`;
  } catch { /* ignore cookie write failures */ }
    // If gtag exists, update consent state: ad_storage and analytics_storage
    // all -> grant both, essential -> deny optional storage
    if (typeof window.gtag === 'function') {
      if (consent === 'all') {
        try { window.gtag('consent', 'update', { 'ad_storage': 'granted', 'analytics_storage': 'granted' }); } catch (e) { console.warn('gtag consent update failed', e); }
  try { window.gtag('event', 'consent_granted', { method: 'banner' }); } catch { /* ignore */ }
      } else {
        try { window.gtag('consent', 'update', { 'ad_storage': 'denied', 'analytics_storage': 'denied' }); } catch (e) { console.warn('gtag consent update failed', e); }
      }
    }
  }, [consent]);

  if (consent !== 'unknown') return null;

  return (
    <div className="fixed left-0 right-0 bottom-6 z-50 flex justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl max-w-4xl w-full p-4 md:p-6 flex flex-col md:flex-row items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#e6f7fb] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 2C7.03 2 3 6.03 3 11c0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9z" fill="#0b5566" opacity="0.08" />
            <path d="M12 6a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" fill="#0b5566" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 text-center md:text-left">
          <div className="font-semibold text-gray-900 text-lg">Nous utilisons des cookies</div>
          <div className="text-sm text-gray-600 mt-1">Ce site utilise des cookies essentiels nécessaires au fonctionnement, ainsi que des cookies optionnels pour améliorer l'expérience et les analyses. Choisissez vos préférences.</div>
        </div>

        {/* Actions */}
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 md:gap-4 items-stretch">
          <button className="flex-1 md:flex-none md:w-48 bg-[#0b5566] hover:bg-[#094a52] text-white px-4 py-2 rounded-lg font-semibold transition" onClick={() => setConsent('all')}>Tout autoriser</button>
          <button className="flex-1 md:flex-none md:w-64 bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-50 transition" onClick={() => setConsent('essential')}>Accepter uniquement les cookies obligatoires</button>
        </div>
      </div>
    </div>
  );
}
