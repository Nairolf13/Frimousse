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

    // Download from private bucket using service role key
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(sanitized);

    if (error || !data) {
      console.error('[storage] Download error:', error?.message || 'no data', 'path:', sanitized);
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    // Determine content type from extension
    const ext = sanitized.split('.').pop()?.toLowerCase();
    const contentTypes = {
      webp: 'image/webp',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
    };
    const contentType = (ext && contentTypes[ext]) || 'application/octet-stream';

    // Stream back with private cache headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const arrayBuffer = await data.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (e) {
    console.error('[storage] Unexpected error:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
