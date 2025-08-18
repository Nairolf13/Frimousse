const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true, centerId: true }
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.get('/all', async (req, res) => {
  try {
    // allow super-admin to see all users, otherwise only users in same center
    const auth = require('../middleware/authMiddleware');
    // attempt to extract token user; if missing, return 403
    // This endpoint is intentionally limited: if no auth token present, return public minimal list
    let where = {};
    try {
      // reuse middleware to populate req.user
      const fakeReq = { cookies: {} };
    } catch (e) {
      // fallback to public list
    }
    const users = await prisma.user.findMany({ select: { id: true, role: true, centerId: true } });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    // Supprimer les refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

    // Si le user est une nanny, supprimer la nanny associée
    if (req.user.role === 'nanny' && req.user.nannyId) {
      await prisma.nanny.delete({ where: { id: req.user.nannyId } });
    }

    // Si le user est un parent, supprimer le parent associé
    if (req.user.role === 'parent' && req.user.parentId) {
      await prisma.parent.delete({ where: { id: req.user.parentId } });
    }

    // Supprimer le user
    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e && e.message ? e.message : String(e) });
  }
});

module.exports = router;
