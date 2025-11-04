
export const DEFAULT_TTL = 60_000; // 1 minute
const PERSIST_PREFIX = 'frimousse:apiCache:';

type CacheEntry = { value: unknown; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function now() {
	return Date.now();
}

function safeClone<T>(v: T): T {
		try {
			// prefer structuredClone when available
			const g = globalThis as unknown as { structuredClone?: ((arg: unknown) => unknown) };
			if (typeof g.structuredClone === 'function') {
				return g.structuredClone(v) as T;
			}
			return JSON.parse(JSON.stringify(v));
		} catch {
			return v;
		}
}

export function getCached<T>(key: string): T | undefined {
	const e = cache.get(key);
	if (!e) return undefined;
	if (e.expiresAt && e.expiresAt < now()) {
		cache.delete(key);
		return undefined;
	}
	return safeClone(e.value) as T;
}

// Try localStorage fallback for persisted entries
export function getPersistedCached<T>(key: string): T | undefined {
	try {
		const raw = localStorage.getItem(PERSIST_PREFIX + key);
		if (!raw) return undefined;
		const parsed = JSON.parse(raw) as { value: unknown; expiresAt: number };
		if (parsed.expiresAt && parsed.expiresAt < now()) {
			localStorage.removeItem(PERSIST_PREFIX + key);
			return undefined;
		}
		// populate in-memory cache for faster subsequent calls
		cache.set(key, { value: safeClone(parsed.value), expiresAt: parsed.expiresAt });
		return safeClone(parsed.value) as T;
	} catch {
		return undefined;
	}
}

export function setCached<T>(key: string, value: T, ttl: number = DEFAULT_TTL, persist = false): void {
	const expiresAt = ttl > 0 ? now() + ttl : Number.POSITIVE_INFINITY;
	cache.set(key, { value: safeClone(value), expiresAt });
	if (persist) {
		try {
			localStorage.setItem(PERSIST_PREFIX + key, JSON.stringify({ value: safeClone(value), expiresAt }));
		} catch {
			// ignore storage errors (quota/privacy/incognito)
		}
	}
}

export function invalidate(key: string): void {
	cache.delete(key);
	try { localStorage.removeItem(PERSIST_PREFIX + key); } catch { /* ignore */ }
}

export function clearCache(): void {
	cache.clear();
	try {
		// remove persisted keys
		for (const k of Object.keys(localStorage)) {
			if (k && k.startsWith(PERSIST_PREFIX)) localStorage.removeItem(k);
		}
	} catch { /* ignore */ }
}

