const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/authMiddleware');
// small debug wrapper: enable birthday logs only when SHOW_BIRTHDAY_LOGS=1
const debug = process.env.SHOW_BIRTHDAY_LOGS === '1' ? console.debug.bind(console) : () => {};

// GET /api/centers/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const center = await prisma.center.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    if (!center) return res.status(404).json({ message: 'Centre non trouvé' });
    // Ensure the user belongs to the same center unless super-admin
    if (!req.user || (!req.user.centerId && req.user.role !== 'super-admin')) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (req.user.role !== 'super-admin' && req.user.centerId && req.user.centerId !== id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    res.json(center);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/centers/:id/birthdays/today
router.get('/:id/birthdays/today', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
  debug(`[birthdays] incoming request - user=${req.user && req.user.id ? req.user.id : 'anon'} centerParam=${id}`);
    // Authorization: only users belonging to the center or super-admins can access
    if (!req.user || (!req.user.centerId && req.user.role !== 'super-admin')) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (req.user.role !== 'super-admin' && req.user.centerId && req.user.centerId !== id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Fetch children with a birthDate for the center, then filter by month/day in JS
    const children = await prisma.child.findMany({
      where: { centerId: id, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true, prescriptionUrl: true }
    });

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const birthdays = (children || []).filter(c => {
      if (!c.birthDate) return false;
      const d = new Date(c.birthDate);
      return d.getMonth() + 1 === todayMonth && d.getDate() === todayDay;
    }).map(c => ({ id: c.id, name: c.name, dob: c.birthDate, photoUrl: c.prescriptionUrl || null }));

  debug(`[birthdays] resolved ${birthdays.length} birthday(s) for center=${id} user=${req.user && req.user.id ? req.user.id : 'anon'}`);
  if (birthdays.length) debug('[birthdays] list:', JSON.stringify(birthdays));
    // Return a wrapper object to match the frontend hook which expects { birthdays: [] }
    return res.json({ birthdays });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
