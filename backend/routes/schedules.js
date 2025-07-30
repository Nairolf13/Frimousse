const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/schedules', async (req, res) => {
  try {
    const schedules = await prisma.schedule.findMany({
      include: { nannies: true },
      orderBy: { date: 'asc' },
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/nannies/:id/schedules', async (req, res) => {
  try {
    const { id } = req.params;
    const schedules = await prisma.schedule.findMany({
      where: { nannies: { some: { id } } },
      orderBy: { date: 'asc' },
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/schedules', async (req, res) => {
  try {
    const { date, startTime, endTime, name, nannyIds, comment } = req.body;
    const schedule = await prisma.schedule.create({
      data: {
        date: new Date(date),
        startTime,
        endTime,
        name,
        comment,
        nannies: { connect: nannyIds.map(id => ({ id })) },
      },
    });
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

router.put('/schedules/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { date, startTime, endTime, name, nannyIds, comment } = req.body;
    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        date: new Date(date),
        startTime,
        endTime,
        name,
        comment,
        nannies: nannyIds ? { set: nannyIds.map(id => ({ id })) } : undefined,
      },
    });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/schedules/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    await prisma.schedule.delete({ where: { id: scheduleId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
