const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Get all assignments (calendar view)
router.get('/', auth, async (req, res) => {
  const { nannyId, start, end } = req.query;
  const where = {};
  if (nannyId) where.nannyId = nannyId;
  if (start && end) {
    // Pour inclure toute la journée de fin, on ajoute 1 jour à end et on filtre strictement avant
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);
    where.date = {
      gte: startDate,
      lt: endDate
    };
  }
  const assignments = await prisma.assignment.findMany({
    where,
    include: { child: true, nanny: true }
  });
  console.log('Assignments API where:', where);
  console.log('Assignments API count:', assignments.length);
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
