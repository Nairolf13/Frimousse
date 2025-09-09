// debug_feed_recipients.js
// Given a postId, replicate the recipient selection of sendFeedPostNotification and print candidate subs (no sends).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect(postId) {
  const post = await prisma.feedPost.findUnique({ where: { id: postId }, include: { author: true } });
  if (!post) {
    console.error('Post not found', postId);
    return;
  }
  const centerId = post.centerId;
  const authorId = post.authorId;
  console.log('Post', postId, 'centerId', centerId, 'authorId', authorId, 'authorName', post.author ? post.author.name : null);

  const users = await prisma.user.findMany({ where: { centerId }, select: { id: true, name: true } });
  console.log('Users in center:', users.map(u=>u.id));
  const userIds = users.map(u => u.id).filter(id => id && id !== authorId);
  console.log('Target userIds after excluding author:', userIds);

  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  console.log('Subscriptions to be used (count):', subs.length);
  for (const s of subs) {
    console.log(' - sub id', s.id, 'userId', s.userId, 'endpoint first50', s.subscription && s.subscription.endpoint ? s.subscription.endpoint.slice(0,50) : null);
  }

  // Also print any subscriptions for author specifically
  const authorSubs = await prisma.pushSubscription.findMany({ where: { userId: authorId } });
  console.log('\nAuthor subscriptions (count):', authorSubs.length);
  for (const s of authorSubs) console.log(' - author sub id', s.id, 'endpoint first50', s.subscription && s.subscription.endpoint ? s.subscription.endpoint.slice(0,50) : null);
}

const postId = process.argv[2];
if (!postId) {
  console.error('Usage: node debug_feed_recipients.js <postId>');
  process.exit(1);
}
inspect(postId).then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(2)});
