const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/authMiddleware');

// GET /api/admin/centers
router.get('/centers', requireAuth, async (req, res) => {
  try {
    // only super-admins
    if (!req.user || req.user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const centers = await prisma.center.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            parents: true,
            children: true,
            nannies: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: centers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;