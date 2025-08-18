const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;


router.get('/', auth, async (req, res) => {
  const where = {};
  if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
  const nannies = await prisma.nanny.findMany({ where, include: { assignedChildren: true } });
  res.json(nannies);
});

router.post('/', auth, async (req, res) => {
  const { name, availability, experience, contact, email, password } = req.body;
  const parsedExperience = typeof experience === 'string' ? parseInt(experience, 10) : experience;
  if (isNaN(parsedExperience)) {
    return res.status(400).json({ error: 'Le champ "experience" doit être un nombre.' });
  }
  if (email && password) {
    try {
      const nanny = await prisma.nanny.create({
        data: {
          name,
          availability,
          experience: parsedExperience,
          contact,
          email,
          centerId: req.user.centerId || null,
        }
      });
      const authController = require('../controllers/authController');
      const fakeReq = {
        body: {
          email,
          password,
          name,
          role: 'nanny',
          nannyId: nanny.id,
          centerId: req.user.centerId || null
        },
        cookies: req.cookies
      };
      await new Promise((resolve, reject) => {
        const fakeRes = {
          status: (code) => { fakeRes.statusCode = code; return fakeRes; },
          json: (data) => { fakeRes.data = data; resolve(fakeRes); },
          cookie: (...args) => {},
        };
        authController.register(fakeReq, fakeRes).catch(reject);
      });
  const user = await prisma.user.findUnique({ where: { email } });
  // Ne pas connecter automatiquement le compte créé
  res.status(201).json({ nanny, user });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  } else {
  const nannyData = { name, availability, experience: parsedExperience, contact, email, centerId: req.user.centerId || null };
  const nanny = await prisma.nanny.create({ data: nannyData });
    res.status(201).json(nanny);
  }
});

router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { name, availability, experience, contact, email } = req.body;
  // ensure center match
  if (!isSuperAdmin(req.user)) {
    const existing = await prisma.nanny.findUnique({ where: { id } });
    if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Nanny not found' });
  }
  const nanny = await prisma.nanny.update({ where: { id }, data: { name, availability, experience, contact, email } });
  res.json(nanny);
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    // ensure center match
    if (!isSuperAdmin(req.user)) {
      const existing = await prisma.nanny.findUnique({ where: { id } });
      if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Nanny not found' });
    }
    // Use a transaction: remove assignments, reports, disconnect schedules, delete related users, then delete nanny
    await prisma.$transaction(async (tx) => {
      await tx.assignment.deleteMany({ where: { nannyId: id } });
      await tx.report.deleteMany({ where: { nannyId: id } });

      // find schedules that reference this nanny and disconnect the relation
      const schedules = await tx.schedule.findMany({ where: { nannies: { some: { id } } }, select: { id: true } });
      for (const s of schedules) {
        await tx.schedule.update({ where: { id: s.id }, data: { nannies: { disconnect: { id } } } });
      }

      const users = await tx.user.findMany({ where: { nannyId: id } });
      for (const user of users) {
        await tx.refreshToken.deleteMany({ where: { userId: user.id } });
      }
      await tx.user.deleteMany({ where: { nannyId: id } });
      await tx.nanny.delete({ where: { id } });
    });
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/nannies/:id error', e);
    res.status(400).json({ error: e && e.message ? e.message : String(e) });
  }
});

router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const nanny = await prisma.nanny.findUnique({ where: { id }, include: { assignedChildren: true } });
  if (!nanny) return res.status(404).json({ message: 'Not found' });
  res.json(nanny);
});

module.exports = router;
