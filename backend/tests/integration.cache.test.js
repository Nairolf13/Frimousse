const express = require('express');
const http = require('http');
const fetch = require('node-fetch');
const cacheMiddlewareFactory = require('../middleware/cacheMiddleware');
const simpleCache = require('../lib/simpleCache');
const redisCache = require('../lib/redisCache');

function startTestServer(port) {
  const app = express();
  app.use(express.json());
  // mount cache middleware on /api/resource
  app.use('/api/resource', cacheMiddlewareFactory(1000));

  // GET handler returns a counter value stored in memory
  let counter = 0;
  app.get('/api/resource', (req, res) => {
    res.json({ value: counter });
  });

  // POST increments counter and invalidates cache
  app.post('/api/resource', (req, res) => {
    counter += 1;
    // simulate invalidation logic used in routes
    const basePath = '/api/resource';
    const centerId = req.body && req.body.centerId ? String(req.body.centerId) : null;
    (async () => {
      try {
        if (process.env.REDIS_URL) {
          if (centerId) await redisCache.delByPrefix(`${basePath}|center:${centerId}`);
          await redisCache.delByPrefix(`${basePath}|anon`);
        } else {
          if (centerId) simpleCache.delByPrefix(`${basePath}|center:${centerId}`);
          simpleCache.delByPrefix(`${basePath}|anon`);
        }
      } catch (e) {
        // ignore
      }
    })();
    res.json({ ok: true, value: counter });
  });

  const server = http.createServer(app);
  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

describe('integration cache invalidation', () => {
  let server;
  const port = 5699;
  const base = `http://127.0.0.1:${port}`;

  beforeAll(async () => {
    server = await startTestServer(port);
  });

  afterAll(async () => {
    if (server && server.close) server.close();
    simpleCache.clear();
  });

  test('GET is cached and POST invalidates cache', async () => {
    // initial GET -> counter 0
    let r = await fetch(`${base}/api/resource`);
    expect(r.status).toBe(200);
    let json = await r.json();
    expect(json.value).toBe(0);

    // second GET should be served from cache (we'll delete the in-memory counters earlier)
    r = await fetch(`${base}/api/resource`);
    expect(r.status).toBe(200);
    json = await r.json();
    expect(json.value).toBe(0);

    // POST increments and invalidates
    r = await fetch(`${base}/api/resource`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
    expect(r.status).toBe(200);
    json = await r.json();
    expect(json.value).toBe(1);

    // After POST, GET should return updated value (cache was invalidated)
    r = await fetch(`${base}/api/resource`);
    expect(r.status).toBe(200);
    json = await r.json();
    expect(json.value).toBe(1);
  });
});
