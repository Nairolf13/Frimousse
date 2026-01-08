const express = require('express');
const router = express.Router();
const prisma = require('../lib/prismaClient');
const { notifyUsers } = require('../lib/pushNotifications');
const requireAuth = require('../middleware/authMiddleware');

// GET /api/support/tickets - Get user's tickets
router.get('/tickets', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ tickets });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/support/tickets - Create new ticket
router.post('/tickets', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message required' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        subject,
        message,
        status: 'open'
      },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // Notify super-admins about new ticket (background)
    (async () => {
      try {
        const superAdmins = await prisma.user.findMany({ where: { role: { in: ['super-admin', 'super_admin', 'superadmin'] } }, select: { id: true } });
        const adminIds = superAdmins.map(a => a.id).filter(Boolean);
        if (adminIds.length) {
          const title = `Nouveau ticket: ${ticket.subject || 'Support'}`;
          const body = (ticket.message || '').slice(0, 200);
          await notifyUsers(adminIds, { title, body, data: { ticketId: ticket.id, url: `/admin/support/${ticket.id}`, type: 'support.new' } });
        }
      } catch (e) {
        console.error('Failed to notify admins about new ticket', e && e.message ? e.message : e);
      }
    })();

    res.json({ ticket });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/support/tickets/:id/reply - Add reply to ticket
router.post('/tickets/:id/reply', requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Check if ticket exists and belongs to user
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Cannot reply to closed ticket' });
    }

    // Create reply
    const reply = await prisma.supportReply.create({
      data: {
        ticketId: id,
        message,
        isFromAdmin: req.user.role === 'super-admin'
      }
    });

    // Update ticket updatedAt
    await prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    // Notify super-admins (if this reply originates from a regular user)
    (async () => {
      try {
        if (req.user.role !== 'super-admin') {
          const superAdmins = await prisma.user.findMany({ where: { role: { in: ['super-admin', 'super_admin', 'superadmin'] } }, select: { id: true } });
          const adminIds = superAdmins.map(a => a.id).filter(Boolean);
          if (adminIds.length) {
            const title = `Réponse sur ticket: ${ticket.subject || 'Support'}`;
            const body = (message || '').slice(0, 200);
            await notifyUsers(adminIds, { title, body, data: { ticketId: id, url: `/admin/support/${id}`, type: 'support.reply' } });
          }
        }
      } catch (e) {
        console.error('Failed to notify admins about support reply', e && e.message ? e.message : e);
      }
    })();

    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/admin/support/tickets - Admin view all tickets (optionally filtered by center)
router.get('/admin/tickets', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { centerId } = req.query;

    let whereClause = {};
    if (centerId) {
      // Filtrer par centre - seulement les utilisateurs de ce centre
      whereClause = {
        user: {
          centerId: centerId
        }
      };
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            center: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        replies: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ tickets });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/admin/support/tickets/unread-count - number of tickets whose last message is from user (awaiting admin)
router.get('/admin/tickets/unread-count', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { centerId } = req.query;

    // Determine unread tickets by checking last user message time vs adminSeenAt
    const whereClause = { status: { not: 'closed' } };
    if (centerId) whereClause.user = { centerId };

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        // last non-admin reply (i.e. last user message)
        replies: {
          where: { isFromAdmin: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    });

    const unread = tickets.reduce((acc, t) => {
      const lastUserMsg = t.replies && t.replies.length ? t.replies[0].createdAt : t.createdAt;
      if (!t.adminSeenAt) return acc + 1; // admin never marked seen
      if (new Date(lastUserMsg) > new Date(t.adminSeenAt)) return acc + 1;
      return acc;
    }, 0);

    res.json({ unread });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/admin/support/tickets/:id/close - Admin close ticket
router.post('/admin/tickets/:id/close', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'closed',
        updatedAt: new Date()
      },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json({ ticket });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/admin/support/tickets/:id/reply - Admin reply to ticket
router.post('/admin/tickets/:id/reply', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Check if ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Cannot reply to closed ticket' });
    }

    // Create reply
    const reply = await prisma.supportReply.create({
      data: {
        ticketId: id,
        message,
        isFromAdmin: true
      }
    });

    // Update ticket updatedAt
    await prisma.supportTicket.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/admin/support/tickets/mark-read - mark tickets as read by admin (creates admin reply)
router.post('/admin/tickets/mark-read', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { centerId } = req.query;

    // Find open tickets optionally filtered by center
    let whereClause = { status: { not: 'closed' } };
    if (centerId) {
      whereClause = {
        ...whereClause,
        user: { centerId }
      };
    }

    // Instead of creating visible admin replies, update adminSeenAt timestamp
    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        replies: {
          where: { isFromAdmin: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    });

    const now = new Date();
    // Mark only tickets that have unread user messages (i.e. last user msg after adminSeenAt or adminSeenAt null)
    const toUpdate = tickets.filter(t => {
      const lastUserMsg = t.replies && t.replies.length ? t.replies[0].createdAt : t.createdAt;
      if (!t.adminSeenAt) return true;
      return new Date(lastUserMsg) > new Date(t.adminSeenAt);
    });

    await Promise.all(toUpdate.map(t => prisma.supportTicket.update({ where: { id: t.id }, data: { adminSeenAt: now } })));

    res.json({ marked: toUpdate.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/admin/support/tickets/mark-user-read - mark tickets from a specific user as read
router.post('/admin/tickets/mark-user-read/:userId', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { userId } = req.params;
    const now = new Date();

    // Find open tickets from this user where last message is from user
    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId,
        status: { not: 'closed' }
      },
      include: {
        replies: {
          where: { isFromAdmin: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    });

    // Mark only tickets that have unread user messages
    const toUpdate = tickets.filter(t => {
      const lastUserMsg = t.replies && t.replies.length ? t.replies[0].createdAt : t.createdAt;
      if (!t.adminSeenAt) return true;
      return new Date(lastUserMsg) > new Date(t.adminSeenAt);
    });

    await Promise.all(toUpdate.map(t => prisma.supportTicket.update({ where: { id: t.id }, data: { adminSeenAt: now } })));

    res.json({ marked: toUpdate.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;