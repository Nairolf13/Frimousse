const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const userId = '846373bf-3e27-400e-9f2d-1bd0f87a3f8d';
    const deleted = await prisma.refreshToken.deleteMany({ where: { userId } });
    console.log('deleted', deleted);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
