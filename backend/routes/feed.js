const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');

const { createClient } = require('@supabase/supabase-js');
// Robust Prisma client import: prefer generated client output, fall back to @prisma/client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authMiddleware = require('../middleware/authMiddleware');
const { sendFeedPostNotification, sendLikeNotification, sendCommentNotification } = require('../lib/pushNotifications');

// Per-file upload limit increased to 1GB. Allow up to 6 files per post.
const PER_FILE_LIMIT = 1 * 1024 * 1024 * 1024; // 1GB
const MAX_TOTAL_PER_POST = 1 * 1024 * 1024 * 1024; // 1GB aggregate
// Use diskStorage to avoid holding large files in memory. Temp files are stored in OS tmp dir and removed after processing.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2,8)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
const upload = multer({ storage, limits: { fileSize: PER_FILE_LIMIT } }); // per-file limit set via PER_FILE_LIMIT (1GB)

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPictures';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase vars not set. Feed uploads will fail until SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false } });

// Middleware to reject overly large Content-Length before multer tries to process
function checkContentLength(req, res, next) {
  try {
    const cl = parseInt(req.headers['content-length'] || '0', 10) || 0;
    if (cl > MAX_TOTAL_PER_POST) {
      console.warn('Rejecting request early due to Content-Length exceeding MAX_TOTAL_PER_POST', { contentLength: cl, max: MAX_TOTAL_PER_POST });
      return res.status(413).json({ message: 'Total upload size too large' });
    }
  } catch (err) {
    // ignore parsing errors and continue
  }
  next();
}

// Multer error handler for this router: map common multer errors to friendly HTTP responses
router.use((err, req, res, next) => {
  if (!err) return next();
  if (err && err.name === 'MulterError') {
    // Multer specific errors
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'File size limit exceeded' });
    if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ message: 'Too many files uploaded' });
    return res.status(400).json({ message: err.message || 'Upload error' });
  }
  return next(err);
});

function validateMime(mimetype) {
  // allow common image types and mp4/webm videos
  return ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'].includes(mimetype);
}

// Create a feed post with optional images
router.post('/', authMiddleware, checkContentLength, upload.array('images', 6), async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  // Only nanny or admin can post
  if (!['nanny', 'admin', 'super-admin'].includes(user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { text, childId, taggedChildIds, visibility = 'CENTER' } = req.body;

  // Normalize tagged children into an array. Maintain backward compatibility with single childId param.
  const tagged = Array.isArray(taggedChildIds) ? taggedChildIds.filter(Boolean) : (childId ? [childId] : []);

  // If tagged children are provided, ensure each has at least one PhotoConsent granting posting for this center.
  if (tagged.length > 0) {
    // find all children that lack consent
    const lacking = [];
    for (const cid of tagged) {
      const consent = await prisma.photoConsent.findFirst({ where: { childId: cid, consent: true } });
      if (!consent) lacking.push(cid);
    }
    if (lacking.length > 0) {
      return res.status(403).json({ message: 'Photo consent absent for some children', lacking });
    }
  }

  try {
    // Create post record first
    const post = await prisma.feedPost.create({
      data: {
        authorId: user.id,
        centerId: user.centerId || null,
        childId: childId || null,
        text: text || null,
        visibility: visibility,
      }
    });

    const files = req.files || [];
    // Defensive aggregate size check to avoid excessive memory usage
    const totalBytes = (files || []).reduce((s, f) => s + (f.size || 0), 0);
    if (totalBytes > MAX_TOTAL_PER_POST) {
      console.warn('Upload rejected: aggregate upload size exceeds limit', { totalBytes, max: MAX_TOTAL_PER_POST });
      return res.status(413).json({ message: 'Total upload size too large' });
    }
    // If files were provided but Supabase isn't configured, fail early with clear message
    if (files.length > 0 && (!SUPABASE_URL || !SUPABASE_KEY)) {
      console.error('Supabase not configured but upload attempted');
      return res.status(503).json({ message: 'Storage backend not configured on server' });
    }
    if (files.length > 6) return res.status(400).json({ message: 'Too many files' });
    const savedMedias = [];

  for (const file of files) {
      if (!validateMime(file.mimetype)) continue;

      // Calculate MD5 hash of the original file
      const fileBufForHash = file.buffer || (file.path ? fs.readFileSync(file.path) : Buffer.alloc(0));
      const hash = crypto.createHash('md5').update(fileBufForHash).digest('hex');

      // Check if a media with this hash already exists for this post (though post is new, but to be safe)
      const existingMedia = await prisma.feedMedia.findFirst({ where: { postId: post.id, hash: hash } });
      if (existingMedia) {
        // Skip this file as it's already uploaded for this post
        continue;
      }

      // Determine if file is image or video
      const isVideo = file.mimetype && file.mimetype.startsWith('video/');
      const baseName = `${post.id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const retry = require('../lib/retry');

      if (isVideo) {
        // For videos: upload raw file to Supabase and do not attempt to transcode here
        const ext = path.extname(file.originalname) || '.mp4';
        const mainPath = path.posix.join('feed', `${baseName}${ext}`);
        const fileBuffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
        try {
          const upMain = await retry(async () => await supabase.storage.from(SUPABASE_BUCKET).upload(mainPath, fileBuffer, { contentType: file.mimetype, upsert: false }));
          if (upMain.error) { console.error('Supabase video upload error', upMain.error); continue; }
        } catch (err) {
          console.error('Supabase video upload failed after retries', err);
          continue;
        }

        const publicMain = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(mainPath);
        const mainUrl = publicMain?.data?.publicUrl || null;

        const media = await prisma.feedMedia.create({ data: {
          postId: post.id,
          type: 'video',
          url: mainUrl,
          thumbnailUrl: null,
          size: file.size,
          hash: hash,
          storagePath: mainPath,
          thumbnailPath: null,
        }});
        savedMedias.push(media);
        // cleanup temp file
        try { if (file.path) require('fs').unlinkSync(file.path); } catch (e) { /* ignore */ }
        continue;
      }

        // Otherwise treat as image: process main image (resize to max width 1600) and thumbnail (square crop)
        const fileBuffer = file.buffer || (file.path ? require('fs').readFileSync(file.path) : null);
        // Use rotate() so sharp applies EXIF orientation before resizing
        const mainBuffer = await sharp(fileBuffer).rotate().resize({ width: 1600, withoutEnlargement: true }).toFormat('webp').toBuffer();
        // Create a square thumbnail with cover fit so all thumbs share identical dimensions
        const thumbBuffer = await sharp(fileBuffer).rotate().resize({ width: 400, height: 400, fit: 'cover' }).toFormat('webp').toBuffer();

      const ext = 'webp';
      const mainPath = path.posix.join('feed', `${baseName}.${ext}`);
      const thumbPath = path.posix.join('feed', `thumb_${baseName}.${ext}`);

      // Upload main (with retries)
      try {
        const upMain = await retry(async () => await supabase.storage.from(SUPABASE_BUCKET).upload(mainPath, mainBuffer, { contentType: 'image/webp', upsert: false }));
        if (upMain.error) { console.error('Supabase upload error', upMain.error); continue; }
      } catch (err) {
        console.error('Supabase upload failed after retries', err);
        continue;
      }
      // Upload thumbnail (with retries)
      try {
        const upThumb = await retry(async () => await supabase.storage.from(SUPABASE_BUCKET).upload(thumbPath, thumbBuffer, { contentType: 'image/webp', upsert: false }));
        if (upThumb.error) console.error('Supabase thumb upload error', upThumb.error);
      } catch (err) {
        console.error('Supabase thumb upload failed after retries', err);
      }

      // For public bucket: return public URLs and store storage paths so we can delete later
      const publicMain = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(mainPath);
      const publicThumb = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(thumbPath);
      const mainUrl = publicMain?.data?.publicUrl || null;
      const thumbUrl = publicThumb?.data?.publicUrl || null;

      const media = await prisma.feedMedia.create({
        data: {
          postId: post.id,
          type: 'image',
          url: mainUrl,
          thumbnailUrl: thumbUrl,
          size: file.size,
          hash: hash,
          storagePath: mainPath,
          thumbnailPath: thumbPath,
        }
      });
      savedMedias.push(media);
      // cleanup temp file
      try { if (file.path) require('fs').unlinkSync(file.path); } catch (e) { /* ignore */ }
    }

    const result = await prisma.feedPost.findUnique({ where: { id: post.id }, include: { medias: true, author: true } });

    // send push notifications in background (don't block response)
    (async () => {
      try {
        await sendFeedPostNotification({ postId: result.id, centerId: result.centerId, authorId: result.authorId, authorName: result.author?.name, text: result.text, action: 'created' });
      } catch (err) {
        console.error('Background push send failed', err);
      }
    })();

    return res.status(201).json(result);
  } catch (e) {
    console.error('Failed to create feed post', e);
    return res.status(500).json({ message: 'Failed to create post' });
  }
});

// Admin-only route: trigger a push notification for an existing post (useful for testing)
router.post('/:postId/notify', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!['admin', 'super-admin'].includes(user.role)) return res.status(403).json({ message: 'Forbidden' });
  const { postId } = req.params;
  try {
    const post = await prisma.feedPost.findUnique({ where: { id: postId }, include: { author: true } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    await sendFeedPostNotification({ postId: post.id, centerId: post.centerId, authorId: post.authorId, authorName: post.author?.name, text: post.text, action: 'test' });
    return res.json({ sent: true });
  } catch (e) {
    console.error('Failed to send test notification', e);
    return res.status(500).json({ message: 'Failed to send notification' });
  }
});

// Simple feed listing (paginated)
router.get('/', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { limit = 20, cursor } = req.query;
  try {
    const posts = await prisma.feedPost.findMany({
      where: { centerId: user.centerId || undefined },
      orderBy: { createdAt: 'desc' },
      include: {
        medias: true,
        author: true,
        _count: { select: { likes: true, comments: true } },
        comments: { take: 1, orderBy: { createdAt: 'desc' }, include: { author: true } },
      },
      take: Number(limit),
    });
    // Fetch all likes by this user for posts in the result set
    const postIds = posts.map(p => p.id);
    const userLikes = postIds.length ? await prisma.feedLike.findMany({ where: { postId: { in: postIds }, userId: user.id } }) : [];
    // normalize response shape
      const mapped = posts.map(p => ({
      id: p.id,
      text: p.text,
      createdAt: p.createdAt,
      author: { name: p.author?.name },
      authorId: p.author?.id,
      medias: p.medias,
      likes: p._count?.likes || 0,
      commentsCount: p._count?.comments || 0,
      // defensive: author may be null if the user was deleted; don't throw
      comments: p.comments.map(c => ({ authorName: c.author?.name || 'Utilisateur', timeAgo: c.createdAt, text: c.text })),
      hasLiked: !!userLikes.find(l => l.postId === p.id),
    }));
    return res.json({ posts: mapped });
  } catch (e) {
    console.error('Failed to list feed', e);
    return res.status(500).json({ message: 'Failed to list feed' });
  }
});

// Toggle like for a post
router.post('/:id/like', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const postId = req.params.id;
  try {
    const existing = await prisma.feedLike.findUnique({ where: { postId_userId: { postId, userId: user.id } } });
    if (existing) {
      await prisma.feedLike.delete({ where: { id: existing.id } });
      return res.json({ liked: false });
    }
    await prisma.feedLike.create({ data: { postId, userId: user.id } });

    // notify post owner in background
    (async () => {
      try {
        await sendLikeNotification({ postId, likerId: user.id, likerName: user.name });
      } catch (err) {
        console.error('Background like push failed', err);
      }
    })();

    return res.json({ liked: true });
  } catch (e) {
    console.error('Failed to toggle like', e);
    return res.status(500).json({ message: 'Failed to toggle like' });
  }
});

// List users who liked a post
router.get('/:id/likes', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const postId = req.params.id;
  try {
    // find likes and include user info
    const likes = await prisma.feedLike.findMany({ where: { postId }, include: { user: true } });
    const users = likes.map(l => ({ id: l.user?.id, name: l.user?.name || 'Utilisateur' }));
    return res.json({ users });
  } catch (e) {
    console.error('Failed to list likers', e);
    return res.status(500).json({ message: 'Failed to list likers' });
  }
});

// Add comment to a post
router.post('/:id/comment', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const postId = req.params.id;
  const { text } = req.body;
  if (!text || text.trim().length === 0) return res.status(400).json({ message: 'Comment text required' });
  try {
    const comment = await prisma.feedComment.create({ data: { postId, authorId: user.id, text } });

    // notify post owner in background
    (async () => {
      try {
        await sendCommentNotification({ postId, commenterId: user.id, commenterName: user.name, commentText: text });
      } catch (err) {
        console.error('Background comment push failed', err);
      }
    })();

    return res.status(201).json({ id: comment.id, text: comment.text, authorName: user.name, authorId: comment.authorId, createdAt: comment.createdAt });
  } catch (e) {
    console.error('Failed to add comment', e);
    return res.status(500).json({ message: 'Failed to add comment' });
  }
});

// List all comments for a post
router.get('/:id/comments', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const postId = req.params.id;
  try {
    const comments = await prisma.feedComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      include: { author: true },
    });
    const mapped = comments.map(c => ({ id: c.id, text: c.text, authorName: c.author?.name, authorId: c.authorId, createdAt: c.createdAt }));
    return res.json({ comments: mapped });
  } catch (e) {
    console.error('Failed to list comments', e);
    return res.status(500).json({ message: 'Failed to list comments' });
  }
});

// Edit a comment (only author or admin/super-admin)
router.patch('/comments/:commentId', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { commentId } = req.params;
  const { text } = req.body;
  if (!text || text.trim().length === 0) return res.status(400).json({ message: 'Comment text required' });
  try {
    const existing = await prisma.feedComment.findUnique({ where: { id: commentId } });
    if (!existing) return res.status(404).json({ message: 'Comment not found' });
    // Only author or admins can edit
    if (existing.authorId !== user.id && !['admin', 'super-admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await prisma.feedComment.update({ where: { id: commentId }, data: { text } });
    return res.json({ id: updated.id, text: updated.text, authorId: updated.authorId, createdAt: updated.createdAt });
  } catch (e) {
    console.error('Failed to edit comment', e);
    return res.status(500).json({ message: 'Failed to edit comment' });
  }
});

// Delete a comment (only author or admin/super-admin)
router.delete('/comments/:commentId', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { commentId } = req.params;
  try {
    const existing = await prisma.feedComment.findUnique({ where: { id: commentId } });
    if (!existing) return res.status(404).json({ message: 'Comment not found' });
    if (existing.authorId !== user.id && !['admin', 'super-admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await prisma.feedComment.delete({ where: { id: commentId } });
    return res.json({ deleted: true });
  } catch (e) {
    console.error('Failed to delete comment', e);
    return res.status(500).json({ message: 'Failed to delete comment' });
  }
});

// Edit a post (only author or admin/super-admin)
router.patch('/:postId', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { postId } = req.params;
  const { text } = req.body;
  try {
    const existing = await prisma.feedPost.findUnique({ where: { id: postId } });
    if (!existing) return res.status(404).json({ message: 'Post not found' });
    if (existing.authorId !== user.id && !['admin', 'super-admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const updated = await prisma.feedPost.update({ where: { id: postId }, data: { text } });

    // notify subscribers in background
    (async () => {
      try {
        const postWithAuthor = await prisma.feedPost.findUnique({ where: { id: updated.id }, include: { author: true } });
        await sendFeedPostNotification({ postId: updated.id, centerId: postWithAuthor.centerId, authorId: postWithAuthor.authorId, authorName: postWithAuthor.author?.name, text: updated.text, action: 'updated' });
      } catch (err) {
        console.error('Background push send failed', err);
      }
    })();

    return res.json({ id: updated.id, text: updated.text, createdAt: updated.createdAt });
  } catch (e) {
    console.error('Failed to edit post', e);
    return res.status(500).json({ message: 'Failed to edit post' });
  }
});

// Delete a post (only author or admin/super-admin)
router.delete('/:postId', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { postId } = req.params;
  try {
    const existing = await prisma.feedPost.findUnique({ where: { id: postId } });
    if (!existing) return res.status(404).json({ message: 'Post not found' });
    if (existing.authorId !== user.id && !['admin', 'super-admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // delete associated rows in correct order to avoid foreign-key constraint errors
    // remove medias, likes, comments then the post itself inside a transaction
    try {
      const result = await prisma.$transaction([
        prisma.feedMedia.deleteMany({ where: { postId } }),
        prisma.feedLike.deleteMany({ where: { postId } }),
        prisma.feedComment.deleteMany({ where: { postId } }),
        prisma.feedPost.delete({ where: { id: postId } }),
      ]);
      // result contains the counts / deleted objects; return success
      return res.json({ deleted: true });
    } catch (txErr) {
      console.error('Failed to delete post in transaction', postId, txErr && txErr.message ? txErr.message : txErr);
      if (txErr && txErr.code) console.error('Prisma error code', txErr.code);
      return res.status(500).json({ message: 'Failed to delete post' });
    }
  } catch (e) {
  console.error('Failed to delete post', e && e.message ? e.message : e);
  if (e && e.stack) console.error(e.stack);
  return res.status(500).json({ message: 'Failed to delete post' });
  }
});

// Add media to an existing post
router.post('/:postId/media', authMiddleware, checkContentLength, upload.array('images', 6), async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { postId } = req.params;
  try {
    const post = await prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    // Only the author or admins can add media
    if (post.authorId !== user.id && !['admin', 'super-admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const files = req.files || [];
    // Normalize tagging fields from multipart form fields (multer populates req.body)
    const { taggedChildIds, childId, noChildSelected } = req.body || {};
    const tagged = Array.isArray(taggedChildIds) ? taggedChildIds.filter(Boolean) : (childId ? [childId] : []);
    // When uploading files, require the user to either mark 'noChildSelected' or identify at least one child
    if (files.length > 0) {
      if (!noChildSelected && (!tagged || tagged.length === 0)) {
        return res.status(400).json({ message: 'Veuillez identifier les enfants ou sélectionner "Pas d\'enfant" avant d\'uploader des photos.' });
      }
      // If tagged children provided, ensure each has photo consent
      if (tagged && tagged.length > 0) {
        const lacking = [];
        for (const cid of tagged) {
          const consent = await prisma.photoConsent.findFirst({ where: { childId: cid, consent: true } });
          if (!consent) lacking.push(cid);
        }
        if (lacking.length > 0) {
          return res.status(403).json({ message: 'Photo consent absent for some children', lacking });
        }
      }
    }
    // require storage when files are provided
    if (files.length === 0) return res.status(400).json({ message: 'No files provided' });
    if (files.length > 0 && (!SUPABASE_URL || !SUPABASE_KEY)) {
      console.error('Supabase not configured but media add attempted');
      return res.status(503).json({ message: 'Storage backend not configured on server' });
    }
    const savedMedias = [];
    for (const file of files) {
      if (!validateMime(file.mimetype)) continue;

      // Read the file into a buffer (support memory or disk storage)
      const fileBuffer = file.buffer || (file.path ? require('fs').readFileSync(file.path) : null);
      if (!fileBuffer) {
        console.error('Uploaded file has no buffer or path, skipping', file && file.originalname ? file.originalname : '(unknown)');
        continue;
      }

      // Calculate MD5 hash of the original file using the buffer
      const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');

      // Check if a media with this hash already exists for this post
      const existingMedia = await prisma.feedMedia.findFirst({ where: { postId: postId, hash: hash } });
      if (existingMedia) {
        // Skip this file as it's already uploaded for this post
        try { if (file.path) require('fs').unlinkSync(file.path); } catch (e) { /* ignore cleanup errors */ }
        continue;
      }

    // Apply EXIF rotation and resize main while preserving aspect ratio
    const mainBuffer = await sharp(fileBuffer).rotate().resize({ width: 1600, withoutEnlargement: true }).toFormat('webp').toBuffer();
    // Square thumbnail for uniform feed appearance
    const thumbBuffer = await sharp(fileBuffer).rotate().resize({ width: 400, height: 400, fit: 'cover' }).toFormat('webp').toBuffer();

      const ext = 'webp';
      const baseName = `${postId}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const mainPath = path.posix.join('feed', `${baseName}.${ext}`);
      const thumbPath = path.posix.join('feed', `thumb_${baseName}.${ext}`);

      const { data: uploadData, error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(mainPath, mainBuffer, { contentType: 'image/webp', upsert: false });
      if (uploadError) {
        console.error('Supabase upload error', uploadError);
        continue;
      }
      const { data: thumbData, error: thumbError } = await supabase.storage.from(SUPABASE_BUCKET).upload(thumbPath, thumbBuffer, { contentType: 'image/webp', upsert: false });
      if (thumbError) console.error('Supabase thumb upload error', thumbError);

  // For public bucket: use public URLs and store storage paths
  const publicMain = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(mainPath);
  const publicThumb = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(thumbPath);
  const mainUrl = publicMain?.data?.publicUrl || null;
  const thumbUrl = publicThumb?.data?.publicUrl || null;

  const media = await prisma.feedMedia.create({ data: { postId: postId, type: 'image', url: mainUrl, thumbnailUrl: thumbUrl, size: file.size, hash: hash, storagePath: mainPath, thumbnailPath: thumbPath } });
  savedMedias.push(media);
  try { if (file.path) require('fs').unlinkSync(file.path); } catch (e) { /* ignore */ }
    }
    return res.status(201).json({ medias: savedMedias });
  } catch (e) {
    console.error('Failed to add media to post', e);
    return res.status(500).json({ message: 'Failed to add media' });
  }
});

// Delete a media entry from a post (does not remove files from Supabase)
router.delete('/:postId/media/:mediaId', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { postId, mediaId } = req.params;
  try {
    const media = await prisma.feedMedia.findUnique({ where: { id: mediaId } });
    if (!media) return res.status(404).json({ message: 'Media not found' });
    if (media.postId !== postId) return res.status(400).json({ message: 'Media does not belong to this post' });
    const post = await prisma.feedPost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.authorId !== user.id && !['admin', 'super-admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // If we have stored storage paths, remove files from Supabase too (public bucket)
    try {
      const toRemove = [];
      if (media.storagePath) toRemove.push(media.storagePath);
      if (media.thumbnailPath) toRemove.push(media.thumbnailPath);
      if (toRemove.length) {
        const { error: delErr } = await supabase.storage.from(SUPABASE_BUCKET).remove(toRemove);
        if (delErr) console.error('Supabase remove error', delErr);
      }
    } catch (e) {
      console.error('Error while removing files from Supabase', e);
    }
    await prisma.feedMedia.delete({ where: { id: mediaId } });

    // If this was the last media for the post and the post has no text, remove the empty post as well
    try {
      const remainingMedias = await prisma.feedMedia.count({ where: { postId } });
      const postAfter = await prisma.feedPost.findUnique({ where: { id: postId } });
      const postTextEmpty = !postAfter || !postAfter.text || String(postAfter.text).trim().length === 0;
      if (remainingMedias === 0 && postTextEmpty) {
        // delete likes, comments and the post in a transaction
        await prisma.$transaction([
          prisma.feedLike.deleteMany({ where: { postId } }),
          prisma.feedComment.deleteMany({ where: { postId } }),
          prisma.feedPost.delete({ where: { id: postId } }),
        ]);
        return res.json({ deleted: true, postDeleted: true });
      }
    } catch (cleanupErr) {
      console.error('Failed to cleanup empty post after media deletion', cleanupErr);
    }

    return res.json({ deleted: true });
  } catch (e) {
    console.error('Failed to delete media', e);
    return res.status(500).json({ message: 'Failed to delete media' });
  }
});

module.exports = router;
