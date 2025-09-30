const PDFDocument = require('pdfkit');

function fmt(v) {
  return `€ ${Number(v || 0).toFixed(2)}`;
}

async function generateInvoiceBuffer(prisma, paymentHistoryId) {
  return new Promise(async (resolve, reject) => {
    try {
      const ph = await prisma.paymentHistory.findUnique({ where: { id: paymentHistoryId }, include: { parent: true } });
      if (!ph) return reject(new Error('paymentHistory not found'));

      // try to find the User linked to this parent to get address fields
      let parentUser = null;
      try {
        if (ph.parentId) {
          parentUser = await prisma.user.findFirst({ where: { parentId: ph.parentId } });
        }
      } catch (e) {
        // ignore
      }

      // resolve center name and admin issuer address for header
      let centerName = null;
      let adminIssuer = null;
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
        // ignore
      }

      let issuer = null;
      try {
        if (ph.parent && ph.parent.centerId) {
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
        // ignore
      }
      if (!issuer) issuer = { name: '', address: '', postalCode: '', city: '', country: '', email: '' };

      const now = new Date();
      const invoiceDate = ph.createdAt ? new Date(ph.createdAt) : now;
      const dueDate = new Date(invoiceDate.getTime() + 15 * 24 * 3600 * 1000);
      const invoiceNumber = `FA-${invoiceDate.getFullYear()}-${ph.id.slice(0, 6)}`;

      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => reject(e));

      // Render header
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const title = centerName || 'Les Frimousses';
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f172a').text(title, { continued: false });
      doc.moveDown(0.5);
      if (adminIssuer) {
        const addrLines = [];
        if (adminIssuer.address) addrLines.push(adminIssuer.address);
        const cityLine = [adminIssuer.postalCode, adminIssuer.city].filter(Boolean).join(' ');
        if (cityLine) addrLines.push(cityLine);
        if (adminIssuer.country) addrLines.push(adminIssuer.country);
        if (addrLines.length > 0) {
          doc.font('Helvetica').fontSize(10).fillColor('#374151');
          for (const line of addrLines) doc.text(line);
          doc.moveDown(1);
        }
        if (adminIssuer.email) doc.fontSize(10).fillColor('#2563eb').text(adminIssuer.email);
      } else {
        doc.font('Helvetica').fontSize(12).fillColor('#2563eb').text('Crèche & Garderie');
        doc.fontSize(10).fillColor('#2563eb').text('contact@lesfrimousses.fr');
      }

      // meta boxes
      const boxW = Math.min(180, Math.floor(pageWidth * 0.3));
      const metaX = doc.page.width - doc.page.margins.right - boxW;
      const startY = Math.max(doc.page.margins.top - 6, 8);
      function metaBox(y, label, value) {
        doc.roundedRect(metaX, y, boxW, 28, 6).fill('#f8fafc');
        doc.fillColor('#374151').fontSize(8).text(label, metaX + 8, y + 4);
        doc.fillColor('#111').font('Helvetica-Bold').fontSize(10).text(value, metaX + 8, y + 14);
      }
      metaBox(startY, 'Facture N°', invoiceNumber);
      metaBox(startY + 38, 'Date', invoiceDate.toLocaleDateString('fr-FR'));
      metaBox(startY + 76, 'Échéance', dueDate.toLocaleDateString('fr-FR'));

      doc.moveDown(4);

      // Cards
      const leftX = doc.page.margins.left;
      const gap = 12;
      const colDaysW = 60;
      const colRateW = 80;
      const colSubtotalW = 90;
      const pageWidthInner = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colSubtotalX = leftX + pageWidthInner - colSubtotalW;
      const colRateX = colSubtotalX - gap - colRateW;
      const colDaysX = colRateX - gap - colDaysW;
      const colAgeW = 80;
      const colAgeX = colDaysX - gap - colAgeW;
      const colNameX = leftX;
      const colNameW = colAgeX - leftX - gap;
      const cols = { name: { x: colNameX, w: colNameW }, age: { x: colAgeX, w: colAgeW }, days: { x: colDaysX, w: colDaysW }, rate: { x: colRateX, w: colRateW }, subtotal: { x: colSubtotalX, w: colSubtotalW } };

      const parentName = ph.parent ? `${ph.parent.firstName || ''} ${ph.parent.lastName || ''}`.trim() : '';

      // Billing card
      const cardW = (pageWidthInner - 20) / 2;
      const cardH = 70;
      const cardY = doc.y;
      doc.roundedRect(leftX, cardY, cardW, cardH, 6).fill('#f8fafc');
      const label = 'FACTURÉ À :';
      const labelX = leftX + 10;
      const labelY = cardY + 10;
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(label, labelX, labelY);
      const billedName = parentName || '—';
      const nameX = labelX + doc.widthOfString(label) + 8;
      const nameAvailableW = cardW - (nameX - leftX) - 12;
      doc.font('Helvetica').fontSize(9).fillColor('#374151').text(billedName, nameX, labelY, { width: nameAvailableW });
      const nameH = doc.heightOfString(billedName, { width: nameAvailableW });
      const currentContactY = labelY + nameH + 6;
      const contactX = leftX + 10;
      const contactW = cardW - 20;
      const innerPadding = 8;
      const leftColW = Math.floor((contactW - innerPadding) * 0.65);
      const rightColW = contactW - innerPadding - leftColW;
      const leftColX = contactX;
      const rightColX = contactX + leftColW + innerPadding;
      let leftY = currentContactY;
      const emailToShow = ph.parent?.email || (parentUser && parentUser.email) || '';
      const phoneToShow = (ph.parent && ph.parent.phone) || (parentUser && parentUser.phone) || '';
      if (emailToShow) { doc.fontSize(8.5).fillColor('#2563eb').text(emailToShow, leftColX, leftY, { width: leftColW }); leftY += doc.heightOfString(emailToShow, { width: leftColW }) + 4; }
      if (phoneToShow) { doc.fontSize(8.5).fillColor('#374151').text(phoneToShow, leftColX, leftY, { width: leftColW }); leftY += doc.heightOfString(phoneToShow, { width: leftColW }) + 4; }

      // Right card: period
      const rightX = leftX + cardW + 20;
      doc.roundedRect(rightX, cardY, cardW, cardH, 6).fill('#ecfdf5');
      doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(10).text(`Période: ${ph.month}/${ph.year}`, rightX + 10, cardY + 14);
      doc.font('Helvetica').fontSize(9).fillColor('#065f46').text(`Du 01/${ph.month}/${ph.year} au 31/${ph.month}/${ph.year}`, rightX + 10, cardY + 34);

      doc.moveDown(10);

      // Table header
      const headerY = doc.y;
      const headerH = 22;
      doc.rect(leftX - 6, headerY - 3, pageWidthInner + 6, headerH).fill('#f8fafc');
      doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('Enfant', cols.name.x, headerY);
      doc.text('Âge/Groupe', cols.age.x, headerY);
      doc.text('Jours présents', cols.days.x, headerY, { width: cols.days.w, align: 'center' });
      doc.text('Tarif/jour', cols.rate.x, headerY, { width: cols.rate.w, align: 'right' });
      doc.text('Sous-total', cols.subtotal.x, headerY, { width: cols.subtotal.w, align: 'right' });
      doc.moveDown(1.1);
      let currentY = headerY + headerH + 4;
      doc.y = currentY;

      const items = Array.isArray(ph.details) ? ph.details : [];
      doc.font('Helvetica').fontSize(9);
      const bottomMargin = doc.page.margins.bottom;
      const footerReserve = 180;
      const pageMaxY = doc.page.height - bottomMargin - footerReserve;

      function addNewPage() {
        doc.addPage();
        // re-render header small version
        doc.moveDown(4);
        const headerY2 = doc.y;
        doc.rect(leftX - 6, headerY2 - 3, pageWidthInner + 6, headerH).fill('#f8fafc');
        doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('Enfant', cols.name.x, headerY2);
        doc.text('Âge/Groupe', cols.age.x, headerY2);
        doc.text('Jours présents', cols.days.x, headerY2, { width: cols.days.w, align: 'center' });
        doc.text('Tarif/jour', cols.rate.x, headerY2, { width: cols.rate.w, align: 'right' });
        doc.text('Sous-total', cols.subtotal.x, headerY2, { width: cols.subtotal.w, align: 'right' });
        doc.moveDown(1.1);
        currentY = headerY2 + headerH + 4;
        doc.y = currentY;
      }

      for (let i = 0; i < items.length; i++) {
        const d = items[i];
        const childName = d.childName || '—';
        const daysStr = String(Number(d.daysPresent) || 0);
        const rateVal = Number(d.ratePerDay) || 0;
        const lineVal = Number(d.subtotal) || (Number(d.daysPresent || 0) * rateVal);
        const nameH = doc.heightOfString(childName, { width: cols.name.w });
        const daysH = doc.heightOfString(daysStr, { width: cols.days.w });
        const rateH = doc.heightOfString(fmt(rateVal), { width: cols.rate.w });
        const subH = doc.heightOfString(fmt(lineVal), { width: cols.subtotal.w });
        const rowH = Math.max(nameH, daysH, rateH, subH) + 8;
        if (currentY + rowH > pageMaxY) addNewPage();
        doc.fillColor('#111').font('Helvetica-Bold').text(childName, cols.name.x, currentY, { width: cols.name.w });
        doc.fillColor('#16a34a').font('Helvetica').text(daysStr, cols.days.x, currentY, { width: cols.days.w, align: 'center' });
        doc.fillColor('#111').font('Helvetica').text(fmt(rateVal), cols.rate.x, currentY, { width: cols.rate.w, align: 'right' });
        doc.fillColor('#16a34a').font('Helvetica-Bold').text(fmt(lineVal), cols.subtotal.x, currentY, { width: cols.subtotal.w, align: 'right' });
        currentY += rowH; doc.y = currentY;
      }

      if (items.length === 0) {
        const placeholderH = doc.heightOfString('Aucun détail', { width: cols.name.w }) + 8;
        if (currentY + placeholderH > pageMaxY) addNewPage();
        doc.fillColor('#6b7280').font('Helvetica').text('Aucun détail pour cette période', cols.name.x, currentY);
        currentY += placeholderH; doc.y = currentY;
      }

      doc.moveDown(3);

      const subtotal = items.reduce((acc, r) => acc + (Number(r.subtotal) || (Number(r.daysPresent || 0) * Number(r.ratePerDay || 0))), 0);
      const discount = Number(ph.discount) || 0;
      const taxRate = Number(ph.taxRate) || 0;
      const taxValue = subtotal * (taxRate / 100);
      const total = typeof ph.total === 'number' ? ph.total : (subtotal - discount + taxValue);

      if (currentY + 120 > pageMaxY) addNewPage();

      const totalsValX = cols.subtotal.x;
      const labelOffset = 12;
      const subtotalLabel = 'Sous-total:';
      const subtotalLabelW = doc.widthOfString(subtotalLabel);
      const subtotalLabelX = Math.max(totalsValX - subtotalLabelW - 4, leftX + 10);
      doc.font('Helvetica').fontSize(10).fillColor('#374151');
      doc.text(subtotalLabel, subtotalLabelX, currentY + 6);
      doc.font('Helvetica-Bold').text(fmt(subtotal), totalsValX, currentY + 6, { align: 'right' });
      let offset = 24;
      if (discount) {
        const discountLabel = 'Remise:';
        const discountLabelW = doc.widthOfString(discountLabel);
        const discountLabelX = Math.max(totalsValX - discountLabelW - 4, leftX + 10);
        doc.font('Helvetica').fillColor('#10b981').text(discountLabel, discountLabelX, currentY + 6 + offset);
        doc.text(fmt(-Math.abs(discount)), totalsValX, currentY + 6 + offset, { align: 'right' });
        offset += 18;
      }
      if (taxRate) {
        const taxLabel = `TVA (${taxRate}%):`;
        const taxLabelW = doc.widthOfString(taxLabel);
        const taxLabelX = Math.max(totalsValX - taxLabelW - 4, leftX + 10);
        doc.fillColor('#374151').text(taxLabel, taxLabelX, currentY + 6 + offset);
        doc.text(fmt(taxValue), totalsValX, currentY + 6 + offset, { align: 'right' });
        offset += 18;
      }

      const extraGapBeforeTotalBox = 12;
      const totalBoxW = 180;
      const totalBoxX = doc.page.width - doc.page.margins.right - totalBoxW;
      const totalBoxY = currentY + 6 + offset + 10 + extraGapBeforeTotalBox;
      doc.roundedRect(totalBoxX, totalBoxY, totalBoxW, 46, 6).fill('#2563eb');
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10).text('TOTAL TTC', totalBoxX + 12, totalBoxY + 8);
      doc.fontSize(14).text(fmt(total), totalBoxX + 12, totalBoxY + 24);

      doc.moveTo(leftX, doc.page.height - bottomMargin - 40);
      doc.font('Helvetica').fontSize(8).fillColor('#9ca3af').text('Les Frimousses – Merci de votre confiance', leftX, doc.page.height - bottomMargin - 28, { width: pageWidthInner, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoiceBuffer };
