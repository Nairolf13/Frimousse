const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/payment-history/assigned?year=2025&month=9&limit=50&offset=0
// month is 1-12
router.get('/assigned', async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // find the user's linked nannyId (User.nannyId)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { nannyId: true } });
    if (!user || !user.nannyId) return res.status(403).json({ error: 'User is not a nanny' });
    const nannyId = user.nannyId;

    const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
    const month = req.query.month ? parseInt(req.query.month, 10) : undefined; // 1-12
    const limit = req.query.limit ? Math.min(200, parseInt(req.query.limit, 10) || 50) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) || 0 : 0;

    // Find parents who have at least one child assigned to this nanny
    const parents = await prisma.parent.findMany({
      where: {
        children: {
          some: {
            child: {
              assignments: {
                some: {
                  nannyId: nannyId
                }
              }
            }
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        // include payment histories, optionally filtered by year/month
        paymentHistories: year !== undefined && month !== undefined ? {
          where: { year: year, month: month },
          orderBy: { month: 'asc' },
          select: { id: true, year: true, month: true, total: true, details: true, paid: true }
        } : {
          orderBy: { year: 'desc' },
          take: 12,
          select: { id: true, year: true, month: true, total: true, paid: true }
        }
      },
      take: limit,
      skip: offset
    });

    return res.json({ parents });
  } catch (err) {
    console.error('payment-history.assigned error:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
