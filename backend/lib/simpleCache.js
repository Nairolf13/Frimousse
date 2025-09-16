// Very small in-memory cache with TTL for quick rate-limiting / caching needs.
// Not suitable for horizontal scaling — use Redis in production.
class SimpleCache {
  constructor() {
    this.map = new Map();
    this.cleanupInterval = 60 * 1000; // cleanup every minute
    this._startCleanup();
  }

  _startCleanup() {
    this._cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.map.entries()) {
        if (v.expiry && v.expiry <= now) this.map.delete(k);
      }
    }, this.cleanupInterval);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiry && entry.expiry <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    const entry = { value };
    if (ttlMs && Number(ttlMs) > 0) entry.expiry = Date.now() + Number(ttlMs);
    this.map.set(key, entry);
  }

  del(key) {
    this.map.delete(key);
  }

  // Delete all keys that start with prefix
  delByPrefix(prefix) {
    if (!prefix) return;
    for (const k of Array.from(this.map.keys())) {
      if (String(k).startsWith(prefix)) this.map.delete(k);
    }
  }

  clear() {
    this.map.clear();
  }
}

module.exports = new SimpleCache();
