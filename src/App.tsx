import AppRoutes from '../routes';
import { useEffect, useState } from 'react';
import { AuthContext } from './context/AuthContext';
import type { User } from './context/AuthContext';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { HelmetProvider } from 'react-helmet-async';

function App() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetchWithRefresh('/api/user/me')
      .then(res => res && res.ok ? res.json() : null)
      .then(async data => {
        setUser(data);
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
      .catch(() => setUser(null));
  }, []);
  return (
    <HelmetProvider>
      <AuthContext.Provider value={{ user }}>
        <AppRoutes />
      </AuthContext.Provider>
    </HelmetProvider>
  );
}

export default App
