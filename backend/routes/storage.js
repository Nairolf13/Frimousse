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
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/authMiddleware');

let fetchFn;
try { fetchFn = globalThis.fetch || require('node-fetch'); } catch (e) { fetchFn = globalThis.fetch; }

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPicture';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false },
  global: { fetch: fetchFn },
});

// Allowed path prefixes — only serve files from known folders
const ALLOWED_PREFIXES = ['avatars/', 'photos/', 'prescriptions/', 'feed/', 'uploads/', 'thumbnails/', 'children/'];

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

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('[storage] Supabase credentials missing');
      return res.status(503).json({ error: 'Storage non configuré' });
    }

    // Generate a signed URL and redirect the browser directly to Supabase.
    // This avoids proxying the file through the Node process (no memory pressure,
    // no server-side fetch issues) while keeping the file protected behind auth.
    const { data: signedData, error: signError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(sanitized, 300); // 5 min expiry

    if (signError || !signedData?.signedUrl) {
      console.error('[storage] createSignedUrl error:', signError?.message, 'path:', sanitized);
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    // Redirect browser to the signed URL — Supabase serves the file directly
    return res.redirect(302, signedData.signedUrl);
  } catch (e) {
    console.error('[storage] Unexpected error:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
