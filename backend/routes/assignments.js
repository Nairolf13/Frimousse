const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
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
  logger.error('GET /assignments error', err);
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

    // Update payment history for affected parents for the current month (non-blocking)
    (async () => {
      try {
        const { upsertPaymentsForParentForMonth } = require('../lib/paymentCron');
        const full = await prisma.assignment.findUnique({ where: { id: assignment.id }, include: { child: { include: { parents: { include: { parent: true } } } } } });
        if (!full || !full.child) return;
        const parents = (full.child.parents || []).map(p => p.parent).filter(Boolean);
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth(); // 0-11 current month
        for (const parent of parents) {
          try { await upsertPaymentsForParentForMonth(parent.id, year, monthIndex); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // non-blocking
      }
    })();

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
  const formattedDate = new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' });

        const schedules = await prisma.schedule.findMany({ where: { date: new Date(date), ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) } });
        const activitiesHtml = schedulesToHtml(schedules);

        const subject = (lang === 'fr' ? `Affectation pour ${child.name}` : `Assignment for ${child.name}`);
  const text = (lang === 'fr') ? `Bonjour,\n\nVotre enfant ${child.name} a une affectation pour ${formattedDate}.` : `Hello,\n\nYour child ${child.name} has an assignment for ${formattedDate}.`;

        // Send emails only if SMTP configured
        if (process.env.SMTP_HOST && parentEmails.length) {
          try {
            await sendTemplatedMail({ templateName: 'assignment', lang, to: parentEmails, subject, text, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
          } catch (e) {
            logger.error('Failed to send assignment email to parents', e && e.message ? e.message : e);
          }
        }

        // Notify parents via push (if parent accounts exist)
        try {
          const { notifyUsers } = require('../lib/pushNotifications');
          const parentUserIds = [];
          for (const p of (child.parents || [])) {
            const parentRec = p && p.parent ? p.parent : null;
            if (!parentRec) continue;
            // try to resolve a User by parentId
            let u = null;
            if (parentRec.id) {
              u = await prisma.user.findFirst({ where: { parentId: parentRec.id }, select: { id: true } }).catch(() => null);
            }
            // fallback: match by email
            if (!u && parentRec.email) {
              u = await prisma.user.findFirst({ where: { email: { equals: parentRec.email, mode: 'insensitive' } }, select: { id: true } }).catch(() => null);
            }
            if (u && u.id) parentUserIds.push(u.id);
          }
          const dedupParentIds = Array.from(new Set(parentUserIds));
          if (dedupParentIds.length) {
            const pushPayload = { title: subject, body: text, data: { url: `/planning`, assignmentId: assignment.id } };
            await notifyUsers(dedupParentIds, pushPayload);
          }
        } catch (e) {
          logger.error('Failed to send parent push notification for assignment create', e && e.message ? e.message : e);
        }

        // Notify admins if created by nanny
        if (req.user.role === 'nanny') {
          const centerAdmins = await prisma.user.findMany({ where: { role: 'admin', centerId: req.user.centerId } });
          const superAdmins = await prisma.user.findMany({ where: { role: { in: ['super-admin', 'super_admin', 'superadmin'] } } });
          const adminIds = [...centerAdmins.map(u => u.id), ...superAdmins.map(u => u.id)].filter(Boolean);
          if (adminIds.length) {
            const adminSubject = (lang === 'fr' ? `Nouvelle affectation créée par ${req.user.name}` : `New assignment created by ${req.user.name}`);
            const adminText = (lang === 'fr') ? `Bonjour,\n\nUne nouvelle affectation pour ${child.name} a été créée par la nounou ${req.user.name}.\n\nDate: ${formattedDate}\nNounou assignée: ${nanny ? nanny.name : ''}` : `Hello,\n\nA new assignment for ${child.name} has been created by nanny ${req.user.name}.\n\nDate: ${formattedDate}\nAssigned nanny: ${nanny ? nanny.name : ''}`;
            try {
              await sendTemplatedMail({ templateName: 'assignment', lang, to: [...centerAdmins.map(u => u.email), ...superAdmins.map(u => u.email)].filter(Boolean), subject: adminSubject, text: adminText, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
            } catch (e) {
              logger.error('Failed to send assignment email to admins', e && e.message ? e.message : e);
            }

            try {
              const { notifyUsers } = require('../lib/pushNotifications');
              const pushPayload = { title: adminSubject, body: adminText, data: { url: `/planning`, assignmentId: assignment.id } };
              await notifyUsers(adminIds, pushPayload);
            } catch (e) {
              logger.error('Failed to send admin push notification', e && e.message ? e.message : e);
            }
          }
        }

        // Notify assigned nanny when an admin created the assignment
        if (isAdminRole(req.user) || isSuperAdmin(req.user)) {
          try {
            const { notifyUsers } = require('../lib/pushNotifications');
            // Resolve the User.id for this nanny (try several fallbacks)
            let nannyUserId = null;
            if (nanny && nanny.id) {
              const nannyUserRec = await prisma.user.findFirst({ where: { nannyId: nanny.id }, select: { id: true } });
              if (nannyUserRec && nannyUserRec.id) nannyUserId = nannyUserRec.id;
            }
            // Try to match by nanny's email if available (case-insensitive)
            if (!nannyUserId && nanny && nanny.email) {
              const byEmail = await prisma.user.findFirst({ where: { email: { equals: nanny.email, mode: 'insensitive' } }, select: { id: true } }).catch(() => null);
              if (byEmail && byEmail.id) nannyUserId = byEmail.id;
            }
            // fallback: if nannyId param is actually a user id or nanny.id equals a user id
            if (!nannyUserId && nannyId && typeof nannyId === 'string') {
              const maybeUser = await prisma.user.findUnique({ where: { id: nannyId }, select: { id: true } }).catch(() => null);
              if (maybeUser && maybeUser.id) nannyUserId = maybeUser.id;
            }
            if (!nannyUserId) {
              logger.warn('No linked user found for nanny when creating assignment', { nannyId: nanny && nanny.id ? nanny.id : null, nannyEmail: nanny && nanny.email ? nanny.email : null });
            }
            if (nannyUserId) {
              const nannySubject = (lang === 'fr' ? `Nouvelle affectation pour ${child.name}` : `New assignment for ${child.name}`);
              const nannyText = (lang === 'fr') ? `Bonjour,\n\nVous avez été affectée à ${child.name} le ${formattedDate}.` : `Hello,\n\nYou have been assigned to ${child.name} on ${formattedDate}.`;
              // Send email to the nanny user if available
              try {
                if (process.env.SMTP_HOST) {
                  const nannyUser = await prisma.user.findUnique({ where: { id: nannyUserId }, select: { email: true } }).catch(() => null);
                  if (nannyUser && nannyUser.email) {
                    await sendTemplatedMail({ templateName: 'assignment', lang, to: [nannyUser.email], subject: nannySubject, text: nannyText, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
                  }
                }
              } catch (e) {
                logger.error('Failed to send assignment email to nanny', e && e.message ? e.message : e);
              }
              await notifyUsers([nannyUserId], { title: nannySubject, body: nannyText, data: { url: `/planning`, assignmentId: assignment.id } });
            }
            else {
              logger.warn('No linked user for nanny on update; attempting fallback email', nanny && nanny.id ? nanny.id : nannyId);
              try {
                if (process.env.SMTP_HOST && nanny && (nanny.email || nanny.contactEmail)) {
                  const to = nanny.email ? [nanny.email] : [nanny.contactEmail];
                  await sendTemplatedMail({ templateName: 'assignment', lang, to, subject: nannySubject, text: nannyText, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
                }
              } catch (e) {
                logger.error('Fallback email to nanny failed on update', e && e.message ? e.message : e);
              }
            }
            // end of nannyUserId branch
          } catch (e) {
            logger.error('Failed to send nanny push notification', e && e.message ? e.message : e);
          }
        }
      } catch (err) {
  logger.error('Failed to send assignment notification', err && err.message ? err.message : err);
      }
    })();

  } catch (err) {
  logger.error('POST /assignments error', err);
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

    // Update payment history for affected parents for the current month (non-blocking)
    (async () => {
      try {
        const { upsertPaymentsForParentForMonth } = require('../lib/paymentCron');
        const full = await prisma.assignment.findUnique({ where: { id: assignment.id }, include: { child: { include: { parents: { include: { parent: true } } } } } });
        if (!full || !full.child) return;
        const parents = (full.child.parents || []).map(p => p.parent).filter(Boolean);
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth(); // 0-11 current month
        for (const parent of parents) {
          try { await upsertPaymentsForParentForMonth(parent.id, year, monthIndex); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore
      }
    })();

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
  const formattedDate = new Date(date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' });

        const schedules = await prisma.schedule.findMany({ where: { date: new Date(date), ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) } });
        const activitiesHtml = schedulesToHtml(schedules);

  const subject = (lang === 'fr' ? `Affectation mise à jour pour ${child.name}` : `Assignment updated for ${child.name}`);
  const text = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été mise à jour pour ${formattedDate}.` : `Hello,\n\nThe assignment for ${child.name} has been updated for ${formattedDate}.`;

        // Send emails only if SMTP configured
        if (process.env.SMTP_HOST && parentEmails.length) {
          try {
            await sendTemplatedMail({ templateName: 'assignment', lang, to: parentEmails, subject, text, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
          } catch (e) {
            logger.error('Failed to send assignment email to parents', e && e.message ? e.message : e);
          }
        }

        // Notify parents via push for assignment update
        try {
          const { notifyUsers } = require('../lib/pushNotifications');
          const parentUserIds = [];
          for (const p of (child.parents || [])) {
            const parentRec = p && p.parent ? p.parent : null;
            if (!parentRec) continue;
            let u = null;
            if (parentRec.id) {
              u = await prisma.user.findFirst({ where: { parentId: parentRec.id }, select: { id: true } }).catch(() => null);
            }
            if (!u && parentRec.email) {
              u = await prisma.user.findFirst({ where: { email: { equals: parentRec.email, mode: 'insensitive' } }, select: { id: true } }).catch(() => null);
            }
            if (u && u.id) parentUserIds.push(u.id);
          }
          const dedupParentIds = Array.from(new Set(parentUserIds));
          if (dedupParentIds.length) {
            const pushPayload = { title: subject, body: text, data: { url: `/planning`, assignmentId: assignment.id } };
            await notifyUsers(dedupParentIds, pushPayload);
          }
        } catch (e) {
          logger.error('Failed to send parent push notification for assignment update', e && e.message ? e.message : e);
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
            const adminText = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été modifiée par la nounou ${req.user.name}.\n\nDate: ${formattedDate}\nNounou assignée: ${nanny ? nanny.name : ''}` : `Hello,\n\nThe assignment for ${child.name} has been modified by nanny ${req.user.name}.\n\nDate: ${formattedDate}\nAssigned nanny: ${nanny ? nanny.name : ''}`;
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
              logger.error('Failed to send admin push notification', e && e.message ? e.message : e);
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
              const nannyText = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été mise à jour pour ${formattedDate}.` : `Hello,\n\nThe assignment for ${child.name} has been updated for ${formattedDate}.`;
              // Send email to the nanny user if available
              try {
                if (process.env.SMTP_HOST) {
                  const nannyUser = await prisma.user.findUnique({ where: { id: nannyUserId }, select: { email: true } }).catch(() => null);
                  if (nannyUser && nannyUser.email) {
                    await sendTemplatedMail({ templateName: 'assignment', lang, to: [nannyUser.email], subject: nannySubject, text: nannyText, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
                  }
                }
              } catch (e) {
                logger.error('Failed to send assignment update email to nanny', e && e.message ? e.message : e);
              }
              await notifyUsers([nannyUserId], { title: nannySubject, body: nannyText, data: { url: `/planning`, assignmentId: assignment.id } });
            }
          } catch (e) {
            logger.error('Failed to send nanny push notification', e && e.message ? e.message : e);
          }
        }
      } catch (err) {
  logger.error('Failed to send assignment update notification', err && err.message ? err.message : err);
      }
    })();

  } catch (err) {
  logger.error('PUT /assignments error', err);
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

    // Update payment history for affected parents for the current month (non-blocking)
    (async () => {
      try {
        const { upsertPaymentsForParentForMonth } = require('../lib/paymentCron');
        const parents = (fullExisting.child && fullExisting.child.parents) ? (fullExisting.child.parents.map(p => p.parent).filter(Boolean)) : [];
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth();
        for (const parent of parents) {
          try { await upsertPaymentsForParentForMonth(parent.id, year, monthIndex); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // ignore
      }
    })();

    (async () => {
      try {
  const { sendTemplatedMail } = require('../lib/email');
        const existing = fullExisting;
        if (!existing) return;
        const child = existing.child;
        const nanny = existing.nanny;
        const parentEmails = (child.parents || []).map(p => p.parent && p.parent.email).filter(Boolean);
        if (!parentEmails.length) return;

        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
  const formattedDate = existing.date ? new Date(existing.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'full' }) : '';

        const schedules = await prisma.schedule.findMany({ where: { date: existing.date ? new Date(existing.date) : undefined, ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) } });
        const activitiesHtml = schedulesToHtml(schedules);

        const subject = (lang === 'fr' ? `Affectation supprimée pour ${child.name}` : `Assignment removed for ${child.name}`);
        const text = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été supprimée.` : `Hello,\n\nThe assignment for ${child.name} has been removed.`;

        await sendTemplatedMail({ templateName: 'assignment_deleted', lang, to: parentEmails, subject, text, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });

        // Notify parents via push for assignment deletion
        try {
          const { notifyUsers } = require('../lib/pushNotifications');
          const parentUserIds = [];
          for (const p of (child.parents || [])) {
            const parentRec = p && p.parent ? p.parent : null;
            if (!parentRec) continue;
            let u = null;
            if (parentRec.id) {
              u = await prisma.user.findFirst({ where: { parentId: parentRec.id }, select: { id: true } }).catch(() => null);
            }
            if (!u && parentRec.email) {
              u = await prisma.user.findFirst({ where: { email: { equals: parentRec.email, mode: 'insensitive' } }, select: { id: true } }).catch(() => null);
            }
            if (u && u.id) parentUserIds.push(u.id);
          }
          const dedupParentIds = Array.from(new Set(parentUserIds));
          if (dedupParentIds.length) {
            const pushPayload = { title: subject, body: text, data: { url: `/planning`, assignmentId: fullExisting.id } };
            await notifyUsers(dedupParentIds, pushPayload);
          }
        } catch (e) {
          logger.error('Failed to send parent push notification for assignment delete', e && e.message ? e.message : e);
        }

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
            const adminText = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été supprimée par la nounou ${req.user.name}.\n\nDate: ${formattedDate}\nNounou assignée: ${nanny ? nanny.name : ''}` : `Hello,\n\nThe assignment for ${child.name} has been deleted by nanny ${req.user.name}.\n\nDate: ${formattedDate}\nAssigned nanny: ${nanny ? nanny.name : ''}`;
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
              logger.error('Failed to send admin push notification', e && e.message ? e.message : e);
            }
          }
        }

        // Notify assigned nanny when deleted by admin
        if (isAdminRole(req.user) || isSuperAdmin(req.user)) {
          try {
            const { notifyUsers } = require('../lib/pushNotifications');
            let nannyUserId = null;
            if (nanny && nanny.id) {
              const nannyUserRec = await prisma.user.findFirst({ where: { nannyId: nanny.id }, select: { id: true } });
              if (nannyUserRec && nannyUserRec.id) nannyUserId = nannyUserRec.id;
            }
            if (!nannyUserId && nanny && nanny.id && typeof nanny.id === 'string') {
              const maybeUser = await prisma.user.findUnique({ where: { id: nanny.id }, select: { id: true } }).catch(() => null);
              if (maybeUser && maybeUser.id) nannyUserId = maybeUser.id;
            }
            if (nannyUserId) {
              const nannySubject = (lang === 'fr' ? `Affectation supprimée pour ${child.name}` : `Assignment removed for ${child.name}`);
              const nannyText = (lang === 'fr') ? `Bonjour,\n\nL'affectation pour ${child.name} a été supprimée de votre planning.` : `Hello,\n\nThe assignment for ${child.name} has been removed.`;
              // Send email to the nanny user if available
              try {
                if (process.env.SMTP_HOST) {
                  const nannyUser = await prisma.user.findUnique({ where: { id: nannyUserId }, select: { email: true } }).catch(() => null);
                  if (nannyUser && nannyUser.email) {
                    await sendTemplatedMail({ templateName: 'assignment_deleted', lang, to: [nannyUser.email], subject: nannySubject, text: nannyText, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
                  }
                }
              } catch (e) {
                logger.error('Failed to send assignment deletion email to nanny', e && e.message ? e.message : e);
              }
              await notifyUsers([nannyUserId], { title: nannySubject, body: nannyText, data: { url: `/planning`, assignmentId: fullExisting.id } });
            }
            else {
              logger.warn('No linked user for nanny on delete; attempting fallback email', nanny && nanny.id ? nanny.id : nannyId);
              try {
                if (process.env.SMTP_HOST && nanny && (nanny.email || nanny.contactEmail)) {
                  const to = nanny.email ? [nanny.email] : [nanny.contactEmail];
                  await sendTemplatedMail({ templateName: 'assignment_deleted', lang, to, subject: nannySubject, text: nannyText, substitutions: { childName: child.name || '', nannyName: nanny ? nanny.name : '', date: formattedDate, link: process.env.FRONTEND_URL || 'http://localhost:5173', logoUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/imgs/LogoFrimousse.webp', activityName: schedules.length ? schedules[0].name : '', activityComment: schedules.length ? schedules[0].comment : '', activityStart: schedules.length ? schedules[0].startTime : '', activityEnd: schedules.length ? schedules[0].endTime : '', activitiesHtml } });
                }
              } catch (e) {
                logger.error('Fallback email to nanny failed on delete', e && e.message ? e.message : e);
              }
            }
          } catch (e) {
            logger.error('Failed to send nanny push notification after delete', e && e.message ? e.message : e);
          }
        }
      } catch (err) {
  logger.error('Failed to send assignment deletion notification', err && err.message ? err.message : err);
      }
    })();

  } catch (err) {
  logger.error('DELETE /assignments error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

