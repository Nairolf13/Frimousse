const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authMiddleware = require('../middleware/authMiddleware');

function isSuperAdmin(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'super-admin' || r === 'super_admin' || r === 'superadmin' || r.includes('super');
}

function isAdminRole(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'admin' || r === 'administrator' || r.includes('admin');
}

// GET /api/reviews - public: list approved reviews (optionally by centerId)
router.get('/', async (req, res) => {
  try {
    const { centerId, limit = 8 } = req.query;
    const where = { approved: true };
    if (centerId) where.centerId = centerId;
    const reviews = await prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit) });
    return res.json({ reviews });
  } catch (e) {
    console.error('Failed to fetch reviews', e);
    return res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// POST /api/reviews - create a new review (anonymous allowed). Mark as not approved by default.
router.post('/', async (req, res) => {
  try {
    const { authorName = null, content, rating = null, centerId = null } = req.body || {};
    if (!content || typeof content !== 'string' || content.trim().length < 5) return res.status(400).json({ message: 'Content too short' });

    const created = await prisma.review.create({ data: { authorName: authorName ? String(authorName).slice(0, 120) : null, content: content.trim(), rating: rating ? Number(rating) : null, centerId } });
    // Do not expose unapproved reviews in the public list. Return created entity for administrative use.
    // Notify super-admins (in-app push + email) that a new review is awaiting moderation. Fire-and-forget.
    (async () => {
      try {
        const users = await prisma.user.findMany({ where: {}, select: { id: true, email: true, name: true, role: true } });
        const superAdmins = (users || []).filter(u => isSuperAdmin(u));
        const adminIds = superAdmins.map(u => u.id).filter(Boolean);
        const adminEmails = superAdmins.map(u => u.email).filter(Boolean);

        // Push / in-app notifications
        if (adminIds.length) {
          try {
            const { notifyUsers } = require('../lib/pushNotifications');
            const payload = { title: 'Nouvel avis à modérer', body: (created.content && created.content.length > 120 ? created.content.slice(0, 117) + '...' : created.content || 'Nouveau avis'), data: { reviewId: created.id, type: 'review.created' } };
            await notifyUsers(adminIds, payload);
          } catch (e) {
            console.error('Failed to notify super-admins via push', e && e.message ? e.message : e);
          }
        }

        // Email notifications for admins who have emails
        if (process.env.SMTP_HOST && adminEmails.length) {
          try {
            const { sendMail } = require('../lib/email');
            const subject = 'Nouvel avis en attente de validation';
            const frontendUrl = process.env.FRONTEND_URL || 'https://frimousse-asso.fr';
            const text = `Un nouvel avis a été posté par ${created.authorName || 'Anonyme'}:\n\n${created.content}\n\nConsultez la modération: ${frontendUrl}/admin/reviews`;
            // sendMail accepts array or string
            await sendMail({ to: adminEmails, subject, text });
          } catch (e) {
            console.error('Failed to send review notification emails', e && e.message ? e.message : e);
          }
        }
      } catch (e) {
        console.error('Failed to prepare admin notifications for new review', e && e.message ? e.message : e);
      }
    })();

    return res.status(201).json({ review: created });
  } catch (e) {
    console.error('Failed to create review', e);
    return res.status(500).json({ message: 'Failed to create review' });
  }
});

// Admin: list reviews (all or pending). Center-scoped for non-super-admins
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { centerId, status = 'pending', limit = 100, page = 1 } = req.query;
    const where = {};
    if (status === 'pending') where.approved = false;
    else if (status === 'approved') where.approved = true;
    // If a centerId query param is provided and user is super-admin allow it
    if (centerId && isSuperAdmin(user)) where.centerId = String(centerId);
    // Non-super-admins should only see reviews for their center
    if (!isSuperAdmin(user) && user.centerId) where.centerId = user.centerId;
    const take = Number(limit) || 100;
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * take;
    const [totalCount, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    ]);
    return res.json({ reviews, totalCount });
  } catch (e) {
    console.error('Failed to fetch admin reviews', e);
    return res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Admin: update a review (approve/unapprove or edit content)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const payload = req.body || {};
    // Load existing
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Review not found' });
    if (!isSuperAdmin(user) && user.centerId && existing.centerId !== user.centerId) return res.status(404).json({ message: 'Review not found' });
    // Only admins/super-admins can modify
    if (!(isAdminRole(user) || isSuperAdmin(user))) return res.status(403).json({ message: 'Forbidden' });
    const data = {};
    if (typeof payload.approved === 'boolean') data.approved = payload.approved;
    if (typeof payload.content === 'string') data.content = payload.content.trim().slice(0, 5000);
    if (typeof payload.authorName === 'string') data.authorName = payload.authorName.trim().slice(0, 120);
    const updated = await prisma.review.update({ where: { id }, data });
    return res.json({ review: updated });
  } catch (e) {
    console.error('Failed to update review', e);
    return res.status(500).json({ message: 'Failed to update review' });
  }
});

// Admin: delete a review
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Review not found' });
    if (!isSuperAdmin(user) && user.centerId && existing.centerId !== user.centerId) return res.status(404).json({ message: 'Review not found' });
    if (!(isAdminRole(user) || isSuperAdmin(user))) return res.status(403).json({ message: 'Forbidden' });
    await prisma.review.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (e) {
    console.error('Failed to delete review', e);
    return res.status(500).json({ message: 'Failed to delete review' });
  }
});

module.exports = router;

