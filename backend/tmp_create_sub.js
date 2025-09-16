const { PrismaClient } = require('@prisma/client');
(async function(){
  const prisma = new PrismaClient();
  try{
    const user = await prisma.user.findUnique({ where: { email: 'test-admin@example.local' } });
    if (!user) { console.error('user not found'); process.exit(1); }
    const s = await prisma.subscription.create({ data: { userId: user.id, stripeSubscriptionId: null, plan: 'essentiel', status: 'trialing' } });
    console.log('created subscription', s.id, 'for user', user.id);
    process.exit(0);
  }catch(e){ console.error(e); process.exit(1); }
})();
