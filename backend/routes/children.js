

const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const discoveryLimit = require('../middleware/discoveryLimitMiddleware');

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
      const parentRec = await prisma.parent.findFirst({ where: { email: req.user.email } });
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
          }
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
          parents: { include: { parent: true } }
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
        }
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
  const { name, age, sexe, parentId, parentName, parentContact, parentMail, allergies, group, birthDate } = req.body;
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
        let parent = await tx.parent.findUnique({ where: { email: parentMail } });
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
  const { name, age, sexe, parentId, parentName, parentContact, parentMail, allergies, group, cotisationPaidUntil, payCotisation, birthDate } = req.body;
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
        let parent = await tx.parent.findUnique({ where: { email: parentMail } });
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

      // handle nannyIds: replace existing childNannies with provided list
      if (Array.isArray(req.body.nannyIds)) {
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
    const existingChild = await prisma.child.findUnique({ where: { id } });
    if (!existingChild) return res.status(404).json({ error: 'Child not found' });
    if (!isSuperAdmin(req.user) && existingChild.centerId !== req.user.centerId) return res.status(404).json({ error: 'Child not found' });
    await prisma.$transaction(async (tx) => {
      await tx.parentChild.deleteMany({ where: { childId: id } });
      await tx.assignment.deleteMany({ where: { childId: id } });
      await tx.report.deleteMany({ where: { childId: id } });
      await tx.child.delete({ where: { id } });
    });
    return res.json({ message: 'Child deleted' });
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
        const parentRec = await prisma.parent.findFirst({ where: { email: req.user.email } });
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


module.exports = router;
