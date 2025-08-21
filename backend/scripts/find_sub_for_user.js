const { PrismaClient } = require('@prisma/client');
const email = process.argv[2];
(async () => {
  if (!email) return console.error('Usage: node find_sub_for_user.js <email>');
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('user:', user);
    if (!user) return;
    const subs = await prisma.subscription.findMany({ where: { userId: user.id } });
    console.log('subscriptions:', subs);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
