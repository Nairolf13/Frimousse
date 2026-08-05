const express = require('express');
const router = express.Router();

const prisma = require('../lib/prismaClient');
const requireAuth = require('../middleware/authMiddleware');
const { getOnlineUserIds } = require('../lib/wsServer');

// Monthly price per plan, in EUR. Overridable via env for pricing changes
// without a deploy; falls back to the prices publicly advertised on /tarifs.
const PLAN_PRICES_EUR = {
  essentiel: Number(process.env.PLAN_PRICE_ESSENTIEL_EUR || 29.99),
  pro: Number(process.env.PLAN_PRICE_PRO_EUR || 59.99),
  decouverte: 0,
};

// GET /api/admin/online-users — currently connected users (super-admin only)
router.get('/online-users', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const ids = getOnlineUserIds();
    if (ids.length === 0) return res.json({ users: [] });
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, role: true, centerId: true, center: { select: { name: true } } },
    });
    res.json({
      users: users.map(u => ({ id: u.id, name: u.name, role: u.role, centerName: u.center?.name || null })),
    });
  } catch (e) {
    console.error('GET /api/admin/online-users error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/revenue-stats — MRR + monthly new/canceled subscriptions (super-admin only)
router.get('/revenue-stats', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const monthsBack = Math.min(24, Math.max(1, Number(req.query.months) || 12));
    const now = new Date();
    const monthStarts = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      monthStarts.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }

    const subs = await prisma.subscription.findMany({
      select: { plan: true, status: true, createdAt: true, canceledAt: true },
    });

    function mrrAt(pointInTime) {
      let total = 0;
      for (const s of subs) {
        const created = new Date(s.createdAt);
        const canceled = s.canceledAt ? new Date(s.canceledAt) : null;
        const wasActive = created <= pointInTime && (!canceled || canceled > pointInTime);
        if (wasActive && (s.status === 'active' || s.status === 'trialing')) {
          total += PLAN_PRICES_EUR[s.plan] || 0;
        }
      }
      return Math.round(total * 100) / 100;
    }

    const series = monthStarts.map((start, i) => {
      const end = i + 1 < monthStarts.length ? monthStarts[i + 1] : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const newCount = subs.filter(s => new Date(s.createdAt) >= start && new Date(s.createdAt) < end).length;
      const canceledCount = subs.filter(s => s.canceledAt && new Date(s.canceledAt) >= start && new Date(s.canceledAt) < end).length;
      return {
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        mrr: mrrAt(new Date(end.getTime() - 1)),
        newSubscriptions: newCount,
        canceledSubscriptions: canceledCount,
      };
    });

    const currentMrr = series[series.length - 1]?.mrr || 0;
    const previousMrr = series[series.length - 2]?.mrr ?? 0;
    const mrrGrowthPct = previousMrr > 0
      ? Math.round(((currentMrr - previousMrr) / previousMrr) * 1000) / 10
      : (currentMrr > 0 ? 100 : 0);

    res.json({
      currentMrr,
      previousMrr,
      mrrGrowthPct,
      series,
    });
  } catch (e) {
    console.error('GET /api/admin/revenue-stats error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
