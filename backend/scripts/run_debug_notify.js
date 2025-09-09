require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { notifyUsers } = require('../lib/pushNotifications');
(async () => {
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { not: null } }, take: 20, select: { userId: true } });
    const userIds = [...new Set(subs.map(s => s.userId))];
    console.log('[debug-script] userIds found:', userIds.slice(0,10));
    if (!userIds || userIds.length === 0) return console.log('[debug-script] No userIds with subscriptions');
    if (!process.env.PUSH_DEBUG) console.log('[debug-script] PUSH_DEBUG not set, but proceeding');
    await notifyUsers(userIds.slice(0,5), { title: 'Debug: test push', body: 'This is a test push from run_debug_notify.js' });
    console.log('[debug-script] notifyUsers finished');
  } catch (e) {
    console.error('[debug-script] ERR', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
})();
