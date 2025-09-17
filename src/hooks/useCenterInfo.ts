import { useEffect, useRef, useState, useCallback } from 'react';
import { getCached, setCached } from '../utils/apiCache';
import { publishRateLimit, subscribeRateLimit } from '../utils/rateLimitSync';

type CenterInfo = { name?: string | null } | null;

export function useCenterInfo(centerId: string | null) {
  const [center, setCenter] = useState<CenterInfo>(null);
  const rateLimitUntilRef = useRef<number>(0);
  const consecutive429Ref = useRef<number>(0);

  useEffect(() => {
    const unsub = subscribeRateLimit((rec) => {
      if (!rec || !rec.key) return;
      if (centerId && rec.key === `/api/centers/${centerId}` && typeof rec.until === 'number') {
        rateLimitUntilRef.current = Math.max(rateLimitUntilRef.current, rec.until || 0);
      }
    });
    return () => unsub();
  }, [centerId]);

  const load = useCallback(async () => {
    if (!centerId) {
      setCenter(null);
      return;
    }
    try {
      if (rateLimitUntilRef.current > Date.now()) return;
      const cacheKey = `/api/centers/${centerId}`;
      const cached = getCached<{ name?: string }>(cacheKey);
      if (cached) {
        setCenter({ name: cached.name || null });
        return;
      }
      const res = await fetch(`/centers/${centerId}`, { credentials: 'include' });
      if (res.status === 429) {
        consecutive429Ref.current = Math.min(3, consecutive429Ref.current + 1);
        const backoff = Math.min(10_000 * Math.pow(2, consecutive429Ref.current - 1), 40_000);
        const until = Date.now() + backoff;
        rateLimitUntilRef.current = Math.max(rateLimitUntilRef.current, until);
        publishRateLimit(`/api/centers/${centerId}`, rateLimitUntilRef.current);
        return;
      }
      if (!res.ok) {
        setCenter(null);
        return;
      }
      consecutive429Ref.current = 0;
      const data = await res.json();
      setCenter({ name: data.name || null });
      setCached(cacheKey, { name: data.name || null }, 60_000);
    } catch {
      setCenter(null);
    }
  }, [centerId]);

  useEffect(() => { void load(); }, [load]);

  return { center, refresh: load } as const;
}

export default useCenterInfo;
