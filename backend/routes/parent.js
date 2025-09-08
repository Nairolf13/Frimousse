const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const discoveryLimit = require('../middleware/discoveryLimitMiddleware');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const requireAuth = require('../middleware/authMiddleware');

function isSuperAdmin(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'super-admin' || r === 'super_admin' || r === 'superadmin' || r.includes('super');
}

function isAdminRole(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  // accept common variants and be case-insensitive
  return r === 'admin' || r === 'administrator' || r.includes('admin');
}

function canManageParents(user) {
  return isAdminRole(user) || !!user.nannyId || isSuperAdmin(user);
}

router.get('/children', requireAuth, async (req, res) => {
  try {
    const parentId = req.user.parentId || req.user.id;
    const children = await prisma.parentChild.findMany({
      where: { parentId },
      include: { child: true }
    });
    res.json(children.map(pc => pc.child));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin listing (must be before '/:id' so 'admin' isn't treated as an id)
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const user = req.user || {};
    if (!canManageParents(user)) return res.status(403).json({ message: 'Forbidden' });

    let parents = [];
    if (prisma.parent && typeof prisma.parent.findMany === 'function') {
      const where = {};
      if (!isSuperAdmin(user) && user.centerId) where.centerId = user.centerId;
      // If user is a nanny, restrict parents to those whose children are assigned to this nanny
      if (user && user.role === 'nanny') {
        const nannyRec = await prisma.nanny.findUnique({ where: { id: user.nannyId } });
        if (!nannyRec) {
          parents = [];
        } else {
          parents = await prisma.parent.findMany({
            where: { ...where, children: { some: { child: { childNannies: { some: { nannyId: nannyRec.id } } } } } },
            include: { children: { include: { child: true } } },
            orderBy: { createdAt: 'desc' }
          });
        }
      } else {
        parents = await prisma.parent.findMany({ where, include: { children: { include: { child: true } } }, orderBy: { createdAt: 'desc' } });
      }
    } else {
      const users = await prisma.user.findMany({ where: { role: 'parent' }, orderBy: { createdAt: 'desc' } });
      const allChildren = await prisma.child.findMany();
      const byEmail = new Map();
      const byName = new Map();
      for (const c of allChildren) {
        if (c.parentMail) {
          const list = byEmail.get(c.parentMail) || [];
          list.push({ child: c });
          byEmail.set(c.parentMail, list);
        }
        if (c.parentName) {
          const key = String(c.parentName).trim();
          const list = byName.get(key) || [];
          list.push({ child: c });
          byName.set(key, list);
        }
      }
      parents = users.map(u => {
        const fullName = `${u.name || ''}`.trim();
        const childrenFromEmail = u.email ? (byEmail.get(u.email) || []) : [];
        const childrenFromName = fullName ? (byName.get(fullName) || []) : [];
        const merged = [...childrenFromEmail, ...childrenFromName];
        const unique = Array.from(new Map(merged.map(item => [item.child.id, item])).values());
        return { id: u.id, firstName: u.name, lastName: '', email: u.email, phone: u.parentPhone || u.phone || null, children: unique };
      });
    }

    const parentsCount = parents.length;
    const childrenCount = parents.reduce((acc, p) => acc + (p.children?.length || 0), 0);

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);
    const assignmentWhere = { date: { gte: todayStart, lte: todayEnd } };
    if (!isSuperAdmin(user) && user.centerId) assignmentWhere.centerId = user.centerId;
    const presentAssignments = await prisma.assignment.count({ where: assignmentWhere });

    res.json({
      stats: { parentsCount, childrenCount, presentToday: presentAssignments },
      parents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get parent by id (allow owner or managers)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userReq = req.user || {};
    // allow if user can manage parents or it's their own parent record
    if (!(canManageParents(userReq) || (userReq.parentId && String(userReq.parentId) === String(id)))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const parent = await prisma.parent.findUnique({ where: { id } });
    if (!parent) return res.status(404).json({ message: 'Parent not found' });
    // If manager but not super-admin, ensure same center
    if (!isSuperAdmin(userReq) && canManageParents(userReq) && userReq.centerId && parent.centerId !== userReq.centerId) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    res.json(parent);
  } catch (err) {
    console.error('GET /api/parent/:id error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

router.post('/', requireAuth, discoveryLimit('parent'), async (req, res) => {
  try {
  const userReq = req.user || {};
  if (!canManageParents(userReq)) return res.status(403).json({ message: 'Forbidden' });

    const { name, email, phone, password } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Missing fields: name and email required' });

    const parts = name.trim().split(/\s+/);
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ') || '';
    const existingUser = await prisma.user.findUnique({ where: { email } });
    const result = await prisma.$transaction(async (tx) => {
      const data = { firstName, lastName, email, phone };
      // Assign centerId:
      // - if creator is super-admin allow explicit centerId in body
      // - otherwise inherit creator's centerId when present
      if (isSuperAdmin(userReq)) {
        if (req.body.centerId) data.centerId = req.body.centerId;
      } else if (userReq.centerId) {
        data.centerId = userReq.centerId;
      }
      const parent = await tx.parent.create({ data });
      if (existingUser) {
        // Ensure existing user is linked to the created parent and centered correctly
        // If the found user is not already an admin/super-admin, promote them to 'parent'.
        const updateData = { parentId: parent.id };
        // Only change role when the existing user is not an admin or super-admin
        if (!isSuperAdmin(existingUser) && !isAdminRole(existingUser)) {
          updateData.role = 'parent';
        }
        if (isSuperAdmin(userReq)) {
          if (req.body.centerId) updateData.centerId = req.body.centerId;
        } else if (userReq.centerId) {
          updateData.centerId = userReq.centerId;
        }
        await tx.user.update({ where: { id: existingUser.id }, data: updateData });
        return { parent, user: await tx.user.findUnique({ where: { id: existingUser.id } }) };
      } else {

        const tempPassword = crypto.randomBytes(12).toString('base64').replace(/\//g, '_');
        const hash = await bcrypt.hash(tempPassword, 10);
  const userData = { email, password: hash, name: `${firstName} ${lastName}`, role: 'parent', parentId: parent.id };
  if (isSuperAdmin(userReq)) {
    if (req.body.centerId) userData.centerId = req.body.centerId;
  } else if (userReq.centerId) {
    userData.centerId = userReq.centerId;
  }
  const user = await tx.user.create({ data: userData });
        return { parent, user };
      }
    });

    if (process.env.SMTP_HOST) {
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
          const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
          const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
          const templatePath = `${__dirname}/../emailTemplates/welcome_parent_${lang}.html`;
          const fs = require('fs');
          let html = null;
          try {
            html = fs.readFileSync(templatePath, 'utf8');
            html = html.replace(/{{name}}/g, firstName || '').replace(/{{inviteUrl}}/g, inviteUrl);
          } catch (e) {
            html = null;
          }

          const subjects = { fr: 'Invitation - Accès Frimousse', en: 'Invitation - Access Frimousse' };
          const mailOptions = {
            from: process.env.SMTP_FROM || `no-reply@${process.env.SMTP_HOST || 'example.com'}`,
            to: email,
            subject: subjects[lang] || subjects.fr,
            text: `Bonjour ${firstName || ''},\n\nUn compte parent a été créé pour vous sur Frimousse.\n\nCliquez ici pour définir votre mot de passe : ${inviteUrl}\n\nCe lien expirera dans 7 jours.\n\nMerci,\nL'équipe Frimousse`,
            html: html || undefined,
          };
          await transporter.sendMail(mailOptions);
          
        } catch (err) {
          console.error('Failed to send invite email', err && err.message ? err.message : err);
        }
      })();
    }

    res.status(201).json(result);
  } catch (err) {
    if (err && err.code === 'P2002') return res.status(409).json({ message: 'Parent or user with this email already exists' });
    console.error('POST /api/parent error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userReq = req.user || {};
    // allow if user can manage parents (admin/nanny/super-admin) OR the parent is updating their own record
    if (!(canManageParents(userReq) || (userReq.parentId && String(userReq.parentId) === String(id)))) return res.status(403).json({ message: 'Forbidden' });
    const { name, email, phone, firstName, lastName } = req.body;
    let data = {};
    if (name) {
      const parts = name.trim().split(/\s+/);
      data.firstName = parts.shift() || '';
      data.lastName = parts.join(' ') || '';
    }
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;

    // Ensure the parent belongs to the same center (unless super-admin)
    if (!isSuperAdmin(userReq)) {
      const existing = await prisma.parent.findUnique({ where: { id } });
      if (!existing || existing.centerId !== userReq.centerId) return res.status(404).json({ message: 'Parent not found' });
    }
    const updated = await prisma.parent.update({ where: { id }, data });

    // If newPassword provided, allow admins or the parent themself to update linked user password(s)
    try {
      const { newPassword } = req.body || {};
      if (newPassword && typeof newPassword === 'string') {
        const actor = req.user || {};
        const isAdmin = isAdminRole(actor) || isSuperAdmin(actor);
        // owner if the logged user has parentId equal to id, or the user id equals the parent user id
        const isSelfParent = actor && (actor.parentId && String(actor.parentId) === String(id));
        if (isAdmin || isSelfParent) {
          const users = await prisma.user.findMany({ where: { parentId: id } });
          if (users && users.length > 0) {
            const hash = await bcrypt.hash(newPassword, 10);
            for (const u of users) {
              await prisma.user.update({ where: { id: u.id }, data: { password: hash } });
              try { await prisma.refreshToken.deleteMany({ where: { userId: u.id } }); } catch (e) { /* ignore */ }
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to update parent user password', e && e.message ? e.message : e);
    }
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/parent/:id error', err);
    if (err && err.code === 'P2025') return res.status(404).json({ message: 'Parent not found' });
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

// Find parent by email (allow parent to fetch their own record by their email, or admins)
router.get('/by-email', requireAuth, async (req, res) => {
  try {
    const userReq = req.user || {};
    const email = (req.query.email || '').toString();
    if (!email) return res.status(400).json({ message: 'Missing email' });

    // allow if user can manage parents or if requesting their own email
    if (!(canManageParents(userReq) || (userReq.email && String(userReq.email).toLowerCase() === email.toLowerCase()))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const parent = await prisma.parent.findFirst({ where: { email } });
    if (!parent) return res.status(404).json({ message: 'Parent not found' });
    res.json(parent);
  } catch (err) {
    console.error('GET /api/parent/by-email error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
  const userReq = req.user || {};
  if (!canManageParents(userReq)) return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    if (!isSuperAdmin(userReq)) {
      const existing = await prisma.parent.findUnique({ where: { id } });
      if (!existing || existing.centerId !== userReq.centerId) return res.status(404).json({ message: 'Parent not found' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { parentId: id }, data: { parentId: null } });
      await tx.parentChild.deleteMany({ where: { parentId: id } });
      await tx.parent.delete({ where: { id } });
    });
    res.json({ message: 'Parent deleted' });
  } catch (err) {
    console.error('DELETE /api/parent/:id error', err);
    if (err && err.code === 'P2025') return res.status(404).json({ message: 'Parent not found' });
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

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
  // Ensure the user exists before attempting to update to avoid Prisma P2025
  const userToUpdate = await prisma.user.findUnique({ where: { id: String(payload.userId) } });
  if (!userToUpdate) return res.status(404).json({ message: 'User not found' });
  await prisma.user.update({ where: { id: userToUpdate.id }, data: { password: hash } });
  res.json({ message: 'Password set successfully' });
  } catch (err) {
    console.error('POST /api/parent/accept-invite error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});



router.get('/child/:childId/schedule', requireAuth, async (req, res) => {
  try {
    const childId = req.params.childId;
    if (req.user && req.user.role === 'parent') {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const parentId = user?.parentId;
      if (!parentId) return res.status(403).json({ message: 'Forbidden' });
      const relation = await prisma.parentChild.findFirst({ where: { parentId, childId } });
      if (!relation) return res.status(403).json({ message: 'Forbidden' });
    }

    const schedules = await prisma.schedule.findMany({
      where: { },
      include: { nannies: true }
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/child/:childId/reports', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;
    if (req.user && req.user.role === 'parent') {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const parentId = user?.parentId;
      if (!parentId) return res.status(403).json({ message: 'Forbidden' });
      const relation = await prisma.parentChild.findFirst({ where: { parentId, childId } });
      if (!relation) return res.status(403).json({ message: 'Forbidden' });
    }
    const reports = await prisma.report.findMany({
      where: { childId },
      include: { nanny: true }
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
