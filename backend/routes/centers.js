const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/authMiddleware');

// GET /api/centers/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const center = await prisma.center.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    if (!center) return res.status(404).json({ message: 'Centre non trouvé' });
    // Ensure the user belongs to the same center unless super-admin
    if (!req.user || (!req.user.centerId && req.user.role !== 'super-admin')) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (req.user.role !== 'super-admin' && req.user.centerId && req.user.centerId !== id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    res.json(center);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
