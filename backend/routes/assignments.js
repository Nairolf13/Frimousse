const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
function isSuperAdmin(user) { if (!user || !user.role) return false; const r = String(user.role).toLowerCase(); return r === 'super-admin' || r === 'super_admin' || r === 'superadmin' || r.includes('super'); }

function isAdminRole(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  // accept common variants and be case-insensitive
  return r === 'admin' || r === 'administrator' || r.includes('admin');
}

router.get('/', auth, async (req, res) => {
  try {
    const { nannyId, start, end } = req.query;
    const where = {};
    if (nannyId) where.nannyId = nannyId;
  // Only filter by centerId when the authenticated user has a centerId set.
  if (!isSuperAdmin(req.user) && req.user && req.user.centerId) where.centerId = req.user.centerId;
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() + 1);
      where.date = { gte: startDate, lt: endDate };
    }
    // If authenticated user is a parent, restrict assignments to children linked to that parent
    if (req.user && req.user.role === 'parent') {
      // resolve parentId from authenticated user or by matching email to Parent record (case-insensitive)
      let parentId = req.user.parentId;
      if (!parentId && req.user.email) {
        const emailTrim = String(req.user.email).trim();
        const parentRec = await prisma.parent.findFirst({ where: { email: { equals: emailTrim, mode: 'insensitive' } } });
        if (parentRec) parentId = parentRec.id;
      }
      if (!parentId) return res.json([]);
      // restrict where to assignments whose child has a parent link
      where.child = { parents: { some: { parentId } } };
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
    // Parents are not allowed to create assignments
    if (req.user && req.user.role === 'parent') return res.status(403).json({ message: 'Forbidden' });

    // Check if assignment date has passed (compare dates without time) and user is not admin or super-admin
    if (!isSuperAdmin(req.user) && !isAdminRole(req.user)) {
      const assignDate = new Date(date);
      assignDate.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (assignDate < today) {
        return res.status(403).json({ message: 'Cannot create past assignments' });
      }
    }

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
        const full = await prisma.assignment.findUnique({ where: { id: assignment.id }, include: { child: { include: { parents: { include: { parent: true } } } }, nanny: true } });
        if (!full) return;
        const child = full.child;
        const nanny = full.nanny;
        const parentEmails = (child.parents || []).map(p => p.parent && p.parent.email).filter(Boolean);

        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
        const formattedDate = new Date(date).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full', timeStyle: 'short' });

        const schedules = await prisma.schedule.findMany({ where: { date: new Date(date), ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) } });
        const activitiesHtml = schedulesToHtml(schedules);

        const subject = (lang === 'fr' ? `Affectation pour ${child.name}` : `Assignment for ${child.name}`);
        const text = (lang === 'fr') ? `Bonjour,\n\nVotre enfant ${child.name} a une affectation pour ${formattedDate}.\n\nConsultez le planning: ${process.env.FRONTEND_URL || 'http://localhost:5173'}` : `Hello,\n\nYour child ${child.name} has an assignment for ${formattedDate}.\n\nView schedule: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

        // Send emails only if SMTP configured
        if (process.env.SMTP_HOST && parentEmails.length) {
          try {
            await sendTemplatedMail({ templateName: 'assignment', lang, to: parentEmails, subject, text, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
          } catch (e) {
            console.error('Failed to send assignment email to parents', e && e.message ? e.message : e);
          }
        }

        // Notify admins if created by nanny
        if (req.user.role === 'nanny') {
          const centerAdmins = await prisma.user.findMany({ where: { role: 'admin', centerId: req.user.centerId } });
          const superAdmins = await prisma.user.findMany({ where: { role: { in: ['super-admin', 'super_admin', 'superadmin'] } } });
          const adminIds = [...centerAdmins.map(u => u.id), ...superAdmins.map(u => u.id)].filter(Boolean);
          if (adminIds.length) {
            const adminSubject = (lang === 'fr' ? `Nouvelle affectation créée par ${req.user.name}` : `New assignment created by ${req.user.name}`);
            const adminText = (lang === 'fr') ? `Bonjour,\n\nUne nouvelle affectation pour ${child.name} a été créée par la nounou ${req.user.name}.\n\nDate: ${formattedDate}\nNounou assignée: ${nanny ? nanny.name : ''}\n\nConsultez le planning: ${process.env.FRONTEND_URL || 'http://localhost:5173'}` : `Hello,\n\nA new assignment for ${child.name} has been created by nanny ${req.user.name}.\n\nDate: ${formattedDate}\nAssigned nanny: ${nanny ? nanny.name : ''}\n\nView schedule: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;
            try {
              await sendTemplatedMail({ templateName: 'assignment', lang, to: [...centerAdmins.map(u => u.email), ...superAdmins.map(u => u.email)].filter(Boolean), subject: adminSubject, text: adminText, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
            } catch (e) {
              console.error('Failed to send assignment email to admins', e && e.message ? e.message : e);
            }

            try {
              const { notifyUsers } = require('../lib/pushNotifications');
              const pushPayload = { title: adminSubject, body: adminText, data: { url: `/planning`, assignmentId: assignment.id } };
              await notifyUsers(adminIds, pushPayload);
            } catch (e) {
              console.error('Failed to send admin push notification', e && e.message ? e.message : e);
            }
          }
        }

        // Notify assigned nanny when an admin created the assignment
        if (isAdminRole(req.user) || isSuperAdmin(req.user)) {
          try {
            const { notifyUsers } = require('../lib/pushNotifications');
            // Resolve the User.id for this nanny (User.nannyId === Nanny.id)
            let nannyUserId = null;
            if (nanny && nanny.id) {
              const nannyUserRec = await prisma.user.findFirst({ where: { nannyId: nanny.id }, select: { id: true } });
              if (nannyUserRec && nannyUserRec.id) nannyUserId = nannyUserRec.id;
            }
            // fallback: if nannyId param is actually a user id
            if (!nannyUserId && nannyId && typeof nannyId === 'string') {
              const maybeUser = await prisma.user.findUnique({ where: { id: nannyId }, select: { id: true } }).catch(() => null);
              if (maybeUser && maybeUser.id) nannyUserId = maybeUser.id;
            }
            if (nannyUserId) {
              const nannySubject = (lang === 'fr' ? `Nouvelle affectation pour ${child.name}` : `New assignment for ${child.name}`);
              const nannyText = (lang === 'fr') ? `Bonjour,\n\nVous avez été affectée à ${child.name} le ${formattedDate}.\n\nConsultez le planning: ${process.env.FRONTEND_URL || 'http://localhost:5173'}` : `Hello,\n\nYou have been assigned to ${child.name} on ${formattedDate}.\n\nView schedule: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;
              await notifyUsers([nannyUserId], { title: nannySubject, body: nannyText, data: { url: `/planning`, assignmentId: assignment.id } });
            }
          } catch (e) {
            console.error('Failed to send nanny push notification', e && e.message ? e.message : e);
          }
        }
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
    // Parents are not allowed to update assignments
    if (req.user && req.user.role === 'parent') return res.status(403).json({ message: 'Forbidden' });

    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Assignment not found' });

    if (!isSuperAdmin(req.user) && existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Assignment not found' });

    // Check if assignment date has passed (compare dates without time) and user is not admin or super-admin
    if (!isSuperAdmin(req.user) && !isAdminRole(req.user)) {
      const existingDate = new Date(existing.date);
      existingDate.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (existingDate < today) {
        return res.status(403).json({ message: 'Cannot modify past assignments' });
      }
    }
    const assignment = await prisma.assignment.update({ where: { id }, data: { date: new Date(date), childId, nannyId } });
    res.json(assignment);

    // background notify parents about update
    (async () => {
      try {
        const { sendTemplatedMail } = require('../lib/email');
        const full = await prisma.assignment.findUnique({ where: { id: assignment.id }, include: { child: { include: { parents: { include: { parent: true } } } }, nanny: true } });
        if (!full) return;
        const child = full.child;
        const nanny = full.nanny;
        const parentEmails = (child.parents || []).map(p => p.parent && p.parent.email).filter(Boolean);

        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
        const formattedDate = new Date(date).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full', timeStyle: 'short' });

        const schedules = await prisma.schedule.findMany({ where: { date: new Date(date), ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) } });
        const activitiesHtml = schedulesToHtml(schedules);

        const subject = (lang === 'fr' ? `Affectation mise à jour pour ${child.name}` : `Assignment updated for ${child.name}`);
        const text = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été mise à jour pour ${formattedDate}.\n\nConsultez le planning: ${process.env.FRONTEND_URL || 'http://localhost:5173'}` : `Hello,\n\nThe assignment for ${child.name} has been updated for ${formattedDate}.\n\nView schedule: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

        // Send emails only if SMTP configured
        if (process.env.SMTP_HOST && parentEmails.length) {
          try {
            await sendTemplatedMail({ templateName: 'assignment', lang, to: parentEmails, subject, text, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
          } catch (e) {
            console.error('Failed to send assignment email to parents', e && e.message ? e.message : e);
          }
        }

        // Notify admins if modified by nanny
        if (req.user.role === 'nanny') {
          const adminEmails = [];
          // Get admins of the center
          const centerAdmins = await prisma.user.findMany({ where: { role: 'admin', centerId: existing.centerId } });
          adminEmails.push(...centerAdmins.map(u => u.email));
          // Get super-admins
          const superAdmins = await prisma.user.findMany({ where: { role: { in: ['super-admin', 'super_admin', 'superadmin'] } } });
          adminEmails.push(...superAdmins.map(u => u.email));
          if (adminEmails.length) {
            const adminSubject = (lang === 'fr' ? `Modification d'affectation par ${req.user.name}` : `Assignment modified by ${req.user.name}`);
            const adminText = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été modifiée par la nounou ${req.user.name}.\n\nDate: ${formattedDate}\nNounou assignée: ${nanny ? nanny.name : ''}\n\nConsultez le planning: ${process.env.FRONTEND_URL || 'http://localhost:5173'}` : `Hello,\n\nThe assignment for ${child.name} has been modified by nanny ${req.user.name}.\n\nDate: ${formattedDate}\nAssigned nanny: ${nanny ? nanny.name : ''}\n\nView schedule: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;
            await sendTemplatedMail({ templateName: 'assignment', lang, to: adminEmails, subject: adminSubject, text: adminText, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });

            // Send push notifications to admins (non-blocking)
            try {
              const { notifyUsers } = require('../lib/pushNotifications');
              const adminIds = [...centerAdmins.map(u => u.id), ...superAdmins.map(u => u.id)].filter(Boolean);
              if (adminIds.length) {
                const pushPayload = { title: adminSubject, body: adminText, data: { url: `/planning`, assignmentId: assignment.id } };
                await notifyUsers(adminIds, pushPayload);
              }
            } catch (e) {
              console.error('Failed to send admin push notification', e && e.message ? e.message : e);
            }
      }
    } // end if (req.user.role === 'nanny')

    // Notify assigned nanny when an admin modified the assignment
    if (isAdminRole(req.user) || isSuperAdmin(req.user)) {
          try {
            const { notifyUsers } = require('../lib/pushNotifications');
            // Resolve the User.id for this nanny (User.nannyId === Nanny.id)
            let nannyUserId = null;
            if (nanny && nanny.id) {
              const nannyUserRec = await prisma.user.findFirst({ where: { nannyId: nanny.id }, select: { id: true } });
              if (nannyUserRec && nannyUserRec.id) nannyUserId = nannyUserRec.id;
            }
            if (!nannyUserId && nannyId && typeof nannyId === 'string') {
              const maybeUser = await prisma.user.findUnique({ where: { id: nannyId }, select: { id: true } }).catch(() => null);
              if (maybeUser && maybeUser.id) nannyUserId = maybeUser.id;
            }
            if (nannyUserId) {
              const nannySubject = (lang === 'fr' ? `Affectation mise à jour pour ${child.name}` : `Assignment updated for ${child.name}`);
              const nannyText = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été mise à jour pour ${formattedDate}.\n\nConsultez le planning: ${process.env.FRONTEND_URL || 'http://localhost:5173'}` : `Hello,\n\nThe assignment for ${child.name} has been updated for ${formattedDate}.\n\nView schedule: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;
              await notifyUsers([nannyUserId], { title: nannySubject, body: nannyText, data: { url: `/planning`, assignmentId: assignment.id } });
            }
          } catch (e) {
            console.error('Failed to send nanny push notification', e && e.message ? e.message : e);
          }
        }
      } catch (err) {
        console.error('Failed to send assignment update notification', err && err.message ? err.message : err);
      }
    })();

  } catch (err) {
    console.error('PUT /assignments error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    // Parents are not allowed to delete assignments
    if (req.user && req.user.role === 'parent') return res.status(403).json({ message: 'Forbidden' });

    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Assignment not found' });

    if (!isSuperAdmin(req.user) && existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Assignment not found' });

    if (!isSuperAdmin(req.user) && !isAdminRole(req.user)) {
      const existingDate = new Date(existing.date);
      existingDate.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (existingDate < today) {
        return res.status(403).json({ message: 'Cannot delete past assignments' });
      }
    }

    const fullExisting = await prisma.assignment.findUnique({ where: { id }, include: { child: { include: { parents: { include: { parent: true } } } }, nanny: true } });
    await prisma.assignment.delete({ where: { id } });
    res.json({ message: 'Assignment deleted' });

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

        // Notify admins if deleted by nanny
        if (req.user.role === 'nanny') {
          const adminEmails = [];
          // Get admins of the center
          const centerAdmins = await prisma.user.findMany({ where: { role: 'admin', centerId: existing.centerId } });
          adminEmails.push(...centerAdmins.map(u => u.email));
          // Get super-admins
          const superAdmins = await prisma.user.findMany({ where: { role: { in: ['super-admin', 'super_admin', 'superadmin'] } } });
          adminEmails.push(...superAdmins.map(u => u.email));
          if (adminEmails.length) {
            const adminSubject = (lang === 'fr' ? `Suppression d'affectation par ${req.user.name}` : `Assignment deleted by ${req.user.name}`);
            const adminText = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été supprimée par la nounou ${req.user.name}.\n\nDate: ${formattedDate}\nNounou assignée: ${nanny ? nanny.name : ''}\n\nConsultez le planning: ${process.env.FRONTEND_URL || 'http://localhost:5173'}` : `Hello,\n\nThe assignment for ${child.name} has been deleted by nanny ${req.user.name}.\n\nDate: ${formattedDate}\nAssigned nanny: ${nanny ? nanny.name : ''}\n\nView schedule: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`;
            await sendTemplatedMail({ templateName: 'assignment_deleted', lang, to: adminEmails, subject: adminSubject, text: adminText, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });

            // Send push notifications to admins (non-blocking)
            try {
              const { notifyUsers } = require('../lib/pushNotifications');
              const adminIds = [...centerAdmins.map(u => u.id), ...superAdmins.map(u => u.id)].filter(Boolean);
              if (adminIds.length) {
                const pushPayload = { title: adminSubject, body: adminText, data: { url: `/planning`, assignmentId: fullExisting.id } };
                await notifyUsers(adminIds, pushPayload);
              }
            } catch (e) {
              console.error('Failed to send admin push notification', e && e.message ? e.message : e);
            }
          }
        }
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

