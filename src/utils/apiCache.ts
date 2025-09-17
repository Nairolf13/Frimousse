
export const DEFAULT_TTL = 60_000; // 1 minute

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

export function setCached<T>(key: string, value: T, ttl: number = DEFAULT_TTL): void {
	const expiresAt = ttl > 0 ? now() + ttl : Number.POSITIVE_INFINITY;
	cache.set(key, { value: safeClone(value), expiresAt });
}

export function invalidate(key: string): void {
	cache.delete(key);
}

export function clearCache(): void {
	cache.clear();
}

