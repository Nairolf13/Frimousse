const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

router.get('/', auth, async (req, res) => {
  const nannies = await prisma.nanny.findMany({ include: { assignedChildren: true } });
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
        }
      });
      const authController = require('../controllers/authController');
      const fakeReq = {
        body: {
          email,
          password,
          name,
          role: 'nanny',
          nannyId: nanny.id
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
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET;
      const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
      function generateAccessToken(user) {
        return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
      }
      function generateRefreshToken(user) {
        return jwt.sign({ id: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
      }
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
      res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15*60*1000 });
      res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*60*60*1000 });
      res.status(201).json({ nanny, user });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  } else {
    const nanny = await prisma.nanny.create({
      data: {
        name,
        availability,
        experience: parsedExperience,
        contact,
        email,
      }
    });
    res.status(201).json(nanny);
  }
});

router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { name, availability, experience, contact, email } = req.body;
  const nanny = await prisma.nanny.update({
    where: { id },
    data: { name, availability, experience, contact, email }
  });
  res.json(nanny);
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.assignment.deleteMany({ where: { nannyId: id } });
    await prisma.schedule.deleteMany({ where: { nannyId: id } });
    const users = await prisma.user.findMany({ where: { nannyId: id } });
    for (const user of users) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    }
    await prisma.user.deleteMany({ where: { nannyId: id } });
    await prisma.nanny.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const nanny = await prisma.nanny.findUnique({ where: { id }, include: { assignedChildren: true } });
  if (!nanny) return res.status(404).json({ message: 'Not found' });
  res.json(nanny);
});

module.exports = router;
