const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/authMiddleware');
const wsServer = require('../lib/wsServer');

function isSuperAdmin(user) { return user && user.role === 'super-admin'; }
function isAdmin(user) { return user && (user.role === 'admin' || isSuperAdmin(user)); }
function isNanny(user) { return user && user.nannyId; }
function isParent(user) { return user && (user.parentId || user.role === 'parent'); }

// Jours fériés français fixes (MM-DD)
const FRENCH_HOLIDAYS = [
  '01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'
];
function isHoliday(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return FRENCH_HOLIDAYS.includes(`${mm}-${dd}`);
}
function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

// Génère les entrées pour un mois donné (lundi-vendredi hors fériés)
function generateEntries(year, month, defaultArrival = '08h30', defaultDeparture = '17h30') {
  const entries = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    entries.push({
      date,
      arrivalTime: (!isWeekend(date) && !isHoliday(date)) ? defaultArrival : null,
      departureTime: (!isWeekend(date) && !isHoliday(date)) ? defaultDeparture : null,
      absent: false,
      comment: null,
    });
  }
  return entries;
}

// GET /api/presence-sheets — liste les feuilles (nanny: ses feuilles, parent: feuilles de ses enfants, admin: toutes)
router.get('/', auth, async (req, res) => {
  try {
    const { month, year, childId, nannyId: qNannyId } = req.query;
    const where = {};

    if (!isAdmin(req.user)) {
      if (isNanny(req.user)) {
        where.nannyId = req.user.nannyId;
      } else if (isParent(req.user)) {
        // récupère les enfants du parent via parentId ou via le rôle parent
        let parentId = req.user.parentId;
        // fallback: chercher le Parent lié à cet utilisateur
        if (!parentId) {
          const parentRecord = await prisma.parent.findFirst({ where: { user: { id: req.user.id } }, select: { id: true } });
          parentId = parentRecord?.id || null;
        }
        if (!parentId) return res.json([]);
        const parentChildren = await prisma.parentChild.findMany({
          where: { parentId },
          select: { childId: true },
        });
        if (parentChildren.length === 0) return res.json([]);
        where.childId = { in: parentChildren.map(pc => pc.childId) };
        // parents voient seulement les feuilles envoyées ou signées
        where.status = { in: ['sent', 'signed'] };
      } else {
        return res.status(403).json({ error: 'Accès interdit' });
      }
    } else {
      if (!isSuperAdmin(req.user)) where.centerId = req.user.centerId;
    }

    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);
    if (childId) where.childId = childId;
    if (qNannyId && (isAdmin(req.user) || isSuperAdmin(req.user))) where.nannyId = qNannyId;

    const sheets = await prisma.presenceSheet.findMany({
      where,
      include: {
        child: { select: { id: true, name: true } },
        nanny: { select: { id: true, name: true } },
        entries: { orderBy: { date: 'asc' } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json(sheets);
  } catch (err) {
    console.error('GET /api/presence-sheets error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/presence-sheets — créer une feuille (nanny ou admin)
router.post('/', auth, async (req, res) => {
  try {
    if (!isNanny(req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ error: 'Seules les nounous et les admins peuvent créer une feuille' });
    }
    const { childId, month, year, defaultArrival, defaultDeparture } = req.body;
    if (!childId || !month || !year) return res.status(400).json({ error: 'childId, month et year sont requis' });

    const nannyId = isAdmin(req.user) && req.body.nannyId ? req.body.nannyId : req.user.nannyId;
    if (!nannyId) return res.status(400).json({ error: 'nannyId requis' });

    // vérifie que l'enfant appartient au même centre
    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) return res.status(404).json({ error: 'Enfant introuvable' });

    const entries = generateEntries(parseInt(year), parseInt(month), defaultArrival, defaultDeparture);

    const sheet = await prisma.presenceSheet.create({
      data: {
        childId,
        nannyId,
        centerId: child.centerId || req.user.centerId || null,
        month: parseInt(month),
        year: parseInt(year),
        status: 'draft',
        entries: { create: entries },
      },
      include: {
        child: { select: { id: true, name: true } },
        nanny: { select: { id: true, name: true } },
        entries: { orderBy: { date: 'asc' } },
      },
    });
    res.status(201).json(sheet);
  } catch (err) {
    if (err && err.code === 'P2002') return res.status(409).json({ error: 'Une feuille existe déjà pour cet enfant, cette nounou et ce mois.' });
    console.error('POST /api/presence-sheets error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/presence-sheets/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const sheet = await prisma.presenceSheet.findUnique({
      where: { id: req.params.id },
      include: {
        child: { select: { id: true, name: true, birthDate: true } },
        nanny: { select: { id: true, name: true } },
        entries: { orderBy: { date: 'asc' } },
      },
    });
    if (!sheet) return res.status(404).json({ error: 'Feuille introuvable' });

    // contrôle d'accès
    if (!isAdmin(req.user)) {
      if (isNanny(req.user) && sheet.nannyId !== req.user.nannyId) return res.status(403).json({ error: 'Accès interdit' });
      if (isParent(req.user)) {
        const pc = await prisma.parentChild.findFirst({ where: { parentId: req.user.parentId, childId: sheet.childId } });
        if (!pc) return res.status(403).json({ error: 'Accès interdit' });
        if (!['sent', 'signed'].includes(sheet.status)) return res.status(403).json({ error: 'Feuille non disponible' });
      }
    }
    res.json(sheet);
  } catch (err) {
    console.error('GET /api/presence-sheets/:id error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/presence-sheets/:id — suppression (admin uniquement)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Réservé aux admins' });
    const sheet = await prisma.presenceSheet.findUnique({ where: { id: req.params.id } });
    if (!sheet) return res.status(404).json({ error: 'Feuille introuvable' });
    if (!isSuperAdmin(req.user) && sheet.centerId !== req.user.centerId) return res.status(403).json({ error: 'Accès interdit' });
    await prisma.presenceSheet.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/presence-sheets/:id error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/presence-sheets/:id — modifier statut ou réinitialiser (admin uniquement)
router.put('/:id', auth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ error: 'Réservé aux admins' });
    const sheet = await prisma.presenceSheet.findUnique({ where: { id: req.params.id } });
    if (!sheet) return res.status(404).json({ error: 'Feuille introuvable' });
    if (!isSuperAdmin(req.user) && sheet.centerId !== req.user.centerId) return res.status(403).json({ error: 'Accès interdit' });
    const { status } = req.body;
    const allowed = ['draft', 'sent', 'signed'];
    if (status && !allowed.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    const updated = await prisma.presenceSheet.update({
      where: { id: req.params.id },
      data: { ...(status ? { status } : {}) },
      include: { child: { select: { id: true, name: true } }, nanny: { select: { id: true, name: true } }, entries: { orderBy: { date: 'asc' } } },
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/presence-sheets/:id error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/presence-sheets/:id/entries — mise à jour des entrées (nanny/admin uniquement)
router.patch('/:id/entries', auth, async (req, res) => {
  try {
    const sheet = await prisma.presenceSheet.findUnique({ where: { id: req.params.id } });
    if (!sheet) return res.status(404).json({ error: 'Feuille introuvable' });

    // seule la nounou concernée ou un admin peut modifier
    if (!isAdmin(req.user)) {
      if (!isNanny(req.user) || sheet.nannyId !== req.user.nannyId) return res.status(403).json({ error: 'Accès interdit' });
    }
    if (sheet.status === 'signed') return res.status(400).json({ error: 'Impossible de modifier une feuille déjà signée' });

    const { entries } = req.body; // [{ id, arrivalTime, departureTime, absent, comment }]
    if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries doit être un tableau' });

    // Admins can always edit. Non-admins cannot edit entries that already have a signature.
    if (!isAdmin(req.user)) {
      const entryIds = entries.map(e => e.id);
      const existing = await prisma.presenceEntry.findMany({
        where: { id: { in: entryIds } },
        select: { id: true, nannySignature: true, parentSignature: true },
      });
      const signed = existing.filter(e => e.nannySignature || e.parentSignature);
      if (signed.length > 0) {
        return res.status(403).json({ error: 'Impossible de modifier des entrées déjà signées. Seul un administrateur peut le faire.' });
      }
    }

    await Promise.all(entries.map(e =>
      prisma.presenceEntry.update({
        where: { id: e.id },
        data: {
          arrivalTime: e.arrivalTime ?? null,
          departureTime: e.departureTime ?? null,
          absent: Boolean(e.absent),
          comment: e.comment ?? null,
        },
      })
    ));

    const updated = await prisma.presenceSheet.findUnique({
      where: { id: req.params.id },
      include: { entries: { orderBy: { date: 'asc' } }, child: { select: { id: true, name: true } }, nanny: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/presence-sheets/:id/entries error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/presence-sheets/:id/send — envoie la feuille aux parents (nanny/admin)
router.post('/:id/send', auth, async (req, res) => {
  try {
    const sheet = await prisma.presenceSheet.findUnique({
      where: { id: req.params.id },
      include: { child: { include: { parents: { include: { parent: { include: { user: true } } } } } }, nanny: { select: { id: true, name: true } } },
    });
    if (!sheet) return res.status(404).json({ error: 'Feuille introuvable' });

    if (!isAdmin(req.user)) {
      if (!isNanny(req.user) || sheet.nannyId !== req.user.nannyId) return res.status(403).json({ error: 'Accès interdit' });
    }

    await prisma.presenceSheet.update({
      where: { id: req.params.id },
      data: { status: 'sent', sentAt: new Date() },
    });

    // notifier les parents via le système de notifications existant
    const parentUsers = sheet.child.parents
      .map(pc => pc.parent?.user)
      .filter(Boolean);

    for (const parentUser of parentUsers) {
      try {
        await prisma.notification.create({
          data: {
            userId: parentUser.id,
            title: 'Feuille de présence à signer',
            body: `La feuille de présence de ${sheet.child.name} pour ${sheet.month}/${sheet.year} est prête à être signée.`,
            data: { type: 'presence_sheet', sheetId: sheet.id },
          },
        });
      } catch { /* ignore notification errors */ }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/presence-sheets/:id/send error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/presence-sheets/:id/entries/:entryId/sign — signature par entrée (jour)
// role: 'nanny' ou 'parent'
router.post('/:id/entries/:entryId/sign', auth, async (req, res) => {
  try {
    const sheet = await prisma.presenceSheet.findUnique({
      where: { id: req.params.id },
      include: {
        child: { include: { parents: { include: { parent: { include: { user: true } } } } } },
        nanny: { include: { user: true } },
      },
    });
    if (!sheet) return res.status(404).json({ error: 'Feuille introuvable' });
    if (sheet.status === 'draft') return res.status(400).json({ error: 'La feuille n\'a pas encore été envoyée' });

    const entry = await prisma.presenceEntry.findUnique({ where: { id: req.params.entryId } });
    if (!entry || entry.sheetId !== sheet.id) return res.status(404).json({ error: 'Entrée introuvable' });

    const { signature } = req.body;
    if (!signature) return res.status(400).json({ error: 'Signature requise' });

    let updateData = {};

    if (isNanny(req.user) && sheet.nannyId === req.user.nannyId) {
      updateData = { nannySignature: signature, nannySignedAt: new Date() };
    } else if (isParent(req.user)) {
      // vérifier que le parent est bien parent de cet enfant
      let parentId = req.user.parentId;
      if (!parentId) {
        const parentRecord = await prisma.parent.findFirst({ where: { user: { id: req.user.id } }, select: { id: true } });
        parentId = parentRecord?.id || null;
      }
      const ok = parentId && sheet.child.parents.some(pc => pc.parentId === parentId);
      if (!ok) return res.status(403).json({ error: 'Accès interdit' });
      updateData = { parentSignature: signature, parentSignedAt: new Date() };
    } else if (isAdmin(req.user)) {
      // admin peut signer des deux côtés selon le paramètre role
      const { role } = req.body;
      if (role === 'parent') updateData = { parentSignature: signature, parentSignedAt: new Date() };
      else updateData = { nannySignature: signature, nannySignedAt: new Date() };
    } else {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    const updatedEntry = await prisma.presenceEntry.update({
      where: { id: req.params.entryId },
      data: updateData,
    });

    // Si toutes les entrées non-weekend ont les deux signatures, passer la feuille à "signed"
    const allEntries = await prisma.presenceEntry.findMany({ where: { sheetId: sheet.id } });
    const workDays = allEntries.filter(e => {
      const d = new Date(e.date); return d.getDay() !== 0 && d.getDay() !== 6;
    });
    const allSigned = workDays.every(e =>
      (e.id === updatedEntry.id ? updatedEntry.nannySignedAt : e.nannySignedAt) &&
      (e.id === updatedEntry.id ? updatedEntry.parentSignedAt : e.parentSignedAt)
    );
    const newSheetStatus = (allSigned && sheet.status !== 'signed') ? 'signed' : null;
    if (newSheetStatus) {
      await prisma.presenceSheet.update({ where: { id: sheet.id }, data: { status: newSheetStatus } });
    }

    // Broadcast en temps réel aux clients qui regardent cette feuille
    wsServer.broadcastSignature(sheet.id, updatedEntry, newSheetStatus || undefined);

    // Envoyer une notification à l'autre partie après signature
    const entryDate = new Date(entry.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const notifData = { type: 'presence_sheet', sheetId: sheet.id };

    if (isNanny(req.user) || (isAdmin(req.user) && req.body.role !== 'parent')) {
      // Nounou a signé → notifier les parents
      const parentUsers = sheet.child.parents
        .map(pc => pc.parent?.user)
        .filter(Boolean);
      for (const parentUser of parentUsers) {
        try {
          await prisma.notification.create({
            data: {
              userId: parentUser.id,
              title: 'Feuille de présence signée',
              body: `La nounou a signé la présence du ${entryDate} pour ${sheet.child.name}.`,
              data: notifData,
            },
          });
        } catch { /* ignore */ }
      }
    } else if (isParent(req.user) || (isAdmin(req.user) && req.body.role === 'parent')) {
      // Parent a signé → notifier la nounou
      const nannyUser = sheet.nanny?.user;
      if (nannyUser) {
        try {
          await prisma.notification.create({
            data: {
              userId: nannyUser.id,
              title: 'Feuille de présence signée',
              body: `Un parent a signé la présence du ${entryDate} pour ${sheet.child.name}.`,
              data: notifData,
            },
          });
        } catch { /* ignore */ }
      }
    }

    res.json(updatedEntry);
  } catch (err) {
    console.error('POST /api/presence-sheets/:id/entries/:entryId/sign error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/presence-sheets/:id/pdf — export PDF
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const sheet = await prisma.presenceSheet.findUnique({
      where: { id: req.params.id },
      include: {
        child: { select: { id: true, name: true } },
        nanny: { select: { id: true, name: true } },
        center: { select: { name: true } },
        entries: { orderBy: { date: 'asc' } },
      },
    });
    if (!sheet) return res.status(404).json({ error: 'Feuille introuvable' });

    // contrôle accès
    if (!isAdmin(req.user)) {
      if (isNanny(req.user) && sheet.nannyId !== req.user.nannyId) return res.status(403).json({ error: 'Accès interdit' });
      if (isParent(req.user)) {
        const pc = await prisma.parentChild.findFirst({ where: { parentId: req.user.parentId, childId: sheet.childId } });
        if (!pc) return res.status(403).json({ error: 'Accès interdit' });
      }
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));

    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const centerName = sheet.center?.name || 'Frimousse';
    const monthLabel = `${monthNames[sheet.month - 1]} ${sheet.year}`;

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const tableX = doc.page.margins.left;

      // En-tête
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#0b5566').text(centerName, { align: 'left' });
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(10).fillColor('#374151').text('Fiche de relevé de présences', { align: 'left' });
      doc.fontSize(9).fillColor('#6b7280').text(`Mois : ${monthLabel}`, { align: 'left' });
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0b5566').text(`Enfant : ${sheet.child.name}`);
      doc.font('Helvetica').fontSize(9).fillColor('#374151').text(`Nounou : ${sheet.nanny.name}`);
      doc.moveDown(0.6);

      // Séparateur
      doc.moveTo(tableX, doc.y).lineTo(tableX + pageW, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.5);

      // En-tête tableau
      const colDate = 70, colDay = 45, colArr = 65, colDep = 65, colAbs = 45, colComment = pageW - colDate - colDay - colArr - colDep - colAbs;
      const rowH = 18;

      doc.rect(tableX, doc.y, pageW, rowH).fill('#f1f5f9');
      const hY = doc.y + 4;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#374151');
      doc.text('Date', tableX + 4, hY, { width: colDate });
      doc.text('Jour', tableX + colDate, hY, { width: colDay });
      doc.text('Arrivée', tableX + colDate + colDay, hY, { width: colArr });
      doc.text('Départ', tableX + colDate + colDay + colArr, hY, { width: colDep });
      doc.text('Absent', tableX + colDate + colDay + colArr + colDep, hY, { width: colAbs });
      doc.text('Commentaire', tableX + colDate + colDay + colArr + colDep + colAbs, hY, { width: colComment });
      doc.moveDown(1.2);

      // Lignes
      for (const entry of sheet.entries) {
        const d = new Date(entry.date);
        const weekend = d.getDay() === 0 || d.getDay() === 6;
        const rowY = doc.y;

        if (weekend) doc.rect(tableX, rowY, pageW, rowH).fill('#fafafa');
        else if (new Date(entry.date).getDate() % 2 === 0) doc.rect(tableX, rowY, pageW, rowH).fill('#f8fafc');

        const tY = rowY + 4;
        const color = weekend ? '#9ca3af' : '#111827';
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        doc.font('Helvetica').fontSize(8).fillColor(color);
        doc.text(dateStr, tableX + 4, tY, { width: colDate });
        doc.text(dayNames[d.getDay()], tableX + colDate, tY, { width: colDay });
        doc.fillColor(entry.absent ? '#dc2626' : color).text(entry.arrivalTime || '—', tableX + colDate + colDay, tY, { width: colArr });
        doc.fillColor(entry.absent ? '#dc2626' : color).text(entry.departureTime || '—', tableX + colDate + colDay + colArr, tY, { width: colDep });
        doc.fillColor(entry.absent ? '#dc2626' : '#6b7280').text(entry.absent ? 'Absent' : '', tableX + colDate + colDay + colArr + colDep, tY, { width: colAbs });
        doc.fillColor('#6b7280').text(entry.comment || '', tableX + colDate + colDay + colArr + colDep + colAbs, tY, { width: colComment - 4 });
        doc.moveDown(1.1);

        if (doc.y > doc.page.height - doc.page.margins.bottom - 100) doc.addPage();
      }

      // Récapitulatif
      doc.moveDown(0.5);
      doc.moveTo(tableX, doc.y).lineTo(tableX + pageW, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.5);
      const presenceDays = sheet.entries.filter(e => !e.absent && e.arrivalTime && !isWeekend(new Date(e.date))).length;
      const absentDays = sheet.entries.filter(e => e.absent).length;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0b5566').text(`Jours de présence : ${presenceDays}    Jours d'absence : ${absentDays}`);
      doc.moveDown(1.5);

      // Zone signatures
      const sigW = (pageW - 20) / 2;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
      doc.text('Signature Nounou', tableX, doc.y, { width: sigW });
      doc.text('Signature Parent', tableX + sigW + 20, doc.y - doc.currentLineHeight(), { width: sigW });
      doc.moveDown(0.3);

      const sigBoxY = doc.y;
      doc.rect(tableX, sigBoxY, sigW, 50).strokeColor('#d1d5db').lineWidth(1).stroke();
      doc.rect(tableX + sigW + 20, sigBoxY, sigW, 50).strokeColor('#d1d5db').lineWidth(1).stroke();

      if (sheet.nannySignedAt) {
        doc.font('Helvetica').fontSize(7).fillColor('#6b7280').text(`Signé le ${new Date(sheet.nannySignedAt).toLocaleDateString('fr-FR')}`, tableX + 4, sigBoxY + 38, { width: sigW - 8 });
      }
      if (sheet.parentSignedAt) {
        doc.font('Helvetica').fontSize(7).fillColor('#6b7280').text(`Signé le ${new Date(sheet.parentSignedAt).toLocaleDateString('fr-FR')}`, tableX + sigW + 24, sigBoxY + 38, { width: sigW - 8 });
      }

      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(7).fillColor('#9ca3af').text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${centerName}`, { align: 'center' });

      doc.end();
    });

    const buf = Buffer.concat(chunks);
    const filename = `presence_${sheet.child.name.replace(/\s+/g, '_')}_${sheet.month}-${sheet.year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buf);
  } catch (err) {
    console.error('GET /api/presence-sheets/:id/pdf error', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
