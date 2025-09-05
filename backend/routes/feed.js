const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');

const { createClient } = require('@supabase/supabase-js');
// Robust Prisma client import: prefer generated client output, fall back to @prisma/client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authMiddleware = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }); // 8MB

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPictures';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase vars not set. Feed uploads will fail until SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false } });

function validateMime(mimetype) {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mimetype);
}

// Create a feed post with optional images
router.post('/', authMiddleware, upload.array('images', 6), async (req, res) => {
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
      const hash = crypto.createHash('md5').update(file.buffer).digest('hex');

      // Check if a media with this hash already exists for this post (though post is new, but to be safe)
      const existingMedia = await prisma.feedMedia.findFirst({ where: { postId: post.id, hash: hash } });
      if (existingMedia) {
        // Skip this file as it's already uploaded for this post
        continue;
      }

      // Process main image (resize to max width 1600) and thumbnail (300)
      const mainBuffer = await sharp(file.buffer).resize({ width: 1600, withoutEnlargement: true }).toFormat('webp').toBuffer();
      const thumbBuffer = await sharp(file.buffer).resize({ width: 300 }).toFormat('webp').toBuffer();

      const ext = 'webp';
      const baseName = `${post.id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const mainPath = path.posix.join('feed', `${baseName}.${ext}`);
      const thumbPath = path.posix.join('feed', `thumb_${baseName}.${ext}`);

      // Upload main
      const { data: uploadData, error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(mainPath, mainBuffer, { contentType: 'image/webp', upsert: false });
      if (uploadError) {
        console.error('Supabase upload error', uploadError);
        continue;
      }

      // Upload thumbnail
      const { data: thumbData, error: thumbError } = await supabase.storage.from(SUPABASE_BUCKET).upload(thumbPath, thumbBuffer, { contentType: 'image/webp', upsert: false });
      if (thumbError) {
        console.error('Supabase thumb upload error', thumbError);
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
    }

    const result = await prisma.feedPost.findUnique({ where: { id: post.id }, include: { medias: true, author: true } });
    return res.status(201).json(result);
  } catch (e) {
    console.error('Failed to create feed post', e);
    return res.status(500).json({ message: 'Failed to create post' });
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
    // delete associated medias first
    await prisma.feedMedia.deleteMany({ where: { postId } });
    await prisma.feedPost.delete({ where: { id: postId } });
    return res.json({ deleted: true });
  } catch (e) {
    console.error('Failed to delete post', e);
    return res.status(500).json({ message: 'Failed to delete post' });
  }
});

// Add media to an existing post
router.post('/:postId/media', authMiddleware, upload.array('images', 6), async (req, res) => {
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
    // require storage when files are provided
    if (files.length === 0) return res.status(400).json({ message: 'No files provided' });
    if (files.length > 0 && (!SUPABASE_URL || !SUPABASE_KEY)) {
      console.error('Supabase not configured but media add attempted');
      return res.status(503).json({ message: 'Storage backend not configured on server' });
    }
    const savedMedias = [];
    for (const file of files) {
      if (!validateMime(file.mimetype)) continue;

      // Calculate MD5 hash of the original file
      const hash = crypto.createHash('md5').update(file.buffer).digest('hex');

      // Check if a media with this hash already exists for this post
      const existingMedia = await prisma.feedMedia.findFirst({ where: { postId: postId, hash: hash } });
      if (existingMedia) {
        // Skip this file as it's already uploaded for this post
        continue;
      }

      const mainBuffer = await sharp(file.buffer).resize({ width: 1600, withoutEnlargement: true }).toFormat('webp').toBuffer();
      const thumbBuffer = await sharp(file.buffer).resize({ width: 300 }).toFormat('webp').toBuffer();

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
    return res.json({ deleted: true });
  } catch (e) {
    console.error('Failed to delete media', e);
    return res.status(500).json({ message: 'Failed to delete media' });
  }
});

module.exports = router;
