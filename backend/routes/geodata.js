const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// PositionStack API Key
const POSITIONSTACK_KEY = process.env.POSITIONSTACK_KEY || '';

if (!POSITIONSTACK_KEY) {
  console.warn('⚠️  POSITIONSTACK_KEY not set in env variables');
}

// Simple in-memory cache with TTL
const cache = new Map();
function setCache(key, value, ttl = 300000) {
  const expires = Date.now() + ttl;
  cache.set(key, { value, expires });
}
function getCache(key) {
  const rec = cache.get(key);
  if (!rec) return null;
  if (rec.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return rec.value;
}

/**
 * Proxy RestCountries - returns a compact list { name, cca2, cca3, region }
 */
router.get('/countries', async (req, res) => {
  try {
    const resp = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,cca3,region');
    const data = await resp.json();
    const compact = data.map(c => ({
      name: c.name?.common || c.name || '',
      cca2: c.cca2 || null,
      cca3: c.cca3 || null,
      region: c.region || null
    })).sort((a, b) => a.name.localeCompare(b.name));
    res.json(compact);
  } catch (err) {
    console.error('geodata/countries error', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

/**
 * Proxy PositionStack for address / city autocomplete
 * Example: /api/geodata/positionstack?q=paris
 */
router.get('/positionstack', async (req, res) => {
  try {
    const rawQ = String(req.query.q || '').trim();
    const limit = Math.min(20, parseInt(req.query.limit || '10', 10));
    if (!rawQ) return res.json([]);

    const cacheKey = `positionstack:${rawQ}:${limit}`;
    const fromCache = getCache(cacheKey);
    // If we have a cached value that's non-null and not an empty array, return it.
    if (fromCache !== null) {
      if (!Array.isArray(fromCache) || (Array.isArray(fromCache) && fromCache.length > 0)) {
        return res.json(fromCache);
      }
      // if the cached value is an empty array, ignore it and continue to attempt live fetch + fallback
    }

    const url = `http://api.positionstack.com/v1/forward?access_key=${POSITIONSTACK_KEY}&query=${encodeURIComponent(rawQ)}&limit=${limit}&autocomplete=1&country=FR`;

    const results = [];
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const mapped = (data.data || []).map((place, idx) => ({
          id: place.id || idx,
          name: place.label || '',
          street: place.street || null,
          house_number: place.number || null,
          city: place.locality || place.county || null,
          state: place.region || null,
          country: place.country || null,
          postcode: place.postal_code || null,
          lat: place.latitude || null,
          lon: place.longitude || null,
          raw: place
        }));
        results.push(...mapped);
      } else {
        console.warn('positionstack responded with', resp.status, await resp.text().catch(() => ''));
      }
    } catch (e) {
      console.error('positionstack fetch error', e?.message || e);
    }

    // If PositionStack returns no results, fallback to Nominatim so the frontend still
    // receives useful suggestions (helps when the positionstack key has limits or misses data).
  if (!results || results.length === 0) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&q=${encodeURIComponent(rawQ)}`;
        const nomResp = await fetch(nomUrl, { headers: { 'User-Agent': 'FrimousseApp/1.0 (contact: no-reply@example.com)' } });
        if (nomResp.ok) {
          const nomData = await nomResp.json();
          const nomResults = (nomData || []).map((place, idx) => {
            const addr = place.address || {};
            return {
              id: place.place_id || idx,
              name: place.display_name || '',
              street: addr.road || addr.pedestrian || addr.cycleway || null,
              house_number: addr.house_number || null,
              city: addr.city || addr.town || addr.village || addr.hamlet || null,
              state: addr.state || addr.county || null,
              country: addr.country || null,
              postcode: addr.postcode || null,
              lat: place.lat || null,
              lon: place.lon || null,
              raw: place
            };
          });
          if (nomResults && nomResults.length > 0) setCache(cacheKey, nomResults, 120000);
          return res.json(nomResults);
        }
      } catch (e) {
        console.error('geodata/nominatim fallback error', e?.message || e);
      }
    }

  if (results && results.length > 0) setCache(cacheKey, results, 120000);
  res.json(results);
  } catch (err) {
    console.error('geodata/positionstack error', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch positionstack' });
  }
});

module.exports = router;
