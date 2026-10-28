import React, { useEffect, useMemo, useState } from 'react';
import { I18nContext } from './i18nContext';
import type { Locale } from './i18nContext';
// French is bundled statically (so there's no flash of untranslated keys on
// first paint, since it's the default/most common locale), but en/es/ar are
// loaded on demand. Shipping all four upfront was the single biggest
// contributor to the ~900KB non-lazy main bundle slowing down first paint
// on mobile — fr+en+es+ar together are ~290KB of JSON every visitor used to
// download and parse before seeing anything, even on the public landing
// page in a single language.
import fr from './locales/fr.json';

const loaders: Partial<Record<Locale, () => Promise<{ default: Record<string, string> }>>> = {
  en: () => import('./locales/en.json'),
  es: () => import('./locales/es.json'),
  ar: () => import('./locales/ar.json'),
};

const cache: Partial<Record<Locale, Record<string, string>>> = { fr };

function readSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem('site_language');
    if (saved === 'en') return 'en';
    if (saved === 'es') return 'es';
    if (saved === 'ar') return 'ar';
    return 'fr';
  } catch {
    return 'fr';
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readSavedLocale);
  const [dict, setDict] = useState<Record<string, string> | null>(cache[readSavedLocale()] ?? null);

  useEffect(() => {
    let cancelled = false;
    const cached = cache[locale];
    const loader = loaders[locale];
    if (cached) {
      setDict(cached);
    } else if (loader) {
      loader().then(mod => {
        if (cancelled) return;
        cache[locale] = mod.default;
        setDict(mod.default);
      }).catch(() => {
        if (cancelled) return;
        // Fall back to an empty dict rather than crashing — t() already
        // falls back to the raw key/param when a translation is missing.
        setDict({});
      });
    }
    try {
      document.documentElement.lang = locale;
      document.documentElement.dir = 'ltr';
      localStorage.setItem('site_language', locale);
      document.cookie = `site_language=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
    } catch {
      // ignore
    }
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    try {
      (window as unknown as { __FRIMOUSSE_I18N?: unknown }).__FRIMOUSSE_I18N = { locale, dict };
    } catch (e) {
      void e;
    }
  }, [locale, dict]);

  const t = useMemo(() => (key: string, params?: Record<string, string> | string) => {
    const raw = dict?.[key] ?? (typeof params === 'string' ? params : key);
    if (dict && !dict[key]) {
      try {
        console.warn(`[i18n] missing translation for key "${key}" (locale=${locale})`);
      } catch (e) {
        void e;
      }
    }
    if (!params || typeof params === 'string') return raw;
    return Object.keys(params).reduce((acc, k) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k] ?? '')), raw);
  }, [dict, locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
