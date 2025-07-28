const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Get all children
router.get('/', auth, async (req, res) => {
  const children = await prisma.child.findMany();
  res.json(children);
});

// Add a child
router.post('/', auth, async (req, res) => {
  const { name, age, parentName, parentContact, allergies } = req.body;
  const child = await prisma.child.create({ data: { name, age, parentName, parentContact, allergies } });
  res.status(201).json(child);
});

// Edit a child
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { name, age, parentName, parentContact, allergies } = req.body;
  const child = await prisma.child.update({ where: { id }, data: { name, age, parentName, parentContact, allergies } });
  res.json(child);
});

// Delete a child
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  await prisma.child.delete({ where: { id } });
  res.json({ message: 'Child deleted' });
});

// Get child by id
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const child = await prisma.child.findUnique({ where: { id } });
  if (!child) return res.status(404).json({ message: 'Not found' });
  res.json(child);
});

module.exports = router;
