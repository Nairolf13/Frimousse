import { useContext } from 'react';
import { I18nContext } from './i18nContext';
import type { I18nShape } from './i18nContext';

export function useI18n() {
  const ctx = useContext(I18nContext) as I18nShape | undefined;
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
