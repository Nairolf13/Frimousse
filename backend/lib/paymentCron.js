const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendTemplatedMail } = require('./email');
const { generateInvoiceBuffer } = require('./invoiceGenerator');

const RATE_PER_DAY = 2;

async function calculatePaymentsForMonth(year, monthIndex) {
  const parents = await prisma.parent.findMany({
    include: { children: { include: { child: true } } }
  });

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
      // Send only when newly created or when total changed to avoid duplicate emails.
      try {
        if (phRecord && Number(phRecord.total) > 0) {
          const shouldSend = !existing || Number(existing.total) !== Number(total);
          if (shouldSend) {
            const parentEmail = parent.email || (parent.user && parent.user.email) || null;
            const parentName = `${parent.firstName || ''} ${parent.lastName || ''}`.trim();
            if (parentEmail) {
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
              } catch (e) {
                console.error('Failed to send invoice email to parent', parent.id, parentEmail, e);
              }
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
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth(); // 0-11
  const targetMonth = monthIndex - 1;
  const targetYear = targetMonth === -1 ? year - 1 : year;
  const targetMonthIndex = targetMonth === -1 ? 11 : targetMonth;

  await calculatePaymentsForMonth(targetYear, targetMonthIndex);
}

// Exécution chaque 1er du mois à 00:50 (server local time or CRON_TZ if provided)
const cronExpression = '50 0 1 * *';
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
