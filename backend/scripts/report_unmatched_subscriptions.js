require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'generated', 'unmatched_subscriptions.json');

(async () => {
  try {
    await fs.promises.mkdir(path.join(__dirname, '..', 'generated'), { recursive: true });
    console.log('Fetching Stripe subscriptions...');
    const subs = await stripe.subscriptions.list({ limit: 100 });
    const unmatched = [];
    for (const s of subs.data) {
      let userId = null;
      // try metadata.subscribeToken
      if (s.metadata && s.metadata.subscribeToken) {
        try {
          const jwt = require('jsonwebtoken');
          const payload = jwt.verify(s.metadata.subscribeToken, process.env.JWT_SECRET);
          if (payload && payload.id) userId = payload.id;
        } catch (e) {
          // ignore
        }
      }
      // try stripe customer mapping
      if (!userId && s.customer) {
        const u = await prisma.user.findFirst({ where: { stripeCustomerId: s.customer } });
        if (u) userId = u.id;
      }
      // try latest invoice customer_email
      let customerEmail = null;
      try {
        const invoices = await stripe.invoices.list({ subscription: s.id, limit: 1 });
        if (invoices.data.length > 0) {
          const inv = invoices.data[0];
          if (inv.customer_email) customerEmail = inv.customer_email;
          if (!userId && inv.customer_email) {
            const u2 = await prisma.user.findUnique({ where: { email: inv.customer_email } });
            if (u2) userId = u2.id;
          }
        }
      } catch (e) {
        // ignore
      }
      if (!userId) {
        unmatched.push({
          stripeSubscriptionId: s.id,
          status: s.status,
          customer: s.customer || null,
          customer_email: customerEmail || null,
          metadata: s.metadata || {},
          created: new Date(s.created * 1000).toISOString()
        });
      }
    }
    await fs.promises.writeFile(OUT, JSON.stringify(unmatched, null, 2), 'utf8');
    console.log('Unmatched subscriptions:', unmatched.length);
    unmatched.forEach(u => console.log('-', u.stripeSubscriptionId, u.customer, u.customer_email, u.status));
    console.log('Report written to', OUT);
  } catch (e) {
    console.error('Error', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
})();
