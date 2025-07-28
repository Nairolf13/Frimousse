const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Get all assignments (calendar view)
router.get('/', auth, async (req, res) => {
  const assignments = await prisma.assignment.findMany({
    include: { child: true, nanny: true }
  });
  res.json(assignments);
});

// Add assignment
router.post('/', auth, async (req, res) => {
  const { date, childId, nannyId } = req.body;
  const assignment = await prisma.assignment.create({
    data: { date: new Date(date), childId, nannyId }
  });
  res.status(201).json(assignment);
});

// Edit assignment
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { date, childId, nannyId } = req.body;
  const assignment = await prisma.assignment.update({
    where: { id },
    data: { date: new Date(date), childId, nannyId }
  });
  res.json(assignment);
});

// Delete assignment
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  await prisma.assignment.delete({ where: { id } });
  res.json({ message: 'Assignment deleted' });
});

module.exports = router;
