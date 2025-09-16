const express = require('express');
const router = express.Router();

// Resolve a fetch implementation: prefer global.fetch (Node 18+), otherwise try node-fetch (v2 or v3)
let fetchImpl = typeof global.fetch === 'function' ? global.fetch : undefined;
if (!fetchImpl) {
  try {
    const nf = require('node-fetch');
    // node-fetch v3 exports as default when used with require in CJS; handle both cases
    fetchImpl = nf && (typeof nf === 'function' ? nf : nf.default) ? (typeof nf === 'function' ? nf : nf.default) : undefined;
  } catch (e) {
    console.warn('node-fetch is not available; external proxy endpoints will fail in environments without global fetch');
  }
}

// Simple in-memory cache for REST Countries list
let _countriesCache = null;
let _countriesCacheAt = 0;
const COUNTRIES_TTL = 1000 * 60 * 60; // 1h

// External proxy endpoints (countries, photon, nominatim)

// Proxy for Nominatim address search
router.get('/nominatim/search', async (req, res) => {
  try {
    const q = String(req.query.q || '');
    if (!q) return res.status(400).json({ error: 'missing q parameter' });
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8`;
    // Nominatim requires a valid User-Agent identifying the application
    if (!fetchImpl) return res.status(500).json({ error: 'server_missing_fetch_impl' });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetchImpl(url, { headers: { 'User-Agent': 'Frimousses/1.0 (contact@example.com)', 'Accept-Language': 'fr' }, signal: controller.signal });
    clearTimeout(timeout);
    const text = await r.text();
    if (!r.ok) {
      console.error('nominatim upstream non-ok', { status: r.status, statusText: r.statusText, body: text });
      try { return res.status(r.status).json(JSON.parse(text)); } catch (e) { return res.status(r.status).type('text').send(text); }
    }
    try { return res.json(JSON.parse(text)); } catch (e) { return res.type('text').send(text); }
  } catch (err) {
    console.error('nominatim proxy error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: err && err.message ? err.message : 'proxy error' });
  }
});

// REST Countries backed endpoint (cached) - returns [{ name, iso2, iso3 }]
router.get('/countries', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'missing q parameter' });
    // load cache if missing or stale
    const now = Date.now();
    if (!_countriesCache || (now - _countriesCacheAt) > COUNTRIES_TTL) {
      if (!fetchImpl) return res.status(500).json({ error: 'server_missing_fetch_impl' });
      const r = await fetchImpl('https://restcountries.com/v3.1/all?fields=name,cca2,cca3,altSpellings', { headers: { 'User-Agent': 'Frimousses/1.0 (contact@example.com)' } });
      if (!r.ok) return res.status(502).json({ error: 'restcountries_fetch_failed', status: r.status });
      const all = await r.json();
      // normalize into simple objects
      _countriesCache = Array.isArray(all) ? all.map(c => ({
        name: (c.name && (c.name.common || c.name)) || '',
        iso2: c.cca2 || '',
        iso3: c.cca3 || '',
        alt: Array.isArray(c.altSpellings) ? c.altSpellings : []
      })) : [];
      _countriesCacheAt = Date.now();
    }
    const lower = q.toLowerCase();
    const results = (_countriesCache || []).filter(c => (c.name || '').toLowerCase().includes(lower) || (Array.isArray(c.alt) && c.alt.join(' ').toLowerCase().includes(lower))).slice(0, 20);
    return res.json(results);
  } catch (err) {
    console.error('countries proxy error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: err && err.message ? err.message : 'proxy error' });
  }
});

// Photon proxy for autocomplete / places (uses photon.komoot.io)
router.get('/photon/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'missing q parameter' });
    const limit = Number(req.query.limit || 8);
    // optional country bias param (iso2 or name) - we'll append to q to bias results
    const country = String(req.query.country || '').trim();
    const lang = String(req.query.lang || 'fr').trim();
    let finalQ = q;
    if (country) {
      finalQ = `${q} ${country}`;
    }
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(finalQ)}&limit=${encodeURIComponent(String(limit))}&lang=${encodeURIComponent(lang)}`;
    if (!fetchImpl) return res.status(500).json({ error: 'server_missing_fetch_impl' });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetchImpl(url, { headers: { 'User-Agent': 'Frimousses/1.0 (contact@example.com)', 'Accept-Language': lang }, signal: controller.signal });
    clearTimeout(timeout);
    const text = await r.text();
    if (!r.ok) {
      console.error('photon upstream non-ok', { status: r.status, statusText: r.statusText, body: text });
      try { return res.status(r.status).json(JSON.parse(text)); } catch (e) { return res.status(r.status).type('text').send(text); }
    }
    try { return res.json(JSON.parse(text)); } catch (e) { return res.type('text').send(text); }
  } catch (err) {
    console.error('photon proxy error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: err && err.message ? err.message : 'proxy error' });
  }
});

module.exports = router;
