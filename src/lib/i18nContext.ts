import { createContext } from 'react';

export type Locale = 'fr' | 'en';

export type I18nShape = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string> | string) => string;
};

export const I18nContext = createContext<I18nShape | undefined>(undefined);
