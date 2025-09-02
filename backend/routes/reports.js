const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');
const requireActiveSubscription = require('../middleware/subscriptionMiddleware');
const discoveryLimit = require('../middleware/discoveryLimitMiddleware');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }

router.get('/', auth, requireActiveSubscription, async (req, res) => {
  try {
  const where = {};
  if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
  // If parent, limit to reports where child is linked to this parent
  if (req.user && req.user.role === 'parent') {
    let parentId = req.user.parentId;
    if (!parentId && req.user.email) {
      const emailTrim = String(req.user.email).trim();
      const parentRec = await prisma.parent.findFirst({ where: { email: { equals: emailTrim, mode: 'insensitive' } } });
      if (parentRec) parentId = parentRec.id;
    }
    if (!parentId) return res.json([]);
    where.child = { parents: { some: { parentId } } };
  }
  const reports = await prisma.report.findMany({ include: { child: true, nanny: true }, where, orderBy: { date: 'desc' } });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des rapports.' });
  }
});

router.post('/', auth, requireActiveSubscription, discoveryLimit('report'), async (req, res) => {
  try {
    const { priority, type, status, childId, nannyId, summary, details, date, time, duration, childrenInvolved } = req.body;
    let isoDate = date;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      isoDate = new Date(date + 'T' + (time || '00:00') + ':00.000Z').toISOString();
    }
    if (!isSuperAdmin(req.user)) {
      if (childId) {
        const child = await prisma.child.findUnique({ where: { id: childId } });
        if (!child || child.centerId !== req.user.centerId) return res.status(404).json({ message: 'Child not found' });
        // if authenticated user is a parent, ensure the child belongs to them
        if (req.user && req.user.role === 'parent') {
          let parentId = req.user.parentId;
          if (!parentId && req.user.email) {
            const parentRec = await prisma.parent.findFirst({ where: { email: req.user.email } });
            if (parentRec) parentId = parentRec.id;
          }
          if (!parentId) return res.status(403).json({ message: 'Forbidden' });
          const link = await prisma.parentChild.findFirst({ where: { childId, parentId } });
          if (!link) return res.status(403).json({ message: 'Forbidden' });
        }
      }
      if (nannyId) {
        const nanny = await prisma.nanny.findUnique({ where: { id: nannyId } });
        if (!nanny || nanny.centerId !== req.user.centerId) return res.status(404).json({ message: 'Nanny not found' });
      }
    }
    const data = { priority, type, status, childId, nannyId, summary, details, date: isoDate, time, duration, childrenInvolved };
    if (!isSuperAdmin(req.user) && req.user.centerId) data.centerId = req.user.centerId;
    const report = await prisma.report.create({ data });
    res.status(201).json(report);
  } catch (err) {
    console.error('Report creation error:', err);
    res.status(500).json({ error: 'Erreur lors de la création du rapport.', details: err.message });
  }
});

module.exports = router;
