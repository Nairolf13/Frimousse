const Redis = require('ioredis');

let client = null;
if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL, {
    // small backoff strategy
    retryStrategy(times) {
      return Math.min(1000 + times * 200, 30000);
    }
  });
  client.on('error', (err) => {
    console.warn('[redisCache] Redis client error', err && err.message ? err.message : err);
  });
}

module.exports = {
  client,
  isEnabled() { return !!client; },
  async ping() { if (!client) return false; try { return await client.ping() === 'PONG'; } catch (e) { return false; } },
  async get(key) {
    if (!client) return null;
    try {
      const v = await client.get(key);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      console.warn('[redisCache] get failed', e && e.message ? e.message : e);
      return null;
    }
  },
  async set(key, value, ttlMs) {
    if (!client) return;
    try {
      const v = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlMs && Number(ttlMs) > 0) {
        await client.set(key, v, 'PX', Number(ttlMs));
      } else {
        await client.set(key, v);
      }
    } catch (e) {
      console.warn('[redisCache] set failed', e && e.message ? e.message : e);
    }
  },
  async del(key) {
    if (!client) return;
    try {
      await client.del(key);
    } catch (e) {
      console.warn('[redisCache] del failed', e && e.message ? e.message : e);
    }
  }
  ,
  // Delete keys by prefix using SCAN to avoid blocking Redis on large keyspaces.
  // prefix is a string prefix (not a glob); this will scan for keys starting with prefix
  async delByPrefix(prefix) {
    if (!client) return;
    try {
      const stream = client.scanStream({ match: `${prefix}*`, count: 1000 });
      const pipeline = client.pipeline();
      let any = false;
      for await (const keys of stream) {
        if (!keys || keys.length === 0) continue;
        any = true;
        for (const k of keys) pipeline.del(k);
      }
      if (any) await pipeline.exec();
    } catch (e) {
      console.warn('[redisCache] delByPrefix failed', e && e.message ? e.message : e);
    }
  }
};
