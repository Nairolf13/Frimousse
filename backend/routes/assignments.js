const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }

router.get('/', auth, async (req, res) => {
  try {
    const { nannyId, start, end } = req.query;
    const where = {};
    if (nannyId) where.nannyId = nannyId;
    if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() + 1);
      where.date = { gte: startDate, lt: endDate };
    }
    const assignments = await prisma.assignment.findMany({ where,
      select: {
        id: true,
        date: true,
        childId: true,
        nannyId: true,
        createdAt: true,
        child: {
          select: {
            id: true,
            name: true,
            age: true,
            sexe: true,
            group: true,
            allergies: true,
            createdAt: true,
            updatedAt: true,
            parents: {
              select: {
                parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
              }
            }
          }
        },
        nanny: { select: { id: true, name: true } }
      }
    });
    res.json(assignments);
  } catch (err) {
    console.error('GET /assignments error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// helper to format schedules as html list
function schedulesToHtml(schedules) {
  if (!schedules || schedules.length === 0) return '';
  return schedules.map(s => `<div style="margin-bottom:8px"><strong>${s.name || ''}</strong><div>${s.comment || ''}</div><small>${s.startTime || ''} — ${s.endTime || ''}</small></div>`).join('');
}

// CREATE assignment
router.post('/', auth, async (req, res) => {
  try {
    const { date, childId, nannyId } = req.body;
    if (!isSuperAdmin(req.user)) {
      const child = await prisma.child.findUnique({ where: { id: childId } });
      if (!child || child.centerId !== req.user.centerId) return res.status(404).json({ message: 'Child not found' });
      const nanny = await prisma.nanny.findUnique({ where: { id: nannyId } });
      if (!nanny || nanny.centerId !== req.user.centerId) return res.status(404).json({ message: 'Nanny not found' });
    }

    const assignment = await prisma.assignment.create({ data: { date: new Date(date), childId, nannyId, centerId: req.user.centerId } });
    res.status(201).json(assignment);

    // background notify parents
    (async () => {
      try {
        const { sendTemplatedMail } = require('../lib/email');
        if (!process.env.SMTP_HOST) return;
        const full = await prisma.assignment.findUnique({ where: { id: assignment.id }, include: { child: { include: { parents: { include: { parent: true } } } }, nanny: true } });
        if (!full) return;
        const child = full.child;
        const nanny = full.nanny;
        const parentEmails = (child.parents || []).map(p => p.parent && p.parent.email).filter(Boolean);
        if (!parentEmails.length) return;

        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
        const formattedDate = new Date(date).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full', timeStyle: 'short' });

        const schedules = await prisma.schedule.findMany({ where: { date: new Date(date), ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) } });
        const activitiesHtml = schedulesToHtml(schedules);

        const subject = (lang === 'fr' ? `Affectation pour ${child.name}` : `Assignment for ${child.name}`);
        const text = (lang === 'fr') ? `Bonjour,\n\nVotre enfant ${child.name} a une affectation pour ${formattedDate}.\n\nConsultez le planning: ${process.env.FRONTEND_URL || 'http://localhost:5173'}` : `Hello,\n\nYour child ${child.name} has an assignment for ${formattedDate}.\n\nView schedule: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

        await sendTemplatedMail({ templateName: 'assignment', lang, to: parentEmails, subject, text, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
      } catch (err) {
        console.error('Failed to send assignment notification', err && err.message ? err.message : err);
      }
    })();

  } catch (err) {
    console.error('POST /assignments error', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// UPDATE assignment
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, childId, nannyId } = req.body;
    if (!isSuperAdmin(req.user)) {
      const existing = await prisma.assignment.findUnique({ where: { id } });
      if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Assignment not found' });
    }
    const assignment = await prisma.assignment.update({ where: { id }, data: { date: new Date(date), childId, nannyId } });
    res.json(assignment);

    // background notify parents about update
    (async () => {
      try {
        const { sendTemplatedMail } = require('../lib/email');
        if (!process.env.SMTP_HOST) return;
        const full = await prisma.assignment.findUnique({ where: { id: assignment.id }, include: { child: { include: { parents: { include: { parent: true } } } }, nanny: true } });
        if (!full) return;
        const child = full.child;
        const nanny = full.nanny;
        const parentEmails = (child.parents || []).map(p => p.parent && p.parent.email).filter(Boolean);
        if (!parentEmails.length) return;

        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
        const formattedDate = new Date(date).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full', timeStyle: 'short' });

        const schedules = await prisma.schedule.findMany({ where: { date: new Date(date), ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) } });
        const activitiesHtml = schedulesToHtml(schedules);

        const subject = (lang === 'fr' ? `Affectation mise à jour pour ${child.name}` : `Assignment updated for ${child.name}`);
        const text = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été mise à jour pour ${formattedDate}.\n\nConsultez le planning: ${process.env.FRONTEND_URL || 'http://localhost:5173'}` : `Hello,\n\nThe assignment for ${child.name} has been updated for ${formattedDate}.\n\nView schedule: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

        await sendTemplatedMail({ templateName: 'assignment', lang, to: parentEmails, subject, text, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
      } catch (err) {
        console.error('Failed to send assignment update notification', err && err.message ? err.message : err);
      }
    })();

  } catch (err) {
    console.error('PUT /assignments error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE assignment
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdmin(req.user)) {
      const existing = await prisma.assignment.findUnique({ where: { id } });
      if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Assignment not found' });
    }
    const fullExisting = await prisma.assignment.findUnique({ where: { id }, include: { child: { include: { parents: { include: { parent: true } } } }, nanny: true } });
    await prisma.assignment.delete({ where: { id } });
    res.json({ message: 'Assignment deleted' });

    // background notify parents about deletion
    (async () => {
      try {
        const { sendTemplatedMail } = require('../lib/email');
        if (!process.env.SMTP_HOST) return;
        const existing = fullExisting;
        if (!existing) return;
        const child = existing.child;
        const nanny = existing.nanny;
        const parentEmails = (child.parents || []).map(p => p.parent && p.parent.email).filter(Boolean);
        if (!parentEmails.length) return;

        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
        const formattedDate = existing.date ? new Date(existing.date).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full', timeStyle: 'short' }) : '';

        const schedules = await prisma.schedule.findMany({ where: { date: existing.date ? new Date(existing.date) : undefined, ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) } });
        const activitiesHtml = schedulesToHtml(schedules);

        const subject = (lang === 'fr' ? `Affectation supprimée pour ${child.name}` : `Assignment removed for ${child.name}`);
        const text = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été supprimée.` : `Hello,\n\nThe assignment for ${child.name} has been removed.`;

        await sendTemplatedMail({ templateName: 'assignment_deleted', lang, to: parentEmails, subject, text, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
      } catch (err) {
        console.error('Failed to send assignment deletion notification', err && err.message ? err.message : err);
      }
    })();

  } catch (err) {
    console.error('DELETE /assignments error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

