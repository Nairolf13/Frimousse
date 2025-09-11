const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const { upsertPaymentsForParentForMonth } = require('../lib/paymentCron');
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth(); // 0-11 current month

    const parents = await prisma.parent.findMany({ select: { id: true, firstName: true, lastName: true } });
    console.log(`Found ${parents.length} parents. Recalculating payments for ${year}-${monthIndex + 1}...`);

    for (const p of parents) {
      try {
        await upsertPaymentsForParentForMonth(p.id, year, monthIndex);
        console.log(`Updated payments for parent ${p.id} (${p.firstName || ''} ${p.lastName || ''})`);
      } catch (err) {
        console.error(`Failed for parent ${p.id}:`, err && err.message ? err.message : err);
      }
    }

    console.log('Recalculation complete.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Recalc failed:', err && err.message ? err.message : err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
