

const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../lib/logger');
const discoveryLimit = require('../middleware/discoveryLimitMiddleware');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const sharp = require('sharp');
const path = require('path');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } }); // 6MB

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPictures';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false } });

function validatePrescriptionMime(mimetype) {
  return ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mimetype);
}

router.get('/count', async (req, res) => {
  try {
    const count = await prisma.child.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id/billing', auth, async (req, res) => {
  const { id } = req.params;
  const { month } = req.query; 
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Le paramètre month est requis au format YYYY-MM.' });
  }
  const [year, mon] = month.split('-').map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 1);
  if (req.user && req.user.role === 'parent') {
    let parentId = req.user.parentId;
      if (!parentId && req.user.email) {
      const emailTrim = String(req.user.email).trim();
      const parentRec = await prisma.parent.findFirst({ where: { email: { equals: emailTrim, mode: 'insensitive' } } });
      if (parentRec) parentId = parentRec.id;
    }
    if (!parentId) {
      if (process.env.NODE_ENV !== 'production') console.debug('[billing] parentId not resolved for user', { userId: req.user && req.user.id, userEmail: req.user && req.user.email });
      return res.status(403).json({ error: 'Access denied: parent not linked to any parent record' });
    }
    const link = await prisma.parentChild.findFirst({ where: { childId: id, parentId } });
    if (!link) {
      if (process.env.NODE_ENV !== 'production') console.debug('[billing] parent not linked to child', { parentId, childId: id });
      return res.status(403).json({ error: 'Access denied: child not linked to this parent' });
    }
  } else if (!isSuperAdmin(req.user)) {
    const child = await prisma.child.findUnique({ where: { id } });
    if (!child) {
      if (process.env.NODE_ENV !== 'production') console.debug('[billing] child not found', { childId: id });
      return res.status(404).json({ error: 'Child not found' });
    }
    if (child.centerId !== req.user.centerId) {
      if (process.env.NODE_ENV !== 'production') console.debug('[billing] center mismatch', { childId: id, childCenterId: child.centerId, userId: req.user && req.user.id, userCenterId: req.user && req.user.centerId });
      return res.status(403).json({ error: 'Access denied: child belongs to a different center' });
    }
  }
  const assignments = await prisma.assignment.findMany({
    where: {
      childId: id,
      date: {
        gte: startDate,
        lt: endDate
      }
    }
  });
  const days = assignments.length;
  const amount = days * 2;
  res.json({ childId: id, month, days, amount });
});

router.get('/', auth, async (req, res) => {
  try {
   
    let resolvedParentId = null;
    if (req.user && req.user.role === 'parent') {
      resolvedParentId = req.user.parentId || null;
      if (!resolvedParentId && req.user.email) {
        const emailTrim = String(req.user.email).trim();
        const parentRec = await prisma.parent.findFirst({ where: { email: { equals: emailTrim, mode: 'insensitive' } } });
        if (parentRec) resolvedParentId = parentRec.id;
      }
    }

    if (resolvedParentId) {
      const children = await prisma.child.findMany({ 
        where: { parents: { some: { parentId: resolvedParentId } } }, 
        select: {
          id: true,
          name: true,
          age: true,
          sexe: true,
          group: true,
          birthDate: true,
          cotisationPaidUntil: true,
          allergies: true,
          parents: { 
            include: { parent: true } 
          },
            childNannies: {
            include: { nanny: true }
          }
            ,
            prescriptionUrl: true
        }
      });
      return res.json(children);
    }

    // Base where clause for center access
    const where = {};
    if (!isSuperAdmin(req.user)) {
      if (!req.user || !req.user.centerId) {
        return res.status(403).json({ error: 'Forbidden: user not linked to any center' });
      }
      where.centerId = req.user.centerId;
    }

    // If the authenticated user is a nanny, restrict to children assigned to them via ChildNanny
    if (req.user && req.user.role === 'nanny') {
      const nanny = await prisma.nanny.findUnique({ where: { id: req.user.nannyId } });
      if (!nanny) return res.json([]);
      const children = await prisma.child.findMany({ 
        where: { ...where, childNannies: { some: { nannyId: nanny.id } } },
        select: {
          id: true,
          name: true,
          age: true,
          sexe: true,
          group: true,
          birthDate: true,
          cotisationPaidUntil: true,
          allergies: true,
          parents: { include: { parent: true } },
            childNannies: { include: { nanny: true } },
            prescriptionUrl: true
        }
      });
      return res.json(children);
    }

    const children = await prisma.child.findMany({ 
      where, 
      select: {
        id: true,
        name: true,
        age: true,
        sexe: true,
        group: true,
  birthDate: true,
  cotisationPaidUntil: true,
        allergies: true,
        parents: { 
          include: { parent: true } 
        },
    childNannies: { include: { nanny: true } },
    prescriptionUrl: true
      }
    });
    return res.json(children);
  } catch (error) {
    console.error('Error fetching children', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture des enfants depuis la base de données. Vérifier les migrations et le schéma.' });
  }
});

router.post('/', auth, discoveryLimit('child'), async (req, res) => {
  // Only admins, nannies, or super-admin can create children.
  if (req.user && req.user.role === 'parent') {
    return res.status(403).json({ error: 'Forbidden: parents cannot create children' });
  }
    const { name, age, sexe, parentId, parentName, parentContact, allergies, group, birthDate } = req.body;
    const parentMail = req.body.parentMail !== undefined ? String(req.body.parentMail || '').trim().toLowerCase() : undefined;
  const parsedAge = typeof age === 'string' ? parseInt(age, 10) : age;
  if (isNaN(parsedAge)) {
    return res.status(400).json({ error: 'Le champ "age" doit être un nombre.' });
  }
  if (sexe !== 'masculin' && sexe !== 'feminin') {
    return res.status(400).json({ error: 'Le champ "sexe" doit être "masculin" ou "feminin".' });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const childData = {
        name,
        age: parsedAge,
        sexe,
        allergies,
        birthDate: birthDate ? new Date(birthDate) : null,
      };
      if (group) {
        childData.group = group;
      }
      if (!isSuperAdmin(req.user) && req.user.centerId) {
        childData.centerId = req.user.centerId;
      } else if (req.body.centerId) {
        childData.centerId = req.body.centerId;
      }
      const child = await tx.child.create({ data: childData });

      let linkedParent = null;
      if (parentId) {
        const parent = await tx.parent.findUnique({ where: { id: parentId } });
        if (parent) {
          await tx.parentChild.create({ data: { parentId: parent.id, childId: child.id } });
          linkedParent = parent;
        }
      } else if (parentMail) {
      } else if (parentMail) {
  let parent = await tx.parent.findFirst({ where: { email: { equals: parentMail, mode: 'insensitive' } } });
        if (!parent) {
          const names = (parentName || '').trim().split(/\s+/);
          const firstName = names.shift() || 'Parent';
          const lastName = names.join(' ') || '';
          const parentData = { firstName, lastName, email: parentMail, phone: parentContact || null };
          if (!isSuperAdmin(req.user) && req.user.centerId) parentData.centerId = req.user.centerId;
          parent = await tx.parent.create({ data: parentData });
        }
        await tx.parentChild.create({ data: { parentId: parent.id, childId: child.id } });
        linkedParent = parent;
      }

      // handle nanny assignments if provided
      if (Array.isArray(req.body.nannyIds) && req.body.nannyIds.length) {
        const nannyIds = req.body.nannyIds.filter(Boolean);
        for (const nid of nannyIds) {
          // ensure nanny exists and belongs to same center (unless super-admin)
          const nannyRec = await tx.nanny.findUnique({ where: { id: nid } });
          if (!nannyRec) continue;
          if (!isSuperAdmin(req.user) && nannyRec.centerId !== child.centerId) continue;
          try { await tx.childNanny.create({ data: { childId: child.id, nannyId: nannyRec.id } }); } catch (e) { /* ignore duplicates */ }
        }
      }

      const childWithParents = await tx.child.findUnique({ where: { id: child.id }, include: { parents: { include: { parent: true } }, childNannies: { include: { nanny: true } } } });
      return childWithParents;
    });

    res.status(201).json(result);
    // background notify nannies assigned to this child (push + email fallback)
    (async () => {
      try {
        const { sendTemplatedMail } = require('../lib/email');
        const { notifyUsers } = require('../lib/pushNotifications');
        const childRec = result;
        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
        const title = (lang === 'fr') ? `Nouvel enfant assigné: ${childRec.name}` : `New child assigned: ${childRec.name}`;
        const text = (lang === 'fr') ? `Bonjour,\n\nUn nouvel enfant (${childRec.name}) vous a été confié.` : `Hello,\n\nA new child (${childRec.name}) has been assigned to you.`;
        for (const cn of (childRec.childNannies || [])) {
          const nanny = cn && cn.nanny ? cn.nanny : null;
          if (!nanny) continue;
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
            // send email to user account if configured
            try {
              if (process.env.SMTP_HOST) {
                const nannyUser = await prisma.user.findUnique({ where: { id: nannyUserId }, select: { email: true } }).catch(() => null);
                if (nannyUser && nannyUser.email) {
                  await sendTemplatedMail({ templateName: 'assignment', lang, to: [nannyUser.email], subject: title, text, substitutions: { childName: childRec.name || '', nannyName: nanny ? nanny.name : '' } });
                }
              }
            } catch (e) {
              logger.error('Failed to send new child email to nanny user', e && e.message ? e.message : e);
            }
            try {
              await notifyUsers([nannyUserId], { title, body: text, data: { childId: childRec.id } });
            } catch (e) {
              logger.error('Failed to send new child push to nanny', e && e.message ? e.message : e);
            }
          } else {
            // fallback: email to nanny record if available
            logger.warn('No linked user for nanny when creating child; attempting fallback email', nanny && nanny.id ? nanny.id : null);
            try {
              if (process.env.SMTP_HOST && (nanny.email || nanny.contactEmail)) {
                const to = nanny.email ? [nanny.email] : [nanny.contactEmail];
                await sendTemplatedMail({ templateName: 'assignment', lang, to, subject: title, text, substitutions: { childName: childRec.name || '', nannyName: nanny ? nanny.name : '' } });
              }
            } catch (e) {
              logger.error('Fallback email to nanny failed when creating child', e && e.message ? e.message : e);
            }
          }
        }
      } catch (e) {
        logger.error('Failed to notify nannies for new child', e && e.message ? e.message : e);
      }
    })();
  } catch (error) {
    console.error('Error creating child', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la création de l\'enfant' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  // Parents are not allowed to update child records
  if (req.user && req.user.role === 'parent') {
    return res.status(403).json({ error: 'Forbidden: parents cannot update children' });
  }
    const { name, age, sexe, parentId, parentName, parentContact, allergies, group, cotisationPaidUntil, payCotisation, birthDate } = req.body;
    const parentMail = req.body.parentMail !== undefined ? String(req.body.parentMail || '').trim().toLowerCase() : undefined;
  const parsedAge = typeof age === 'string' ? parseInt(age, 10) : age;
  if (isNaN(parsedAge)) {
    return res.status(400).json({ error: 'Le champ "age" doit être un nombre.' });
  }
  if (sexe !== 'masculin' && sexe !== 'feminin') {
    return res.status(400).json({ error: 'Le champ "sexe" doit être "masculin" ou "feminin".' });
  }
  let cotisationDate = cotisationPaidUntil ? new Date(cotisationPaidUntil) : undefined;
  if (payCotisation) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    cotisationDate = nextYear;
  }
  try {
    const existingChild = await prisma.child.findUnique({ where: { id } });
    if (!existingChild) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req.user) && existingChild.centerId !== req.user.centerId) return res.status(404).json({ error: 'Child not found' });

    const result = await prisma.$transaction(async (tx) => {
      const updateData = {
        name,
        age: parsedAge,
        sexe,
        allergies,
        cotisationPaidUntil: cotisationDate,
      };
      // Only include birthDate in the update if the client explicitly provided the field
      if (Object.prototype.hasOwnProperty.call(req.body, 'birthDate')) {
        updateData.birthDate = birthDate ? new Date(birthDate) : null;
      }
      if (group !== undefined) updateData.group = group;
      const child = await tx.child.update({
        where: { id },
        data: updateData
      });

  if (parentId) {
        await tx.parentChild.deleteMany({ where: { childId: id } });
        const parent = await tx.parent.findUnique({ where: { id: parentId } });
        if (parent) {
          await tx.parentChild.create({ data: { parentId: parent.id, childId: id } });
        }
      } else if (parentMail) {
      } else if (parentMail) {
  let parent = await tx.parent.findFirst({ where: { email: { equals: parentMail, mode: 'insensitive' } } });
          if (!isSuperAdmin(req.user)) {
            const existing = await prisma.child.findUnique({ where: { id } });
            if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ error: 'Child not found' });
          }
        if (!parent) {
          const names = (parentName || '').trim().split(/\s+/);
          const firstName = names.shift() || 'Parent';
          const lastName = names.join(' ') || '';
          parent = await tx.parent.create({ data: { firstName, lastName, email: parentMail, phone: parentContact || null } });
        }
        await tx.parentChild.deleteMany({ where: { childId: id } });
        await tx.parentChild.create({ data: { parentId: parent.id, childId: id } });
      }

  // handle nannyIds: replace existing childNannies only if client explicitly provided the field
  if (Object.prototype.hasOwnProperty.call(req.body, 'nannyIds') && Array.isArray(req.body.nannyIds)) {
        await tx.childNanny.deleteMany({ where: { childId: id } });
        const nannyIds = req.body.nannyIds.filter(Boolean);
        for (const nid of nannyIds) {
          const nannyRec = await tx.nanny.findUnique({ where: { id: nid } });
          if (!nannyRec) continue;
          if (!isSuperAdmin(req.user) && nannyRec.centerId !== existingChild.centerId) continue;
          try { await tx.childNanny.create({ data: { childId: id, nannyId: nannyRec.id } }); } catch (e) { /* ignore duplicates */ }
        }
      }

      const childWithParents = await tx.child.findUnique({ where: { id }, include: { parents: { include: { parent: true } } } });
      return childWithParents;
    });
    res.json(result);
  } catch (error) {
    console.error('Error updating child', error);
    if (error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Child not found' });
    }
    return res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  if (req.user && req.user.role === 'parent') {
    return res.status(403).json({ error: 'Forbidden: parents cannot delete children' });
  }
  try {
    // load child with assigned nannies so we can notify them after deletion
    const fullExisting = await prisma.child.findUnique({ where: { id }, include: { childNannies: { include: { nanny: true } } } });
    if (!fullExisting) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req.user) && fullExisting.centerId !== req.user.centerId) return res.status(404).json({ error: 'Child not found' });

    await prisma.$transaction(async (tx) => {
      await tx.parentChild.deleteMany({ where: { childId: id } });
      await tx.assignment.deleteMany({ where: { childId: id } });
      await tx.report.deleteMany({ where: { childId: id } });
      await tx.child.delete({ where: { id } });
    });
    res.json({ message: 'Child deleted' });

    // background notify previously assigned nannies (email fallback + push)
    (async () => {
      try {
        const { sendTemplatedMail } = require('../lib/email');
        const { notifyUsers } = require('../lib/pushNotifications');
        const childRec = fullExisting;
        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
  const title = (lang === 'fr') ? `Affectation supprimée : ${childRec.name}` : `Assignment removed: ${childRec.name}`;
  const text = (lang === 'fr') ? `Bonjour,\n\nL'enfant ${childRec.name} a été retiré de vos affectations et n'est plus disponible.` : `Hello,\n\nThe child ${childRec.name} has been removed from your assignments and is no longer available.`;

        for (const cn of (childRec.childNannies || [])) {
          const nanny = cn && cn.nanny ? cn.nanny : null;
          if (!nanny) continue;
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
            try {
              if (process.env.SMTP_HOST) {
                const nannyUser = await prisma.user.findUnique({ where: { id: nannyUserId }, select: { email: true } }).catch(() => null);
                if (nannyUser && nannyUser.email) {
                  await sendTemplatedMail({ templateName: 'assignment_deleted', lang, to: [nannyUser.email], subject: title, text, substitutions: { childName: childRec.name || '', nannyName: nanny ? nanny.name : '' } });
                }
              }
            } catch (e) {
              logger.error('Failed to send assignment deletion email to nanny', e && e.message ? e.message : e);
            }
            try {
              await notifyUsers([nannyUserId], { title, body: text, data: { childId: childRec.id } });
            } catch (e) {
              logger.error('Failed to send assignment deletion push to nanny', e && e.message ? e.message : e);
            }
          } else {
            logger.warn('No linked user for nanny on delete; attempting fallback email', nanny && nanny.id ? nanny.id : null);
            try {
              if (process.env.SMTP_HOST && (nanny.email || nanny.contactEmail)) {
                const to = nanny.email ? [nanny.email] : [nanny.contactEmail];
                await sendTemplatedMail({ templateName: 'assignment_deleted', lang, to, subject: title, text, substitutions: { childName: childRec.name || '', nannyName: nanny ? nanny.name : '' } });
              }
            } catch (e) {
              logger.error('Fallback email to nanny failed on delete', e && e.message ? e.message : e);
            }
          }
        }
      } catch (err) {
        logger.error('Failed to notify nannies for deleted child', err && err.message ? err.message : err);
      }
    })();
  } catch (error) {
    console.error('Error deleting child', error);
    if (error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Child not found' });
    }
    if (error && error.code === 'P2003') {
      return res.status(400).json({ error: 'Impossible de supprimer l\'enfant : des enregistrements dépendants existent.' });
    }
    return res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});

router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const child = await prisma.child.findUnique({ 
      where: { id }, 
      select: {
        id: true,
        name: true,
        age: true,
        sexe: true,
        group: true,
  birthDate: true,
  cotisationPaidUntil: true,
        allergies: true,
        parents: { 
          include: { parent: true } 
        }
      }
    });
    if (!child) return res.status(404).json({ message: 'Not found' });
    if (req.user && req.user.role === 'parent') {
      let parentId = req.user.parentId;
      if (!parentId && req.user.email) {
      const emailTrim = String(req.user.email).trim();
      const parentRec = await prisma.parent.findFirst({ where: { email: { equals: emailTrim, mode: 'insensitive' } } });
      if (parentRec) parentId = parentRec.id;
    }
      if (!parentId) return res.status(404).json({ message: 'Not found' });
      const link = await prisma.parentChild.findFirst({ where: { childId: id, parentId } });
      if (!link) return res.status(404).json({ message: 'Not found' });
    } else if (!isSuperAdmin(req.user) && child.centerId !== req.user.centerId) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json(child);
  } catch (error) {
    console.error('Error fetching child', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la lecture de l\'enfant' });
  }
});

// --- Photo consent endpoints ---
// Get current parent's consent for a child (for parents to manage their own consent)
router.get('/:id/photo-consent', auth, async (req, res) => {
  const { id } = req.params;
  try {
    if (!req.user || req.user.role !== 'parent') return res.status(403).json({ message: 'Forbidden' });
    let parentId = req.user.parentId;
    if (!parentId && req.user.email) {
      const parentRec = await prisma.parent.findFirst({ where: { email: { equals: String(req.user.email).trim(), mode: 'insensitive' } } });
      if (parentRec) parentId = parentRec.id;
    }
    if (!parentId) return res.status(403).json({ message: 'Parent identity not found' });
    const link = await prisma.parentChild.findFirst({ where: { childId: id, parentId } });
    if (!link) return res.status(404).json({ message: 'Child not linked to parent' });
    const consent = await prisma.photoConsent.findUnique({ where: { childId_parentId: { childId: id, parentId } } });
    return res.json({ consent: !!consent?.consent, grantedAt: consent?.grantedAt || null });
  } catch (e) {
    console.error('Failed to get photo consent', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Upsert current parent's consent for a child (parent-only)
router.post('/:id/photo-consent', auth, async (req, res) => {
  const { id } = req.params;
  const { consent } = req.body;
  try {
    if (!req.user || req.user.role !== 'parent') return res.status(403).json({ message: 'Forbidden' });
    let parentId = req.user.parentId;
    if (!parentId && req.user.email) {
      const parentRec = await prisma.parent.findFirst({ where: { email: { equals: String(req.user.email).trim(), mode: 'insensitive' } } });
      if (parentRec) parentId = parentRec.id;
    }
    if (!parentId) return res.status(403).json({ message: 'Parent identity not found' });
    const link = await prisma.parentChild.findFirst({ where: { childId: id, parentId } });
    if (!link) return res.status(404).json({ message: 'Child not linked to parent' });

    const now = new Date();
    const upserted = await prisma.photoConsent.upsert({
      where: { childId_parentId: { childId: id, parentId } },
      update: { consent: !!consent, grantedAt: consent ? now : null },
      create: { childId: id, parentId, consent: !!consent, grantedAt: consent ? now : null }
    });
    return res.json({ consent: !!upserted.consent, grantedAt: upserted.grantedAt });
  } catch (e) {
    console.error('Failed to upsert photo consent', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Summary endpoint used by feed composer: returns whether any parent granted consent for this child
router.get('/:id/photo-consent-summary', auth, async (req, res) => {
  const { id } = req.params;
  try {
    // Ensure caller has access to view the child (parents, nannies assigned, admins)
    const child = await prisma.child.findUnique({ where: { id } });
    if (!child) return res.status(404).json({ message: 'Child not found' });
    if (req.user && req.user.role === 'parent') {
      let parentId = req.user.parentId;
      if (!parentId && req.user.email) {
        const parentRec = await prisma.parent.findFirst({ where: { email: { equals: String(req.user.email).trim(), mode: 'insensitive' } } });
        if (parentRec) parentId = parentRec.id;
      }
      if (!parentId) return res.status(403).json({ message: 'Forbidden' });
      const link = await prisma.parentChild.findFirst({ where: { childId: id, parentId } });
      if (!link) return res.status(403).json({ message: 'Forbidden' });
    } else if (req.user && req.user.role === 'nanny') {
      // ensure nanny is assigned to this child
      const nannyId = req.user.nannyId;
      const link = await prisma.childNanny.findFirst({ where: { childId: id, nannyId } });
      if (!link) return res.status(403).json({ message: 'Forbidden' });
    } else if (!isSuperAdmin(req.user) && req.user && req.user.centerId && child.centerId !== req.user.centerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const any = await prisma.photoConsent.findFirst({ where: { childId: id, consent: true } });
    return res.json({ allowed: !!any });
  } catch (e) {
    console.error('Failed to get photo consent summary', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Upload prescription for a child (parent only)
router.post('/:id/prescription', auth, upload.single('prescription'), async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  if (!user || user.role !== 'parent') return res.status(403).json({ message: 'Forbidden' });
  try {
    // verify parent-child link
    let parentId = user.parentId;
    if (!parentId && user.email) {
      const p = await prisma.parent.findFirst({ where: { email: { equals: String(user.email).trim(), mode: 'insensitive' } } });
      if (p) parentId = p.id;
    }
    if (!parentId) return res.status(403).json({ message: 'Parent identity not found' });
    const link = await prisma.parentChild.findFirst({ where: { childId: id, parentId } });
    if (!link) return res.status(403).json({ message: 'Child not linked to parent' });
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file provided' });
    if (!validatePrescriptionMime(file.mimetype)) return res.status(400).json({ message: 'Invalid file type' });
    if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(503).json({ message: 'Storage not configured' });

    // Generate path and upload (no image processing for PDFs)
    const ext = file.mimetype === 'application/pdf' ? 'pdf' : 'webp';
    let buffer = file.buffer;
    if (ext === 'webp') {
      buffer = await sharp(file.buffer).resize({ width: 1600, withoutEnlargement: true }).toFormat('webp').toBuffer();
    }
    const baseName = `${id}_presc_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const storagePath = path.posix.join('prescriptions', `${baseName}.${ext}`);
    const { data: uploadData, error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(storagePath, buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) {
      console.error('Supabase upload error', uploadError);
      return res.status(500).json({ message: 'Upload failed' });
    }
    const publicUrl = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath)?.data?.publicUrl || null;

    // delete previous prescription if present
    const existing = await prisma.child.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Child not found' });
    if (existing.prescriptionPath) {
      try { await supabase.storage.from(SUPABASE_BUCKET).remove([existing.prescriptionPath]); } catch (e) { console.error('Failed to remove old prescription', e); }
    }

    const updated = await prisma.child.update({ where: { id }, data: { prescriptionUrl: publicUrl, prescriptionPath: storagePath } });
    return res.json({ url: publicUrl });
  } catch (e) {
    console.error('Failed to upload prescription', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get prescription signed/public URL (admin, nanny, or parent linked)
router.get('/:id/prescription', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const child = await prisma.child.findUnique({ where: { id } });
    if (!child) return res.status(404).json({ message: 'Child not found' });
    // check permissions
    if (req.user && req.user.role === 'parent') {
      let parentId = req.user.parentId;
      if (!parentId && req.user.email) {
        const p = await prisma.parent.findFirst({ where: { email: { equals: String(req.user.email).trim(), mode: 'insensitive' } } });
        if (p) parentId = p.id;
      }
      if (!parentId) return res.status(403).json({ message: 'Forbidden' });
      const link = await prisma.parentChild.findFirst({ where: { childId: id, parentId } });
      if (!link) return res.status(403).json({ message: 'Forbidden' });
    } else if (req.user && req.user.role === 'nanny') {
      const link = await prisma.childNanny.findFirst({ where: { childId: id, nannyId: req.user.nannyId } });
      if (!link) return res.status(403).json({ message: 'Forbidden' });
    } else if (!isSuperAdmin(req.user) && child.centerId !== req.user.centerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!child.prescriptionPath) return res.status(404).json({ message: 'No prescription' });
    if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(503).json({ message: 'Storage not configured' });
    const publicUrl = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(child.prescriptionPath)?.data?.publicUrl || null;
    return res.json({ url: publicUrl });
  } catch (e) {
    console.error('Failed to get prescription', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete prescription (parent only)
router.delete('/:id/prescription', auth, async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  if (!user || user.role !== 'parent') return res.status(403).json({ message: 'Forbidden' });
  try {
    let parentId = user.parentId;
    if (!parentId && user.email) {
      const p = await prisma.parent.findFirst({ where: { email: { equals: String(user.email).trim(), mode: 'insensitive' } } });
      if (p) parentId = p.id;
    }
    if (!parentId) return res.status(403).json({ message: 'Parent identity not found' });
    const link = await prisma.parentChild.findFirst({ where: { childId: id, parentId } });
    if (!link) return res.status(403).json({ message: 'Child not linked to parent' });
    const child = await prisma.child.findUnique({ where: { id } });
    if (!child || !child.prescriptionPath) return res.status(404).json({ message: 'No prescription' });
    if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(503).json({ message: 'Storage not configured' });
    try { await supabase.storage.from(SUPABASE_BUCKET).remove([child.prescriptionPath]); } catch (e) { console.error('Supabase remove failed', e); }
    await prisma.child.update({ where: { id }, data: { prescriptionPath: null, prescriptionUrl: null } });
    return res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('Failed to delete prescription', e);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
