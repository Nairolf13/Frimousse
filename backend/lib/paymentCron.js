const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Tarif par jour (modifiable)
const RATE_PER_DAY = 2;

async function calculatePaymentsForMonth(year, monthIndex) {
  // monthIndex is 0-based (0 = January)
  const parents = await prisma.parent.findMany({
    include: { children: { include: { child: true } } }
  });

  for (const parent of parents) {
    let total = 0;
    const details = [];

    for (const pc of parent.children) {
      const child = pc.child;

      // Compter les jours de présence dans Assignment
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

    // Sauvegarder dans PaymentHistory (idempotent)
    try {
      const existing = await prisma.paymentHistory.findFirst({ where: { parentId: parent.id, year, month: monthIndex + 1 } });
      if (existing) {
        await prisma.paymentHistory.update({ where: { id: existing.id }, data: { total, details } });
      } else {
        await prisma.paymentHistory.create({
          data: {
            parentId: parent.id,
            month: monthIndex + 1, // because JS months are 0-based
            year,
            total,
            details
          }
        });
      }
    } catch (err) {
      console.error('Failed to upsert paymentHistory for parent', parent.id, err);
    }
  }
}

async function upsertPaymentsForParentForMonth(parentId, year, monthIndex) {
  // Calculate payment only for a single parent
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
  // Calculate for previous month to ensure full data
  const targetMonth = monthIndex - 1;
  const targetYear = targetMonth === -1 ? year - 1 : year;
  const targetMonthIndex = targetMonth === -1 ? 11 : targetMonth;

  await calculatePaymentsForMonth(targetYear, targetMonthIndex);
}

// Exécution chaque 1er du mois à 00:05
const task = cron.schedule('5 0 1 * *', () => {
  console.log('Calcul des paiements mensuels...');
  calculatePayments().catch(console.error);
}, { scheduled: true });

module.exports = { calculatePayments, calculatePaymentsForMonth, upsertPaymentsForParentForMonth, task };
