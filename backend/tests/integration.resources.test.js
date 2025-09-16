const express = require('express');
const http = require('http');
const fetch = require('node-fetch');
const cacheMiddlewareFactory = require('../middleware/cacheMiddleware');
const simpleCache = require('../lib/simpleCache');
const redisCache = require('../lib/redisCache');

function startTestServerFor(basePath, port) {
  const app = express();
  app.use(express.json());
  // mount cache middleware on the basePath
  app.use(basePath, cacheMiddlewareFactory(1000));

  // simple in-memory "DB" per server instance
  let counter = 0;

  app.get(basePath, (req, res) => {
    res.json({ value: counter });
  });

  app.post(basePath, (req, res) => {
    counter += 1;
    // simulate invalidation logic
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
      } catch (e) { /* ignore */ }
    })();
    res.json({ ok: true, value: counter });
  });

  const server = http.createServer(app);
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

const bases = ['/api/feed', '/api/assignments', '/api/nannies', '/api/subscriptions', '/api/user', '/api'];

describe('integration: cache invalidation for multiple resources', () => {
  let servers = [];
  const startPort = 5800;

  beforeAll(async () => {
    for (let i = 0; i < bases.length; i++) {
      const p = startPort + i;
      // start a server per base on different port
      // note: each server will listen on its own port because express mounting uses full path
      // We prefix requests with the port
      const server = await startTestServerFor(bases[i], p);
      servers.push({ base: bases[i], server, port: p });
    }
  });

  afterAll(async () => {
    for (const s of servers) {
      if (s && s.server && s.server.close) s.server.close();
    }
    simpleCache.clear();
  });

  for (const s of bases.map((b, idx) => ({ base: b, port: startPort + idx }))) {
    test(`${s.base} cache -> mutate -> cache invalidated`, async () => {
      const baseUrl = `http://127.0.0.1:${s.port}${s.base}`;
      // initial GET
      let r = await fetch(baseUrl);
      expect(r.status).toBe(200);
      let json = await r.json();
      expect(json.value).toBe(0);

      // second GET should be cached
      r = await fetch(baseUrl);
      expect(r.status).toBe(200);
      json = await r.json();
      expect(json.value).toBe(0);

      // POST mutate (with centerId sometimes)
      r = await fetch(baseUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ centerId: '10' }) });
      expect(r.status).toBe(200);
      json = await r.json();
      expect(json.value).toBe(1);

      // GET must return updated value (cache invalidated)
      r = await fetch(baseUrl);
      expect(r.status).toBe(200);
      json = await r.json();
      expect(json.value).toBe(1);
    });
  }
});
