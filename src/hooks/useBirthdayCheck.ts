import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

type BirthdayItem = { id: string; name: string; dob: string; photoUrl?: string };

// module-level map to deduplicate concurrent fetches for the same centerId
const inFlightFetches = new Map<string, Promise<{ birthdays?: BirthdayItem[] }>>();

export default function useBirthdayCheck(centerId?: string) {
  const [birthdays, setBirthdays] = useState<BirthdayItem[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // If there's already an in-flight fetch for this center, reuse it
        let fetchPromise = inFlightFetches.get(centerId);
        if (!fetchPromise) {
          const url = API_URL ? `${API_URL}/centers/${centerId}/birthdays/today` : `/api/centers/${centerId}/birthdays/today`;
          fetchPromise = (async () => {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) return { birthdays: [] };
            const data = await res.json();
            return { birthdays: Array.isArray(data.birthdays) ? data.birthdays : [] };
          })();
          inFlightFetches.set(centerId, fetchPromise);
        }

        const result = await fetchPromise;
        if (!cancelled) setBirthdays(result.birthdays ?? []);
      } catch {
        if (!cancelled) setBirthdays([]);
      } finally {
        if (!cancelled) setLoading(false);
        // clear in-flight entry for this centerId so subsequent calls will refetch later
        inFlightFetches.delete(centerId);
      }
    })();
    return () => { cancelled = true; };
  }, [centerId]);

  return { birthdays, loading };
}
