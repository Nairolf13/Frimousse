import { useState, useEffect } from 'react';

/**
 * Detects iOS users who are NOT using Safari and shows a banner
 * telling them to open the site in Safari to install the PWA.
 *
 * Also shows a "Add to Home Screen" tip for iOS Safari users
 * who haven't installed the app yet.
 */
export default function IosSafariBanner() {
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<'not-safari' | 'safari-tip' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // Already running as standalone PWA → nothing to show
    const isStandalone =
      ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Dismiss key in localStorage so users only see it once per type
    const ua = navigator.userAgent;

    // Detect iOS (iPhone, iPad, iPod) — iPad on iOS 13+ reports as Mac
    const isIos = /iP(hone|od|ad)/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIos) return;

    // Detect Safari: Safari on iOS has "Safari" in UA but NOT "CriOS" (Chrome),
    // "FxiOS" (Firefox), "EdgiOS" (Edge), "OPiOS" (Opera), etc.
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);

    if (!isSafari) {
      if (localStorage.getItem('ios-banner-not-safari-dismissed')) return;
      setType('not-safari');
      setVisible(true);
    } else {
      // Safari on iOS but not installed → show add-to-home-screen tip
      if (localStorage.getItem('ios-banner-safari-tip-dismissed')) return;
      setType('safari-tip');
      setVisible(true);
    }
  }, []);

  function dismiss() {
    if (type === 'not-safari') {
      localStorage.setItem('ios-banner-not-safari-dismissed', '1');
    } else if (type === 'safari-tip') {
      localStorage.setItem('ios-banner-safari-tip-dismissed', '1');
    }
    setVisible(false);
  }

  if (!visible || !type) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] safe-area-bottom animate-slide-up">
      <div className="mx-3 mb-3 rounded-2xl bg-white/95 backdrop-blur-lg shadow-lg border border-gray-200 px-4 py-3 flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {type === 'not-safari' ? (
            /* Safari compass icon */
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.5 8.5-2.14 4.86L8.5 15.5l2.14-4.86L15.5 8.5Z" />
            </svg>
          ) : (
            /* Share / export icon */
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M12 15V2.25m0 0 3 3m-3-3-3 3" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {type === 'not-safari' ? (
            <>
              <p className="text-sm font-semibold text-gray-900">
                Ouvrez dans Safari
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Pour installer l'application Frimousse sur votre iPhone, ouvrez ce site dans Safari.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900">
                Installer Frimousse
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Appuyez sur{' '}
                <svg className="inline w-4 h-4 -mt-0.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M12 15V2.25m0 0 3 3m-3-3-3 3" />
                </svg>{' '}
                puis <strong>« Sur l'écran d'accueil »</strong> pour installer l'app.
              </p>
            </>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 -m-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
