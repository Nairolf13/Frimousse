#!/usr/bin/env node
require('dotenv').config();
const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT || 'mailto:notifications@lesfrimousses.com';

  if (!publicKey || !privateKey) {
    console.error('VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in backend/.env');
    process.exit(1);
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);

  const subs = await prisma.pushSubscription.findMany();
  if (!subs || subs.length === 0) {
    console.log('No subscriptions found');
    process.exit(0);
  }

  const payload = JSON.stringify({
    title: 'Notification Frimousse',
    body: 'Message de test',
  icon: '/imgs/LogoFrimousse-192.png',
  badge: '/imgs/LogoFrimousse-512.png',
    tag: 'frimousse-notif',
  });

  for (const s of subs) {
    try {
      await webpush.sendNotification(s.subscription, payload);
      console.log('Sent to', s.id);
    } catch (err) {
      // remove invalid subscriptions
      const statusCode = (err && err.statusCode) || (err && err.status) || null;
      console.error('Failed to send to', s.id, statusCode || '', err && err.body ? err.body : (err && err.message) || err);
      if (statusCode === 404 || statusCode === 410) {
        try {
          await prisma.pushSubscription.delete({ where: { id: s.id } });
          console.log('Deleted invalid subscription', s.id);
        } catch (delErr) {
          console.error('Failed to delete subscription', s.id, delErr);
        }
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
