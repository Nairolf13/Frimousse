const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');
const requireActiveSubscription = require('../middleware/subscriptionMiddleware');
const discoveryLimit = require('../middleware/discoveryLimitMiddleware');
const logger = require('../lib/logger');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }

router.get('/', auth, requireActiveSubscription, async (req, res) => {
  try {
  const where = {};
  if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
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
    if (req.user && req.user.role === 'parent') {
      return res.status(403).json({ message: 'Forbidden: parents cannot create reports' });
    }
    const { priority, type, status, childId, nannyId, summary, details, date, time, duration, childrenInvolved } = req.body;
    let isoDate = date;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      isoDate = new Date(date + 'T' + (time || '00:00') + ':00.000Z').toISOString();
    }
    if (!isSuperAdmin(req.user)) {
      if (childId) {
        const child = await prisma.child.findUnique({ where: { id: childId } });
        if (!child || child.centerId !== req.user.centerId) return res.status(404).json({ message: 'Child not found' });
        if (req.user && req.user.role === 'parent') {
          let parentId = req.user.parentId;
          if (!parentId && req.user.email) {
            const emailTrim = String(req.user.email).trim();
            const parentRec = await prisma.parent.findFirst({ where: { email: { equals: emailTrim, mode: 'insensitive' } } });
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
    // background notify parents when a nanny creates a report for their child
    (async () => {
      try {
        const { sendTemplatedMail } = require('../lib/email');
        const { notifyUsers } = require('../lib/pushNotifications');
        const childIds = new Set();
        if (report.childId) childIds.add(report.childId);
        if (report.childrenInvolved && Array.isArray(report.childrenInvolved)) for (const cid of report.childrenInvolved) childIds.add(cid);
        if (!childIds.size) return;
        const children = await prisma.child.findMany({ where: { id: { in: Array.from(childIds) } }, include: { parents: { include: { parent: true } } } });
        const parentEmails = new Set();
        const parentIds = new Set();
        for (const c of children) {
          for (const pc of (c.parents || [])) {
            if (pc && pc.parent) {
              if (pc.parent.email) parentEmails.add(pc.parent.email);
              if (pc.parent.id) parentIds.add(pc.parent.id);
            }
          }
        }
        if (!parentEmails.size && !parentIds.size) return;
        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
        const subject = (lang === 'fr') ? `Nouveau rapport concernant votre enfant` : `New report about your child`;
        const text = (lang === 'fr') ? `Un nouveau rapport a été créé par la nounou${report.nannyId ? '' : ''} concernant votre enfant. Résumé: ${report.summary || ''}` : `A new report was created by the nanny regarding your child. Summary: ${report.summary || ''}`;

        // send emails
        if (process.env.SMTP_HOST && parentEmails.size) {
          try {
            await sendTemplatedMail({ templateName: 'report', lang, to: Array.from(parentEmails), subject, text, substitutions: { reportSummary: report.summary || '', reportDetails: report.details || '' }, prisma });
          } catch (e) { logger.error('Failed to send report emails to parents', e && e.message ? e.message : e); }
        }

        if (parentIds.size) {
          try {
            const parentUsers = await prisma.user.findMany({ where: { parentId: { in: Array.from(parentIds) } }, select: { id: true } });
            const parentUserIds = parentUsers.map(u => u.id).filter(Boolean);
            if (parentUserIds.length) await notifyUsers(parentUserIds, { title: subject, body: report.summary || text, data: { reportId: report.id, type: 'report.created' } });
          } catch (e) { logger.error('Failed to send report pushes to parent users', e && e.message ? e.message : e); }
        }
      } catch (e) {
        logger.error('Failed to notify parents about new report', e && e.message ? e.message : e);
      }
    })();
    res.status(201).json(report);
  } catch (err) {
    logger.error('Report creation error:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Erreur lors de la création du rapport.', details: err.message });
  }
});

// update a report
router.put('/:id', auth, requireActiveSubscription, async (req, res) => {
  try {
    if (req.user && req.user.role === 'parent') {
      return res.status(403).json({ message: 'Forbidden: parents cannot edit reports' });
    }
    const reportId = req.params.id;
    const existing = await prisma.report.findUnique({ where: { id: reportId } });
    if (!existing) return res.status(404).json({ message: 'Report not found' });
    if (!isSuperAdmin(req.user)) {
      if (existing.centerId && req.user.centerId && existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Report not found' });
    }

    const { priority, type, status, childId, nannyId, summary, details, date, time, duration, childrenInvolved } = req.body;
    let isoDate = date;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      isoDate = new Date(date + 'T' + (time || '00:00') + ':00.000Z').toISOString();
    }

    const data = { priority, type, status, childId, nannyId, summary, details, date: isoDate, time, duration, childrenInvolved };
    const updated = await prisma.report.update({ where: { id: reportId }, data });
    res.json(updated);
  } catch (err) {
    logger.error('Report update error:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du rapport.', details: err.message });
  }
});

// delete a report
router.delete('/:id', auth, requireActiveSubscription, async (req, res) => {
  try {
    if (req.user && req.user.role === 'parent') {
      return res.status(403).json({ message: 'Forbidden: parents cannot delete reports' });
    }
    const reportId = req.params.id;
    const existing = await prisma.report.findUnique({ where: { id: reportId } });
    if (!existing) return res.status(404).json({ message: 'Report not found' });
    if (!isSuperAdmin(req.user)) {
      if (existing.centerId && req.user.centerId && existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Report not found' });
    }
    await prisma.report.delete({ where: { id: reportId } });
    res.status(204).end();
  } catch (err) {
    logger.error('Report delete error:', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Erreur lors de la suppression du rapport.', details: err.message });
  }
});

module.exports = router;
