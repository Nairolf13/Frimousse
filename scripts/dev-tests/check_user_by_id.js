const { PrismaClient } = require('@prisma/client');
(async()=>{
  const p = new PrismaClient();
  const id = process.argv[2];
  if(!id){ console.error('Usage: node check_user_by_id.js <id>'); process.exit(1); }
  const u = await p.user.findUnique({ where: { id } });
  console.log('found user', !!u, u?u.email:null, u && u.stripeCustomerId ? 'stripeCustomerId:'+u.stripeCustomerId : 'no-stripe-cust');
  await p.$disconnect();
})();
