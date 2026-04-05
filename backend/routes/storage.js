/**
 * storage.js
 *
 * Secure proxy for Supabase private bucket files.
 * All requests require a valid JWT (auth middleware).
 *
 * GET /api/storage/photo?path=photos/xxx.webp
 *   → Fetches the file from the private Supabase bucket using the service role key
 *   → Streams it back to the authenticated client
 *   → Cache-Control: private, max-age=3600 (browsers cache 1h but URL is not shareable)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/authMiddleware');

let fetchFn;
try { fetchFn = globalThis.fetch || require('node-fetch'); } catch (e) { fetchFn = globalThis.fetch; }

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPicture';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

// Allowed path prefixes — only serve files from known folders
const ALLOWED_PREFIXES = ['avatars/', 'photos/', 'prescriptions/', 'feed/', 'uploads/', 'thumbnails/', 'children/'];

// Build a short-lived service_role JWT using SUPABASE_JWT_SECRET.
// This bypasses the SDK's internal key validation (Invalid Compact JWS).
function makeServiceToken() {
  const secret = SUPABASE_JWT_SECRET;
  if (!secret) return SUPABASE_KEY; // fallback to env key if secret not set
  return jwt.sign(
    { role: 'service_role', iss: 'supabase', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 },
    secret,
    { algorithm: 'HS256' }
  );
}

router.get('/photo', auth, async (req, res) => {
  try {
    const { path: filePath } = req.query;

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'Paramètre path manquant' });
    }

    // Sanitize: prevent path traversal
    const sanitized = filePath.replace(/\.\.\//g, '').replace(/^\/+/, '');

    // Only allow known prefixes
    const allowed = ALLOWED_PREFIXES.some(prefix => sanitized.startsWith(prefix));
    if (!allowed) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (!SUPABASE_URL || (!SUPABASE_KEY && !SUPABASE_JWT_SECRET)) {
      console.error('[storage] Supabase credentials missing');
      return res.status(503).json({ error: 'Storage non configuré' });
    }

    const fetchImpl = fetchFn || globalThis.fetch;
    if (!fetchImpl) {
      console.error('[storage] fetch not available');
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const base = SUPABASE_URL.replace(/\/$/, '');
    const token = makeServiceToken();

    // Call Supabase Storage REST API to get a signed URL using our fresh token
    const signRes = await fetchImpl(
      `${base}/storage/v1/object/sign/${SUPABASE_BUCKET}/${sanitized}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 300 }),
      }
    );

    if (!signRes.ok) {
      const body = await signRes.text().catch(() => '');
      console.error('[storage] sign REST failed:', signRes.status, body.slice(0, 200), 'path:', sanitized);
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    const signJson = await signRes.json();
    const signedPath = signJson.signedURL;
    if (!signedPath) {
      console.error('[storage] no signedURL in response, path:', sanitized);
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    // Redirect the browser to the full signed URL — Supabase serves the file directly
    const fullSignedUrl = `${base}/storage/v1${signedPath}`;
    return res.redirect(302, fullSignedUrl);
  } catch (e) {
    console.error('[storage] Unexpected error:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
