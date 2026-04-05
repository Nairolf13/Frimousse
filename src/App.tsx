import AppRoutes from '../routes';
import { useEffect, useState } from 'react';
import { AuthContext, useAuth } from './context/AuthContext';
import { CenterSettingsProvider } from './context/CenterSettingsContext';
import { AssistantProvider } from './context/AssistantContext';
import NotificationsProvider from './context/NotificationsProvider';
import type { User } from './context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { HelmetProvider } from 'react-helmet-async';
import CookieConsentBanner from './components/CookieConsent';
import { writeLocalConsent } from './utils/cookieConsent';
import { useI18n } from './lib/useI18n';

// Synchronise BDD → local dès que l'user est connu (multi-appareils)
function UserPreferencesSync() {
  const { user } = useAuth();
  const { setLocale } = useI18n();

  useEffect(() => {
    if (!user) return;
    if (user.language === 'fr' || user.language === 'en' || user.language === 'es') {
      setLocale(user.language);
      try { localStorage.setItem('site_language', user.language); } catch { /* ignore */ }
    }
    if (user.cookieConsent === 'all' || user.cookieConsent === 'essential') {
      writeLocalConsent(user.cookieConsent);
    }
    if (Array.isArray(user.tutorialCompleted) && user.tutorialCompleted.length > 0) {
      try { localStorage.setItem('tutorial_completed', JSON.stringify(user.tutorialCompleted)); } catch { /* ignore */ }
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function prefetchRoutes() {
  const imports = [
    () => import('../pages/Dashboard'),
    () => import('../pages/Children'),
    () => import('../pages/Nannies'),
    () => import('../pages/ParentDashboard'),
    () => import('../pages/PresenceSheets'),
    () => import('../pages/Feed'),
    () => import('../pages/MonPlanning'),
    () => import('../pages/Settings'),
    () => import('../pages/Notifications'),
    () => import('../pages/ReportsPage'),
    () => import('../components/ProtectedLayout'),
  ];
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
      imports.forEach(fn => fn().catch(() => null));
    });
  } else {
    setTimeout(() => imports.forEach(fn => fn().catch(() => null)), 2000);
  }
}

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    // Skip authentication check on public pages to avoid 401 errors in console
    const publicPaths = ['/', '/about', '/fonctionnalites', '/tarifs', '/support', '/confidentialite', '/cgu', '/mentions-legales', '/guide-demarrage', '/guide-ajouter-enfant', '/guide-planning', '/guide-export-rapport', '/guide-securite', '/login', '/register', '/reset-password', '/invite', '/annuaire'];
    if (typeof window !== 'undefined' && publicPaths.includes(window.location.pathname)) {
      return;
    }

    fetchWithRefresh('/api/user/me', { credentials: 'include' })
      .then(res => res && res.ok ? res.json() : null)
      .then(async data => {
        setUser(data);
        if (data) prefetchRoutes();
        try {
          // if authenticated and there's a registered service worker subscription, associate it to this user
          if (data && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              const clientSub = await reg.pushManager.getSubscription();
              if (clientSub) {
                try {
                  // fetch current subscriptions for this user and compare endpoints to avoid redundant associate calls
                  const meRes = await fetch('/api/push-subscriptions/me', { credentials: 'include' });
                  if (meRes && meRes.ok) {
                    const json = await meRes.json();
                    type SubRow = { subscription?: { endpoint?: string } };
                    const existing: SubRow[] = Array.isArray(json.subscriptions) ? json.subscriptions : [];
                    const exists = existing.some((s: SubRow) => s && s.subscription && s.subscription.endpoint === clientSub.endpoint);
                    if (!exists) {
                      await fetch('/api/push-subscriptions/associate', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subscription: clientSub })
                      }).catch(() => null);
                    }
                  } else {
                    // If /me fails, fall back to attempting to associate once
                    await fetch('/api/push-subscriptions/associate', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subscription: clientSub })
                    }).catch(() => null);
                  }
                } catch {
                  // ignore inner errors
                }
              }
            }
          }
        } catch {
          // ignore association errors
        }
      })
      .catch(() => setUser(null)); // null = unauthenticated (triggers redirect)
  }, []);
  return (
    <HelmetProvider>
      <AuthContext.Provider value={{ user, setUser }}>
        <UserPreferencesSync />
        <CookieConsentBanner />
        <CenterSettingsProvider>
          <NotificationsProvider>
            <AssistantProvider>
              <AppRoutes />
            </AssistantProvider>
          </NotificationsProvider>
        </CenterSettingsProvider>
      </AuthContext.Provider>
    </HelmetProvider>
  );
}

export default App
