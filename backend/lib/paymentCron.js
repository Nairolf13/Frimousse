const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendTemplatedMail } = require('./email');
const { generateInvoiceBuffer } = require('./invoiceGenerator');
const { notifyUsers } = require('./pushNotifications');

const RATE_PER_DAY = 2;

async function calculatePaymentsForMonth(year, monthIndex) {
  const parents = await prisma.parent.findMany({
    include: { children: { include: { child: true } } }
  });

  // Compteurs pour le rapport final
  let totalInvoices = 0;
  let sentInvoices = 0;
  let failedInvoices = 0;
  const failedEmails = [];

  for (const parent of parents) {
    let total = 0;
    const details = [];

    for (const pc of parent.children) {
      const child = pc.child;

      const days = await prisma.assignment.count({
        where: {
          childId: child.id,
          date: {
            gte: new Date(year, monthIndex, 1),
            lte: new Date(year, monthIndex + 1, 0)
          }
        }
      });

      const subtotal = days * RATE_PER_DAY;
      total += subtotal;

      details.push({
        childName: child.name,
        daysPresent: days,
        ratePerDay: RATE_PER_DAY,
        subtotal
      });
    }

    try {
      const existing = await prisma.paymentHistory.findFirst({ where: { parentId: parent.id, year, month: monthIndex + 1 } });
      let phRecord = null;
      if (existing) {
        // update and return the updated record
        phRecord = await prisma.paymentHistory.update({ where: { id: existing.id }, data: { total, details } });
      } else {
        phRecord = await prisma.paymentHistory.create({
          data: {
            parentId: parent.id,
            month: monthIndex + 1, // because JS months are 0-based
            year,
            total,
            details
          }
        });
      }

      // If invoice total > 0, send an email to the parent.
      try {
        if (phRecord && Number(phRecord.total) > 0) {
          totalInvoices++;
          // Send invoice whenever total > 0 (even if unchanged). The only case we skip is when total === 0.
          const parentEmail = parent.email || (parent.user && parent.user.email) || null;
          const parentName = `${parent.firstName || ''} ${parent.lastName || ''}`.trim();
          if (!parentEmail) {
            failedInvoices++;
            failedEmails.push({ parentId: parent.id, parentName: parentName || 'Nom inconnu', reason: 'Pas d\'email' });
          } else {
            try {
              // generate invoice PDF buffer and attach
              const pdfBuffer = await generateInvoiceBuffer(prisma, phRecord.id).catch(err => {
                console.error('Failed to generate invoice PDF for', phRecord.id, err);
                return null;
              });
              const attachments = [];
              if (pdfBuffer) {
                attachments.push({ filename: `facture-${phRecord.id}.pdf`, content: pdfBuffer, contentType: 'application/pdf' });
              }
              // Build a clear, consistent invoice subject including the invoice number, recipient name and send date
              // Compute invoice number the same way the PDF generator does (falls back to now when createdAt missing)
              const invoiceDate = phRecord.createdAt ? new Date(phRecord.createdAt) : new Date();
              const invoiceNumber = `FA-${invoiceDate.getFullYear()}-${phRecord.id.slice(0, 6)}`;
              const formattedDate = invoiceDate.toLocaleDateString('fr-FR');
              const recipientLabel = parentName || parent.email || '';
              const invoiceSubject = `Facture n° ${invoiceNumber} de ${recipientLabel} du ${formattedDate}`;

              // Use existing templated mail helper which will filter opted-out users when prisma is provided
              await sendTemplatedMail({
                templateName: 'invoice',
                lang: 'fr',
                to: parentEmail,
                subject: invoiceSubject,
                substitutions: {
                  parentName,
                  total: Number(total).toFixed(2),
                  month: phRecord.month,
                  year: phRecord.year,
                  invoiceId: phRecord.id,
                  invoiceNumber
                },
                prisma,
                attachments,
                respectOptOut: false,
                paymentHistoryId: phRecord.id,
                bypassOptOut: true
              });
              sentInvoices++;
            } catch (e) {
              console.error('Failed to send invoice email to parent', parent.id, parentEmail, e);
              failedInvoices++;
              failedEmails.push({ parentId: parent.id, parentName, parentEmail, reason: e.message || 'Erreur inconnue' });
            }
          }
        }
      } catch (e) {
        console.error('Error while attempting to email invoice for parent', parent.id, e);
      }
    } catch (err) {
      console.error('Failed to upsert paymentHistory for parent', parent.id, err);
    }
  }

  // Envoyer une notification + email au super admin avec le résumé
  try {
    // Récupérer tous les super-admins
    const superAdmins = await prisma.user.findMany({ 
      where: { role: { in: ['super-admin', 'super_admin', 'superadmin'] } }, 
      select: { id: true, email: true, name: true } 
    });

    if (superAdmins.length > 0) {
      const monthName = new Date(year, monthIndex, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      
      // Notification push
      const adminIds = superAdmins.map(a => a.id).filter(Boolean);
      const notifTitle = `✅ Factures envoyées - ${monthName}`;
      const notifBody = `${sentInvoices}/${totalInvoices} factures envoyées avec succès${failedInvoices > 0 ? `, ${failedInvoices} échec(s)` : ''}`;
      
      await notifyUsers(adminIds, {
        title: notifTitle,
        body: notifBody,
        data: { 
          url: '/payment-history',
          type: 'invoices.sent',
          year,
          month: monthIndex + 1,
          totalInvoices,
          sentInvoices,
          failedInvoices
        }
      });

      // Email au super admin
      for (const admin of superAdmins) {
        if (admin.email) {
          try {
            let emailBody = `<h2>Rapport d'envoi des factures - ${monthName}</h2>`;
            emailBody += `<p><strong>Résumé :</strong></p>`;
            emailBody += `<ul>`;
            emailBody += `<li>Total de factures à envoyer : <strong>${totalInvoices}</strong></li>`;
            emailBody += `<li>Factures envoyées avec succès : <strong style="color: green;">${sentInvoices}</strong></li>`;
            emailBody += `<li>Échecs : <strong style="color: ${failedInvoices > 0 ? 'red' : 'green'};">${failedInvoices}</strong></li>`;
            emailBody += `</ul>`;
            
            if (failedEmails.length > 0) {
              emailBody += `<h3 style="color: red;">Détails des échecs :</h3>`;
              emailBody += `<table border="1" cellpadding="5" style="border-collapse: collapse;">`;
              emailBody += `<tr><th>Parent</th><th>Email</th><th>Raison</th></tr>`;
              for (const fail of failedEmails) {
                emailBody += `<tr>`;
                emailBody += `<td>${fail.parentName || 'N/A'}</td>`;
                emailBody += `<td>${fail.parentEmail || 'N/A'}</td>`;
                emailBody += `<td>${fail.reason || 'N/A'}</td>`;
                emailBody += `</tr>`;
              }
              emailBody += `</table>`;
            } else {
              emailBody += `<p style="color: green;">✅ Toutes les factures ont été envoyées avec succès !</p>`;
            }

            await sendTemplatedMail({
              templateName: 'generic',
              lang: 'fr',
              to: admin.email,
              subject: `📊 Rapport d'envoi des factures - ${monthName}`,
              substitutions: {
                title: `Rapport d'envoi des factures`,
                content: emailBody
              },
              bypassOptOut: true
            });
          } catch (emailErr) {
            console.error(`PaymentCron: Échec envoi email rapport au super admin ${admin.email}`, emailErr);
          }
        }
      }
    }
  } catch (notifErr) {
    console.error('PaymentCron: Échec envoi notification/email final au super admin', notifErr);
  }
}

async function upsertPaymentsForParentForMonth(parentId, year, monthIndex) {
  const parent = await prisma.parent.findUnique({ where: { id: parentId }, include: { children: { include: { child: true } } } });
  if (!parent) return;
  let total = 0;
  const details = [];
  for (const pc of parent.children) {
    const child = pc.child;
    const days = await prisma.assignment.count({ where: { childId: child.id, date: { gte: new Date(year, monthIndex, 1), lte: new Date(year, monthIndex + 1, 0) } } });
    const subtotal = days * RATE_PER_DAY;
    total += subtotal;
    details.push({ childName: child.name, daysPresent: days, ratePerDay: RATE_PER_DAY, subtotal });
  }
  try {
    const existing = await prisma.paymentHistory.findFirst({ where: { parentId: parent.id, year, month: monthIndex + 1 } });
    if (existing) {
      await prisma.paymentHistory.update({ where: { id: existing.id }, data: { total, details } });
    } else {
      await prisma.paymentHistory.create({ data: { parentId: parent.id, month: monthIndex + 1, year, total, details } });
    }
  } catch (err) {
    console.error('Failed to upsert paymentHistory for parent single', parent.id, err);
  }
}

async function calculatePayments() {
  // Use the cron timezone (or environment) to determine the "current" date
  // This avoids problems when the server runs in UTC but the cron is scheduled
  // for a different timezone (e.g. Europe/Paris). We derive a timezone-aware
  // date by using toLocaleString with the cron timezone and parsing it back.
  const tz = process.env.CRON_TZ || 'Europe/Paris';
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const year = now.getFullYear();
  const monthIndex = now.getMonth(); // 0-11 based on cron timezone
  const targetMonth = monthIndex - 1;
  const targetYear = targetMonth === -1 ? year - 1 : year;
  const targetMonthIndex = targetMonth === -1 ? 11 : targetMonth;

  await calculatePaymentsForMonth(targetYear, targetMonthIndex);
}

// Exécution chaque 1er du mois à 00:05 (server local time or CRON_TZ if provided)
const cronExpression = '5 0 1 * *';
const cronTimezone = process.env.CRON_TZ || 'Europe/Paris';
const cronEnabled = process.env.ENABLE_PAYMENT_CRON !== 'false';

let task = null;
if (cronEnabled) {
  task = cron.schedule(cronExpression, async () => {
    const start = new Date().toISOString();
    console.log(`[${start}] Payment cron started: Calcul des paiements mensuels... (tz=${cronTimezone})`);
    try {
      await calculatePayments();
      const finish = new Date().toISOString();
      console.log(`[${finish}] Payment cron finished successfully`);
    } catch (err) {
      const when = new Date().toISOString();
      console.error(`[${when}] Payment cron failed`, err);
    }
  }, { scheduled: true, timezone: cronTimezone });
  console.log(`Payment cron scheduled (${cronExpression}) with timezone ${cronTimezone}`);
} else {
  console.log('Payment cron disabled via ENABLE_PAYMENT_CRON=false');
}

module.exports = { calculatePayments, calculatePaymentsForMonth, upsertPaymentsForParentForMonth, task };
