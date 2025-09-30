const { PrismaClient } = require('@prisma/client');
(async function(){
  const prisma = new PrismaClient();
  try{
    const logs = await prisma.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    for(const l of logs){
      if(l.subject && l.subject.includes('Facture')){
        console.log('\nID:', l.id);
        console.log('createdAt:', l.createdAt);
        console.log('subject:', l.subject);
        console.log('paymentHistoryId:', l.paymentHistoryId);
      }
    }
  }catch(e){
    console.error('Error', e);
  }finally{
    await prisma.$disconnect();
  }
})();
