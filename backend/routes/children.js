

const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  if (!isSuperAdmin(req.user)) {
    const child = await prisma.child.findUnique({ where: { id } });
    if (!child || child.centerId !== req.user.centerId) return res.status(404).json({ error: 'Child not found' });
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
    let where = {};
    if (!isSuperAdmin(req.user)) {
      where.centerId = req.user.centerId;
    }
    const children = await prisma.child.findMany({ where, include: { parents: { include: { parent: true } } } });
    return res.json(children);
  } catch (error) {
    console.error('Error fetching children', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture des enfants depuis la base de données. Vérifier les migrations et le schéma.' });
  }
});

router.post('/', auth, async (req, res) => {
  const { name, age, sexe, parentId, parentName, parentContact, parentMail, allergies, group } = req.body;
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

      const childWithParents = await tx.child.findUnique({ where: { id: child.id }, include: { parents: { include: { parent: true } } } });
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
  const { name, age, sexe, parentId, parentName, parentContact, parentMail, allergies, group, cotisationPaidUntil, payCotisation } = req.body;
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
    const child = await prisma.child.findUnique({ where: { id }, include: { parents: { include: { parent: true } } } });
    if (!child) return res.status(404).json({ message: 'Not found' });
    res.json(child);
  } catch (error) {
    console.error('Error fetching child', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la lecture de l\'enfant' });
  }
});


module.exports = router;
