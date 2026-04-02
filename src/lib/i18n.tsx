import React, { useEffect, useMemo, useState } from 'react';
import { I18nContext } from './i18nContext';
import type { Locale } from './i18nContext';
import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';
import ar from './locales/ar.json';

const translations: Record<Locale, Record<string, string>> = { fr, en, es, ar };

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem('site_language');
      if (saved === 'en') return 'en';
      if (saved === 'es') return 'es';
      if (saved === 'ar') return 'ar';
      return 'fr';
    } catch {
      return 'fr';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.lang = locale;
      document.documentElement.dir = 'ltr';
      localStorage.setItem('site_language', locale);
      document.cookie = `site_language=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
      try {
        (window as unknown as { __FRIMOUSSE_I18N?: unknown }).__FRIMOUSSE_I18N = { locale, translations };
      } catch (e) {
        void e;
      }
    } catch {
      // ignore
    }
  }, [locale]);

  const t = useMemo(() => (key: string, params?: Record<string, string> | string) => {
    const raw = translations[locale]?.[key] ?? (typeof params === 'string' ? params : key);
    if (!translations[locale]?.[key]) {
      try {
        console.warn(`[i18n] missing translation for key "${key}" (locale=${locale})`);
      } catch (e) {
        void e;
      }
    }
    if (!params || typeof params === 'string') return raw;
    return Object.keys(params).reduce((acc, k) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k] ?? '')), raw);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
