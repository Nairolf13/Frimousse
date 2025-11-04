const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
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
  // declare doc here so the catch block can stop it if an error occurs while streaming
  let doc;
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

    // allow admin
    if (isAdmin) {
      /* ok */
    } else {
      // For non-admins, disallow downloading invoices for the current month
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();
      if (ph.month === currentMonth && ph.year === currentYear) {
        return res.status(403).json({ message: "Le mois en cours n'est pas fini : vous ne pouvez pas télécharger cette facture." });
      }

      // Parent can access their invoice
      if (user.parentId && user.parentId === ph.parentId) {
        /* ok */
      }
      // Nanny can access invoice only if assigned to that parent (either via Assignment or ChildNanny)
      else if (user.nannyId) {
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
        // other authenticated users: forbid
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const parentName = ph.parent ? `${ph.parent.firstName || ''} ${ph.parent.lastName || ''}`.trim() : '';
    const parentEmail = ph.parent?.email || '';
    // try to find the User linked to this parent to get address fields
    let parentUser = null;
    try {
      if (ph.parentId) {
        parentUser = await prisma.user.findFirst({ where: { parentId: ph.parentId } });
      }
    } catch (e) {
      console.error('Failed to lookup parent user for invoice', e && e.message ? e.message : e);
    }
    // resolve center name and admin issuer address for header
    let centerName = null;
    let adminIssuer = null; // { address, postalCode, city, country, email }
    try {
      if (ph.parent && ph.parent.centerId) {
        const center = await prisma.center.findUnique({ where: { id: ph.parent.centerId } });
        if (center) centerName = center.name || null;
        const adminUser = await prisma.user.findFirst({ where: { centerId: ph.parent.centerId, role: { contains: 'admin', mode: 'insensitive' } } });
        if (adminUser) {
          adminIssuer = {
            address: adminUser.address || '',
            postalCode: adminUser.postalCode || '',
            city: adminUser.city || '',
            country: adminUser.country || '',
            email: adminUser.email || ''
          };
        }
      }
    } catch (e) {
      console.error('Failed to resolve center/admin for invoice header', e && e.message ? e.message : e);
    }
    // Try to resolve the issuing address: prefer an admin user linked to the same center as the parent
    let issuer = null; // will hold user-like object with name, address, postalCode, city, country, email
    try {
      if (ph.parent && ph.parent.centerId) {
        // find an admin user for that center
        const adminUser = await prisma.user.findFirst({ where: { centerId: ph.parent.centerId, role: { contains: 'admin', mode: 'insensitive' } } });
        if (adminUser) {
          issuer = {
            name: adminUser.name || `${adminUser.email}`,
            address: adminUser.address || '',
            postalCode: adminUser.postalCode || '',
            city: adminUser.city || '',
            country: adminUser.country || '',
            email: adminUser.email || ''
          };
        }
      }
    } catch (e) {
      // fail quietly and fallback below
      console.error('Failed to lookup center admin for invoice issuer', e && e.message ? e.message : e);
    }
    // Fallback to current authenticated user (req.user) if no center admin found
    if (!issuer && user) {
      issuer = {
        name: user.name || user.email,
        address: user.address || '',
        postalCode: user.postalCode || '',
        city: user.city || '',
        country: user.country || '',
        email: user.email || ''
      };
    }
    const now = new Date();
    const invoiceDate = ph.createdAt ? new Date(ph.createdAt) : now;
    const dueDate = new Date(invoiceDate.getTime() + 15 * 24 * 3600 * 1000);
    const invoiceNumber = `FA-${invoiceDate.getFullYear()}-${ph.id.slice(0, 6)}`;

    // PDF setup - tighter margins for single page fit
    res.setHeader('Content-Type', 'application/pdf');
    // allow inline viewing (e.g., in an iframe/modal) when ?inline=1 is passed
    const inlineView = (req.query.inline === '1' || req.query.inline === 'true');
    res.setHeader('Content-Disposition', `${inlineView ? 'inline' : 'attachment'}; filename="facture-${ph.id}.pdf"`);

    doc = new PDFDocument({ size: 'A4', margin: 36 });
    // robust stream error handling: ensure PDF stream errors don't crash the process
    doc.on('error', (e) => {
      console.error('PDF stream error', e);
      try { doc.destroy(); } catch (er) { /* ignore */ }
    });
    // If response errors (client disconnect), destroy the PDF stream
    res.on('close', () => {
      try { if (doc && !doc.destroyed) doc.destroy(); } catch (er) { /* ignore */ }
    });
    doc.pipe(res);

    const leftX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageHeight = doc.page.height;
    const bottomMargin = doc.page.margins.bottom;

    // Col layout (dynamic)
    const gap = 12;
    const colDaysW = 60;
    const colRateW = 80;
    const colSubtotalW = 90;
    const colSubtotalX = leftX + pageWidth - colSubtotalW;
    const colRateX = colSubtotalX - gap - colRateW;
    const colDaysX = colRateX - gap - colDaysW;
    // define age column size and position (was previously missing -> ReferenceError)
    const colAgeW = 80;
    const colAgeX = colDaysX - gap - colAgeW;
    const colNameX = leftX;
    const colNameW = colAgeX - leftX - gap;

    const cols = {
      name: { x: colNameX, w: colNameW },
      age: { x: colAgeX, w: colAgeW },
      days: { x: colDaysX, w: colDaysW },
      rate: { x: colRateX, w: colRateW },
      subtotal: { x: colSubtotalX, w: colSubtotalW }
    };

  // Header (pass center name and admin issuer info)
  renderHeader(doc, ph, parentName, invoiceNumber, invoiceDate, dueDate, centerName, adminIssuer);

    // Client & period cards (compact)
    const cardW = (pageWidth - 20) / 2;
    const cardH = 70;
    const cardY = doc.y;

    // Billing card: label at left, parent name to the right; contact/address lines constrained to card width
    doc.roundedRect(leftX, cardY, cardW, cardH, 6).fill('#f8fafc');
    const label = 'FACTURÉ À :';
    const labelX = leftX + 10;
    const labelY = cardY + 10;
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(label, labelX, labelY);
    const billedName = parentName || '—';
    // compute name position just to the right of the label and limit its width so it wraps inside the card
    const nameX = labelX + doc.widthOfString(label) + 8;
    const nameAvailableW = cardW - (nameX - leftX) - 12; // right padding
    doc.font('Helvetica').fontSize(9).fillColor('#374151').text(billedName, nameX, labelY, { width: nameAvailableW });
    // compute current Y below the name block to start printing address/email/phone
    const nameH = doc.heightOfString(billedName, { width: nameAvailableW });
    const currentContactY = labelY + nameH + 6;
    const contactX = leftX + 10;
    const contactW = cardW - 20; // left+right padding
    // two-column layout inside card: left for address, right for email/phone
    const innerPadding = 8;
    const leftColW = Math.floor((contactW - innerPadding) * 0.65);
    const rightColW = contactW - innerPadding - leftColW;
    const leftColX = contactX;
    const rightColX = contactX + leftColW + innerPadding;

    // Left column: email and phone (fall back to parentEmail / ph.parent.phone)
    // position at the same vertical level as the contact start
    let leftY = currentContactY;
    const emailToShow = parentEmail || (parentUser && parentUser.email) || '';
    const phoneToShow = (ph.parent && ph.parent.phone) || (parentUser && parentUser.phone) || '';
    if (emailToShow) {
      doc.fontSize(8.5).fillColor('#2563eb').text(emailToShow, leftColX, leftY, { width: leftColW });
      leftY += doc.heightOfString(emailToShow, { width: leftColW }) + 4;
    }
    if (phoneToShow) {
      doc.fontSize(8.5).fillColor('#374151').text(phoneToShow, leftColX, leftY, { width: leftColW });
      leftY += doc.heightOfString(phoneToShow, { width: leftColW }) + 4;
    }

    // Right column: parent address lines from linked user, or fallback to ph.parent fields
    let rightY = currentContactY;
    const addrSource = parentUser || (ph.parent ? {
      address: ph.parent.address || '',
      postalCode: ph.parent.postalCode || '',
      city: ph.parent.city || '',
      country: ph.parent.country || ''
    } : null);
    if (addrSource && (addrSource.address || addrSource.postalCode || addrSource.city || addrSource.country)) {
      if (addrSource.address) {
        doc.fontSize(8.5).fillColor('#374151').text(addrSource.address, rightColX, rightY, { width: rightColW });
        rightY += doc.heightOfString(addrSource.address, { width: rightColW }) + 4;
      }
      const parentCityLine = [addrSource.postalCode, addrSource.city].filter(Boolean).join(' ');
      if (parentCityLine) {
        doc.fontSize(8.5).fillColor('#374151').text(parentCityLine, rightColX, rightY, { width: rightColW });
        rightY += doc.heightOfString(parentCityLine, { width: rightColW }) + 4;
      }
      if (addrSource.country) {
        doc.fontSize(8.5).fillColor('#374151').text(addrSource.country, rightColX, rightY, { width: rightColW });
        rightY += doc.heightOfString(addrSource.country, { width: rightColW }) + 4;
      }
    }

    // Period card
    const rightX = leftX + cardW + 20;
    doc.roundedRect(rightX, cardY, cardW, cardH, 6).fill('#ecfdf5');
    doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(10).text(`Période: ${ph.month}/${ph.year}`, rightX + 10, cardY + 14);
    doc.font('Helvetica').fontSize(9).fillColor('#065f46').text(`Du 01/${ph.month}/${ph.year} au 31/${ph.month}/${ph.year}`, rightX + 10, cardY + 34);

  // add extra vertical breathing room between the billing/period cards and the items table
  doc.moveDown(10);

    // Table header (and prepare row loop)
    const headerInfo = renderTableHeader(doc, leftX, pageWidth, cols);
    let currentY = headerInfo.headerY + 4;
    doc.y = currentY;

    // page max Y before footer area
  const footerReserve = 180; // espace réservé pour totaux + footer (increased for breathing room)
    const pageMaxY = doc.page.height - bottomMargin - footerReserve;

    const items = Array.isArray(ph.details) ? ph.details : [];

    // helper to add new page and re-render table header
    function addNewPage() {
      doc.addPage();
      // reset layout constants on new page
      renderHeader(doc, ph, parentName, invoiceNumber, invoiceDate, dueDate, centerName, adminIssuer);
      doc.moveDown(4);
      const h = renderTableHeader(doc, leftX, pageWidth, cols);
      currentY = h.headerY + 4;
      doc.y = currentY;
    }

    // Render rows with proper alignment
    doc.font('Helvetica').fontSize(9);
    for (let i = 0; i < items.length; i++) {
      const d = items[i];
      const childName = d.childName || '—';
      const daysStr = String(Number(d.daysPresent) || 0);
      const rateVal = Number(d.ratePerDay) || 0;
      const lineVal = Number(d.subtotal) || (Number(d.daysPresent || 0) * rateVal);

      // Measure heights for each cell
      const nameH = doc.heightOfString(childName, { width: cols.name.w });
      const daysH = doc.heightOfString(daysStr, { width: cols.days.w });
      const rateH = doc.heightOfString(fmt(rateVal), { width: cols.rate.w });
      const subH = doc.heightOfString(fmt(lineVal), { width: cols.subtotal.w });
      const rowH = Math.max(nameH, daysH, rateH, subH) + 8; // padding

      // page break if needed
      if (currentY + rowH > pageMaxY) {
        addNewPage();
      }

      // draw each cell at exact coords
      // Name (left, allow wrapping)
      doc.fillColor('#111').font('Helvetica-Bold').text(childName, cols.name.x, currentY, { width: cols.name.w });

      // Days (center)
      doc.fillColor('#16a34a').font('Helvetica').text(daysStr, cols.days.x, currentY, { width: cols.days.w, align: 'center' });

      // Rate (right)
      doc.fillColor('#111').font('Helvetica').text(fmt(rateVal), cols.rate.x, currentY, { width: cols.rate.w, align: 'right' });

      // Subtotal (right, bold)
      doc.fillColor('#16a34a').font('Helvetica-Bold').text(fmt(lineVal), cols.subtotal.x, currentY, { width: cols.subtotal.w, align: 'right' });

      // advance Y
      currentY += rowH;
      doc.y = currentY;
    }

    // If no items, render a placeholder row
    if (items.length === 0) {
      const placeholderH = doc.heightOfString('Aucun détail', { width: cols.name.w }) + 8;
      if (currentY + placeholderH > pageMaxY) addNewPage();
      doc.fillColor('#6b7280').font('Helvetica').text('Aucun détail pour cette période', cols.name.x, currentY);
      currentY += placeholderH;
      doc.y = currentY;
    }

  // create more space between table rows and totals to make the invoice less compact
  doc.moveDown(3);

    // --- Totals area (placed after rows) ---
    // Recompute subtotal
    const subtotal = items.reduce((acc, r) => acc + (Number(r.subtotal) || (Number(r.daysPresent || 0) * Number(r.ratePerDay || 0))), 0);
    const discount = Number(ph.discount) || 0;
    const taxRate = Number(ph.taxRate) || 0;
    const taxValue = subtotal * (taxRate / 100);
    const total = typeof ph.total === 'number' ? ph.total : (subtotal - discount + taxValue);

    // Ensure totals fit; if not, new page
    if (currentY + 120 > pageMaxY) addNewPage();

  // Bring labels closer to the numeric totals column for a tighter look
  const totalsValX = cols.subtotal.x;
  // position labels a bit to the left of the values column (previously used cols.rate.x which left a large gap)
  const labelOffset = 12; // smaller offset keeps label close to the numbers
  const totalsX = Math.max(cols.rate.x + 20, totalsValX - 120) + labelOffset;

  // Measure label width and position it so its right edge sits a few points left of the totals value column
  doc.font('Helvetica').fontSize(10).fillColor('#374151');
  const labelGap = 4; // gap in points between label right edge and value
  const subtotalLabel = 'Sous-total:';
  const subtotalLabelW = doc.widthOfString(subtotalLabel);
  const subtotalLabelX = Math.max(totalsValX - subtotalLabelW - labelGap, leftX + 10);
  doc.text(subtotalLabel, subtotalLabelX, currentY + 6);
  doc.font('Helvetica-Bold').text(fmt(subtotal), totalsValX, currentY + 6, { align: 'right' });

    let offset = 24;
    if (discount) {
  // Discount label positioned to hug the amounts column
  const discountLabel = 'Remise:';
  const discountLabelW = doc.widthOfString(discountLabel);
  const discountLabelX = Math.max(totalsValX - discountLabelW - labelGap, leftX + 10);
  doc.font('Helvetica').fillColor('#10b981').text(discountLabel, discountLabelX, currentY + 6 + offset);
  doc.text(fmt(-Math.abs(discount)), totalsValX, currentY + 6 + offset, { align: 'right' });
      offset += 18;
    }

    if (taxRate) {
  const taxLabel = `TVA (${taxRate}%):`;
  const taxLabelW = doc.widthOfString(taxLabel);
  const taxLabelX = Math.max(totalsValX - taxLabelW - labelGap, leftX + 10);
  doc.fillColor('#374151').text(taxLabel, taxLabelX, currentY + 6 + offset);
  doc.text(fmt(taxValue), totalsValX, currentY + 6 + offset, { align: 'right' });
      offset += 18;
    }

  // Add a bit more vertical space between the last totals line and the TOTAL TTC box
  const extraGapBeforeTotalBox = 12; // increase this if you want more breathing room
  // Total box
  const totalBoxW = 180;
  const totalBoxX = doc.page.width - doc.page.margins.right - totalBoxW;
  const totalBoxY = currentY + 6 + offset + 10 + extraGapBeforeTotalBox;
    doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, 46, 6).fill('#2563eb');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10).text('TOTAL TTC', totalBoxX + 12, totalBoxY + 8);
    doc.fontSize(14).text(fmt(total), totalBoxX + 12, totalBoxY + 24);

    // Footer
    doc.moveTo(leftX, doc.page.height - bottomMargin - 40);
    doc.font('Helvetica').fontSize(8).fillColor('#9ca3af').text('Les Frimousses – Merci de votre confiance', leftX, doc.page.height - bottomMargin - 28, { width: pageWidth, align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Invoice error', err);
    if (!res.headersSent) res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Send invoice by email to the parent linked to the paymentHistory record
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

    // allow admin
    if (!isAdmin) {
      // Parent can request send only for their own invoices
      if (!(user.parentId && user.parentId === ph.parentId)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const parentEmail = ph.parent && ph.parent.email ? ph.parent.email.trim() : '';
    if (!parentEmail) return res.status(400).json({ message: 'Parent has no email configured' });

    // Generate PDF buffer using shared generator
    const { generateInvoiceBuffer } = require('../lib/invoiceGenerator');
    const buffer = await generateInvoiceBuffer(prisma, id);

    // send templated mail with invoice attached
    const { sendTemplatedMail } = require('../lib/email');
    await sendTemplatedMail({ templateName: 'invoice', lang: 'fr', to: parentEmail, prisma, attachments: [ { filename: `facture-${id}.pdf`, content: buffer } ], paymentHistoryId: id });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send invoice by email', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to send invoice' });
  }
});

module.exports = router;
