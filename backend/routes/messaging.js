const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireProOrTrial = require('../middleware/requireProOrTrial');

const wsServer = require('../lib/wsServer');
const { notifyUsers } = require('../lib/pushNotifications');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const path = require('path');
const prisma = require('../lib/prismaClient');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPictures';
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false } })
  : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé'));
  },
});

router.use(auth);
router.use(requireProOrTrial);

// ─── POST /api/messaging/upload ─────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
    if (!supabase) return res.status(503).json({ error: 'Stockage non configuré' });

    const ext = path.extname(req.file.originalname) || '.bin';
    const hash = crypto.createHash('md5').update(`${Date.now()}_${Math.random()}`).digest('hex');
    const storagePath = `messaging/${hash}${ext}`;

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

    if (error) {
      console.error('messaging upload error', error);
      return res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }

    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    res.json({ url: data.publicUrl, mediaType });
  } catch (e) {
    console.error('POST /upload error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function isAdmin(user) {
  return typeof user.role === 'string' && (user.role === 'admin' || user.role.toLowerCase().includes('super'));
}

/**
 * Returns the list of User IDs that `user` is allowed to message.
 * - admin/super-admin: everyone in the same center
 * - parent: admin(s) of the center + nannies of their children
 * - nanny: admin(s) of the center + parents of their assigned children
 */
async function getAllowedContactIds(user) {
  const centerId = user.centerId;

  // Super-admin can message everyone in the app
  const isSuperAdmin = typeof user.role === 'string' && user.role.toLowerCase().includes('super');
  if (isSuperAdmin) {
    const users = await prisma.user.findMany({
      where: { id: { not: user.id } },
      select: { id: true },
    });
    return users.map(u => u.id);
  }

  if (!centerId) return [];

  if (isAdmin(user)) {
    // Can talk to everyone in the center except themselves
    const users = await prisma.user.findMany({
      where: { centerId, id: { not: user.id } },
      select: { id: true },
    });
    return users.map(u => u.id);
  }

  if (user.role === 'parent' && user.parentId) {
    // Get center admins
    const admins = await prisma.user.findMany({
      where: { centerId, role: { in: ['admin', 'super-admin'] } },
      select: { id: true },
    });
    // Get nannies assigned to this parent's children
    const parentChildren = await prisma.parentChild.findMany({
      where: { parentId: user.parentId },
      select: { childId: true },
    });
    const childIds = parentChildren.map(pc => pc.childId);
    const nannyUsers = await prisma.user.findMany({
      where: {
        centerId,
        nanny: { childNannies: { some: { childId: { in: childIds } } } },
      },
      select: { id: true },
    });
    const ids = new Set([...admins.map(a => a.id), ...nannyUsers.map(n => n.id)]);
    ids.delete(user.id);
    return [...ids];
  }

  if (user.nannyId) {
    // Get center admins
    const admins = await prisma.user.findMany({
      where: { centerId, role: { in: ['admin', 'super-admin'] } },
      select: { id: true },
    });
    // Get parents of children assigned to this nanny
    const childNannies = await prisma.childNanny.findMany({
      where: { nannyId: user.nannyId },
      select: { childId: true },
    });
    const childIds = childNannies.map(cn => cn.childId);
    const parentUsers = await prisma.user.findMany({
      where: {
        centerId,
        parent: { children: { some: { childId: { in: childIds } } } },
      },
      select: { id: true },
    });
    const ids = new Set([...admins.map(a => a.id), ...parentUsers.map(p => p.id)]);
    ids.delete(user.id);
    return [...ids];
  }

  return [];
}

// ─── GET /api/messaging/contacts ────────────────────────────────────────────
// Returns the list of users this user can message (for the "new conversation" picker)
router.get('/contacts', async (req, res) => {
  try {
    const allowedIds = await getAllowedContactIds(req.user);
    if (allowedIds.length === 0) return res.json([]);

    const users = await prisma.user.findMany({
      where: { id: { in: allowedIds } },
      select: { id: true, name: true, role: true, avatarUrl: true, nannyId: true, parentId: true, centerId: true },
    });
    res.json(users);
  } catch (e) {
    console.error('GET /contacts error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/messaging/conversations ───────────────────────────────────────
// Returns all conversations the current user participates in
router.get('/conversations', async (req, res) => {
  try {
    const convos = await prisma.conversation.findMany({
      where: { participants: { some: { userId: req.user.id } } },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Attach unread count per conversation
    const withUnread = await Promise.all(
      convos.map(async (c) => {
        const me = c.participants.find(p => p.userId === req.user.id);
        const lastReadAt = me?.lastReadAt ?? null;
        const unread = await prisma.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: req.user.id },
            createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
          },
        });
        return { ...c, unreadCount: unread };
      })
    );

    res.json(withUnread);
  } catch (e) {
    console.error('GET /conversations error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/messaging/conversations ──────────────────────────────────────
// Create or get a 1-on-1 conversation with another user
router.post('/conversations', async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) return res.status(400).json({ error: 'participantId requis' });
    if (participantId === req.user.id) return res.status(400).json({ error: 'Impossible de vous envoyer un message à vous-même' });

    const allowedIds = await getAllowedContactIds(req.user);
    if (!allowedIds.includes(participantId)) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à contacter cet utilisateur' });
    }

    // Look for an existing 1-on-1 conversation between the two users
    const existing = await prisma.conversation.findFirst({
      where: {
        participants: { every: { userId: { in: [req.user.id, participantId] } } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, createdAt: true, senderId: true },
        },
      },
    });

    if (existing && existing.participants.length === 2) {
      return res.json(existing);
    }

    const convo = await prisma.conversation.create({
      data: {
        centerId: req.user.centerId,
        participants: {
          create: [{ userId: req.user.id }, { userId: participantId }],
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        messages: true,
      },
    });

    res.status(201).json(convo);
  } catch (e) {
    console.error('POST /conversations error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/messaging/conversations/:id/messages ──────────────────────────
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: id, userId: req.user.id },
    });
    if (!participant) return res.status(403).json({ error: 'Accès refusé' });

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, parseInt(req.query.pageSize || '50', 10));
    const skip = (page - 1) * pageSize;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: id },
        include: { sender: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.message.count({ where: { conversationId: id } }),
    ]);

    // Mark as read
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    res.json({ messages, total, page, pageSize });
  } catch (e) {
    console.error('GET /messages error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/messaging/conversations/:id/messages ─────────────────────────
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, mediaUrl, mediaType } = req.body;

    if ((!content || !content.trim()) && !mediaUrl) return res.status(400).json({ error: 'Message vide' });
    if (content && content.length > 2000) return res.status(400).json({ error: 'Message trop long (max 2000 caractères)' });

    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: id, userId: req.user.id },
    });
    if (!participant) return res.status(403).json({ error: 'Accès refusé' });

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: id,
          senderId: req.user.id,
          content: content ? content.trim() : '',
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
        },
        include: { sender: { select: { id: true, name: true, role: true, avatarUrl: true } } },
      }),
      prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: new Date() },
      }),
      // Mark as read for sender
      prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      }),
    ]);

    // Broadcast via WS
    wsServer.broadcastMessage(id, message);

    // Push notification to other participants
    try {
      const otherParticipants = await prisma.conversationParticipant.findMany({
        where: { conversationId: id, userId: { not: req.user.id } },
        select: { userId: true },
      });
      const recipientIds = otherParticipants.map(p => p.userId);
      if (recipientIds.length > 0) {
        const senderName = req.user.name || 'Quelqu\'un';
        const preview = content.trim().length > 80 ? content.trim().slice(0, 77) + '…' : content.trim();
        await notifyUsers(recipientIds, {
          title: `Message de ${senderName}`,
          body: preview,
          tag: `frimousse-message-${id}`,
          data: { url: '/messages', type: 'message', conversationId: id },
        });
      }
    } catch (notifErr) {
      console.error('messaging notif error', notifErr && notifErr.message ? notifErr.message : notifErr);
    }

    res.status(201).json(message);
  } catch (e) {
    console.error('POST /messages error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/messaging/conversations/:id/read ─────────────────────────────
router.post('/conversations/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: id, userId: req.user.id },
    });
    if (!participant) return res.status(403).json({ error: 'Accès refusé' });

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/messaging/unread-count ────────────────────────────────────────
router.get('/unread-count', async (req, res) => {
  try {
    const participants = await prisma.conversationParticipant.findMany({
      where: { userId: req.user.id },
      select: { conversationId: true, lastReadAt: true },
    });

    let total = 0;
    for (const p of participants) {
      const count = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: req.user.id },
          createdAt: p.lastReadAt ? { gt: p.lastReadAt } : undefined,
        },
      });
      total += count;
    }

    res.json({ unread: total });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PATCH /api/messaging/messages/:id ──────────────────────────────────────
router.patch('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Contenu vide' });
    if (content.length > 2000) return res.status(400).json({ error: 'Message trop long' });

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ error: 'Message introuvable' });
    if (message.senderId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    const updated = await prisma.message.update({
      where: { id },
      data: { content: content.trim() },
      include: { sender: { select: { id: true, name: true, role: true, avatarUrl: true } } },
    });

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: message.conversationId },
      select: { userId: true },
    });
    wsServer.broadcastToParticipants(
      participants.map(p => p.userId),
      { type: 'message_updated', conversationId: message.conversationId, message: updated }
    );
    res.json(updated);
  } catch (e) {
    console.error('PATCH /messages/:id error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE /api/messaging/messages/:id ─────────────────────────────────────
router.delete('/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ error: 'Message introuvable' });
    if (message.senderId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: message.conversationId },
      select: { userId: true },
    });

    await prisma.message.delete({ where: { id } });

    wsServer.broadcastToParticipants(
      participants.map(p => p.userId),
      { type: 'message_deleted', conversationId: message.conversationId, messageId: id }
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /messages/:id error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DELETE /api/messaging/conversations/:id ────────────────────────────────
// Removes the current user from the conversation (soft-leave).
// If all participants have left, the conversation and its messages are deleted.
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: id, userId: req.user.id },
    });
    if (!participant) return res.status(403).json({ error: 'Accès refusé' });

    // Remove this participant
    await prisma.conversationParticipant.delete({ where: { id: participant.id } });

    // Check if any participant remains
    const remaining = await prisma.conversationParticipant.count({ where: { conversationId: id } });
    if (remaining === 0) {
      // Delete all messages then the conversation
      await prisma.message.deleteMany({ where: { conversationId: id } });
      await prisma.conversation.delete({ where: { id } });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /conversations/:id error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
