const simpleCache = require('../lib/simpleCache');
const redisCache = require('../lib/redisCache');
// lightweight in-memory metrics (not persisted) for quick debugging
const metrics = { hits: 0, misses: 0 };
const CACHE_DEBUG = process.env.CACHE_DEBUG === '1';

// Middleware factory: cache GET responses for `ttlMs` milliseconds. Keyed by path + query.
// Usage: app.use('/api/foo', cacheMiddleware(30*1000));
function cacheMiddleware(ttlMs = 30000) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    // include user id when available to avoid serving one user's data to another
    const userIdPart = req.user && req.user.id ? `|uid:${String(req.user.id)}` : '|anon';
    // include center id when available (from authenticated user or query param) so
    // routes that are center-scoped (like /api/nannies) can be safely cached per-center
    const centerId = (req.user && req.user.centerId) || req.query && req.query.centerId || null;
    const centerPart = centerId ? `|center:${String(centerId)}` : '';

    // build key from originalUrl (path + query) and the user/center parts
    const key = `${req.originalUrl}${centerPart}${userIdPart}`;

    // Try redis first if configured
    if (process.env.REDIS_URL) {
      try {
        const cachedRaw = await redisCache.get(key);
        if (cachedRaw) {
          if (CACHE_DEBUG) console.log('[cache] HIT', key);
          metrics.hits++;
          // cachedRaw expected to be { body, headers }
          res.set(cachedRaw.headers || {});
          return res.status(200).send(cachedRaw.body);
        }
        if (CACHE_DEBUG) { console.log('[cache] MISS', key); metrics.misses++; }
      } catch (e) {
        console.warn('Redis cache read failed', e && e.message ? e.message : e);
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

    // hijack res.send to capture the body
    const originalSend = res.send.bind(res);
    res.send = async (body) => {
      try {
        const headers = {};
        // capture a small set of headers useful for clients
        ['content-type', 'cache-control'].forEach(h => {
          const v = res.getHeader ? res.getHeader(h) : res.get(h);
          if (v) headers[h] = v;
        });
        if (process.env.REDIS_URL) {
          try {
            await redisCache.set(key, { body, headers }, ttlMs);
          } catch (e) {
            console.warn('Redis cache set failed', e && e.message ? e.message : e);
          }
        } else {
          simpleCache.set(key, { body, headers }, ttlMs);
        }
      } catch (e) {
        // caching should never break the response
        console.warn('Cache save failed', e && e.message ? e.message : e);
      }
      return originalSend(body);
    };
    next();
  };
}

module.exports = cacheMiddleware;
module.exports._metrics = metrics;
