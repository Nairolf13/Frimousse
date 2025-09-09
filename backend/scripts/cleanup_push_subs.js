// cleanup_push_subs.js
// Usage:
//  node cleanup_push_subs.js        # report mode (no deletions)
//  node cleanup_push_subs.js --apply  # perform deletions (destructive)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function short(s) {
  if (!s) return null;
  return typeof s === 'string' ? (s.length > 60 ? s.slice(0,60)+'...' : s) : String(s).slice(0,60);
}

(async () => {
  const apply = process.argv.includes('--apply');
  console.log('cleanup_push_subs.js - report mode. apply=', apply ? 'YES' : 'NO');
  try {
    const all = await prisma.pushSubscription.findMany({ orderBy: { createdAt: 'asc' } });
    console.log('Total pushSubscription rows:', all.length);

    const endpointMap = new Map();
    const userMap = new Map();

    for (const s of all) {
      const ep = s.subscription && s.subscription.endpoint ? String(s.subscription.endpoint) : null;
      if (ep) {
        const arr = endpointMap.get(ep) || [];
        arr.push(s);
        endpointMap.set(ep, arr);
      }
      const uid = s.userId || null;
      const uarr = userMap.get(uid) || [];
      uarr.push(s);
      userMap.set(uid, uarr);
    }

    const dupEndpoints = [...endpointMap.entries()].filter(([, arr]) => arr.length > 1);
    console.log('Endpoints with duplicates:', dupEndpoints.length);
    if (dupEndpoints.length) {
      console.log('\nSample duplicated endpoints (up to 20):');
      for (const [ep, arr] of dupEndpoints.slice(0, 20)) {
        console.log('\n- endpoint:', short(ep), 'count=', arr.length);
        for (const r of arr) {
          console.log('   id:', r.id, 'userId:', r.userId, 'createdAt:', r.createdAt.toISOString());
        }
      }
    }

    const usersWithMultiple = [...userMap.entries()].filter(([uid, arr]) => uid && arr.length > 1);
    console.log('\nUsers with multiple subscriptions:', usersWithMultiple.length);
    if (usersWithMultiple.length) {
      console.log('\nSample users with multiple subscriptions (up to 20):');
      for (const [uid, arr] of usersWithMultiple.slice(0, 20)) {
        console.log('\n- userId:', uid, 'count=', arr.length);
        for (const r of arr) console.log('   id:', r.id, 'endpoint:', short(r.subscription && r.subscription.endpoint), 'createdAt:', r.createdAt.toISOString());
      }
    }

    if (!apply) {
      console.log('\nDRY RUN complete. To apply deletions run with --apply');
      await prisma.$disconnect();
      process.exit(0);
    }

    // APPLY mode: do deletions conservatively.
    console.log('\nAPPLY MODE - starting deletions');
    let deletedCount = 0;

    // 1) Deduplicate rows that have identical endpoint.
    for (const [ep, arr] of dupEndpoints) {
      // choose keep candidate:
      // prefer any row with a non-null userId; among those choose the most recent (by createdAt)
      let keep = null;
      const withUser = arr.filter(r => r.userId);
      const candidates = withUser.length ? withUser : arr;
      // pick most recent
      candidates.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      keep = candidates[0];
      const toDelete = arr.filter(r => r.id !== keep.id);
      if (toDelete.length) {
        const ids = toDelete.map(t => t.id);
        const res = await prisma.pushSubscription.deleteMany({ where: { id: { in: ids } } });
        deletedCount += res.count || 0;
        console.log('Dedup endpoint kept', keep.id, 'deleted', ids.length);
      }
    }

    // 2) For users with multiple subscriptions, keep only the most recent subscription (by createdAt)
    const refreshed = await prisma.pushSubscription.findMany();
    const mapByUser = new Map();
    for (const s of refreshed) {
      if (!s.userId) continue;
      const arr = mapByUser.get(s.userId) || [];
      arr.push(s);
      mapByUser.set(s.userId, arr);
    }
    const multiUsers = [...mapByUser.entries()].filter(([, arr]) => arr.length > 1);
    for (const [uid, arr] of multiUsers) {
      arr.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      const keep = arr[0];
      const toDelete = arr.slice(1).map(r => r.id);
      if (toDelete.length) {
        const res = await prisma.pushSubscription.deleteMany({ where: { id: { in: toDelete } } });
        deletedCount += res.count || 0;
        console.log('For user', uid, 'kept', keep.id, 'deleted', toDelete.length);
      }
    }

    console.log('\nAPPLY MODE complete. total deleted:', deletedCount);
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
    try { await prisma.$disconnect(); } catch (_) {}
    process.exit(2);
  }
})();
