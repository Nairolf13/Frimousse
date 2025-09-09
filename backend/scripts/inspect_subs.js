require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const userId = process.argv[2];
(async () => {
  try {
    if (!userId) return console.error('Usage: node inspect_subs.js <userId>');
    const rows = await prisma.pushSubscription.findMany({ where: { userId } });
    console.log('subs for', userId, JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('ERR', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
})();
