const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        child: true,
        nanny: true,
      },
      orderBy: { date: 'desc' }
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des rapports.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { priority, type, status, childId, nannyId, summary, details, date, time, duration, childrenInvolved } = req.body;
    let isoDate = date;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      isoDate = new Date(date + 'T' + (time || '00:00') + ':00.000Z').toISOString();
    }
    console.log('Valeur isoDate utilisée pour la création du rapport :', isoDate);
    const report = await prisma.report.create({
      data: {
        priority,
        type,
        status,
        childId,
        nannyId,
        summary,
        details,
        date: isoDate,
        time,
        duration,
        childrenInvolved,
      },
    });
    res.status(201).json(report);
  } catch (err) {
    console.error('Report creation error:', err);
    res.status(500).json({ error: 'Erreur lors de la création du rapport.', details: err.message });
  }
});

module.exports = router;
