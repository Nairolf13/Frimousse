const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/authMiddleware');

// GET /api/admin/emaillogs?limit=50&page=1
router.get('/emaillogs', requireAuth, async (req, res) => {
  try {
    // only admins
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

  // build where clause from optional filters
  const where = {};
    // month filter: expect YYYY-MM
    if (req.query.month && typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)) {
      const [yStr, mStr] = req.query.month.split('-');
      const y = Number(yStr);
      const m = Number(mStr);
      if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 1 && m <= 12) {
        const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const next = new Date(Date.UTC(y, m, 1, 0, 0, 0));
        where.createdAt = { gte: start, lt: next };
      }
    }
    // q filter: search subject (case-insensitive).
    // NOTE: recipients is stored as JSON; using "contains" on a Json field with Prisma
    // can error depending on the connector. For now we only search `subject` server-side
    // to avoid a runtime 500. If you need recipients search, we can implement it via
    // a dedicated text column (recipients_text) or a raw SQL query using $queryRaw.
    if (req.query.q && typeof req.query.q === 'string' && req.query.q.trim() !== '') {
      const q = req.query.q.trim();
      // search subject and denormalized recipientsText
      where.OR = [ { subject: { contains: q, mode: 'insensitive' } }, { recipientsText: { contains: q, mode: 'insensitive' } } ];
    }

    // Restrict to email logs for parents in the same center as the admin.
    // If the admin user has a centerId, only include EmailLogs linked to a PaymentHistory
    // whose parent.centerId matches the admin's centerId. If the admin has no centerId
    // (super-admin), keep full access.
    if (req.user && req.user.centerId) {
      where.paymentHistory = { is: { parent: { centerId: req.user.centerId } } };
    }

    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { paymentHistory: true },
      take: limit,
      skip,
    });

    const total = await prisma.emailLog.count({ where });

    res.json({ data: logs, meta: { total, page, limit } });
  } catch (e) {
    console.error('admin/emaillogs error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/emaillogs/:id/resend - resend the email for this emaillog (if linked to a paymentHistory)
router.post('/emaillogs/:id/resend', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const id = req.params.id;
    const log = await prisma.emailLog.findUnique({ where: { id }, include: { paymentHistory: true } });
    if (!log) return res.status(404).json({ error: 'EmailLog not found' });
    if (!log.paymentHistory) return res.status(400).json({ error: 'No paymentHistory linked to this EmailLog' });

    // Ensure admin belongs to the same center as the parent (unless admin has no centerId)
    if (req.user && req.user.centerId) {
      const ph = log.paymentHistory;
      const parent = await prisma.parent.findUnique({ where: { id: ph.parentId } });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
      if (parent.centerId !== req.user.centerId) return res.status(403).json({ error: 'Forbidden' });
    }

    // load parent to get email and name
  const ph = log.paymentHistory;
  const parent = await prisma.parent.findUnique({ where: { id: ph.parentId } });
  if (!parent || !parent.email) return res.status(400).json({ error: 'Parent email not found' });

    // generate PDF buffer for the paymentHistory
    const { generateInvoiceBuffer } = require('../lib/invoiceGenerator');
    const pdfBuffer = await generateInvoiceBuffer(prisma, ph.id).catch(err => { console.error('PDF generation failed', err); return null; });
    if (!pdfBuffer) return res.status(500).json({ error: 'Failed to generate invoice PDF' });

    // build subject and substitutions similar to cron
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
  } catch (e) {
    console.error('admin/emaillogs resend error', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
