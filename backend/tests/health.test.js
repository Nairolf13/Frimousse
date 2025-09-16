const express = require('express');
const fetch = require('node-fetch');

describe('health endpoint', () => {
  let server;
  beforeAll((done) => {
    const app = express();
    app.get('/api/_health', async (req, res) => {
      try {
        const redisCache = require('../lib/redisCache');
        const cacheMiddleware = require('../middleware/cacheMiddleware');
        const redisOk = await (redisCache && redisCache.ping ? redisCache.ping() : false);
        const metrics = cacheMiddleware._metrics || { hits: 0, misses: 0 };
        return res.json({ ok: true, redis: !!redisOk, cacheMetrics: metrics });
      } catch (e) {
        return res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
      }
    });
    server = app.listen(4999, '127.0.0.1', () => done());
  });

  afterAll(() => {
    if (server) server.close();
  });

  test('GET /api/_health', async () => {
    const res = await fetch('http://localhost:4999/api/_health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('ok');
    expect(body).toHaveProperty('cacheMetrics');
  }, 10000);
});
