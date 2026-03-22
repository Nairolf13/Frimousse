const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Strict rate limiter for login: 10 attempts / 15 min per IP+email combination
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const email = (req.body && req.body.email) ? String(req.body.email).toLowerCase().trim() : '';
    return email ? `${ip}:${email}` : ip;
  },
  message: { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
});

// Slightly more lenient for registration / verification (20 / 15 min)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
});

router.post('/register', registerLimiter, authController.register);
router.post('/register-subscribe/init', registerLimiter, authController.registerSubscribeInit);
router.post('/register-subscribe/complete', registerLimiter, authController.registerSubscribeComplete);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot', authLimiter, authController.forgotPassword);
router.post('/reset', authLimiter, authController.resetPassword);
router.post('/verify-email', registerLimiter, authController.verifyEmail);
router.post('/resend-verification', registerLimiter, authController.resendVerification);

// Universal accept-invite endpoint (works for both parent and nanny invitations)
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Missing token or password' });
    const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET || 'invite_secret_default';
    let payload;
    try {
      payload = jwt.verify(token, inviteSecret);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    if (payload.type !== 'invite' || !payload.userId) return res.status(400).json({ message: 'Invalid token payload' });
    const user = await prisma.user.findUnique({ where: { id: String(payload.userId) } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    res.json({ message: 'Password set successfully' });
  } catch (err) {
    console.error('POST /api/auth/accept-invite error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

module.exports = router;
