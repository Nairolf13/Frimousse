

const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
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
    const children = await prisma.child.findMany({ include: { parents: { include: { parent: true } } } });
    return res.json(children);
  } catch (error) {
    console.error('Error fetching children', error);
    return res.status(500).json({ error: 'Erreur lors de la lecture des enfants depuis la base de données. Vérifier les migrations et le schéma.' });
  }
});

router.post('/', auth, async (req, res) => {
  const { name, age, sexe, parentId, parentName, parentContact, parentMail, allergies } = req.body;
  const parsedAge = typeof age === 'string' ? parseInt(age, 10) : age;
  if (isNaN(parsedAge)) {
    return res.status(400).json({ error: 'Le champ "age" doit être un nombre.' });
  }
  if (sexe !== 'masculin' && sexe !== 'feminin') {
    return res.status(400).json({ error: 'Le champ "sexe" doit être "masculin" ou "feminin".' });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      const child = await tx.child.create({
        data: {
          name,
          age: parsedAge,
          sexe,
          allergies,
        }
      });

      // Link parent via ParentChild relation. Prefer explicit parentId from the client.
      let linkedParent = null;
      if (parentId) {
        // ensure parent exists
        const parent = await tx.parent.findUnique({ where: { id: parentId } });
        if (parent) {
          await tx.parentChild.create({ data: { parentId: parent.id, childId: child.id } });
          linkedParent = parent;
        }
      } else if (parentMail) {
        // try to find parent by email, otherwise create a minimal parent and link
        let parent = await tx.parent.findUnique({ where: { email: parentMail } });
        if (!parent) {
          // try to split name into first/last
          const names = (parentName || '').trim().split(/\s+/);
          const firstName = names.shift() || 'Parent';
          const lastName = names.join(' ') || '';
          parent = await tx.parent.create({ data: { firstName, lastName, email: parentMail, phone: parentContact || null } });
        }
        await tx.parentChild.create({ data: { parentId: parent.id, childId: child.id } });
        linkedParent = parent;
      }

      // return child with optional linked parent info for client convenience
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
  const { name, age, sexe, parentId, parentName, parentContact, parentMail, allergies, cotisationPaidUntil, payCotisation } = req.body;
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
    const result = await prisma.$transaction(async (tx) => {
      const child = await tx.child.update({
        where: { id },
        data: {
          name,
          age: parsedAge,
          sexe,
          allergies,
          cotisationPaidUntil: cotisationDate,
        }
      });

      // If a parentId is provided, replace existing parent links with the new one.
      if (parentId) {
        await tx.parentChild.deleteMany({ where: { childId: id } });
        const parent = await tx.parent.findUnique({ where: { id: parentId } });
        if (parent) {
          await tx.parentChild.create({ data: { parentId: parent.id, childId: id } });
        }
      } else if (parentMail) {
        // fallback: find or create parent by email and ensure link
        let parent = await tx.parent.findUnique({ where: { email: parentMail } });
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
    // delete dependent records that reference child to avoid FK constraint errors
    await prisma.$transaction(async (tx) => {
      await tx.parentChild.deleteMany({ where: { childId: id } });
      await tx.assignment.deleteMany({ where: { childId: id } });
      await tx.report.deleteMany({ where: { childId: id } });
      await tx.child.delete({ where: { id } });
    });
    return res.json({ message: 'Child deleted' });
  } catch (error) {
    console.error('Error deleting child', error);
    // Prisma record not found
    if (error && error.code === 'P2025') {
      return res.status(404).json({ error: 'Child not found' });
    }
    // Foreign key / constraint error
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
