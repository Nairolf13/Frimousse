require('dotenv').config();
const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
  const subId = process.argv[2] || 'ba8e41d3-68cf-43e7-a01f-150deff4bf06';
  const sub = await prisma.pushSubscription.findUnique({ where: { id: subId } });
    if (!sub) return console.error('[script] subscription not found', subId);
    const endpoint = (sub.subscription && sub.subscription.endpoint) || 'no-endpoint';
    console.log('[script] found subscription', subId, 'endpoint:', endpoint.slice ? endpoint.slice(0,200) + '...' : endpoint);

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const contact = process.env.VAPID_CONTACT || 'mailto:notifications@lesfrimousses.com';
    if (!publicKey || !privateKey) return console.error('[script] VAPID keys missing');

    webpush.setVapidDetails(contact, publicKey, privateKey);
    const payload = JSON.stringify({ title: 'Probe to nanny', body: 'Test push to nanny subscription' });

    try {
      const res = await webpush.sendNotification(sub.subscription, payload);
      console.log('[script] sendNotification resolved:', res);
    } catch (err) {
      console.error('[script] sendNotification error status:', err && err.statusCode, 'body:', err && err.body ? err.body : err && err.message ? err.message : err);
    }
  } catch (e) {
    console.error('[script] ERR', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
})();
