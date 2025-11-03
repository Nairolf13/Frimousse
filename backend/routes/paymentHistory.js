const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const invoiceGenerator = require('../lib/invoiceGenerator');
const emailLib = require('../lib/email');
const auth = require('../middleware/authMiddleware');

// Récupérer l’historique par mois/année
router.get('/:year/:month', auth, async (req, res) => {
  const { year, month } = req.params;
  const yearInt = parseInt(year, 10);
  const monthInt = parseInt(month, 10);
  if (!Number.isFinite(yearInt) || !Number.isFinite(monthInt)) {
    return res.status(400).json({ message: 'Paramètres year et month invalides' });
  }
  try {
    // Determine caller identity and restrict results accordingly
    const userId = req.user && req.user.id;

    // default where clause
    const whereBase = { year: yearInt, month: monthInt };

    if (!userId) {
      // unauthenticated: deny
      return res.status(401).json({ message: 'Non authentifié' });
    }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { nannyId: true, parentId: true, role: true, centerId: true } });

  // Roles: distinguish regular admins from super-admins
  const role = (user && user.role) || '';
  const isSuperAdmin = typeof role === 'string' && role.toLowerCase().includes('super');
  const isAdmin = typeof role === 'string' && role.toLowerCase().includes('admin');

    // If the user's role explicitly indicates 'parent' but we don't have a parentId on the user record,
    // deny access rather than falling back to other checks.
    if (typeof role === 'string' && role.toLowerCase().includes('parent') && (!user || !user.parentId)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    let data;
    if (isSuperAdmin) {
      // Super-admin: full access
      data = await prisma.paymentHistory.findMany({ where: whereBase, include: { parent: true } });
    } else if (isAdmin) {
      // Regular admin: only parents belonging to the same center as the admin
      if (!user || !user.centerId) return res.status(403).json({ message: 'Accès refusé' });
      data = await prisma.paymentHistory.findMany({
        where: {
          ...whereBase,
          parent: { is: { centerId: user.centerId } }
        },
        include: { parent: true }
      });
    } else if (user && user.parentId) {
      // Parent: only their own records
      data = await prisma.paymentHistory.findMany({
        where: { ...whereBase, parentId: user.parentId },
        include: { parent: true }
      });
    } else if (user && user.nannyId) {
      // Nanny: only parents who have at least one child that has an assignment or an explicit childNanny with this nanny
      data = await prisma.paymentHistory.findMany({
        where: {
          ...whereBase,
          parent: {
            children: {
              some: {
                child: {
                  OR: [
                    { assignments: { some: { nannyId: user.nannyId } } },
                    { childNannies: { some: { nannyId: user.nannyId } } }
                  ]
                }
              }
            }
          }
        },
        include: { parent: true }
      });
    } else {
      // Other authenticated users: deny
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Compute invoiceNumber for each record so frontend can show a human-friendly invoice identifier
    const augmented = (data || []).map(rec => {
      try {
        const invoiceDate = rec && rec.createdAt ? new Date(rec.createdAt) : new Date();
        const invoiceNumber = `FA-${invoiceDate.getFullYear()}-${String(rec.id).slice(0, 6)}`;
        return { ...rec, invoiceNumber };
      } catch (e) {
        return { ...rec };
      }
    });

    res.json(augmented);
  } catch (err) {
    console.error('Failed to fetch payment history for', { year: yearInt, month: monthInt }, err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

// Send invoice PDF by email to the parent linked to the paymentHistory record
router.post('/:id/send', auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const ph = await prisma.paymentHistory.findUnique({ where: { id }, include: { parent: true } });
    if (!ph) return res.status(404).json({ message: 'Payment not found' });

    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Non authentifié' });
    const role = (user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role.includes('super');

    // Authorization: admin can send any; parents can request send for their own invoices
    if (!isAdmin) {
      if (!user.parentId || user.parentId !== ph.parentId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const parentEmail = ph.parent && ph.parent.email ? ph.parent.email.trim() : null;
    if (!parentEmail) {
      return res.status(400).json({ message: 'Parent has no email' });
    }

    // generate PDF buffer
    let pdfBuf;
    try {
      pdfBuf = await invoiceGenerator.generateInvoiceBuffer(prisma, id);
    } catch (e) {
      console.error('Failed to generate invoice PDF', e);
      return res.status(500).json({ message: 'Failed to generate invoice' });
    }

    // prepare attachment
    const filename = `facture-${id}.pdf`;
    const attachment = { filename, content: pdfBuf, contentType: 'application/pdf' };

    // send a simple email with the PDF attached and log via prisma
    try {
      const subject = `Votre facture - Les Frimousses`;
      const text = `Bonjour,\n\nVous trouverez ci-joint votre facture.\n\nCordialement,\nLes Frimousses`;
      await emailLib.sendMail({ to: parentEmail, subject, text, attachments: [attachment], prisma, paymentHistoryId: id });
      return res.json({ success: true, message: 'Email envoyé' });
    } catch (e) {
      console.error('Failed to send invoice email', e);
      return res.status(500).json({ message: 'Failed to send email', error: (e && e.message) ? e.message : String(e) });
    }
  } catch (err) {
    console.error('Error in /payment-history/:id/send', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
