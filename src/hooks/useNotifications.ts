import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchWithRefresh } from '../../utils/fetchWithRefresh';
import { getCached, setCached, invalidate } from '../utils/apiCache';
import { publishRateLimit, subscribeRateLimit } from '../utils/rateLimitSync';

type UseNotificationsOptions = {
  pollingInterval?: number; // ms
  autoStart?: boolean;
};

export function useNotifications(opts: UseNotificationsOptions = {}) {
  const pollingInterval = opts.pollingInterval ?? 30_000;
  const autoStart = opts.autoStart ?? true;

  const [unread, setUnread] = useState<number>(0);
  const intervalRef = useRef<number | null>(null);
  const runningRef = useRef<boolean>(false);
  const consecutive429Ref = useRef<number>(0);
  const rateLimitUntilRef = useRef<number>(0);

  // Subscribe to cross-tab suppression so we can update our local window
  useEffect(() => {
    const unsub = subscribeRateLimit((rec) => {
      if (!rec || !rec.key) return;
      if (rec.key === '/api/notifications/unread-count' && typeof rec.until === 'number') {
        rateLimitUntilRef.current = Math.max(rateLimitUntilRef.current, rec.until || 0);
      }
    });
    return () => unsub();
  }, []);

  const load = useCallback(async () => {
    const cacheKey = '/api/notifications/unread-count';
    try {
      const cached = getCached<{ unread: number }>(cacheKey);
      if (cached) {
        setUnread(Number(cached.unread) || 0);
        return;
      }

      if (rateLimitUntilRef.current > Date.now()) return;

      const res = await fetchWithRefresh('/api/notifications/unread-count', { credentials: 'include' });
      if (res.status === 429) {
        // exponential backoff on consecutive 429s: 10s -> 20s -> 40s (cap 40s)
        consecutive429Ref.current = Math.min(3, consecutive429Ref.current + 1);
        const backoff = Math.min(10_000 * Math.pow(2, consecutive429Ref.current - 1), 40_000);
        const until = Date.now() + backoff;
        rateLimitUntilRef.current = Math.max(rateLimitUntilRef.current, until);
        publishRateLimit('/api/notifications/unread-count', rateLimitUntilRef.current);
        return;
      }

      if (!res.ok) {
        // don't change consecutive429 on other errors, but ensure unread is safe
        setUnread(0);
        return;
      }

      consecutive429Ref.current = 0;
      const j = await res.json();
      const value = Number(j.unread) || 0;
      setCached(cacheKey, { unread: value }, 15_000);
      setUnread(value);
    } catch {
      // network error
      setUnread(0);
    }
  }, []);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    // immediate load
    void load();
    // set interval
    intervalRef.current = window.setInterval(() => { void load(); }, pollingInterval);
  }, [load, pollingInterval]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // allow external invalidation trigger
  useEffect(() => {
    function onChange() {
      invalidate('/api/notifications/unread-count');
      void load();
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('notifications:changed', onChange as EventListener);
    }
    return () => { if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('notifications:changed', onChange as EventListener); };
  }, [load]);

  // auto start when requested
  useEffect(() => {
    if (autoStart) start();
    return () => stop();
  }, [autoStart, start, stop]);

  return { unreadCount: unread, start, stop, refresh: load } as const;
}

export default useNotifications;
