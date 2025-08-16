const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }

router.get('/', auth, async (req, res) => {
  const { nannyId, start, end } = req.query;
  const where = {};
  if (nannyId) where.nannyId = nannyId;
  if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);
    where.date = {
      gte: startDate,
      lt: endDate
    };
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
  // creation: ensure child/nanny are in same center (unless super-admin)
  if (!isSuperAdmin(req.user)) {
    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child || child.centerId !== req.user.centerId) return res.status(404).json({ message: 'Child not found' });
    const nanny = await prisma.nanny.findUnique({ where: { id: nannyId } });
    if (!nanny || nanny.centerId !== req.user.centerId) return res.status(404).json({ message: 'Nanny not found' });
  }
  const assignment = await prisma.assignment.create({ data: { date: new Date(date), childId, nannyId, centerId: req.user.centerId } });
  res.status(201).json(assignment);
});

router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { date, childId, nannyId } = req.body;
  if (!isSuperAdmin(req.user)) {
    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Assignment not found' });
  }
  const assignment = await prisma.assignment.update({ where: { id }, data: { date: new Date(date), childId, nannyId } });
  res.json(assignment);
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  if (!isSuperAdmin(req.user)) {
    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Assignment not found' });
  }
  await prisma.assignment.delete({ where: { id } });
  res.json({ message: 'Assignment deleted' });
});

module.exports = router;
