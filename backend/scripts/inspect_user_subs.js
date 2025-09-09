const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const userId = 'd33aa98c-4b62-4146-9d8a-1b32974faa23';
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId }, select: { id: true, userId: true, subscription: true, createdAt: true } });
    console.log('subs for', userId, JSON.stringify(subs, null, 2));
  } catch (e) { console.error('ERR', e && e.message ? e.message : e); }
  await prisma.$disconnect();
})();
