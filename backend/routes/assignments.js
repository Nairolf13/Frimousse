const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', auth, async (req, res) => {
  const { nannyId, start, end } = req.query;
  const where = {};
  if (nannyId) where.nannyId = nannyId;
  if (start && end) {
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
                parent: {
                  select: { id: true, firstName: true, lastName: true, email: true, phone: true }
                }
              }
            }
          }
        },
      nanny: {
        select: { id: true, name: true }
      }
    }
  });
  res.json(assignments);
});

router.post('/', auth, async (req, res) => {
  const { date, childId, nannyId } = req.body;
  const assignment = await prisma.assignment.create({
    data: { date: new Date(date), childId, nannyId }
  });
  res.status(201).json(assignment);
});

router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { date, childId, nannyId } = req.body;
  const assignment = await prisma.assignment.update({
    where: { id },
    data: { date: new Date(date), childId, nannyId }
  });
  res.json(assignment);
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  await prisma.assignment.delete({ where: { id } });
  res.json({ message: 'Assignment deleted' });
});

module.exports = router;
