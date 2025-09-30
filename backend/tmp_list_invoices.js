// Quick script to list paymentHistory for Sep 2025 and compute invoiceNumber
const { PrismaClient } = require('@prisma/client');
(async function(){
  const prisma = new PrismaClient();
  try{
    const rows = await prisma.paymentHistory.findMany({ where: { year: 2025, month: 9 }, include: { parent: true } });
    if(!rows || rows.length === 0){
      console.log('No paymentHistory rows found for 9/2025');
      return;
    }
    console.log('Found', rows.length, 'rows');
    for(const r of rows){
      const invoiceDate = r.createdAt ? new Date(r.createdAt) : new Date();
      const invoiceNumber = `FA-${invoiceDate.getFullYear()}-${String(r.id).slice(0,6)}`;
      console.log('\nID:', r.id);
      console.log('Parent:', r.parent ? `${r.parent.firstName||''} ${r.parent.lastName||''}`.trim() : r.parentId);
      console.log('createdAt:', r.createdAt);
      console.log('computed invoiceNumber:', invoiceNumber);
    }
  }catch(e){
    console.error('Error', e);
  }finally{
    await prisma.$disconnect();
  }
})();
