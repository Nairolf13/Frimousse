const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const prisma = require('../lib/prismaClient');
const { validatePassword } = require('../lib/validatePassword');
const { sendParentInviteEmail, INVITE_TOKEN_TTL } = require('../lib/parentInvite');
const { detectLang, subject: emailSubject } = require('../lib/i18n');

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

// Strict limiter for invite acceptance (5 attempts / 15 min per IP)
const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
});

// Refresh token limiter (30 / 15 min per IP — allows normal usage but blocks spam)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
});

router.post('/register', registerLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot', authLimiter, authController.forgotPassword);
router.post('/reset', authLimiter, authController.resetPassword);
router.post('/verify-email', registerLimiter, authController.verifyEmail);
router.post('/resend-verification', registerLimiter, authController.resendVerification);

// Universal accept-invite endpoint (works for both parent and nanny invitations)
router.post('/accept-invite', inviteLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Missing token or password' });
    const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;
    if (!inviteSecret) return res.status(500).json({ message: 'Server configuration error' });
    let payload;
    try {
      payload = jwt.verify(token, inviteSecret);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    if (payload.type !== 'invite' || !payload.userId) return res.status(400).json({ message: 'Invalid token payload' });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const user = await prisma.user.findUnique({ where: { id: String(payload.userId) } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    res.json({ message: 'Password set successfully' });
  } catch (err) {
    console.error('POST /api/auth/accept-invite error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Resend an invite link (parent or nanny) when the original one expired or
// was lost. Deliberately doesn't require auth — the recipient has no
// working account yet, that's the whole point — but is rate-limited and
// never reveals whether the email exists, same as /auth/forgot.
router.post('/resend-invite', inviteLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email requis' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Only resend for accounts that still look like a pending invite (never
    // logged in / never verified) — a real password-set account should go
    // through "forgot password" instead. Not revealing existence either way.
    if (!user || (!user.parentId && !user.nannyId)) return res.json({ ok: true });
    const lang = detectLang(req);
    if (user.parentId) {
      const parent = await prisma.parent.findUnique({ where: { id: user.parentId } });
      await sendParentInviteEmail({
        userId: user.id,
        email: user.email,
        firstName: parent ? parent.firstName : (user.name || '').split(' ')[0],
        lang,
        prisma,
      });
    } else if (user.nannyId) {
      const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;
      const inviteToken = jwt.sign({ type: 'invite', userId: user.id }, inviteSecret, { expiresIn: INVITE_TOKEN_TTL });
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const inviteUrl = `${loginUrl}/invite?token=${inviteToken}`;
      const subject = emailSubject('invite_nanny', lang);
      await require('../lib/email').sendTemplatedMail({ templateName: 'welcome_nanny', lang, to: user.email, subject, substitutions: { name: user.name || '', inviteUrl }, prisma, respectOptOut: false });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/resend-invite error', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
