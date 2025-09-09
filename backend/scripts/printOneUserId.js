const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const u = await prisma.user.findFirst();
    if (!u) { console.log('NO_USER'); process.exit(0); }
    console.log(u.id);
  } catch (e) {
    console.error('ERR', e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
