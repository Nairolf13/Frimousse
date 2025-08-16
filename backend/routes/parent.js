const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
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

// Récupérer les enfants du parent connecté
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

// Créer un Parent (admin/nanny) -> body: { name, email, phone, password }
router.post('/', requireAuth, async (req, res) => {
  try {
  const userReq = req.user || {};
  if (!(userReq.role === 'admin' || userReq.nannyId || isSuperAdmin(userReq))) return res.status(403).json({ message: 'Forbidden' });

    const { name, email, phone, password } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Missing fields: name and email required' });

    // split name into firstName / lastName
    const parts = name.trim().split(/\s+/);
    const firstName = parts.shift() || '';
    const lastName = parts.join(' ') || '';

    const existingUser = await prisma.user.findUnique({ where: { email } });

    // Use a transaction to create parent and user (if needed) atomically
    // If no password is provided and no existing user, we create a user with a temporary
    // random password (hashed) and then generate/send an invitation token so the parent
    // can set their real password via the invite flow.
    const result = await prisma.$transaction(async (tx) => {
      const data = { firstName, lastName, email, phone };
      if (!isSuperAdmin(userReq) && userReq.centerId) data.centerId = userReq.centerId;
      const parent = await tx.parent.create({ data });
      if (existingUser) {
        // link existing user
        await tx.user.update({ where: { id: existingUser.id }, data: { parentId: parent.id } });
        return { parent, user: await tx.user.findUnique({ where: { id: existingUser.id } }) };
      } else {
        // always create the user with a random temporary password; the parent will set their
        // real password via the invite link. We never expose passwords in the API response.
        const tempPassword = crypto.randomBytes(12).toString('base64').replace(/\//g, '_');
        const hash = await bcrypt.hash(tempPassword, 10);
  const userData = { email, password: hash, name: `${firstName} ${lastName}`, role: 'parent', parentId: parent.id };
  if (!isSuperAdmin(userReq) && userReq.centerId) userData.centerId = userReq.centerId;
  const user = await tx.user.create({ data: userData });
        return { parent, user };
      }
    });

    // send invitation email if SMTP configured
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
          // always send an invite link so parent can set their own password
          const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET || 'invite_secret_default';
          const inviteToken = jwt.sign({ type: 'invite', userId: result.user.id }, inviteSecret, { expiresIn: '7d' });
          const inviteUrl = `${loginUrl}/invite?token=${inviteToken}`;
          const mailText = `Bonjour ${firstName || ''},\n\nUn compte parent a été créé pour vous sur Frimousse.\n\nCliquez sur ce lien pour définir votre mot de passe : ${inviteUrl}\n\nCe lien expirera dans 7 jours.\n\nMerci,\nL'équipe Frimousse`;

          // For easier debugging in development, print invite URL to server logs
          if (process.env.NODE_ENV !== 'production') {
            
          }

          const mailOptions = {
            from: process.env.SMTP_FROM || `no-reply@${process.env.SMTP_HOST || 'example.com'}`,
            to: email,
            subject: 'Invitation - Accès Frimousse',
            text: mailText,
          };
          await transporter.sendMail(mailOptions);
          
        } catch (err) {
          console.error('Failed to send invite email', err && err.message ? err.message : err);
        }
      })();
    }

    res.status(201).json(result);
  } catch (err) {
    // handle unique constraint on email
    if (err && err.code === 'P2002') return res.status(409).json({ message: 'Parent or user with this email already exists' });
    console.error('POST /api/parent error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

// Mettre à jour un Parent (admin/nanny)
router.put('/:id', requireAuth, async (req, res) => {
  try {
  const userReq = req.user || {};
  if (!(userReq.role === 'admin' || userReq.nannyId || isSuperAdmin(userReq))) return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
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
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/parent/:id error', err);
    if (err && err.code === 'P2025') return res.status(404).json({ message: 'Parent not found' });
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

// Supprimer un Parent (admin/nanny)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
  const userReq = req.user || {};
  if (!(userReq.role === 'admin' || userReq.nannyId || isSuperAdmin(userReq))) return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    // In a transaction, unlink any users and delete parent (ensure center match)
    if (!isSuperAdmin(userReq)) {
      const existing = await prisma.parent.findUnique({ where: { id } });
      if (!existing || existing.centerId !== userReq.centerId) return res.status(404).json({ message: 'Parent not found' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { parentId: id }, data: { parentId: null } });
      // remove ParentChild relations first to avoid foreign key constraint
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

// Endpoint pour accepter l'invitation et définir le mot de passe
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
    // update user password
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: payload.userId }, data: { password: hash } });
    res.json({ message: 'Password set successfully' });
  } catch (err) {
    console.error('POST /api/parent/accept-invite error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

// Admin/Nanny: lister tous les parents + stats
router.get('/admin', requireAuth, async (req, res) => {
  try {
    // autoriser les admins et les nounous
  const user = req.user || {};
  if (!(user.role === 'admin' || user.nannyId || isSuperAdmin(user))) return res.status(403).json({ message: 'Forbidden' });

    let parents = [];
    // If Parent model exists use it; otherwise fallback to users with role 'parent'
    if (prisma.parent && typeof prisma.parent.findMany === 'function') {
      const where = {};
      if (!isSuperAdmin(user) && user.centerId) where.centerId = user.centerId;
  parents = await prisma.parent.findMany({ where, include: { children: { include: { child: true } } }, orderBy: { createdAt: 'desc' } });
    } else {
      // fallback: users with role 'parent'
      const users = await prisma.user.findMany({ where: { role: 'parent' }, orderBy: { createdAt: 'desc' } });
      const allChildren = await prisma.child.findMany();
      // build children mapping by email and by name
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
        // merge unique children
        const merged = [...childrenFromEmail, ...childrenFromName];
        const unique = Array.from(new Map(merged.map(item => [item.child.id, item])).values());
        return { id: u.id, firstName: u.name, lastName: '', email: u.email, phone: u.parentPhone || u.phone || null, children: unique };
      });
    }

    const parentsCount = parents.length;
    const childrenCount = parents.reduce((acc, p) => acc + (p.children?.length || 0), 0);

    // simple heuristic pour présents aujourd'hui : compter assignments pour today
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

// Récupérer le planning d'un enfant (vérifie que le parent possède bien l'enfant)
router.get('/child/:childId/schedule', requireAuth, async (req, res) => {
  try {
    const childId = req.params.childId;
    // If caller is a parent, ensure they own this child
    if (req.user && req.user.role === 'parent') {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const parentId = user?.parentId;
      if (!parentId) return res.status(403).json({ message: 'Forbidden' });
      const relation = await prisma.parentChild.findFirst({ where: { parentId, childId } });
      if (!relation) return res.status(403).json({ message: 'Forbidden' });
    }

    const schedules = await prisma.schedule.findMany({
      where: { /* schedules are independent, we return all schedules related to assignments for that child */ },
      include: { nannies: true }
    });

    // Filter schedules that are linked to assignments for this child
    // Find assignments for the child and collect schedule ids from assignments if applicable.
    // The current data model stores assignments with a date and nanny for a child; schedules are separate.
    // To be safe, return schedules as-is and let frontend filter if needed.
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les rapports d'un enfant
router.get('/child/:childId/reports', requireAuth, async (req, res) => {
  try {
    const { childId } = req.params;
    // If caller is a parent, ensure they own this child before returning reports
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
