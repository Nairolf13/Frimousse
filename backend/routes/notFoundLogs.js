const express = require('express');
const router = express.Router();
const prisma = require('../lib/prismaClient');
const requireAuth = require('../middleware/authMiddleware');

function isSuperAdmin(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'super-admin' || r === 'super_admin' || r === 'superadmin' || r.includes('super');
}

// POST /api/not-found-logs — public (no auth), logs a 404 hit
// Rate-limited by the global limiter in index.js
router.post('/', async (req, res) => {
  try {
    const rawUrl = req.body?.url;
    if (!rawUrl || typeof rawUrl !== 'string') return res.status(400).json({ error: 'url required' });

    // Sanitize: keep only path+query, max 500 chars, strip origin
    let url;
    try {
      const parsed = new URL(rawUrl, 'https://lesfrimousses.com');
      url = (parsed.pathname + parsed.search).slice(0, 500);
    } catch {
      url = String(rawUrl).slice(0, 500);
    }

    const userAgent = (req.headers['user-agent'] || '').slice(0, 300) || null;

    // Upsert: if same URL already logged, increment count and update lastSeenAt
    const existing = await prisma.notFoundLog.findFirst({ where: { url } });
    if (existing) {
      await prisma.notFoundLog.update({
        where: { id: existing.id },
        data: { count: { increment: 1 }, lastSeenAt: new Date(), userAgent },
      });
    } else {
      await prisma.notFoundLog.create({ data: { url, userAgent } });
    }

    res.json({ ok: true });
  } catch (e) {
    // Never crash the frontend — swallow errors silently
    console.error('[notFoundLogs] POST error:', e?.message);
    res.json({ ok: false });
  }
});

// GET /api/admin/not-found-logs — super-admin only
router.get('/not-found-logs', requireAuth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });

    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;
    const showResolved = req.query.resolved === 'true';

    const where = { resolved: showResolved };

    const [logs, total] = await Promise.all([
      prisma.notFoundLog.findMany({
        where,
        orderBy: [{ count: 'desc' }, { lastSeenAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.notFoundLog.count({ where }),
    ]);

    res.json({ logs, total, page, limit });
  } catch (e) {
    console.error('[notFoundLogs] GET error:', e?.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// PATCH /api/admin/not-found-logs/:id/resolve — super-admin only
router.patch('/not-found-logs/:id/resolve', requireAuth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const log = await prisma.notFoundLog.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    });
    res.json({ ok: true, log });
  } catch (e) {
    console.error('[notFoundLogs] PATCH error:', e?.message);
    res.status(500).json({ error: 'server_error' });
  }
});

// DELETE /api/admin/not-found-logs/:id — super-admin only
router.delete('/not-found-logs/:id', requireAuth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });

    await prisma.notFoundLog.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('[notFoundLogs] DELETE error:', e?.message);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
