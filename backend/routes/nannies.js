const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Get all nannies
router.get('/', auth, async (req, res) => {
  const nannies = await prisma.nanny.findMany({ include: { assignedChildren: true } });
  res.json(nannies);
});

// Add a nanny
router.post('/', auth, async (req, res) => {
  const { name, availability, experience } = req.body;
  const parsedExperience = typeof experience === 'string' ? parseInt(experience, 10) : experience;
  if (isNaN(parsedExperience)) {
    return res.status(400).json({ error: 'Le champ "experience" doit être un nombre.' });
  }
  const nanny = await prisma.nanny.create({
    data: {
      name,
      availability,
      experience: parsedExperience,
    }
  });
  res.status(201).json(nanny);
});

// Edit a nanny
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { name, availability, experience } = req.body;
  const nanny = await prisma.nanny.update({ where: { id }, data: { name, availability, experience } });
  res.json(nanny);
});

// Delete a nanny
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  await prisma.nanny.delete({ where: { id } });
  res.json({ message: 'Nanny deleted' });
});

// Get nanny by id
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const nanny = await prisma.nanny.findUnique({ where: { id }, include: { assignedChildren: true } });
  if (!nanny) return res.status(404).json({ message: 'Not found' });
  res.json(nanny);
});

module.exports = router;
