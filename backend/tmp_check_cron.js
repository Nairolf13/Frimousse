const { PrismaClient } = require('@prisma/client');
const cronModule = require('./lib/paymentCron');

(async () => {
  const p = new PrismaClient();
  try {
    const now = new Date();
    const m = now.getMonth();
    const tgt = m - 1 === -1 ? 11 : m - 1;
    const y = m - 1 === -1 ? now.getFullYear() - 1 : now.getFullYear();
    const before = await p.paymentHistory.count({ where: { month: tgt + 1, year: y } });
    console.log('before', before);
    await cronModule.calculatePayments();
    console.log('calc done');
    const after = await p.paymentHistory.count({ where: { month: tgt + 1, year: y } });
    console.log('after', after);
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
