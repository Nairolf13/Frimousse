const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Get all schedules (admin)
router.get('/schedules', async (req, res) => {
  try {
    const schedules = await prisma.schedule.findMany({
      include: { nanny: true },
      orderBy: { date: 'asc' },
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get schedules for a specific nanny
router.get('/nannies/:id/schedules', async (req, res) => {
  try {
    const { id } = req.params;
    const schedules = await prisma.schedule.findMany({
      where: { nannyId: id },
      orderBy: { date: 'asc' },
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Create a schedule for a nanny
router.post('/nannies/:id/schedules', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime } = req.body;
    const schedule = await prisma.schedule.create({
      data: {
        date: new Date(date),
        startTime,
        endTime,
        nanny: { connect: { id } },
      },
    });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update a schedule
router.put('/schedules/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { date, startTime, endTime } = req.body;
    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        date: new Date(date),
        startTime,
        endTime,
      },
    });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete a schedule
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
