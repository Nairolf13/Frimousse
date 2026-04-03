const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }

const prisma = require('../lib/prismaClient');
const { detectLang, subject: emailSubject } = require('../lib/i18n');
const discoveryLimit = require('../middleware/discoveryLimitMiddleware');
const requireActiveSubscription = require('../middleware/subscriptionMiddleware');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;


router.get('/', auth, requireActiveSubscription, async (req, res) => {
  const where = {};
  // Si super-admin et centerId fourni dans la query, filtrer par ce centre
  if (isSuperAdmin(req.user) && req.query.centerId) {
    where.centerId = req.query.centerId;
  } else if (!isSuperAdmin(req.user)) {
    // Sinon, filtrer par le centre de l'utilisateur
    where.centerId = req.user.centerId;
  }
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
      avatarUrl: u.avatarUrl || null,
    });
  });
  res.set('Cache-Control', 'private, max-age=15');
  res.json(mapped);
});

// Batch details: return nannies (all or filtered by ids) with aggregated monthly totals
router.post('/batch/details', auth, async (req, res) => {
  try {
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : undefined;
    const month = (req.body && req.body.month) || String(req.query.month || '').trim();
    const where = {};
    if (isSuperAdmin(req.user) && req.query.centerId) {
      where.centerId = req.query.centerId;
    } else if (!isSuperAdmin(req.user)) {
      where.centerId = req.user.centerId;
    }
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
        avatarUrl: u.avatarUrl || null,
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
    const allParentIds = new Set();
    for (const nid of nannyIds) {
      const kids = nannyToChildren[nid] || [];
      for (const cid of kids) {
        for (const pid of childToParents[cid] || []) allParentIds.add(pid);
      }
    }

    // load adjustments for all parents this month
    const monthStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const allParentIdsArr = Array.from(allParentIds);
    const adjustmentsArr = allParentIdsArr.length > 0 ? await prisma.invoiceAdjustment.findMany({
      where: { parentId: { in: allParentIdsArr }, month: monthStr },
      select: { parentId: true, amount: true }
    }) : [];
    const adjustmentsByParent = {};
    for (const adj of adjustmentsArr) {
      adjustmentsByParent[adj.parentId] = (adjustmentsByParent[adj.parentId] || 0) + adj.amount;
    }

    for (const nid of nannyIds) {
      const kids = nannyToChildren[nid] || [];
      // compute per-parent subtotal first, then subtract reduction
      const parentSubtotals = {};
      for (const cid of kids) {
        const days = childCounts[cid] || 0;
        const amount = days * 2;
        for (const pid of childToParents[cid] || []) {
          parentSubtotals[pid] = (parentSubtotals[pid] || 0) + amount;
        }
      }
      let total = 0;
      for (const pid of Object.keys(parentSubtotals)) {
        const reduction = adjustmentsByParent[pid] || 0;
        total += Math.max(0, parentSubtotals[pid] - reduction);
      }
      nannyTotals[nid] = total;
    }

    // attach totals to the mapped objects
    const result = mapped.map(n => ({ ...n, totalMonthly: nannyTotals[n.id] || 0 }));
    res.json(result);
  } catch (err) {
    console.error('POST /api/nannies/batch/details error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', auth, requireActiveSubscription, discoveryLimit('nanny'), async (req, res) => {
  try {
    const userReq = req.user || {};
    // Only admins or super-admin can create nannies
    if (!(userReq.role === 'admin' || isSuperAdmin(userReq))) return res.status(403).json({ message: 'Forbidden: seuls les administrateurs peuvent créer des nounous' });
  const { name, availability, experience, contact, birthDate, password, address, postalCode, city, region, country } = req.body;
    if (name && String(name).length > 100) return res.status(400).json({ error: 'Nom trop long (max 100 caractères).' });
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
        // Allow any existing user (admin, parent, etc.) to also be linked as a nanny.
        // We only set nannyId without changing their role so they keep their existing permissions.
        if (existingUser.nannyId) {
          // Already linked to another nanny record — conflict
          return { nanny, user: null, existingUserConflict: true };
        }
        const userUpdateData = { nannyId: nanny.id };
        if (address !== undefined) userUpdateData.address = address || null;
        if (postalCode !== undefined) userUpdateData.postalCode = postalCode || null;
        if (city !== undefined) userUpdateData.city = city || null;
        if (region !== undefined) userUpdateData.region = region || null;
        if (country !== undefined) userUpdateData.country = country || null;
        await tx.user.update({ where: { id: existingUser.id }, data: userUpdateData });
        return { nanny, user: await tx.user.findUnique({ where: { id: existingUser.id } }), isNewUser: false };
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
      return { nanny, user, isNewUser: true };
    });

    // If the existing user is already linked to another nanny record
    if (result && result.existingUserConflict) {
      return res.status(409).json({ message: 'Cet utilisateur est déjà associé à une autre fiche nounou.' });
    }

      // Send invite email only for newly created users — not for existing users (admin or otherwise)
      if (result.user && result.isNewUser && process.env.SMTP_HOST) {
        (async () => {
          try {
            const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;
            const inviteToken = jwt.sign({ type: 'invite', userId: result.user.id }, inviteSecret, { expiresIn: '7d' });
            const inviteUrl = `${loginUrl}/invite?token=${inviteToken}`;
            const lang = detectLang(req);
            const subject = emailSubject('invite_nanny', lang);
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
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Accept invite to set password (for nanny)
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Missing token or password' });
    const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;
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
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', auth, requireActiveSubscription, async (req, res) => {
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

router.delete('/:id', auth, requireActiveSubscription, async (req, res) => {
  const { id } = req.params;
  try {
    if (!isSuperAdmin(req.user)) {
      const existing = await prisma.nanny.findUnique({ where: { id } });
      if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Nanny not found' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.assignment.deleteMany({ where: { nannyId: id } });
      await tx.report.deleteMany({ where: { nannyId: id } });
      await tx.presenceSheet.deleteMany({ where: { nannyId: id } });

      const schedules = await tx.schedule.findMany({ where: { nannies: { some: { id } } }, select: { id: true } });
      for (const s of schedules) {
        await tx.schedule.update({ where: { id: s.id }, data: { nannies: { disconnect: { id } } } });
      }

      const users = await tx.user.findMany({ where: { nannyId: id } });
      for (const user of users) {
        await tx.refreshToken.deleteMany({ where: { userId: user.id } });

        if (user.role && (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('super'))) {
          // If the user is also an admin, keep the account and unlink nanny role only
          await tx.user.update({ where: { id: user.id }, data: { nannyId: null } });
        } else {
          // For pure nanny accounts, delete the user entirely (and related data is already cleaned up above)
          await tx.user.delete({ where: { id: user.id } });
        }
      }

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
  if (!isSuperAdmin(req.user) && nanny.centerId !== req.user.centerId) return res.status(404).json({ message: 'Not found' });
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

    // subtract adjustments (reductions) for each parent this month
    const monthStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    const parentIds = Object.keys(parentTotals);

    if (parentIds.length > 0) {
      const adjustments = await prisma.invoiceAdjustment.findMany({
        where: { parentId: { in: parentIds }, month: monthStr },
        select: { parentId: true, amount: true }
      });

      for (const adj of adjustments) {
        if (parentTotals[adj.parentId] !== undefined) {
          parentTotals[adj.parentId] = Math.max(0, parentTotals[adj.parentId] - adj.amount);
        }
      }
    }

    const totalMonthly = Object.values(parentTotals).reduce((s, v) => s + (v || 0), 0);
    res.json({ totalMonthly });
  } catch (err) {
    console.error('GET /api/nannies/:id/cotisation-total error', err);
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

// Export PDF planning mensuel pour une nounou
router.get('/:id/export-planning', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const month = String(req.query.month || '').trim();
    if (!month || !/^[0-9]{4}-[0-9]{2}$/.test(month)) {
      return res.status(400).json({ error: 'Paramètre month requis au format YYYY-MM' });
    }

    // Vérifier accès
    const nanny = await prisma.nanny.findUnique({ where: { id }, include: { user: true } });
    if (!nanny) return res.status(404).json({ error: 'Nounou introuvable' });
    if (!isSuperAdmin(req.user)) {
      const isOwnNanny = req.user.nannyId && String(req.user.nannyId) === String(id);
      const isAdminOfCenter = (req.user.role === 'admin') && nanny.centerId === req.user.centerId;
      if (!isOwnNanny && !isAdminOfCenter) return res.status(403).json({ error: 'Accès interdit' });
    }

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    // Récupérer les assignments du mois pour cette nounou
    const assignments = await prisma.assignment.findMany({
      where: { nannyId: id, date: { gte: startDate, lt: endDate } },
      include: { child: true },
      orderBy: { date: 'asc' },
    });

    // Récupérer le nom du centre
    let centerName = 'Frimousse';
    if (nanny.centerId) {
      try {
        const center = await prisma.center.findUnique({ where: { id: nanny.centerId } });
        if (center) centerName = center.name;
      } catch { /* ignore */ }
    }

    // Construire un map jour → enfants présents
    const daysInMonth = new Date(year, mon, 0).getDate();
    const dayMap = {};
    for (let d = 1; d <= daysInMonth; d++) dayMap[d] = [];
    for (const a of assignments) {
      const day = new Date(a.date).getDate();
      if (!dayMap[day]) dayMap[day] = [];
      if (a.child && !dayMap[day].find(c => c.id === a.child.id)) {
        dayMap[day].push({ id: a.child.id, name: a.child.name });
      }
    }

    // Récupérer tous les enfants uniques du mois
    const childrenSet = {};
    for (const a of assignments) {
      if (a.child) childrenSet[a.child.id] = a.child.name;
    }
    const childrenList = Object.entries(childrenSet).map(([cid, name]) => ({ id: cid, name }));

    // Compter jours par enfant
    const childDayCounts = {};
    for (const [, children] of Object.entries(dayMap)) {
      for (const c of children) {
        childDayCounts[c.id] = (childDayCounts[c.id] || 0) + 1;
      }
    }

    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const monthLabel = `${monthNames[mon - 1]} ${year}`;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      // En-tête
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#0b5566').text(centerName, { align: 'left' });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(11).fillColor('#374151').text(`Planning de présences — ${nanny.name}`, { align: 'left' });
      doc.fontSize(10).fillColor('#6b7280').text(`Mois : ${monthLabel}`, { align: 'left' });
      doc.moveDown(0.8);

      // Ligne séparatrice
      const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageW, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.8);

      // Tableau des jours
      const colDay = 50;
      const colDayName = 60;
      const colChildren = pageW - colDay - colDayName;
      const rowH = 20;
      const tableX = doc.page.margins.left;

      // En-tête tableau
      doc.rect(tableX, doc.y, pageW, rowH).fill('#f1f5f9');
      const headerY = doc.y + 5;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
      doc.text('Jour', tableX + 4, headerY, { width: colDay });
      doc.text('', tableX + colDay, headerY, { width: colDayName });
      doc.text('Enfants présents', tableX + colDay + colDayName, headerY, { width: colChildren });
      doc.moveDown(1.4);

      // Lignes
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, mon - 1, d);
        const dayName = dayNames[dateObj.getDay()];
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const children = dayMap[d] || [];
        const childrenText = children.length > 0 ? children.map(c => c.name).join(', ') : '—';

        const rowY = doc.y;
        // Fond alternance / weekend
        if (isWeekend) {
          doc.rect(tableX, rowY, pageW, rowH).fill('#fafafa');
        } else if (d % 2 === 0) {
          doc.rect(tableX, rowY, pageW, rowH).fill('#f8fafc');
        }

        const textY = rowY + 5;
        doc.font(isWeekend ? 'Helvetica' : 'Helvetica').fontSize(9)
          .fillColor(isWeekend ? '#9ca3af' : '#111827')
          .text(String(d).padStart(2, '0'), tableX + 4, textY, { width: colDay });
        doc.fillColor(isWeekend ? '#9ca3af' : '#6b7280')
          .text(dayName, tableX + colDay, textY, { width: colDayName });
        doc.fillColor(isWeekend ? '#9ca3af' : (children.length > 0 ? '#0b5566' : '#d1d5db'))
          .text(childrenText, tableX + colDay + colDayName, textY, { width: colChildren - 4 });

        doc.moveDown(1.1);

        // Nouvelle page si nécessaire
        if (doc.y > doc.page.height - doc.page.margins.bottom - 80 && d < daysInMonth) {
          doc.addPage();
        }
      }

      doc.moveDown(1);
      // Séparateur
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageW, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.8);

      // Récapitulatif
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b5566').text('Récapitulatif du mois');
      doc.moveDown(0.5);

      if (childrenList.length === 0) {
        doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('Aucune présence enregistrée ce mois-ci.');
      } else {
        // En-tête récap
        doc.rect(tableX, doc.y, pageW, rowH).fill('#f1f5f9');
        const recapHeaderY = doc.y + 5;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
        doc.text('Enfant', tableX + 4, recapHeaderY, { width: pageW * 0.7 });
        doc.text('Jours gardés', tableX + pageW * 0.7, recapHeaderY, { width: pageW * 0.3, align: 'right' });
        doc.moveDown(1.4);

        let totalDays = 0;
        childrenList.forEach((c, i) => {
          const days = childDayCounts[c.id] || 0;
          totalDays += days;
          const rowY2 = doc.y;
          if (i % 2 === 0) doc.rect(tableX, rowY2, pageW, rowH).fill('#f8fafc');
          const textY2 = rowY2 + 5;
          doc.font('Helvetica').fontSize(9).fillColor('#111827').text(c.name, tableX + 4, textY2, { width: pageW * 0.7 });
          doc.font('Helvetica-Bold').fillColor('#0b5566').text(String(days), tableX + pageW * 0.7, textY2, { width: pageW * 0.3, align: 'right' });
          doc.moveDown(1.1);
        });

        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(`Total : ${totalDays} jours de garde`, { align: 'right' });
      }

      // Pied de page
      doc.moveDown(1.5);
      doc.font('Helvetica').fontSize(8).fillColor('#9ca3af').text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${centerName}`, { align: 'center' });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);
    const filename = `planning_${nanny.name.replace(/\s+/g, '_')}_${month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('GET /api/nannies/:id/export-planning error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
