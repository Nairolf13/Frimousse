const express = require('express');
const router = express.Router();

const prisma = require('../lib/prismaClient');
const requireAuth = require('../middleware/authMiddleware');
const { sendMail } = require('../lib/email');

// GET /api/announcements/active
// Returns active announcements not yet read by the current user
router.get('/active', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const announcements = await prisma.announcement.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!announcements.length) return res.json([]);

    const reads = await prisma.announcementRead.findMany({
      where: { userId, announcementId: { in: announcements.map(a => a.id) } },
      select: { announcementId: true },
    });
    const readIds = new Set(reads.map(r => r.announcementId));

    const unread = announcements.filter(a => !readIds.has(a.id));
    res.json(unread);
  } catch (err) {
    console.error('GET /announcements/active error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/announcements/:id/read
// Mark an announcement as read by the current user (DB + localStorage handled client-side)
router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId } },
      create: { announcementId: id, userId },
      update: { readAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('POST /announcements/:id/read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/announcements — list all (super-admin only)
router.get('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'super-admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const list = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/announcements — create (super-admin only)
router.post('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'super-admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { title, message, type = 'info', sendEmail: doSendEmail = false } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message are required' });

    const announcement = await prisma.announcement.create({
      data: { title, message, type, active: true, sendEmail: !!doSendEmail },
    });

    // Broadcast email if requested
    if (doSendEmail) {
      try {
        const users = await prisma.user.findMany({
          where: { notifyByEmail: true },
          select: { email: true, name: true },
        });
        const emails = users.map(u => u.email).filter(Boolean);
        if (emails.length > 0) {
          const htmlBody = `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:32px;color:white;text-align:center;margin-bottom:24px;">
                <img src="https://lesfrimousses.com/imgs/LogoFrimousse.webp" alt="Frimousse" style="width:60px;height:60px;object-fit:contain;margin-bottom:16px;border-radius:12px;background:white;padding:4px;" />
                <h1 style="margin:0;font-size:22px;font-weight:800;">${title}</h1>
              </div>
              <div style="background:#f8fafc;border-radius:12px;padding:24px;border:1px solid #e2e8f0;">
                <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">${message.replace(/\n/g, '<br/>')}</p>
              </div>
              <p style="text-align:center;margin-top:24px;">
                <a href="${process.env.FRONTEND_URL || 'https://lesfrimousses.com'}/dashboard" style="background:#6366f1;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ouvrir Frimousse</a>
              </p>
              <p style="text-align:center;margin-top:16px;font-size:12px;color:#9ca3af;">Vous recevez cet email car vous êtes utilisateur de Frimousse.</p>
            </div>
          `;
          // Send in batches of 50 to avoid SMTP limits
          for (let i = 0; i < emails.length; i += 50) {
            const batch = emails.slice(i, i + 50);
            await sendMail({ to: batch, subject: `[Frimousse] ${title}`, html: htmlBody, prisma }).catch(e => {
              console.error('Email broadcast batch error:', e && e.message ? e.message : e);
            });
          }
        }
      } catch (emailErr) {
        console.error('Email broadcast error:', emailErr && emailErr.message ? emailErr.message : emailErr);
        // Don't fail the whole request if email fails
      }
    }

    res.json(announcement);
  } catch (err) {
    console.error('POST /announcements error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/announcements/:id — update active status (super-admin only)
router.patch('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'super-admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const { id } = req.params;
    const { active } = req.body;
    const updated = await prisma.announcement.update({ where: { id }, data: { active } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/announcements/:id (super-admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'super-admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
