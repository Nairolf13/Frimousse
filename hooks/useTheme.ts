import { useState, useEffect, useCallback } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

export type Theme = 'light' | 'dark' | 'system';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
  return theme;
}

function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('app_theme') as Theme | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch { /* ignore */ }
    return 'system';
  });

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem('app_theme', t); } catch { /* ignore */ }
    applyTheme(t);
    // Persist to DB (fire-and-forget — don't block UI)
    fetchWithRefresh(`${API_URL}/user/preferences`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t }),
    }).catch(() => { /* ignore network errors */ });
  }, []);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system preference changes (only relevant in 'system' mode)
  useEffect(() => {
    if (theme !== 'system') return;
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } catch { /* ignore */ }
  }, [theme]);

  return { theme, setTheme, resolved: resolveTheme(theme) };
}
