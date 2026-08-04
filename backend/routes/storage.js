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
const path = require('path');
const auth = require('../middleware/authMiddleware');
const prisma = require('../lib/prismaClient');

function isSuperAdmin(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'super-admin' || r === 'super_admin' || r === 'superadmin' || r.includes('super');
}

let fetchFn;
try { fetchFn = globalThis.fetch || require('node-fetch'); } catch (e) { fetchFn = globalThis.fetch; }

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPicture';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

// Allowed path prefixes — only serve files from known folders
const ALLOWED_PREFIXES = ['avatars/', 'photos/', 'prescriptions/', 'feed/', 'uploads/', 'thumbnails/', 'children/'];

// Resolve which DB record a storage path corresponds to, and whether the
// requesting user is allowed to view it. Fails closed: an unrecognized path
// (one that doesn't match any known naming scheme) is denied rather than
// served, since this proxy is the single choke point for all private files.
async function checkAccess(sanitized, user) {
  const basename = path.posix.basename(sanitized);

  if (sanitized.startsWith('avatars/child-')) {
    // avatars/child-<childId>-<timestamp>.webp
    const m = basename.match(/^child-([^-]+(?:-[^-]+){4})-\d+\.\w+$/) || basename.match(/^child-(.+)-\d+\.\w+$/);
    const childId = m ? m[1] : null;
    if (!childId) return false;
    const child = await prisma.child.findUnique({ where: { id: childId }, select: { centerId: true } });
    if (!child) return false;
    if (isSuperAdmin(user)) return true;
    // Nanny/parent roles must have a specific assignment/link to this child —
    // sharing a centerId alone is not enough (a center has many children).
    if (user.nannyId) return !!(await prisma.childNanny.findFirst({ where: { childId, nannyId: user.nannyId } }));
    if (user.parentId) return !!(await prisma.parentChild.findFirst({ where: { childId, parentId: user.parentId } }));
    // Center staff without a nanny/parent identity (i.e. admins) see all of their center's children.
    return child.centerId === user.centerId;
  }

  if (sanitized.startsWith('prescriptions/')) {
    // prescriptions/<childId>_presc_<timestamp>_<random>.<ext>
    const m = basename.match(/^(.+?)_presc_/);
    const childId = m ? m[1] : null;
    if (!childId) return false;
    const child = await prisma.child.findUnique({ where: { id: childId }, select: { centerId: true } });
    if (!child) return false;
    if (isSuperAdmin(user)) return true;
    if (user.nannyId) return !!(await prisma.childNanny.findFirst({ where: { childId, nannyId: user.nannyId } }));
    if (user.parentId) return !!(await prisma.parentChild.findFirst({ where: { childId, parentId: user.parentId } }));
    return child.centerId === user.centerId;
  }

  if (sanitized.startsWith('avatars/')) {
    // User avatar: avatars/<hash>.webp, stored as User.avatarUrl
    const owner = await prisma.user.findFirst({ where: { avatarUrl: sanitized }, select: { id: true, centerId: true } });
    if (!owner) return false;
    if (isSuperAdmin(user)) return true;
    if (owner.id === user.id) return true;
    return !!owner.centerId && owner.centerId === user.centerId;
  }

  if (sanitized.startsWith('feed/')) {
    // Feed post media: feed/<name>.webp or feed/thumb_<name>.webp
    const media = await prisma.feedMedia.findFirst({
      where: { OR: [{ storagePath: sanitized }, { thumbnailPath: sanitized }] },
      select: { post: { select: { centerId: true } } },
    });
    if (!media || !media.post) return false;
    if (isSuperAdmin(user)) return true;
    return media.post.centerId === user.centerId;
  }

  // No recognized ownership scheme for this prefix (photos/, uploads/, thumbnails/,
  // children/ are not currently produced by any upload path) — deny by default.
  return false;
}

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

    // Sanitize: normalize the path and reject any traversal outright, rather than
    // stripping "../" in a single non-recursive pass (which overlapping sequences
    // like "..../..../" can survive and later get re-normalized by the HTTP client).
    const normalized = path.posix.normalize(filePath.replace(/^\/+/, ''));
    if (normalized.includes('..') || path.posix.isAbsolute(normalized)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Only allow known prefixes
    const allowed = ALLOWED_PREFIXES.some(prefix => normalized.startsWith(prefix));
    if (!allowed) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const sanitized = normalized;

    // Verify the requesting user actually owns/has a legitimate relationship to
    // this specific file, rather than trusting any authenticated caller with any
    // valid-looking path.
    const hasAccess = await checkAccess(sanitized, req.user);
    if (!hasAccess) {
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
