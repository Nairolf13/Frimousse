const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  try {
    const now = new Date();
    const year = now.getFullYear();
    const monthIdx = now.getMonth();
    const first = new Date(year, monthIdx, 1);
    const last = new Date(year, monthIdx + 1, 0);
    console.log('Checking assignments between', first.toISOString(), 'and', last.toISOString());
    const rows = await p.assignment.findMany({ where: { date: { gte: first, lte: last } }, include: { child: { select: { id: true, name: true, parents: { select: { parent: { select: { id: true, firstName: true, lastName: true } } } } } }, nanny: true } });
    console.log('Found', rows.length, 'assignments this month');
    rows.forEach(r => console.log(r.id, r.date.toISOString(), r.child && r.child.name, r.nanny && r.nanny.name));
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
  } finally {
    await p.$disconnect();
  }
})();
