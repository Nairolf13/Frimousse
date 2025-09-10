const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  try {
    const now = new Date();
    const m = now.getMonth();
    const tgt = m - 1 === -1 ? 11 : m - 1;
    const y = m - 1 === -1 ? now.getFullYear() - 1 : now.getFullYear();
    const rec = await p.paymentHistory.findFirst({ where: { month: tgt + 1, year: y }, include: { parent: true } });
    if (!rec) {
      console.log('Aucun enregistrement trouvé pour', y, tgt+1);
    } else {
      console.log('Found paymentHistory:', JSON.stringify(rec, null, 2));
    }
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
