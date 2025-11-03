const simpleCache = require('../lib/simpleCache');
const redisCache = require('../lib/redisCache');

const metrics = { hits: 0, misses: 0 };
const CACHE_DEBUG = process.env.CACHE_DEBUG === '1';

// Middleware factory: cache GET responses for `ttlMs` milliseconds
function cacheMiddleware(ttlMs = 30000) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Only cache API routes
    if (!req.originalUrl.startsWith('/api')) {
      return next();
    }

    const userIdPart = req.user?.id ? `|uid:${req.user.id}` : '|anon';
    const centerId = req.user?.centerId || req.query?.centerId || null;
    const centerPart = centerId ? `|center:${centerId}` : '';
    const key = `${req.originalUrl}${centerPart}${userIdPart}`;

    // Try Redis first if configured
    if (process.env.REDIS_URL) {
      try {
        const cachedRaw = await redisCache.get(key);
        if (cachedRaw) {
          if (CACHE_DEBUG) console.log('[cache] HIT', key);
          metrics.hits++;
          res.set(cachedRaw.headers || {});
          return res.status(200).send(cachedRaw.body);
        }
        if (CACHE_DEBUG) { console.log('[cache] MISS', key); metrics.misses++; }
      } catch (e) {
        console.warn('Redis cache read failed', e?.message || e);
      }
    } else {
      const cached = simpleCache.get(key);
      if (cached) {
        if (CACHE_DEBUG) console.log('[cache] HIT', key);
        metrics.hits++;
        res.set(cached.headers || {});
        return res.status(200).send(cached.body);
      }
      if (CACHE_DEBUG) { console.log('[cache] MISS', key); metrics.misses++; }
    }

    // Hijack res.send to capture the body
    const originalSend = res.send.bind(res);
    res.send = async (body) => {
      try {
        const headers = {};
        ['content-type', 'cache-control'].forEach(h => {
          const v = res.getHeader ? res.getHeader(h) : res.get(h);
          if (v) headers[h] = v;
        });

        if (process.env.REDIS_URL) {
          try {
            await redisCache.set(key, { body, headers }, ttlMs);
          } catch (e) {
            console.warn('Redis cache set failed', e?.message || e);
          }
        } else {
          simpleCache.set(key, { body, headers }, ttlMs);
        }
      } catch (e) {
        console.warn('Cache save failed', e?.message || e);
      }
      return originalSend(body);
    };

    next();
  };
}

module.exports = cacheMiddleware;
module.exports._metrics = metrics;
