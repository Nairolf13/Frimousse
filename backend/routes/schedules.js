const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');
const logger = require('../lib/logger');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }

router.get('/schedules', auth, async (req, res) => {
  try {
  const where = {};
  // Si super-admin et centerId fourni dans la query, filtrer par ce centre
  if (isSuperAdmin(req.user) && req.query.centerId) {
    where.centerId = req.query.centerId;
  } else if (!isSuperAdmin(req.user)) {
    // Sinon, filtrer par le centre de l'utilisateur
    where.centerId = req.user.centerId;
  }
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

      // notify participating nannies and parents of children cared for by those nannies
      (async () => {
        try {
          const { sendTemplatedMail } = require('../lib/email');
          const { notifyUsers } = require('../lib/pushNotifications');
          const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
          const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';

          const nannyIds = (fullSchedule && fullSchedule.nannies) ? fullSchedule.nannies.map(n => n.id).filter(Boolean) : [];
          if (!nannyIds.length) return;

          const title = (lang === 'fr') ? `Nouvelle activité : ${name || ''}` : `New activity: ${name || ''}`;
          const text = (lang === 'fr') ? `Une nouvelle activité a été planifiée pour ${new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' })}` : `A new activity has been planned for ${new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' })}`;

          // Notify nannies (push + email to user account if present)
          for (const nid of nannyIds) {
            try {
              const nannyRec = await prisma.nanny.findUnique({ where: { id: nid } });
              if (!nannyRec) continue;
              // resolve user account for nanny
              let nannyUserId = null;
              const nannyUserRec = await prisma.user.findFirst({ where: { nannyId: nid }, select: { id: true, email: true } }).catch(() => null);
              if (nannyUserRec && nannyUserRec.id) nannyUserId = nannyUserRec.id;
              // send email to nanny user if configured
                  if (nannyUserRec && nannyUserRec.email && process.env.SMTP_HOST) {
                try {
                  await sendTemplatedMail({ templateName: 'activity', lang, to: [nannyUserRec.email], subject: title, text, substitutions: { activityName: name || '', comment: comment || '', date: new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }), startTime: startTime || '', endTime: endTime || '' }, prisma });
                } catch (e) { logger.error('Failed to send activity email to nanny user', e && e.message ? e.message : e); }
              }
              if (nannyUserId) {
                try { await notifyUsers([nannyUserId], { title, body: text, data: { scheduleId: schedule.id, type: 'schedule.created' } }); } catch (e) { logger.error('Failed to send activity push to nanny', e && e.message ? e.message : e); }
              } else {
                // fallback: email to nanny record
                if (process.env.SMTP_HOST && (nannyRec.email || nannyRec.contactEmail)) {
                  try {
                    const to = nannyRec.email ? [nannyRec.email] : [nannyRec.contactEmail];
                    await sendTemplatedMail({ templateName: 'activity', lang, to, subject: title, text, substitutions: { activityName: name || '', comment: comment || '', date: new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }), startTime: startTime || '', endTime: endTime || '' }, prisma });
                  } catch (e) { logger.error('Fallback activity email to nanny failed', e && e.message ? e.message : e); }
                }
              }
            } catch (e) {
              logger.error('Error notifying nanny for schedule', e && e.message ? e.message : e);
            }
          }

          // Notify parents whose children are cared for by any of these nannies
          try {
            // find children linked to these nannies
            const children = await prisma.child.findMany({ where: { childNannies: { some: { nannyId: { in: nannyIds } } }, ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) }, include: { parents: { include: { parent: true } } } });
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
            const parentEmailList = Array.from(parentEmails);
            // send emails
            if (process.env.SMTP_HOST && parentEmailList.length) {
              try {
                await sendTemplatedMail({ templateName: 'activity', lang, to: parentEmailList, subject: title, text, substitutions: { activityName: name || '', comment: comment || '', date: new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }), startTime: startTime || '', endTime: endTime || '' }, prisma });
              } catch (e) { logger.error('Failed to send activity emails to parents', e && e.message ? e.message : e); }
            }
            // push to parent users (resolve users by parentId)
            if (parentIds.size) {
              const parentUsers = await prisma.user.findMany({ where: { parentId: { in: Array.from(parentIds) } }, select: { id: true } });
              const parentUserIds = parentUsers.map(u => u.id).filter(Boolean);
              if (parentUserIds.length) {
                try { await notifyUsers(parentUserIds, { title, body: text, data: { scheduleId: schedule.id, type: 'schedule.created' } }); } catch (e) { logger.error('Failed to send activity pushes to parents', e && e.message ? e.message : e); }
              }
            }
          } catch (e) {
            logger.error('Failed to notify parents for schedule', e && e.message ? e.message : e);
          }

        } catch (err) {
          logger.error('Failed to send schedule-related notifications', err && err.message ? err.message : err);
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
          await sendTemplatedMail({ templateName: 'activity', lang, to: parentEmails, subject, text, substitutions: { activityName: name || '', comment: comment || '', date: new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }), startTime: startTime || '', endTime: endTime || '', link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp' }, prisma });
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
    // load the existing schedule first so we can perform permission checks
    // and still reference it later when sending notifications
    const existing = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!existing) return res.status(404).json({ message: 'Schedule not found' });
    if (!isSuperAdmin(req.user) && existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Schedule not found' });
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
          await sendTemplatedMail({ templateName: 'activity', lang, to: parentEmails, subject, text, substitutions: { activityName: existing.name || '', comment: existing.comment || '', date: existing.date ? new Date(existing.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }) : '', startTime: existing.startTime || '', endTime: existing.endTime || '', link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp' }, prisma });
        } catch (err) {
          console.error('Failed to send activity deletion notification', err && err.message ? err.message : err);
        }
      })();
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
