const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireActiveSubscription = require('../middleware/subscriptionMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.use(auth);
// unread-count is exempt from subscription check (used in header for all users)
router.use((req, res, next) => {
  if (req.path === '/unread-count' || req.path === '/stats') return next();
  return requireActiveSubscription(req, res, next);
});

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(req.query.pageSize || '20', 10)));
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.notification.count({ where: { userId } })
    ]);

    res.json({ items, total, page, pageSize });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;
    const unread = await prisma.notification.count({ where: { userId, read: false } });
    res.json({ unread });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/notifications/stats - return unread / today / week counts for current user
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [unread, today, week] = await Promise.all([
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.notification.count({ where: { userId, createdAt: { gte: startOfToday } } }),
      prisma.notification.count({ where: { userId, createdAt: { gte: sevenDaysAgo } } })
    ]);

    res.json({ unread, today, week });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/notifications/:id/read - mark as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const n = await prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { read: true } });
    if (n.count === 0) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/notifications/:id/unread - mark as unread
router.put('/:id/unread', async (req, res) => {
  try {
    const { id } = req.params;
    const n = await prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { read: false } });
    if (n.count === 0) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/notifications/:id - delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const n = await prisma.notification.deleteMany({ where: { id, userId: req.user.id } });
    if (n.count === 0) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/notifications/mark-all-read - mark all notifications for current user as read
router.put('/mark-all-read', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    res.json({ success: true, updated: result.count });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/notifications - delete all notifications for current user
router.delete('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await prisma.notification.deleteMany({ where: { userId } });
    res.json({ success: true, deleted: result.count });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
