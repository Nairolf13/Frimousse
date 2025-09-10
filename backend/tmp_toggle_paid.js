const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  try {
    const now = new Date();
    const m = now.getMonth();
    const tgt = m - 1 === -1 ? 11 : m - 1;
    const y = m - 1 === -1 ? now.getFullYear() - 1 : now.getFullYear();
    const rec = await p.paymentHistory.findFirst({ where: { month: tgt + 1, year: y } });
    if (!rec) {
      console.log('No record found to toggle for', y, tgt+1);
      return;
    }
    console.log('Found id:', rec.id, 'current paid:', rec.paid);
    const updated = await p.paymentHistory.update({ where: { id: rec.id }, data: { paid: true }, include: { parent: true } });
    console.log('Updated to paid:true ->', JSON.stringify(updated, null, 2));
    // restore
    const restored = await p.paymentHistory.update({ where: { id: rec.id }, data: { paid: false }, include: { parent: true } });
    console.log('Restored to paid:false ->', JSON.stringify(restored, null, 2));
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
