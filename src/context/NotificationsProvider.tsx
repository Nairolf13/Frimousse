import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithRefresh } from '../../utils/fetchWithRefresh';
import { getCached, setCached } from '../utils/apiCache';
import { publishRateLimit } from '../utils/rateLimitSync';
import NotificationsContext from './notificationsContext';
import { useAuth } from './AuthContext';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState<number>(0);
  const [unreadReviews, setUnreadReviews] = useState<number | undefined>(undefined);
  const pollingRef = useRef<number | null>(null);
  const leaderRef = useRef<boolean>(false);
  const consecutive429 = useRef<number>(0);
  const pollingIntervalRef = useRef<number>(30_000);
  const loadDebounceRef = useRef<number | null>(null);
  const { user } = useAuth();

  // elect a leader: simplest approach — the first tab that mounts becomes the leader by writing to localStorage
  const bc = React.useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) return new BroadcastChannel('__frimousse_notifications__');
    return null;
  }, []);

  // publish notification counts to other tabs
  const publish = useCallback((count: number, reviewsCount?: number) => {
    setUnread(count);
    try {
      // Prefer BroadcastChannel for inter-tab messaging
      if (bc) {
        bc.postMessage({ unread: count, unreadReviews: typeof reviewsCount === 'number' ? reviewsCount : undefined });
      } else if (typeof sessionStorage !== 'undefined') {
        // sessionStorage persists across reloads in the same tab (good for keeping badge after refresh)
        sessionStorage.setItem('__frimousse_unread__', String(count));
        if (typeof reviewsCount === 'number') sessionStorage.setItem('__frimousse_unread_reviews__', String(reviewsCount));
      } else {
        // fallback to localStorage for older envs
        localStorage.setItem('__frimousse_unread__', String(count));
      }
    } catch {
      // broadcasting/storage may fail in some environments — ignore
    }
  }, [bc]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // BroadcastChannel delivers { data: ... } in some environments, in others the event is the payload
      const maybe = (e as unknown) as { data?: unknown };
      const payload = maybe && maybe.data ? maybe.data : (e as unknown);
      if (payload && typeof payload === 'object') {
        const p = payload as { unread?: number | string; unreadReviews?: number | string; viewedAt?: number | string };
        // If another tab signals the notifications were viewed, clear the badge
        if ('viewedAt' in p && p.viewedAt) {
          setUnread(0);
          return;
        }
        if ('unread' in p) setUnread(Number(p.unread || 0));
        if ('unreadReviews' in p) setUnreadReviews(Number(p.unreadReviews ?? 0));
      }
    }
    function onStorage(e: StorageEvent) {
      if (e.key === '__frimousse_unread__' && e.newValue != null) {
        const v = Number(e.newValue || '0');
        setUnread(v);
      }
      if (e.key === '__frimousse_viewed__' && e.newValue != null) {
        // another tab marked the notifications as viewed -> remove badge locally
        setUnread(0);
      }
    }
    // Initialize from sessionStorage if available so badge survives reload in the same tab
    try {
      if (typeof sessionStorage !== 'undefined') {
        const s = sessionStorage.getItem('__frimousse_unread__');
        const sr = sessionStorage.getItem('__frimousse_unread_reviews__');
        if (s != null) setUnread(Number(s || '0'));
        if (sr != null) setUnreadReviews(Number(sr || '0'));
      }
    } catch {
      // ignore
    }
    // also listen to a custom event to mark notifications as viewed when the user visits the Notifications page
    function onViewed() {
      try {
        // persist a small marker in sessionStorage so reload keeps the viewed state in this tab
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('__frimousse_viewed__', String(Date.now()));
      } catch {
        // ignore
      }
      setUnread(0);
      try {
        if (bc) bc.postMessage({ viewedAt: Date.now() });
        else if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('__frimousse_viewed__', String(Date.now()));
      } catch {
        // ignore
      }
    }

    if (bc) {
      bc.addEventListener('message', onMessage as EventListener);
    } else if (typeof window !== 'undefined') {
      // fallback: listen to localStorage changes (sessionStorage doesn't fire storage events across tabs)
      window.addEventListener('storage', onStorage as EventListener);
    }
    if (typeof window !== 'undefined') window.addEventListener('notifications:viewed', onViewed as EventListener);

    return () => {
      if (bc) bc.removeEventListener('message', onMessage as EventListener);
      else if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage as EventListener);
      if (typeof window !== 'undefined') window.removeEventListener('notifications:viewed', onViewed as EventListener);
    };
  }, [bc]);

  const load = useCallback(async () => {
    const cacheKey = '/api/notifications/unread-count';
    try {
      // If there's no authenticated user, don't attempt notification API calls which will return 401.
      if (!user) {
        return;
      }
      const cached = getCached<{ unread: number }>(cacheKey);
      if (cached) {
        publish(Number(cached.unread) || 0);
        return;
      }
      const res = await fetchWithRefresh('/api/notifications/unread-count', { credentials: 'include' });
      if (res.status === 429) {
        consecutive429.current = Math.min(3, consecutive429.current + 1);
        // increase polling interval: 30s -> 60s -> 120s
        pollingIntervalRef.current = Math.min(30_000 * Math.pow(2, consecutive429.current - 1), 120_000);
        const ra = res.headers.get('Retry-After');
        const retry = ra ? parseInt(ra, 10) : NaN;
        const until = !Number.isNaN(retry) ? Date.now() + retry * 1000 : Date.now() + pollingIntervalRef.current;
        publishRateLimit('/api/notifications/unread-count', until);
        return;
      }
      if (!res.ok) {
        return publish(0);
      }
      consecutive429.current = 0;
      const j = await res.json();
      const value = Number(j.unread) || 0;
      setCached(cacheKey, { unread: value }, 15_000);
      publish(value);
    } catch (e) {
      console.error('[NotificationsProvider] Error loading notifications:', e);
      publish(0);
    }
  }, [publish, user]);

  // Admin-only: poll pending reviews count and publish as part of notifications
  const reviewsPollRef = useRef<number | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      // only poll for admins/super-admins
      if (!user || !user.role || (!String(user.role).toLowerCase().includes('admin') && !String(user.role).toLowerCase().includes('super'))) {
        setUnreadReviews(undefined);
        return;
      }
      const cacheKey = '/api/reviews/pending-count';
      const cached = getCached<{ pending: number }>(cacheKey);
      if (cached) {
        const pendingValue = Number(cached.pending) || 0;
        setUnreadReviews(pendingValue);
        try {
          if (bc) bc.postMessage({ unread, unreadReviews: pendingValue });
          else if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('__frimousse_unread_reviews__', String(pendingValue));
          else localStorage.setItem('__frimousse_unread_reviews__', String(pendingValue));
        } catch {
          // ignore broadcast/storage failures
        }
        return;
      }
      const res = await fetchWithRefresh('/api/reviews/admin', { credentials: 'include' });
      if (!res.ok) return;
      const j = await res.json();
      const list = Array.isArray(j.reviews) ? j.reviews : j;
      const pending = list.filter((r: unknown) => {
        if (!r || typeof r !== 'object') return false;
        const rr = r as { approved?: unknown };
        return rr.approved !== true;
      }).length;
      setCached(cacheKey, { pending }, 15_000);
      setUnreadReviews(pending);
      try {
        if (bc) bc.postMessage({ unread, unreadReviews: pending });
        else if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('__frimousse_unread_reviews__', String(pending));
        else localStorage.setItem('__frimousse_unread_reviews__', String(pending));
      } catch {
        // ignore
      }
    } catch {
      // ignore errors when fetching reviews count
    }
  }, [user, unread, bc]);

  const startPolling = useCallback(() => {
    // Do not start polling when user is not authenticated to avoid unnecessary 401s and refresh attempts
    if (!user) return;
    if (pollingRef.current != null) return;
    // simple leader election: if another tab is already leader, don't duplicate polling
    // Check a localStorage flag set by leader
    try {
      const leader = localStorage.getItem('__frimousse_notifications_leader__');
      if (!leader) {
        // claim leadership
        localStorage.setItem('__frimousse_notifications_leader__', String(Date.now()));
        leaderRef.current = true;
      } else {
        // If an existing leader key is stale (older than 60s), take over leadership
        const ts = Number(leader);
        const age = Number.isFinite(ts) ? Date.now() - ts : Number.MAX_SAFE_INTEGER;
        if (age > 60_000) {
          // assume previous leader died; take over
          localStorage.setItem('__frimousse_notifications_leader__', String(Date.now()));
          leaderRef.current = true;
        }
      }
    } catch {
      // ignore
    }

    if (!leaderRef.current) return; // only leader polls
    // immediate load
    void load();
    void loadReviews();
    pollingRef.current = window.setInterval(() => { void load(); }, pollingIntervalRef.current);
    // a separate interval for reviews to avoid coupling — keep ref to clear later
    reviewsPollRef.current = window.setInterval(() => { void loadReviews(); }, pollingIntervalRef.current);
  }, [load, loadReviews, user]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current != null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (reviewsPollRef.current != null) {
      clearInterval(reviewsPollRef.current);
      reviewsPollRef.current = null;
    }
    if (leaderRef.current) {
    try { localStorage.removeItem('__frimousse_notifications_leader__'); } catch (e) { console.debug('failed to release leader', e); }
      leaderRef.current = false;
    }
  }, []);

  // Rafraîchir immédiatement quand l'utilisateur se connecte
  useEffect(() => {
    if (user) {
      void load();
      void loadReviews();
    }
  }, [user, load, loadReviews]);

  // Écouter les changements de notifications (marquées comme lues, supprimées, etc.)
  useEffect(() => {
    const handleNotificationsChanged = () => {
      if (user) {
        void load();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('notifications:changed', handleNotificationsChanged);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('notifications:changed', handleNotificationsChanged);
      }
    };
  }, [user, load]);

  useEffect(() => {
    // start polling by default in the first mounted tab
    startPolling();
    
    // Fonction debouncée pour rafraîchir (évite les appels multiples en rafale)
    const debouncedLoad = () => {
      if (loadDebounceRef.current) {
        clearTimeout(loadDebounceRef.current);
      }
      loadDebounceRef.current = window.setTimeout(() => {
        if (user) {
          void load();
        }
        loadDebounceRef.current = null;
      }, 300); // 300ms debounce
    };
    
    // Écouter les messages du service worker (notification push reçue)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'push-received') {
        debouncedLoad();
      }
    };
    
    if (typeof window !== 'undefined') {
      // Écouter les messages du service worker
      navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
      // Aussi rafraîchir quand la fenêtre reprend le focus (notifications reçues en arrière-plan)
      window.addEventListener('focus', debouncedLoad);
    }
    
    return () => {
      stopPolling();
      if (loadDebounceRef.current) {
        clearTimeout(loadDebounceRef.current);
      }
      if (typeof window !== 'undefined') {
        navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
        window.removeEventListener('focus', debouncedLoad);
      }
    };
  }, [startPolling, stopPolling, load]);

  const value = { unreadCount: unread, unreadReviews, refresh: load, refreshReviews: loadReviews };
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export default NotificationsProvider;
