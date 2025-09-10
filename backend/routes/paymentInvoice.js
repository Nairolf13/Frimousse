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
function renderHeader(doc, ph, parentName, invoiceNumber, invoiceDate, dueDate) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f172a').text('Les Frimousses', { continued: false });
  doc.font('Helvetica').fontSize(12).fillColor('#2563eb').text('Crèche & Garderie');
  doc.fontSize(10).fillColor('#2563eb').text('contact@lesfrimousses.fr');
  // meta boxes top-right
  const metaX = doc.page.margins.left + pageWidth * 0.58;
  const startY = doc.y - 44;
  function metaBox(y, label, value) {
    doc.roundedRect(metaX, y, pageWidth * 0.4, 30, 6).fill('#f8fafc');
    doc.fillColor('#374151').fontSize(8).text(label, metaX + 8, y + 5);
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(10).text(value, metaX + 8, y + 15);
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
    if (!isAdmin && user.parentId !== ph.parentId) return res.status(403).json({ message: 'Forbidden' });

    const parentName = ph.parent ? `${ph.parent.firstName || ''} ${ph.parent.lastName || ''}`.trim() : '';
    const parentEmail = ph.parent?.email || '';
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

    // Header
    renderHeader(doc, ph, parentName, invoiceNumber, invoiceDate, dueDate);

    // Client & period cards (compact)
    const cardW = (pageWidth - 20) / 2;
    const cardH = 70;
    const cardY = doc.y;

    // Billing card
    doc.roundedRect(leftX, cardY, cardW, cardH, 6).fill('#f8fafc');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('FACTURÉ À :', leftX + 10, cardY + 10);
    doc.font('Helvetica').fontSize(9).fillColor('#374151').text(parentName || '—', leftX + 10, cardY + 28);
    if (parentEmail) doc.fontSize(8.5).fillColor('#2563eb').text(parentEmail, leftX + 10, cardY + 44);

    // Period card
    const rightX = leftX + cardW + 20;
    doc.roundedRect(rightX, cardY, cardW, cardH, 6).fill('#ecfdf5');
    doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(10).text(`Période: ${ph.month}/${ph.year}`, rightX + 10, cardY + 14);
    doc.font('Helvetica').fontSize(9).fillColor('#065f46').text(`Du 01/${ph.month}/${ph.year} au 31/${ph.month}/${ph.year}`, rightX + 10, cardY + 34);

    doc.moveDown(6);

    // Table header (and prepare row loop)
    const headerInfo = renderTableHeader(doc, leftX, pageWidth, cols);
    let currentY = headerInfo.headerY + 4;
    doc.y = currentY;

    // page max Y before footer area
    const footerReserve = 140; // espace réservé pour totaux + footer
    const pageMaxY = doc.page.height - bottomMargin - footerReserve;

    const items = Array.isArray(ph.details) ? ph.details : [];

    // helper to add new page and re-render table header
    function addNewPage() {
      doc.addPage();
      // reset layout constants on new page
      renderHeader(doc, ph, parentName, invoiceNumber, invoiceDate, dueDate);
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

    doc.moveDown(1.5);

    // --- Totals area (placed after rows) ---
    // Recompute subtotal
    const subtotal = items.reduce((acc, r) => acc + (Number(r.subtotal) || (Number(r.daysPresent || 0) * Number(r.ratePerDay || 0))), 0);
    const discount = Number(ph.discount) || 0;
    const taxRate = Number(ph.taxRate) || 0;
    const taxValue = subtotal * (taxRate / 100);
    const total = typeof ph.total === 'number' ? ph.total : (subtotal - discount + taxValue);

    // Ensure totals fit; if not, new page
    if (currentY + 120 > pageMaxY) addNewPage();

    const totalsX = cols.rate.x;
    const totalsValX = cols.subtotal.x;

    doc.font('Helvetica').fontSize(10).fillColor('#374151').text('Sous-total:', totalsX, currentY + 6);
    doc.font('Helvetica-Bold').text(fmt(subtotal), totalsValX, currentY + 6, { align: 'right' });

    let offset = 24;
    if (discount) {
      doc.font('Helvetica').fillColor('#10b981').text('Remise:', totalsX, currentY + 6 + offset);
      doc.text(fmt(-Math.abs(discount)), totalsValX, currentY + 6 + offset, { align: 'right' });
      offset += 18;
    }

    if (taxRate) {
      doc.fillColor('#374151').text(`TVA (${taxRate}%):`, totalsX, currentY + 6 + offset);
      doc.text(fmt(taxValue), totalsValX, currentY + 6 + offset, { align: 'right' });
      offset += 18;
    }

    // Total box
    const totalBoxW = 180;
    const totalBoxX = doc.page.width - doc.page.margins.right - totalBoxW;
    const totalBoxY = currentY + 6 + offset + 10;
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

module.exports = router;
