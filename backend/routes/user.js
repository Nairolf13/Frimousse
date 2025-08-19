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
    const auth = require('../middleware/authMiddleware');

    let where = {};
    try {
      const fakeReq = { cookies: {} };
    } catch (e) {
    }
    const users = await prisma.user.findMany({ select: { id: true, role: true, centerId: true } });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

    if (req.user.role === 'nanny' && req.user.nannyId) {
      await prisma.nanny.delete({ where: { id: req.user.nannyId } });
    }

    if (req.user.role === 'parent' && req.user.parentId) {
      await prisma.parent.delete({ where: { id: req.user.parentId } });
    }

    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e && e.message ? e.message : String(e) });
  }
});

module.exports = router;
