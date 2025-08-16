const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');
function isSuperAdmin(user) { return user && user.role === 'super-admin'; }

router.get('/schedules', auth, async (req, res) => {
  try {
  const where = {};
  if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
  const schedules = await prisma.schedule.findMany({ include: { nannies: true }, where, orderBy: { date: 'asc' } });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/nannies/:id/schedules', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const schedules = await prisma.schedule.findMany({
  where: { nannies: { some: { id } }, ...(isSuperAdmin(req.user) ? {} : { centerId: req.user.centerId }) },
      orderBy: { date: 'asc' },
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/schedules', auth, async (req, res) => {
  try {
    const { date, startTime, endTime, name, nannyIds, comment } = req.body;
  const data = { date: new Date(date), startTime, endTime, name, comment };
  if (!isSuperAdmin(req.user) && req.user.centerId) data.centerId = req.user.centerId;
  const schedule = await prisma.schedule.create({ data: { ...data, nannies: { connect: nannyIds.map(id => ({ id })) } } });
    const fullSchedule = await prisma.schedule.findUnique({
      where: { id: schedule.id },
      include: { nannies: true },
    });
    res.json(fullSchedule);
  } catch (err) {
    console.error('Erreur POST /schedules:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.put('/schedules/:scheduleId', auth, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { date, startTime, endTime, name, nannyIds, comment } = req.body;
    if (!isSuperAdmin(req.user)) {
      const existing = await prisma.schedule.findUnique({ where: { id: scheduleId } });
      if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Schedule not found' });
    }
    const schedule = await prisma.schedule.update({ where: { id: scheduleId }, data: { date: new Date(date), startTime, endTime, name, comment, nannies: nannyIds ? { set: nannyIds.map(id => ({ id })) } : undefined } });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/schedules/:scheduleId', auth, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    if (!isSuperAdmin(req.user)) {
      const existing = await prisma.schedule.findUnique({ where: { id: scheduleId } });
      if (!existing || existing.centerId !== req.user.centerId) return res.status(404).json({ message: 'Schedule not found' });
    }
    await prisma.schedule.delete({ where: { id: scheduleId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
