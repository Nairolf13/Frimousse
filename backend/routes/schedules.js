const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }

router.get('/schedules', auth, async (req, res) => {
  try {
  const where = {};
  if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
  const schedules = await prisma.schedule.findMany({ include: { nannies: true }, where, orderBy: { date: 'asc' } });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/nannies/:id/schedules', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const schedules = await prisma.schedule.findMany({
  where: { nannies: { some: { id } }, ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) },
      orderBy: { date: 'asc' },
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/schedules', auth, async (req, res) => {
  try {
    const { date, startTime, endTime, name, nannyIds, comment } = req.body;
  const data = { date: new Date(date), startTime, endTime, name, comment };
  if (!isSuperAdmin(req.user) && req.user.centerId) data.centerId = req.user.centerId;
  const schedule = await prisma.schedule.create({ data: { ...data, nannies: { connect: nannyIds.map(id => ({ id })) } } });
    const fullSchedule = await prisma.schedule.findUnique({
      where: { id: schedule.id },
      include: { nannies: true },
    });
      res.json(fullSchedule);

      // notify parents of children assigned that day about the new activity (non-blocking)
      (async () => {
        try {
          const { sendTemplatedMail, getParentEmailsForDate } = require('../lib/email');
          if (!process.env.SMTP_HOST) return;
          const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
          const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
          const parentEmails = await getParentEmailsForDate(prisma, date, req.user.centerId, isSuperAdmin(req.user));
          if (!parentEmails.length) return;
          const subject = (lang === 'fr') ? `Nouvelle activité : ${name || ''}` : `New activity: ${name || ''}`;
          const text = (lang === 'fr') ? `Une nouvelle activité a été planifiée pour ${new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' })}` : `A new activity has been planned for ${new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' })}`;
          await sendTemplatedMail({ templateName: 'activity', lang, to: parentEmails, subject, text, substitutions: { activityName: name || '', comment: comment || '', date: new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }), startTime: startTime || '', endTime: endTime || '', link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp' } });
        } catch (err) {
          console.error('Failed to send activity notification', err && err.message ? err.message : err);
        }
      })();
  } catch (err) {
    console.error('Erreur POST /schedules:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.put('/schedules/:scheduleId', auth, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { date, startTime, endTime, name, nannyIds, comment } = req.body;
    if (!isSuperAdmin(req.user)) {
      const existing = await prisma.schedule.findUnique({ where: { id: scheduleId } });
      if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Schedule not found' });
    }
    const schedule = await prisma.schedule.update({ where: { id: scheduleId }, data: { date: new Date(date), startTime, endTime, name, comment, nannies: nannyIds ? { set: nannyIds.map(id => ({ id })) } : undefined } });
    res.json(schedule);
      // notify parents about updated activity
      (async () => {
        try {
          const { sendTemplatedMail, getParentEmailsForDate } = require('../lib/email');
          if (!process.env.SMTP_HOST) return;
          const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
          const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
          const parentEmails = await getParentEmailsForDate(prisma, date, req.user.centerId, isSuperAdmin(req.user));
          if (!parentEmails.length) return;
          const subject = (lang === 'fr') ? `Activité mise à jour : ${name || ''}` : `Activity updated: ${name || ''}`;
          const text = (lang === 'fr') ? `Une activité a été mise à jour pour ${new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' })}` : `An activity has been updated for ${new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' })}`;
          await sendTemplatedMail({ templateName: 'activity', lang, to: parentEmails, subject, text, substitutions: { activityName: name || '', comment: comment || '', date: new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }), startTime: startTime || '', endTime: endTime || '', link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp' } });
        } catch (err) {
          console.error('Failed to send activity update notification', err && err.message ? err.message : err);
        }
      })();
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/schedules/:scheduleId', auth, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    if (!isSuperAdmin(req.user)) {
      const existing = await prisma.schedule.findUnique({ where: { id: scheduleId } });
      if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Schedule not found' });
    }
    await prisma.schedule.delete({ where: { id: scheduleId } });
    res.json({ success: true });
      // notify parents about deleted activity
      (async () => {
        try {
          const { sendTemplatedMail, getParentEmailsForDate } = require('../lib/email');
          if (!process.env.SMTP_HOST) return;
          const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
          const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
          const parentEmails = await getParentEmailsForDate(prisma, existing.date, req.user.centerId, isSuperAdmin(req.user));
          if (!parentEmails.length) return;
          const subject = (lang === 'fr') ? `Activité supprimée : ${existing.name || ''}` : `Activity removed: ${existing.name || ''}`;
          const text = (lang === 'fr') ? `Une activité a été supprimée pour ${existing.date ? new Date(existing.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }) : ''}` : `An activity has been removed for ${existing.date ? new Date(existing.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }) : ''}`;
          await sendTemplatedMail({ templateName: 'activity', lang, to: parentEmails, subject, text, substitutions: { activityName: existing.name || '', comment: existing.comment || '', date: existing.date ? new Date(existing.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }) : '', startTime: existing.startTime || '', endTime: existing.endTime || '', link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp' } });
        } catch (err) {
          console.error('Failed to send activity deletion notification', err && err.message ? err.message : err);
        }
      })();
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
