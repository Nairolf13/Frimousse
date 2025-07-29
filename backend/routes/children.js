const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Route pour calculer le montant à payer pour un enfant sur un mois donné
router.get('/:id/billing', auth, async (req, res) => {
  const { id } = req.params;
  const { month } = req.query; // format attendu: '2025-07'
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Le paramètre month est requis au format YYYY-MM.' });
  }
  const [year, mon] = month.split('-').map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 1);
  // Récupère toutes les présences (assignments) de l'enfant pour le mois
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
  const children = await prisma.child.findMany();
  res.json(children);
});

router.post('/', auth, async (req, res) => {
  const { name, age, sexe, parentName, parentContact, parentMail, allergies } = req.body;
  const parsedAge = typeof age === 'string' ? parseInt(age, 10) : age;
  if (isNaN(parsedAge)) {
    return res.status(400).json({ error: 'Le champ "age" doit être un nombre.' });
  }
  if (sexe !== 'masculin' && sexe !== 'feminin') {
    return res.status(400).json({ error: 'Le champ "sexe" doit être "masculin" ou "feminin".' });
  }
  const child = await prisma.child.create({
    data: {
      name,
      age: parsedAge,
      sexe,
      parentName,
      parentContact,
      parentMail,
      allergies,
    }
  });
  res.status(201).json(child);
});

router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { name, age, sexe, parentName, parentContact, parentMail, allergies, cotisationPaidUntil, payCotisation } = req.body;
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
  const child = await prisma.child.update({
    where: { id },
    data: {
      name,
      age: parsedAge,
      sexe,
      parentName,
      parentContact,
      parentMail,
      allergies,
      cotisationPaidUntil: cotisationDate,
    }
  });
  res.json(child);
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  await prisma.child.delete({ where: { id } });
  res.json({ message: 'Child deleted' });
});

router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const child = await prisma.child.findUnique({ where: { id } });
  if (!child) return res.status(404).json({ message: 'Not found' });
  res.json(child);
});


module.exports = router;
