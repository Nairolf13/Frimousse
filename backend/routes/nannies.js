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
  // include linked user so we can return address fields stored on User
  const nannies = await prisma.nanny.findMany({ where, include: { assignedChildren: true, user: true } });
  // flatten user address fields onto the nanny object for frontend convenience
  const mapped = nannies.map(n => {
    const u = n.user || {};
    return Object.assign({}, n, {
      address: u.address || null,
      postalCode: u.postalCode || null,
      city: u.city || null,
      region: u.region || null,
      country: u.country || null,
    });
  });
  res.json(mapped);
});

// Batch details: return nannies (all or filtered by ids) with aggregated monthly totals
router.post('/batch/details', auth, async (req, res) => {
  try {
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : undefined;
    const month = (req.body && req.body.month) || String(req.query.month || '').trim();
    const where = {};
    if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
    if (ids && ids.length > 0) where.id = { in: ids };

    // include linked user so we can return address fields stored on User
    const nannies = await prisma.nanny.findMany({ where, include: { assignedChildren: true, user: true } });
    const mapped = nannies.map(n => {
      const u = n.user || {};
      return Object.assign({}, n, {
        address: u.address || null,
        postalCode: u.postalCode || null,
        city: u.city || null,
        region: u.region || null,
        country: u.country || null,
      });
    });

    // Determine month range
    let startDate, endDate;
    if (!month) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else {
      if (!/^[0-9]{4}-[0-9]{2}$/.test(month)) return res.status(400).json({ message: 'Invalid month parameter, expected YYYY-MM' });
      const [year, mon] = month.split('-').map(Number);
      startDate = new Date(year, mon - 1, 1);
      endDate = new Date(year, mon, 1);
    }

    const nannyIds = mapped.map(n => n.id);
    if (nannyIds.length === 0) return res.json([]);

    // children linked to these nannies
    const childNannies = await prisma.childNanny.findMany({ where: { nannyId: { in: nannyIds } }, select: { nannyId: true, childId: true } });
    const nannyToChildren = {};
    const allChildIds = new Set();
    for (const cn of childNannies) {
      if (!nannyToChildren[cn.nannyId]) nannyToChildren[cn.nannyId] = [];
      nannyToChildren[cn.nannyId].push(cn.childId);
      allChildIds.add(cn.childId);
    }

    const childIdsArr = Array.from(allChildIds);
    // map childId -> parentIds
    const parentChilds = childIdsArr.length > 0 ? await prisma.parentChild.findMany({ where: { childId: { in: childIdsArr } }, select: { parentId: true, childId: true } }) : [];
    const childToParents = {};
    for (const pc of parentChilds) {
      if (!childToParents[pc.childId]) childToParents[pc.childId] = [];
      childToParents[pc.childId].push(pc.parentId);
    }

    // assignments for these children in the month
    const assignments = childIdsArr.length > 0 ? await prisma.assignment.findMany({ where: { childId: { in: childIdsArr }, date: { gte: startDate, lt: endDate } }, select: { childId: true } }) : [];
    const childCounts = {};
    for (const a of assignments) { childCounts[a.childId] = (childCounts[a.childId] || 0) + 1; }

    // compute per-nanny totals (sum of per-parent amounts)
    const nannyTotals = {};
    for (const nid of nannyIds) {
      const kids = nannyToChildren[nid] || [];
      let total = 0;
      for (const cid of kids) {
        const days = childCounts[cid] || 0;
        const amount = days * 2;
        const parents = childToParents[cid] || [];
        total += amount * (parents.length || 0);
      }
      nannyTotals[nid] = total;
    }

    // attach totals to the mapped objects
    const result = mapped.map(n => ({ ...n, totalMonthly: nannyTotals[n.id] || 0 }));
    res.json(result);
  } catch (err) {
    console.error('POST /api/nannies/batch/details error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

router.post('/', auth, discoveryLimit('nanny'), async (req, res) => {
  try {
    const userReq = req.user || {};
    // Only admins or nannies themselves (or super-admin) can create nannies
    if (!(userReq.role === 'admin' || userReq.nannyId || userReq.role === 'super-admin')) return res.status(403).json({ message: 'Forbidden' });
  const { name, availability, experience, contact, birthDate, password, address, postalCode, city, region, country } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    const parsedExperience = typeof experience === 'string' ? parseInt(experience, 10) : experience;
    if (isNaN(parsedExperience)) {
      return res.status(400).json({ error: 'Le champ "experience" doit être un nombre.' });
    }

    const result = await prisma.$transaction(async (tx) => {
    // Nanny table does not store address fields - address is stored on the related User record
    const nannyData = { name, availability, experience: parsedExperience, contact, email, birthDate: birthDate ? new Date(birthDate) : null, centerId: req.user.centerId || null };
      const nanny = await tx.nanny.create({ data: nannyData });

      if (!email) return { nanny, user: null };

  const existingUser = await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
      if (existingUser) {
        // Do not attach existing users who are not nounous. This prevents admins being assigned a nannyId.
        if (existingUser.role !== 'nanny') {
          // Signal conflict to outer scope by returning a marker
          return { nanny, user: null, existingUserConflict: true };
        }
        // Attach existing user to this nanny and update address fields when provided
        const userUpdateData = { nannyId: nanny.id };
        if (address !== undefined) userUpdateData.address = address || null;
        if (postalCode !== undefined) userUpdateData.postalCode = postalCode || null;
        if (city !== undefined) userUpdateData.city = city || null;
        if (region !== undefined) userUpdateData.region = region || null;
        if (country !== undefined) userUpdateData.country = country || null;
        await tx.user.update({ where: { id: existingUser.id }, data: userUpdateData });
        return { nanny, user: await tx.user.findUnique({ where: { id: existingUser.id } }) };
      }

  // Use provided password if present, otherwise create a temporary random password
  const initialPassword = (typeof password === 'string' && password.trim() !== '') ? password : crypto.randomBytes(12).toString('base64').replace(/\//g, '_');
  const hash = await bcrypt.hash(initialPassword, 10);
  const userData = { email, password: hash, name, role: 'nanny', nannyId: nanny.id };
    if (userReq.centerId) userData.centerId = userReq.centerId;
    if (address !== undefined) userData.address = address || null;
    if (postalCode !== undefined) userData.postalCode = postalCode || null;
    if (city !== undefined) userData.city = city || null;
    if (region !== undefined) userData.region = region || null;
    if (country !== undefined) userData.country = country || null;
    const user = await tx.user.create({ data: userData });
      return { nanny, user };
    });

    // If the email belonged to a non-nanny existing user, return conflict
    if (result && result.existingUserConflict) {
      return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà et n\'est pas une nounou.' });
    }

      // Send invite email if we created a new user with email using templated mail (respects notifyByEmail)
      if (result.user && process.env.SMTP_HOST) {
        (async () => {
          try {
            const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET || 'invite_secret_default';
            const inviteToken = jwt.sign({ type: 'invite', userId: result.user.id }, inviteSecret, { expiresIn: '7d' });
            const inviteUrl = `${loginUrl}/invite?token=${inviteToken}`;
            const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
            const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
            const subject = lang === 'fr' ? 'Invitation - Accès Frimousse' : 'Invitation - Access Frimousse';
            await require('../lib/email').sendTemplatedMail({ templateName: 'welcome_nanny', lang, to: result.user.email, subject, substitutions: { name: result.user.name || '', inviteUrl }, prisma });
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
  const { name, availability, experience, contact, birthDate, newPassword, address, postalCode, city, region, country } = req.body;
  const email = req.body.email !== undefined ? String(req.body.email || '').trim().toLowerCase() : undefined;
  if (!isSuperAdmin(req.user)) {
    const existing = await prisma.nanny.findUnique({ where: { id } });
    if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Nanny not found' });
  }
  const updateData = { name, availability, experience, contact, birthDate: birthDate ? new Date(birthDate) : null };
  if (email !== undefined) updateData.email = email;
  const nanny = await prisma.nanny.update({ where: { id }, data: updateData });

  // If address fields were provided, update the linked user(s) instead (User holds address info)
  try {
    const addrUpdate = {};
    if (address !== undefined) addrUpdate.address = address || null;
    if (postalCode !== undefined) addrUpdate.postalCode = postalCode || null;
    if (city !== undefined) addrUpdate.city = city || null;
    if (region !== undefined) addrUpdate.region = region || null;
    if (country !== undefined) addrUpdate.country = country || null;
    if (Object.keys(addrUpdate).length > 0) {
      const users = await prisma.user.findMany({ where: { nannyId: id } });
      for (const u of users) {
        await prisma.user.update({ where: { id: u.id }, data: addrUpdate });
      }
    }
  } catch (e) {
    console.error('Failed to update linked user address fields', e && e.message ? e.message : e);
  }

  // If an admin provided newPassword, update the linked user password
  try {
    if (newPassword && typeof newPassword === 'string') {
      const actor = req.user || {};
      const isAdmin = actor && (actor.role === 'admin' || isSuperAdmin(actor));
      const isSelfNanny = actor && actor.nannyId && String(actor.nannyId) === String(id);
      // Allow admins or the nanny herself to change the password
      if (isAdmin || isSelfNanny) {
        // find user(s) linked to this nanny and update their password
        const users = await prisma.user.findMany({ where: { nannyId: id } });
        if (users && users.length > 0) {
          const bcrypt = require('bcryptjs');
          const hash = await bcrypt.hash(newPassword, 10);
          for (const u of users) {
            await prisma.user.update({ where: { id: u.id }, data: { password: hash } });
            try { await prisma.refreshToken.deleteMany({ where: { userId: u.id } }); } catch (e) { /* ignore */ }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to update nanny user password', e && e.message ? e.message : e);
  }
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
  const nanny = await prisma.nanny.findUnique({ where: { id }, include: { assignedChildren: true, user: true } });
  if (!nanny) return res.status(404).json({ message: 'Not found' });
  const u = nanny.user || {};
  const mapped = Object.assign({}, nanny, {
    address: u.address || null,
    postalCode: u.postalCode || null,
    city: u.city || null,
    region: u.region || null,
    country: u.country || null,
  });
  res.json(mapped);
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

// Aggregated monthly cotisation total for parents whose children are assigned to a nanny
router.get('/:id/cotisation-total', auth, async (req, res) => {
  try {
    const nannyId = req.params.id;
    const where = { id: nannyId };
    if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
    const nanny = await prisma.nanny.findFirst({ where });
    if (!nanny) return res.status(404).json({ error: 'Nanny not found' });

    const month = String(req.query.month || '').trim();
    let startDate, endDate;
    if (!month) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else {
      if (!/^[0-9]{4}-[0-9]{2}$/.test(month)) return res.status(400).json({ message: 'Invalid month parameter, expected YYYY-MM' });
      const [year, mon] = month.split('-').map(Number);
      startDate = new Date(year, mon - 1, 1);
      endDate = new Date(year, mon, 1);
    }

    // children linked to this nanny
    const childNannies = await prisma.childNanny.findMany({ where: { nannyId }, select: { childId: true } });
    const childIds = childNannies.map(c => c.childId);
    if (!childIds || childIds.length === 0) return res.json({ totalMonthly: 0 });

    // map childId -> parentIds
    const parentChilds = await prisma.parentChild.findMany({ where: { childId: { in: childIds } }, select: { parentId: true, childId: true } });
    const childToParents = {};
    for (const pc of parentChilds) {
      if (!childToParents[pc.childId]) childToParents[pc.childId] = [];
      childToParents[pc.childId].push(pc.parentId);
    }

    // assignments for these children in the month
    const assignments = await prisma.assignment.findMany({ where: { childId: { in: childIds }, date: { gte: startDate, lt: endDate } }, select: { childId: true } });
    const childCounts = {};
    for (const a of assignments) { childCounts[a.childId] = (childCounts[a.childId] || 0) + 1; }

    // compute per-parent totals: amount = days * 2 per child, summed across their children
    const parentTotals = {};
    for (const childId of Object.keys(childToParents)) {
      const days = childCounts[childId] || 0;
      const amount = days * 2;
      for (const pid of childToParents[childId] || []) {
        parentTotals[pid] = (parentTotals[pid] || 0) + amount;
      }
    }

    const totalMonthly = Object.values(parentTotals).reduce((s, v) => s + (v || 0), 0);
    res.json({ totalMonthly });
  } catch (err) {
    console.error('GET /api/nannies/:id/cotisation-total error', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});

router.put('/:id/cotisation', auth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
    const nanny = await prisma.nanny.findFirst({ where });
    if (!nanny) return res.status(404).json({ error: 'Nanny not found' });
    const now = new Date();
    let baseDate;
    if (nanny.cotisationPaidUntil && new Date(nanny.cotisationPaidUntil) > now) {
      baseDate = new Date(nanny.cotisationPaidUntil);
    } else {
      baseDate = now;
    }
    // Always set to 1st of next month
    let year = baseDate.getFullYear();
    let month = baseDate.getMonth() + 1; // JS months: 0-11
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const newDate = new Date(year, month, 1, 0, 0, 0, 0);

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
