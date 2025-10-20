const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/authMiddleware');
const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');
let fetchFn;
try {
  fetchFn = globalThis.fetch || require('node-fetch');
} catch (e) {
  fetchFn = globalThis.fetch;
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPictures';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase vars not set. Upload signing will fail until SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured.');
}

// Ensure the Supabase client has a fetch implementation available in older Node runtimes
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false }, global: { fetch: fetchFn } });

if (SUPABASE_URL && !/^https?:\/\//.test(SUPABASE_URL)) {
  console.warn('Supabase URL does not look like a valid URL:', SUPABASE_URL.slice(0, 60));
}

async function uploadViaJwtFallback(bucket, objectPath, buffer, contentType) {
  if (!process.env.SUPABASE_JWT_SECRET) {
    console.warn('SUPABASE_JWT_SECRET not set; cannot perform JWT fallback upload');
    return { ok: false, status: 0, body: null };
  }
  if (!fetchFn) {
    console.warn('fetch not available in this runtime; cannot perform JWT fallback upload');
    return { ok: false, status: 0, body: null };
  }
  try {
    const token = jwt.sign(
      { role: 'service_role', exp: Math.floor(Date.now() / 1000) + 60 * 5 },
      process.env.SUPABASE_JWT_SECRET,
      { algorithm: 'HS256' }
    );
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;
    const headers = { Authorization: `Bearer ${token}` };
    if (contentType) headers['Content-Type'] = contentType;
    const res = await fetchFn(url, { method: 'POST', headers, body: buffer });
    const text = await (res.text ? res.text() : Promise.resolve(null));
    if (!res.ok) {
      console.error('JWT fallback upload failed', { status: res.status, body: text ? text.slice(0, 200) : null });
      return { ok: false, status: res.status, body: text };
    }
    return { ok: true, status: res.status, body: text };
  } catch (e) {
    console.error('JWT fallback upload exception', e && e.message ? e.message : e);
    return { ok: false, status: 0, body: String(e) };
  }
}

function generateStoragePath(prefix, originalName) {
  const hash = crypto.createHash('md5').update(`${Date.now()}_${Math.random()}_${originalName}`).digest('hex');
  const ext = path.extname(originalName) || '.jpg';
  return path.posix.join(prefix, `${hash}${ext}`);
}

// Return an object with upload info for the client to PUT directly to Supabase Storage via the client SDK
router.post('/supabase/sign', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { filename, contentType, prefix = 'feed' } = req.body || {};
  if (!filename || !contentType) return res.status(400).json({ message: 'filename and contentType required' });

  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(503).json({ message: 'Storage not configured' });

  try {
    const storagePath = generateStoragePath(prefix, filename);
    // Supabase doesn't provide a direct presigned PUT url via the JS client; however we can return the storage path
    // and the frontend can use the Supabase JS client to upload directly to the bucket using anon key or signed policy.
    // For security, we expect the frontend to use the public upload flow only if configured; otherwise fallback to server upload.
    return res.json({ storagePath, bucket: SUPABASE_BUCKET, publicUrl: supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath)?.data?.publicUrl || null });
  } catch (e) {
    console.error('Failed to sign upload', e);
    return res.status(500).json({ message: 'Failed to prepare upload' });
  }
});

// Finalize: called by client after upload completes so backend can create DB records or trigger post-processing.
router.post('/supabase/finalize', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { storagePath, postId, thumbnailPath = null, size = null, originalName = null } = req.body || {};
  if (!storagePath || !postId) return res.status(400).json({ message: 'storagePath and postId required' });

  // Ensure storage backend is configured on the server. In production a missing service role key
  // will cause downloads/finalize to fail silently; return a clear 503 so the frontend can surface it.
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Finalize called but Supabase server credentials are not configured');
    return res.status(503).json({ message: 'Storage backend not configured on server' });
  }

  try {
    // Verify post exists and user is the author (or admin)
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const post = await prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.authorId !== user.id && !['admin', 'super-admin'].includes(user.role)) return res.status(403).json({ message: 'Forbidden' });

    // Check if feedMedia for this storagePath already exists (idempotent)
    const existing = await prisma.feedMedia.findFirst({ where: { storagePath } });
    if (existing) return res.json({ medias: [existing], skipped: true });

    // Ensure object exists in Supabase
    const listDir = path.posix.dirname(storagePath) || '';
    const { data: listData, error: listErr } = await supabase.storage.from(SUPABASE_BUCKET).list(listDir, { limit: 100 });
    if (listErr) console.warn('Could not list storage path during finalize', listErr);

    // Download the object to generate thumbnail (with retries)
    const retry = require('../lib/retry');
    let buffer;
    try {
      const downloadRes = await retry(async () => await supabase.storage.from(SUPABASE_BUCKET).download(storagePath));
      if (downloadRes.error) throw downloadRes.error;
      const arrayBuffer = await downloadRes.data.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (err) {
      console.error('Failed to download uploaded object during finalize', err);
      return res.status(500).json({ message: 'Failed to access uploaded object' });
    }

    // Extra security: verify storage metadata owner matches post authorId (if metadata present)
    try {
      const { data: metaData, error: metaErr } = await supabase.storage.from(SUPABASE_BUCKET).getMetadata(storagePath);
      if (metaErr) {
        console.warn('Could not read metadata for', storagePath, metaErr);
      } else {
        const ownerUid = metaData && metaData.metadata ? metaData.metadata.owner : null;
        if (ownerUid && ownerUid !== post.authorId) {
          console.warn('Upload owner mismatch:', ownerUid, 'post author:', post.authorId);
          return res.status(403).json({ message: 'Upload owner mismatch' });
        }
      }
    } catch (mErr) {
      console.warn('Failed to fetch metadata for', storagePath, mErr);
    }

    // generate thumbnail with sharp
    const sharp = require('sharp');
    const thumbBuffer = await sharp(buffer).resize({ width: 300 }).toFormat('webp').toBuffer();

    // decide thumbnail path
    const thumbPath = path.posix.join(path.posix.dirname(storagePath), `thumb_${path.posix.basename(storagePath)}.webp`);
    try {
      const upRes = await retry(async () => await supabase.storage.from(SUPABASE_BUCKET).upload(thumbPath, thumbBuffer, { contentType: 'image/webp', upsert: false }));
      if (upRes.error) {
        const msg = String(upRes.error.message || upRes.error || '');
        console.error('Thumbnail upload error', upRes.error);
        if (msg.includes('Invalid Compact JWS')) {
          const fb = await uploadViaJwtFallback(SUPABASE_BUCKET, thumbPath, thumbBuffer, 'image/webp');
          if (!fb.ok) console.error('JWT fallback for finalize thumbnail failed', fb);
        }
      }
    } catch (err) {
      console.error('Thumbnail upload failed after retries', err);
    }

    const publicMain = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
    const publicThumb = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(thumbPath);
    const mainUrl = publicMain?.data?.publicUrl || null;
    const thumbUrl = publicThumb?.data?.publicUrl || null;

    // Create feedMedia row
    const media = await prisma.feedMedia.create({ data: {
      postId: postId,
      type: 'image',
      url: mainUrl,
      thumbnailUrl: thumbUrl,
      size: size || null,
      hash: originalName ? require('crypto').createHash('md5').update(originalName + storagePath).digest('hex') : null,
      storagePath: storagePath,
      thumbnailPath: thumbPath,
    }});

    return res.json({ medias: [media] });
  } catch (e) {
    console.error('Failed to finalize upload', e);
    return res.status(500).json({ message: 'Failed to finalize upload' });
  }
});

module.exports = router;
