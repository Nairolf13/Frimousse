const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const discoveryLimit = require('../middleware/discoveryLimitMiddleware');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;


router.get('/', auth, async (req, res) => {
  const where = {};
  if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
  const nannies = await prisma.nanny.findMany({ 
    where, 
    select: {
      id: true,
      name: true,
      availability: true,
      experience: true,
      specializations: true,
      status: true,
      contact: true,
      email: true,
      cotisationPaidUntil: true,
      birthDate: true,
      assignedChildren: {
        select: {
          id: true,
          name: true,
          birthDate: true
        }
      }
    }
  });
  res.json(nannies);
});

router.post('/', auth, discoveryLimit('nanny'), async (req, res) => {
  try {
    const userReq = req.user || {};
    // Only admins or nannies themselves (or super-admin) can create nannies
    if (!(userReq.role === 'admin' || userReq.nannyId || userReq.role === 'super-admin')) return res.status(403).json({ message: 'Forbidden' });
    const { name, availability, experience, contact, email, birthDate } = req.body;
    const parsedExperience = typeof experience === 'string' ? parseInt(experience, 10) : experience;
    if (isNaN(parsedExperience)) {
      return res.status(400).json({ error: 'Le champ "experience" doit être un nombre.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const nannyData = { 
        name, 
        availability, 
        experience: parsedExperience, 
        contact, 
        email, 
        birthDate: birthDate ? new Date(birthDate) : null, 
        centerId: req.user.centerId || null 
      };
      const nanny = await tx.nanny.create({ data: nannyData });

      if (!email) return { nanny, user: null };

      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        // Do not attach existing users who are not nounous. This prevents admins being assigned a nannyId.
        if (existingUser.role !== 'nanny') {
          // Signal conflict to outer scope by returning a marker
          return { nanny, user: null, existingUserConflict: true };
        }
        // Attach existing user to this nanny
        await tx.user.update({ where: { id: existingUser.id }, data: { nannyId: nanny.id } });
        return { nanny, user: await tx.user.findUnique({ where: { id: existingUser.id } }) };
      }

      // Create a temporary password and user record, then send invite email
      const tempPassword = crypto.randomBytes(12).toString('base64').replace(/\//g, '_');
      const hash = await bcrypt.hash(tempPassword, 10);
      const userData = { email, password: hash, name, role: 'nanny', nannyId: nanny.id };
      if (userReq.centerId) userData.centerId = userReq.centerId;
      const user = await tx.user.create({ data: userData });
      return { nanny, user };
    });

    // If the email belonged to a non-nanny existing user, return conflict
    if (result && result.existingUserConflict) {
      return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà et n\'est pas une nounou.' });
    }

    // Send invite email if we created a new user with email
    if (result.user && process.env.SMTP_HOST) {
      (async () => {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          });
          const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET || 'invite_secret_default';
          const inviteToken = jwt.sign({ type: 'invite', userId: result.user.id }, inviteSecret, { expiresIn: '7d' });
          const inviteUrl = `${loginUrl}/invite?token=${inviteToken}`;
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
          const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
          const templatePath = `${__dirname}/../emailTemplates/welcome_nanny_${lang}.html`;
          const fs = require('fs');
          let html = null;
          try {
            html = fs.readFileSync(templatePath, 'utf8');
            html = html.replace(/{{name}}/g, result.user.name || '').replace(/{{inviteUrl}}/g, inviteUrl);
          } catch (e) {
            html = null;
          }
          const subjects = { fr: 'Invitation - Accès Frimousse', en: 'Invitation - Access Frimousse' };
          const mailOptions = {
            from: process.env.SMTP_FROM || `no-reply@${process.env.SMTP_HOST || 'example.com'}`,
            to: result.user.email,
            subject: subjects[lang] || subjects.fr,
            text: `Bonjour ${(result.user.name || '').split(/\s+/)[0] || ''},\n\nVous avez reçu une invitation pour rejoindre Frimousse. Connectez-vous ici: ${inviteUrl}`,
            html: html || undefined,
          };
          await transporter.sendMail(mailOptions);
        } catch (err) {
          console.error('Failed to send nanny invite email', err && err.message ? err.message : err);
        }
      })();
    }

    res.status(201).json(result);
  } catch (e) {
    console.error('POST /api/nannies error', e);
    if (e && e.code === 'P2002') return res.status(409).json({ message: 'Nanny or user with this email already exists' });
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

// Accept invite to set password (for nanny)
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
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: payload.userId }, data: { password: hash } });
    res.json({ message: 'Password set successfully' });
  } catch (err) {
    console.error('POST /api/nannies/accept-invite error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { name, availability, experience, contact, email, birthDate } = req.body;
  if (!isSuperAdmin(req.user)) {
    const existing = await prisma.nanny.findUnique({ where: { id } });
    if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Nanny not found' });
  }
  const nanny = await prisma.nanny.update({ where: { id }, data: { name, availability, experience, contact, email, birthDate: birthDate ? new Date(birthDate) : null } });
  res.json(nanny);
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    if (!isSuperAdmin(req.user)) {
      const existing = await prisma.nanny.findUnique({ where: { id } });
      if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Nanny not found' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.assignment.deleteMany({ where: { nannyId: id } });
      await tx.report.deleteMany({ where: { nannyId: id } });

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
  const nanny = await prisma.nanny.findUnique({ 
    where: { id }, 
    select: {
      id: true,
      name: true,
      availability: true,
      experience: true,
      specializations: true,
      status: true,
      contact: true,
      email: true,
      cotisationPaidUntil: true,
      birthDate: true,
      assignedChildren: {
        select: {
          id: true,
          name: true,
          birthDate: true
        }
      }
    }
  });
  if (!nanny) return res.status(404).json({ message: 'Not found' });
  res.json(nanny);
});

router.get('/:id/cotisation', auth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
  const nanny = await prisma.nanny.findFirst({ where, select: { cotisationPaidUntil: true, lastCotisationAmount: true } });
  if (!nanny) return res.status(404).json({ error: 'Nanny not found' });
  res.json({ cotisationPaidUntil: nanny.cotisationPaidUntil, lastCotisationAmount: nanny.lastCotisationAmount || null });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id/cotisation', auth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
    const nanny = await prisma.nanny.findFirst({ where });
    if (!nanny) return res.status(404).json({ error: 'Nanny not found' });
    const now = new Date();
    let newDate;
    if (nanny.cotisationPaidUntil && new Date(nanny.cotisationPaidUntil) > now) {
      newDate = new Date(nanny.cotisationPaidUntil);
    } else {
      newDate = now;
    }
    newDate.setMonth(newDate.getMonth() + 1);

    const updateData = { cotisationPaidUntil: newDate };
    const { amount } = req.body || {};
    const isAdmin = req.user && (req.user.role === 'admin' || isSuperAdmin(req.user));
    if (amount && isAdmin) {
      updateData.lastCotisationAmount = Number(amount);
    }

    await prisma.nanny.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json({ cotisationPaidUntil: newDate, lastCotisationAmount: updateData.lastCotisationAmount || null });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
