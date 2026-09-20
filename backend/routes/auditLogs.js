const express = require('express');
const router = express.Router();
const prisma = require('../lib/prismaClient');
const requireAuth = require('../middleware/authMiddleware');

function isSuperAdmin(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'super-admin' || r === 'super_admin' || r === 'superadmin' || r.includes('super');
}

// GET /api/admin/audit-logs — super-admin only
router.get('/audit-logs', requireAuth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });

    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.targetType) where.targetType = String(req.query.targetType);
    if (req.query.centerId) where.centerId = String(req.query.centerId);
    if (req.query.search) {
      const q = String(req.query.search);
      where.OR = [
        { actorName: { contains: q, mode: 'insensitive' } },
        { actorEmail: { contains: q, mode: 'insensitive' } },
        { centerName: { contains: q, mode: 'insensitive' } },
        { targetId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page, limit });
  } catch (e) {
    console.error('[auditLogs] GET error:', e?.message);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
