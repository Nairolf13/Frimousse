const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all nannies
router.get('/', auth, async (req, res) => {
  const nannies = await prisma.nanny.findMany({ include: { assignedChildren: true } });
  res.json(nannies);
});

// Add a nanny
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

router.post('/', auth, async (req, res) => {
  const { name, availability, experience, contact, email, password } = req.body;
  const parsedExperience = typeof experience === 'string' ? parseInt(experience, 10) : experience;
  if (isNaN(parsedExperience)) {
    return res.status(400).json({ error: 'Le champ "experience" doit être un nombre.' });
  }
  if (email && password) {
    // Création nounou + user associé via la logique register
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
      // On va utiliser la logique de register d'authController
      const authController = require('../controllers/authController');
      // On forge une requête factice pour register
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
      // On utilise une promesse pour capturer la réponse
      await new Promise((resolve, reject) => {
        const fakeRes = {
          status: (code) => { fakeRes.statusCode = code; return fakeRes; },
          json: (data) => { fakeRes.data = data; resolve(fakeRes); },
          cookie: (...args) => {},
        };
        authController.register(fakeReq, fakeRes).catch(reject);
      });
      // On connecte la nounou pour générer les tokens comme dans login
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
    // Création nounou seule (pas de compte user)
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

// Edit a nanny
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { name, availability, experience, contact, email } = req.body;
  const nanny = await prisma.nanny.update({
    where: { id },
    data: { name, availability, experience, contact, email }
  });
  res.json(nanny);
});

// Delete a nanny
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    // Supprime d'abord les assignments liés à la nounou
    await prisma.assignment.deleteMany({ where: { nannyId: id } });
    // Supprime aussi les plannings liés si besoin
    await prisma.schedule.deleteMany({ where: { nannyId: id } });
    // Trouve le(s) user(s) associé(s) à cette nounou
    const users = await prisma.user.findMany({ where: { nannyId: id } });
    for (const user of users) {
      // Supprime les refresh tokens liés à ce user
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    }
    // Supprime le user associé
    await prisma.user.deleteMany({ where: { nannyId: id } });
    // Supprime la nounou
    await prisma.nanny.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get nanny by id
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const nanny = await prisma.nanny.findUnique({ where: { id }, include: { assignedChildren: true } });
  if (!nanny) return res.status(404).json({ message: 'Not found' });
  res.json(nanny);
});

module.exports = router;
