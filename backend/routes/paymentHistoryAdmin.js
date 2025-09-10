const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function isSuperAdmin(user) { return user && user.role && user.role.toLowerCase().includes('super'); }

// Trigger manual calculation (admin only)
router.post('/calculate', auth, async (req, res) => {
  try {
    if (!req.user || !(req.user.role === 'admin' || isSuperAdmin(req.user))) return res.status(403).json({ message: 'Forbidden' });
    const { year, month } = req.body || {};
    const paymentCron = require('../lib/paymentCron');
    if (year && month) {
      // month is 1-based
      const mIndex = Number(month) - 1;
      await paymentCron.calculatePaymentsForMonth(Number(year), mIndex);
      return res.json({ message: 'Calcul lancé pour ' + year + '/' + month });
    }
    await paymentCron.calculatePayments();
    res.json({ message: 'Calcul lancé (mois précédent)' });
  } catch (err) {
    console.error('Failed to trigger payment calculation', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Mark a payment as paid/unpaid (admin only)
router.patch('/:id/paid', auth, async (req, res) => {
  try {
    if (!req.user || !(req.user.role === 'admin' || (req.user.role && req.user.role.toLowerCase().includes('super')))) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { id } = req.params;
    const { paid } = req.body;
    if (typeof paid !== 'boolean') return res.status(400).json({ message: 'Invalid paid value' });
  const updated = await prisma.paymentHistory.update({ where: { id }, data: { paid }, include: { parent: true } });
  res.json({ success: true, record: updated });
  } catch (err) {
    console.error('Failed to update paid status', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

