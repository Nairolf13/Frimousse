// Script: inspect_push_subs.js
// Lists recent feed posts and pushSubscription rows for authors and anonymous entries

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async function main() {
  try {
    const posts = await prisma.feedPost.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { author: true } });
    console.log('LATEST POSTS:', posts.length);
    for (const p of posts) {
      console.log('\nPOST', p.id, '\n  createdAt:', p.createdAt, '\n  authorId:', p.authorId, '\n  authorName:', p.author ? p.author.name : null);
      const subsAuthor = await prisma.pushSubscription.findMany({ where: { userId: p.authorId } });
      console.log('  authorSubs count =', subsAuthor.length);
      for (const s of subsAuthor) {
        console.log('    - id:', s.id, 'endpoint first50:', (s.subscription && s.subscription.endpoint ? s.subscription.endpoint.slice(0,50) : null));
      }
    }

    const anon = await prisma.pushSubscription.findMany({ where: { userId: null }, take: 50 });
    console.log('\nANONYMOUS SUBSCRIPTIONS COUNT =', anon.length);
    for (let i = 0; i < Math.min(10, anon.length); i++) {
      const s = anon[i];
      console.log('  anon', i + 1, 'id:', s.id, 'endpoint first50:', (s.subscription && s.subscription.endpoint ? s.subscription.endpoint.slice(0,50) : null));
    }

    // Also list any subscriptions whose endpoint is present in both anonymous and user-associated rows (possible duplicates)
    const all = await prisma.pushSubscription.findMany({ take: 1000 });
    const endpointMap = new Map();
    for (const s of all) {
      const ep = s.subscription && s.subscription.endpoint ? s.subscription.endpoint : null;
      if (!ep) continue;
      const arr = endpointMap.get(ep) || [];
      arr.push({ id: s.id, userId: s.userId });
      endpointMap.set(ep, arr);
    }
    const dupes = [...endpointMap.entries()].filter(([, arr]) => arr.length > 1);
    console.log('\nENDPOINT DUPLICATES COUNT =', dupes.length);
    if (dupes.length) {
      console.log('Some duplicated endpoints (first 10):');
      for (const [ep, arr] of dupes.slice(0, 10)) {
        console.log(' endpoint first50:', ep.slice(0,50), 'rows:', arr);
      }
    }

  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
  } finally {
    try { await prisma.$disconnect(); } catch (e) {}
    process.exit(0);
  }
})();
