const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const { generateInvoiceBuffer } = require('../lib/invoiceGenerator');
const { sendTemplatedMail } = require('../lib/email');
const prisma = new PrismaClient();

function fmt(v) {
  return `€ ${Number(v || 0).toFixed(2)}`;
}


// Render header (utilisé aussi après addPage)
function renderHeader(doc, ph, parentName, invoiceNumber, invoiceDate, dueDate, centerName, adminIssuer) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // Top-left: center name and admin address/email
  const title = centerName || 'Les Frimousses';
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f172a').text(title, { continued: false });
  // add a small gap between the center title and the following address lines
  doc.moveDown(0.5);
  // adminIssuer may contain address/email to print below the title
  if (adminIssuer) {
    const addrLines = [];
    if (adminIssuer.address) addrLines.push(adminIssuer.address);
    const cityLine = [adminIssuer.postalCode, adminIssuer.city].filter(Boolean).join(' ');
    if (cityLine) addrLines.push(cityLine);
    if (adminIssuer.country) addrLines.push(adminIssuer.country);
    // print address lines (one per line)
    if (addrLines.length > 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#374151');
      for (const line of addrLines) {
        doc.text(line);
      }
  // add a clearer gap between address block and admin email
  doc.moveDown(1);
    }
    // print admin email in a blue link-like color (separate line)
    if (adminIssuer.email) {
      doc.fontSize(10).fillColor('#2563eb').text(adminIssuer.email);
    }
  } else {
    // fallback subtitle
    doc.font('Helvetica').fontSize(12).fillColor('#2563eb').text('Crèche & Garderie');
    doc.fontSize(10).fillColor('#2563eb').text('contact@lesfrimousses.fr');
  }
  // meta boxes top-right (anchored to page top-right for consistent placement)
  // narrower meta boxes so number/date/due don't take too much horizontal space
  const boxW = Math.min(180, Math.floor(pageWidth * 0.3));
  const metaX = doc.page.width - doc.page.margins.right - boxW;
  // nudge meta boxes a bit higher (but keep within a safe distance from page top)
  const startY = Math.max(doc.page.margins.top - 6, 8);
  function metaBox(y, label, value) {
    // slightly shorter box height to save vertical space
    doc.roundedRect(metaX, y, boxW, 28, 6).fill('#f8fafc');
    doc.fillColor('#374151').fontSize(8).text(label, metaX + 8, y + 4);
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(10).text(value, metaX + 8, y + 14);
  }
  metaBox(startY, 'Facture N°', invoiceNumber);
  metaBox(startY + 38, 'Date', invoiceDate.toLocaleDateString('fr-FR'));
  metaBox(startY + 76, 'Échéance', dueDate.toLocaleDateString('fr-FR'));

  // Leave space
  doc.moveDown(4);
}

// Render table header and return header bottom Y and header height
function renderTableHeader(doc, leftX, pageWidth, cols) {
  const headerY = doc.y;
  const headerH = 22;
  // background
  doc.rect(leftX - 6, headerY - 3, pageWidth + 6, headerH).fill('#f8fafc');
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('Enfant', cols.name.x, headerY);
  doc.text('Âge/Groupe', cols.age.x, headerY);
  doc.text('Jours présents', cols.days.x, headerY, { width: cols.days.w, align: 'center' });
  doc.text('Tarif/jour', cols.rate.x, headerY, { width: cols.rate.w, align: 'right' });
  doc.text('Sous-total', cols.subtotal.x, headerY, { width: cols.subtotal.w, align: 'right' });
  doc.moveDown(1.1);
  return { headerY: headerY + headerH, headerH };
}

router.get('/invoice/:id', auth, async (req, res) => {
  // always disable caching so clients never see stale PDFs
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const ph = await prisma.paymentHistory.findUnique({
      where: { id },
      include: { parent: true }
    });
    if (!ph) return res.status(404).json({ message: 'Not found' });

    const user = req.user;
    if (!user) return res.status(403).json({ message: 'Forbidden' });
    const role = (user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role.includes('super');

    if (!isAdmin) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      if (ph.month === currentMonth && ph.year === currentYear) {
        return res.status(403).json({ message: "Le mois en cours n'est pas fini : vous ne pouvez pas télécharger cette facture." });
      }
      if (user.parentId && user.parentId === ph.parentId) {
        /* ok */
      } else if (user.nannyId) {
        const assigned = await prisma.parent.findFirst({
          where: {
            id: ph.parentId,
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
          },
          select: { id: true }
        });
        if (!assigned) return res.status(403).json({ message: 'Forbidden' });
      } else {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    // delegate PDF creation to shared helper so it matches send route
    const pdfBuffer = await generateInvoiceBuffer(prisma, ph.id);
    // ensure correct content type so clients don't misinterpret the binary
    res.setHeader('Content-Type', 'application/pdf');
    res.status(200).send(pdfBuffer);
    return;
  } catch (err) {
    console.error('Error in GET /invoice/:id', err);
    return res.status(500).json({ message: 'Server error generating invoice' });
  }
});    // robust stream error handling: ensure PDF stream errors don't crash the process
router.post('/invoice/:id/send', auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'Missing id' });

    const ph = await prisma.paymentHistory.findUnique({ where: { id }, include: { parent: true } });
    if (!ph) return res.status(404).json({ message: 'Not found' });

    const user = req.user;
    if (!user) return res.status(403).json({ message: 'Forbidden' });
    const role = (user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role.includes('super');

    // Allow admin or the parent who owns the invoice
    if (!isAdmin) {
      if (user.parentId && user.parentId === ph.parentId) {
        // ok
      } else if (user.nannyId) {
        // allow nanny only if assigned to the parent (same logic as download permission)
        const assigned = await prisma.parent.findFirst({
          where: {
            id: ph.parentId,
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
          },
          select: { id: true }
        });
        if (!assigned) return res.status(403).json({ message: 'Forbidden' });
      } else {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const parentEmail = ph.parent?.email || null;
    if (!parentEmail) return res.status(400).json({ message: 'Parent has no email' });

    // generate PDF buffer
    const pdfBuffer = await generateInvoiceBuffer(prisma, ph.id).catch(err => {
      console.error('Failed to generate invoice PDF for send:', ph.id, err);
      return null;
    });
    if (!pdfBuffer) return res.status(500).json({ message: 'Failed to generate invoice PDF' });

    const invoiceDate = ph.createdAt ? new Date(ph.createdAt) : new Date();
    const invoiceNumber = `FA-${invoiceDate.getFullYear()}-${ph.id.slice(0, 6)}`;
    const parentName = ph.parent ? `${ph.parent.firstName || ''} ${ph.parent.lastName || ''}`.trim() : '';
    const formattedDate = invoiceDate.toLocaleDateString('fr-FR');
    const invoiceSubject = `Facture n° ${invoiceNumber} de ${parentName || parentEmail} du ${formattedDate}`;

    // send templated mail (bypass opt-out for admin-triggered sends)
    await sendTemplatedMail({
      templateName: 'invoice',
      lang: 'fr',
      to: parentEmail,
      subject: invoiceSubject,
      substitutions: {
        parentName,
        total: Number(ph.total || 0).toFixed(2),
        month: ph.month,
        year: ph.year,
        invoiceId: ph.id,
        invoiceNumber
      },
      prisma,
      attachments: [{ filename: `facture-${ph.id}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
      bypassOptOut: true,
      recipientsText: `${parentName || ''} <${parentEmail}>`,
      paymentHistoryId: ph.id
    });

    return res.json({ ok: true, message: 'Email queued' });
  } catch (err) {
    console.error('Failed to send invoice email on demand', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

