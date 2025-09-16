const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst();
    console.log('OK, user sample:', user ? 'found' : 'no users');
  } catch (err) {
    console.error('Prisma runtime error:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
