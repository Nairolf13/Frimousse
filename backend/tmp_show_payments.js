const { PrismaClient } = require('@prisma/client');
(async ()=>{
  const p = new PrismaClient();
  try {
    const rows = await p.paymentHistory.findMany({ where: { year: 2025, month: 9 }, include: { parent: true } });
    console.log('Found', rows.length, 'rows');
    rows.forEach(r => console.log(r.id, r.parent ? (r.parent.firstName + ' ' + r.parent.lastName) : 'no-parent', r.total, r.paid));
  } catch (e) { console.error('ERROR', e && e.message ? e.message : e); }
  finally { await p.$disconnect(); }
})();
