require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Listing active subscriptions from Stripe...');
    const subs = await stripe.subscriptions.list({ limit: 100 });
    console.log('Found', subs.data.length, 'subscriptions');
    for (const s of subs.data) {
      try {
        const stripeSubId = s.id;
        const status = s.status || 'active';
        const planMeta = (s.metadata && s.metadata.plan) ? s.metadata.plan : 'unknown';
        const trialStart = s.trial_start ? new Date(s.trial_start * 1000) : null;
        const trialEnd = s.trial_end ? new Date(s.trial_end * 1000) : null;
        const currentStart = s.current_period_start ? new Date(s.current_period_start * 1000) : null;
        const currentEnd = s.current_period_end ? new Date(s.current_period_end * 1000) : null;

        // try to resolve user by metadata.subscribeToken
        let userId = null;
        if (s.metadata && s.metadata.subscribeToken) {
          try {
            const jwt = require('jsonwebtoken');
            const payload = jwt.verify(s.metadata.subscribeToken, process.env.JWT_SECRET);
            if (payload && payload.id) userId = payload.id;
          } catch (e) {
            // ignore
          }
        }

        // fallback: customer -> find user by stripeCustomerId
        if (!userId && s.customer) {
          const u = await prisma.user.findFirst({ where: { stripeCustomerId: s.customer } });
          if (u) userId = u.id;
        }

        // fallback: try session customer email on latest invoice
        if (!userId) {
          const invoices = await stripe.invoices.list({ subscription: stripeSubId, limit: 1 });
          if (invoices.data.length > 0) {
            const inv = invoices.data[0];
            if (inv.customer_email) {
              const u2 = await prisma.user.findUnique({ where: { email: inv.customer_email } });
              if (u2) userId = u2.id;
            }
          }
        }

        const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } });
        if (existing) {
          console.log('Updating existing subscription', stripeSubId);
          await prisma.subscription.update({ where: { id: existing.id }, data: { status, plan: planMeta, trialStart, trialEnd, currentPeriodStart: currentStart, currentPeriodEnd: currentEnd } });
        } else {
          console.log('Creating subscription', stripeSubId, 'for userId', userId);
          await prisma.subscription.create({ data: { userId: userId, stripeSubscriptionId: stripeSubId, plan: planMeta, status, trialStart, trialEnd, currentPeriodStart: currentStart, currentPeriodEnd: currentEnd } });
        }
      } catch (e) {
        console.error('Error reconciling subscription', s.id, e && e.message ? e.message : e);
      }
    }
    console.log('Reconciliation completed');
  } catch (e) {
    console.error('Reconciliation failed', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
})();
