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
    const { id } = req.params;
    const { paid } = req.body;
    if (typeof paid !== 'boolean') return res.status(400).json({ message: 'Invalid paid value' });

    const user = req.user || {};
    const role = (user.role || '').toLowerCase();
    const isAdmin = user && (user.role === 'admin' || role.includes('super'));

    // Fetch payment and parent
    const payment = await prisma.paymentHistory.findUnique({ where: { id }, include: { parent: true } });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Admins / super-admins can toggle any
    if (isAdmin) {
      const updated = await prisma.paymentHistory.update({ where: { id }, data: { paid }, include: { parent: true } });
      return res.json({ success: true, record: updated });
    }

    // Nanny: only if the parent has at least one child assigned to this nanny
    if (user && user.nannyId) {
      const assigned = await prisma.parent.findFirst({
        where: {
          id: payment.parentId,
          children: {
            some: {
              child: {
                assignments: {
                  some: { nannyId: user.nannyId }
                }
              }
            }
          }
        },
        select: { id: true }
      });
      if (assigned) {
        const updated = await prisma.paymentHistory.update({ where: { id }, data: { paid }, include: { parent: true } });
        return res.json({ success: true, record: updated });
      }
    }

    return res.status(403).json({ message: 'Forbidden' });
  } catch (err) {
    console.error('Failed to update paid status', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

