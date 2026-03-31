import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface CenterSettings {
  dailyRate: number;
  childCotisationAmount: number;
  nannyCotisationAmount: number;
}

const defaults: CenterSettings = {
  dailyRate: 2,
  childCotisationAmount: 15,
  nannyCotisationAmount: 10,
};

const CenterSettingsContext = createContext<{
  settings: CenterSettings;
  reload: () => void;
  settingsVersion: number;
}>({ settings: defaults, reload: () => {}, settingsVersion: 0 });

export function CenterSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CenterSettings>(defaults);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const API_URL = import.meta.env.VITE_API_URL || '';

  const isAdmin = !!(user && (user.role === 'admin' || user.role === 'super-admin'));

  const reload = useCallback(() => {
    if (!isAdmin) return;
    fetch(`${API_URL}/centers/settings`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setSettings({
            dailyRate: d.dailyRate ?? 2,
            childCotisationAmount: d.childCotisationAmount ?? 15,
            nannyCotisationAmount: d.nannyCotisationAmount ?? 10,
          });
          setSettingsVersion(v => v + 1);
        }
      })
      .catch(() => {});
  }, [isAdmin, API_URL]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <CenterSettingsContext.Provider value={{ settings, reload, settingsVersion }}>
      {children}
    </CenterSettingsContext.Provider>
  );
}

export function useCenterSettings() {
  return useContext(CenterSettingsContext);
}
