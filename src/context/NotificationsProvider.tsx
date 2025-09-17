import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithRefresh } from '../../utils/fetchWithRefresh';
import { getCached, setCached } from '../utils/apiCache';
import { publishRateLimit } from '../utils/rateLimitSync';
import NotificationsContext from './notificationsContext';

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState<number>(0);
  const pollingRef = useRef<number | null>(null);
  const leaderRef = useRef<boolean>(false);
  const consecutive429 = useRef<number>(0);
  const pollingIntervalRef = useRef<number>(30_000);

  // elect a leader: simplest approach — the first tab that mounts becomes the leader by writing to localStorage
  const bc = React.useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) return new BroadcastChannel('__frimousse_notifications__');
    return null;
  }, []);

  const publish = useCallback((count: number) => {
    setUnread(count);
    try {
      if (bc) bc.postMessage({ unread: count });
      else localStorage.setItem('__frimousse_unread__', String(count));
    } catch {
      // ignore
    }
  }, [bc]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // BroadcastChannel delivers { data: ... } in some environments, in others the event is the payload
      const maybe = (e as unknown) as { data?: unknown };
      const payload = maybe && maybe.data ? maybe.data : (e as unknown);
      if (payload && typeof payload === 'object' && 'unread' in (payload as object)) {
        const p = payload as { unread?: number | string };
        const val = Number(p.unread || 0);
        setUnread(val);
      }
    }
    function onStorage(e: StorageEvent) {
      if (e.key === '__frimousse_unread__' && e.newValue != null) {
        const v = Number(e.newValue || '0');
        setUnread(v);
      }
    }
    if (bc) {
      bc.addEventListener('message', onMessage as EventListener);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage as EventListener);
    }
    return () => {
      if (bc) bc.removeEventListener('message', onMessage as EventListener);
      else if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage as EventListener);
    };
  }, [bc]);

  const load = useCallback(async () => {
    const cacheKey = '/api/notifications/unread-count';
    try {
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
      if (!res.ok) return publish(0);
      consecutive429.current = 0;
      const j = await res.json();
      const value = Number(j.unread) || 0;
      setCached(cacheKey, { unread: value }, 15_000);
      publish(value);
    } catch {
      publish(0);
    }
  }, [publish]);

  const startPolling = useCallback(() => {
    if (pollingRef.current != null) return;
    // simple leader election: if another tab is already leader, don't duplicate polling
    // Check a localStorage flag set by leader
    try {
      const leader = localStorage.getItem('__frimousse_notifications_leader__');
      if (!leader) {
        // claim leadership
        localStorage.setItem('__frimousse_notifications_leader__', String(Date.now()));
        leaderRef.current = true;
      }
    } catch {
      // ignore
    }

    if (!leaderRef.current) return; // only leader polls
    // immediate load
    void load();
    pollingRef.current = window.setInterval(() => { void load(); }, pollingIntervalRef.current);
  }, [load]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current != null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (leaderRef.current) {
    try { localStorage.removeItem('__frimousse_notifications_leader__'); } catch (e) { console.debug('failed to release leader', e); }
      leaderRef.current = false;
    }
  }, []);

  useEffect(() => {
    // start polling by default in the first mounted tab
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const value = { unreadCount: unread, refresh: load };
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export default NotificationsProvider;
