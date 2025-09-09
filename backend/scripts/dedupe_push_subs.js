require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Starting dedupe_push_subs: listing all push subscriptions...');
    const all = await prisma.pushSubscription.findMany({ orderBy: { createdAt: 'asc' } });
    console.log('Total subscriptions:', all.length);

    // group by endpoint
    const map = new Map();
    for (const s of all) {
      const endpoint = s && s.subscription && s.subscription.endpoint ? s.subscription.endpoint : JSON.stringify(s.subscription || {});
      if (!map.has(endpoint)) map.set(endpoint, []);
      map.get(endpoint).push(s);
    }

    let toDelete = [];
    for (const [endpoint, rows] of map.entries()) {
      if (rows.length <= 1) continue;
      // sort by createdAt desc -> keep first (most recent)
      rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const keep = rows[0];
      const remove = rows.slice(1).map(r => r.id);
      toDelete = toDelete.concat(remove);
      console.log(`Endpoint duplicated (${rows.length} rows). Keeping ${keep.id}, removing ${remove.length} rows`);
    }

    if (toDelete.length === 0) {
      console.log('No duplicates detected.');
      return;
    }

    console.log('Deleting', toDelete.length, 'rows...');
    const res = await prisma.pushSubscription.deleteMany({ where: { id: { in: toDelete } } });
    console.log('Deleted rows count (reported):', res.count);
    const remaining = await prisma.pushSubscription.count();
    console.log('Remaining subscription rows:', remaining);
  } catch (e) {
    console.error('Error during dedupe:', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
})();
