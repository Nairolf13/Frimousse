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

// POST /api/payment-history/:id/send - send the invoice PDF to the parent (admin only)
router.post('/:id/send', auth, async (req, res) => {
  try {
    const user = req.user || {};
    const role = (user.role || '').toLowerCase();
    const isAdmin = user && (user.role === 'admin' || role.includes('super'));
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const force = req.query.force === '1' || req.body && req.body.force === true;

    const ph = await prisma.paymentHistory.findUnique({ where: { id }, include: { parent: true } });
    if (!ph) return res.status(404).json({ message: 'PaymentHistory not found' });
    const parent = ph.parent;
    if (!parent || !parent.email) return res.status(400).json({ message: 'Parent or parent email not found' });

    // Prevent accidental duplicate sends: if an EmailLog with status 'sent' exists for this ph in last 24h, block unless force
    try {
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const existing = await prisma.emailLog.findFirst({ where: { paymentHistoryId: id, status: 'sent', createdAt: { gte: since } } });
      if (existing && !force) {
        return res.status(400).json({ message: 'Invoice already sent recently. Use ?force=1 to override.' });
      }
    } catch (e) {
      // ignore errors in duplicate-check and proceed
      console.error('Failed to check existing EmailLog', e && e.message ? e.message : e);
    }

    // generate PDF buffer
    const { generateInvoiceBuffer } = require('../lib/invoiceGenerator');
    const pdfBuffer = await generateInvoiceBuffer(prisma, ph.id).catch(err => { console.error('PDF generation failed', err); return null; });
    if (!pdfBuffer) return res.status(500).json({ message: 'Failed to generate invoice PDF' });

    const invoiceDate = ph.createdAt ? new Date(ph.createdAt) : new Date();
    const invoiceNumber = `FA-${invoiceDate.getFullYear()}-${ph.id.slice(0, 6)}`;
    const recipientLabel = `${parent.firstName || ''} ${parent.lastName || ''}`.trim() || parent.email || '';
    const invoiceSubject = `Facture n° ${invoiceNumber} de ${recipientLabel}`;

    const { sendTemplatedMail } = require('../lib/email');
    await sendTemplatedMail({
      templateName: 'invoice',
      lang: 'fr',
      to: parent.email,
      subject: invoiceSubject,
      substitutions: { parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(), total: Number(ph.total).toFixed(2), month: ph.month, year: ph.year, invoiceId: ph.id, invoiceNumber },
      prisma,
      attachments: [{ filename: `facture-${ph.id}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
      paymentHistoryId: ph.id,
      bypassOptOut: true
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send invoice', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

