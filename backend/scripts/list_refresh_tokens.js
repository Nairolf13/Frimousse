const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const tokens = await prisma.refreshToken.findMany({ select: { id: true, token: true, userId: true, expiresAt: true } });
    console.log(JSON.stringify(tokens, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
