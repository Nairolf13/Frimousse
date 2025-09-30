// Script to show email logs for a given paymentHistory id
const { PrismaClient } = require('@prisma/client');
const PAYMENT_ID = process.argv[2] || 'f8a1a1eb-03b9-4518-88bb-a846bd7566ca';
(async function(){
  const prisma = new PrismaClient();
  try{
    const logs = await prisma.emailLog.findMany({ where: { paymentHistoryId: PAYMENT_ID }, include: { paymentHistory: true }, orderBy: { createdAt: 'desc' } });
    if(!logs || logs.length === 0){
      console.log('No emailLog found for paymentHistoryId =', PAYMENT_ID);
      return;
    }
    for(const l of logs){
      console.log('\n--- EmailLog ---');
      console.log('id:', l.id);
      console.log('createdAt:', l.createdAt);
      console.log('subject:', l.subject);
      console.log('recipients:', l.recipients || l.recipientsText || '—');
      console.log('status:', l.status);
      console.log('paymentHistoryId:', l.paymentHistoryId);
      if(l.paymentHistory){
        console.log('paymentHistory.id:', l.paymentHistory.id);
        console.log('paymentHistory.month/year/total:', l.paymentHistory.month, l.paymentHistory.year, l.paymentHistory.total);
        console.log('paymentHistory.createdAt:', l.paymentHistory.createdAt);
      } else {
        console.log('paymentHistory relation is null');
      }
    }
  }catch(e){
    console.error('Error', e);
  }finally{
    await prisma.$disconnect();
  }
})();
