const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/authMiddleware');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const fs = require('fs');
const path = require('path');
const GENERATED_DIR = path.join(__dirname, '..', 'generated');
const GENERATED_PRICES_PATH = path.join(GENERATED_DIR, 'stripe_prices.json');
const PROCESSED_EVENTS_PATH = path.join(GENERATED_DIR, 'processed_stripe_events.json');

// Helper: resolve a plan name to a Stripe price ID.
// If the corresponding env var is already a price_xxx, return it.
// If the env var contains a numeric amount (e.g. "29.99"), create a product+price on Stripe (monthly EUR) and cache the price id.
async function resolvePriceId(plan) {
  const map = { essentiel: 'PRICE_ID_ESSENTIEL', pro: 'PRICE_ID_PRO', decouverte: 'PRICE_ID_DECOUVERTE' };
  const envKey = map[plan] || 'PRICE_ID_ESSENTIEL';
  let val = process.env[envKey] || process.env.PRICE_ID_ESSENTIEL;
  if (!val) return null;
  // If placeholder, fallback to ESSENTIEL
  if (String(val).includes('REPLACE_ME')) {
    val = process.env.PRICE_ID_ESSENTIEL;
  }

  // If it's already a Stripe price id, return it
  if (String(val).startsWith('price_')) return val;

  // If it's a numeric amount like 29.99, create Stripe product+price and cache
  const numMatch = String(val).trim().match(/^\d+(?:\.\d{1,2})?$/);
  if (!numMatch) return null;
  const amountCents = Math.round(parseFloat(numMatch[0]) * 100);

  // ensure generated dir exists
  try { await fs.promises.mkdir(GENERATED_DIR, { recursive: true }); } catch (e) { /* ignore */ }

  // load cache
  let cache = {};
  try {
    const raw = await fs.promises.readFile(GENERATED_PRICES_PATH, 'utf8');
    cache = JSON.parse(raw || '{}');
  } catch (e) {
    cache = {};
  }

  if (cache[envKey] && typeof cache[envKey] === 'string') return cache[envKey];

  // create product and price in Stripe
  try {
    const product = await stripe.products.create({ name: `Frimousse - ${envKey.replace('PRICE_ID_', '')}` });
    const price = await stripe.prices.create({ unit_amount: amountCents, currency: 'eur', recurring: { interval: 'month' }, product: product.id });
    cache[envKey] = price.id;
    await fs.promises.writeFile(GENERATED_PRICES_PATH, JSON.stringify(cache, null, 2), 'utf8');
    return price.id;
  } catch (e) {
    console.error('Error creating Stripe price for', envKey, e && e.message ? e.message : e);
    return null;
  }
}

// Webhook endpoint for subscription events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature error', err && err.message ? err.message : err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Idempotency: ensure we don't process the same Stripe event twice
  try {
    await fs.promises.mkdir(GENERATED_DIR, { recursive: true });
  } catch (e) { /* ignore */ }
  let processed = {};
  try {
    const raw = await fs.promises.readFile(PROCESSED_EVENTS_PATH, 'utf8').catch(() => '{}');
    processed = JSON.parse(raw || '{}');
  } catch (e) {
    processed = {};
  }
  if (processed[event.id]) {
    // already processed
    return res.json({ received: true, skipped: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // only handle subscription mode
        try {
          if (session.mode !== 'subscription') break;
          const stripeSubId = session.subscription;
          if (!stripeSubId) break;
          const subscriptionObj = await stripe.subscriptions.retrieve(stripeSubId, { expand: ['latest_invoice.payment_intent'] });

          // Try to resolve user from metadata or client_reference_id
          const meta = subscriptionObj?.metadata || {};
          let user = null;
          if (meta.subscribeToken) {
            try {
              const payload = jwt.verify(meta.subscribeToken, JWT_SECRET);
              if (payload && payload.id) {
                user = await prisma.user.findUnique({ where: { id: payload.id } });
              }
            } catch (e) {
              // invalid token - ignore and try other methods
            }
          }

          // fallback: find user by stripe customer id
          if (!user && subscriptionObj.customer) {
            user = await prisma.user.findFirst({ where: { stripeCustomerId: subscriptionObj.customer } });
          }

          // fallback: try session customer email (if available on the checkout session)
          if (!user && session.customer_details && session.customer_details.email) {
            const sessEmail = String(session.customer_details.email).trim();
            user = await prisma.user.findFirst({ where: { email: { equals: sessEmail, mode: 'insensitive' } } });
          }

          // Upsert subscription record
          const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } });
          const status = subscriptionObj.status || 'active';
          const trialStart = subscriptionObj.trial_start ? new Date(subscriptionObj.trial_start * 1000) : null;
          const trialEnd = subscriptionObj.trial_end ? new Date(subscriptionObj.trial_end * 1000) : null;

          if (existing) {
            await prisma.subscription.update({ where: { id: existing.id }, data: { status, currentPeriodStart: subscriptionObj.current_period_start ? new Date(subscriptionObj.current_period_start * 1000) : null, currentPeriodEnd: subscriptionObj.current_period_end ? new Date(subscriptionObj.current_period_end * 1000) : null } });
          } else {
            await prisma.subscription.create({ data: {
              userId: user ? user.id : null,
              stripeSubscriptionId: stripeSubId,
              plan: meta.plan || 'unknown',
              status: status,
              trialStart: trialStart,
              trialEnd: trialEnd,
              currentPeriodStart: subscriptionObj.current_period_start ? new Date(subscriptionObj.current_period_start * 1000) : null,
              currentPeriodEnd: subscriptionObj.current_period_end ? new Date(subscriptionObj.current_period_end * 1000) : null,
            }});
          }

          // If we found a user and they were not logged in, create session cookies (login)
          if (user) {
            try {
              const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, centerId: user.centerId || null }, JWT_SECRET, { expiresIn: '15m' });
              const refreshToken = jwt.sign({ id: user.id, centerId: user.centerId || null }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
              await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
              await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
              const cookieOpts = { httpOnly: true, maxAge: 15*60*1000, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'lax' };
              const refreshOpts = { httpOnly: true, maxAge: 7*24*60*60*1000, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'lax' };
              // Note: webhook handlers cannot directly set cookies for the browser that initiated the Checkout
              // but we store refresh token in DB so after redirect the frontend can call refresh endpoint to get tokens.
              // Alternatively, if desired, you can create a one-time link for the user to complete login.
            } catch (e) {
              console.error('Error creating session tokens in webhook', e);
            }
          }
        } catch (e) {
          console.error('Error handling checkout.session.completed in webhook', e);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const stripeSubId = invoice.subscription;
        const sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSubId } });
        if (sub) {
          await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'active', currentPeriodStart: new Date(invoice.period_start * 1000), currentPeriodEnd: new Date(invoice.period_end * 1000) } });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const stripeSubId = invoice.subscription;
        const sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSubId } });
        if (sub) {
          await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'past_due' } });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscriptionObj = event.data.object;
        const sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionObj.id } });
        if (sub) {
          await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'canceled', canceledAt: new Date() } });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscriptionObj = event.data.object;
        const sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionObj.id } });
        if (sub) {
          await prisma.subscription.update({ where: { id: sub.id }, data: { status: subscriptionObj.status, currentPeriodStart: subscriptionObj.current_period_start ? new Date(subscriptionObj.current_period_start * 1000) : null, currentPeriodEnd: subscriptionObj.current_period_end ? new Date(subscriptionObj.current_period_end * 1000) : null } });
        }
        break;
      }
      default:
        // console.log('Unhandled event type', event.type);
    }
  } catch (e) {
    console.error('Error processing webhook event', e);
  }

  // mark event as processed
  try {
    processed[event.id] = { processedAt: new Date().toISOString() };
    await fs.promises.writeFile(PROCESSED_EVENTS_PATH, JSON.stringify(processed, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write processed events file', e && e.message ? e.message : e);
  }

  res.json({ received: true });
});

// Create SetupIntent
router.post('/setup-intent', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    // Ensure stripe customer exists on User model (assume user.stripeCustomerId field)
    let dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    let customerId = dbUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: dbUser.email, name: dbUser.name });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const setupIntent = await stripe.setupIntents.create({ customer: customerId, payment_method_types: ['card'] });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création du SetupIntent' });
  }
});

// Create Checkout Session (authenticated)
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { plan, mode } = req.body; // mode: 'discovery' or 'direct'
    const user = req.user;
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

  let effectivePlan = plan;
  const selectedPlan = req.body.selectedPlan;
  if (plan === 'decouverte') {
    if (!selectedPlan || !['essentiel', 'pro'].includes(selectedPlan)) return res.status(400).json({ error: "Pour l'offre Découverte vous devez choisir 'essentiel' ou 'pro' via le champ selectedPlan." });
    effectivePlan = selectedPlan;
  }
  const priceId = await resolvePriceId(effectivePlan);
  if (!priceId) return res.status(500).json({ error: 'Price id not configured' });

    const trialDays = mode === 'discovery' ? 15 : 30;
    const trialEnd = Math.floor(Date.now() / 1000) + trialDays * 24 * 3600;

    // ensure customer exists in Stripe
    let customerId = dbUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: dbUser.email, name: dbUser.name });
      customerId = customer.id;
      await prisma.user.update({ where: { id: dbUser.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_end: trialEnd, metadata: { plan: effectivePlan, selectedPlan: plan === 'decouverte' ? selectedPlan : effectivePlan } },
      // include the Checkout session id in the redirect so the frontend can finalize the subscription if webhooks are not delivered in dev
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tarifs?checkout=canceled`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de la création de l\'abonnement' });
  }
});

// Create Checkout Session using a short-lived subscribeToken (used after register-subscribe/init)
router.post('/create-checkout-with-token', async (req, res) => {
  try {
    const { plan, mode, selectedPlan, subscribeToken } = req.body;
    if (!subscribeToken || !plan) return res.status(400).json({ error: 'Missing fields' });
    let payload;
    try { payload = jwt.verify(subscribeToken, JWT_SECRET); } catch (e) { return res.status(403).json({ error: 'Invalid or expired token' }); }
    if (!payload || payload.type !== 'subscribe' || !payload.id) return res.status(403).json({ error: 'Invalid token payload' });
    const userId = payload.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    let effectivePlan = plan;
    if (plan === 'decouverte') {
      if (!selectedPlan || !['essentiel', 'pro'].includes(selectedPlan)) return res.status(400).json({ error: 'For decouverte you must select either "essentiel" or "pro" as selectedPlan' });
      effectivePlan = selectedPlan;
    }

    const priceId = await resolvePriceId(effectivePlan);
    if (!priceId) return res.status(500).json({ error: 'Price id not configured' });

    const trialDays = mode === 'discovery' ? 15 : 30;
    const trialEnd = Math.floor(Date.now() / 1000) + trialDays * 24 * 3600;

    // ensure customer exists in Stripe
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_end: trialEnd, metadata: { plan: effectivePlan, selectedPlan: plan === 'decouverte' ? selectedPlan : effectivePlan, subscribeToken } },
  // include the Checkout session id in the redirect so the frontend can finalize the subscription if webhooks are not delivered in dev
  success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?checkout=canceled`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('create-checkout-with-token error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Erreur lors de la création de la session Checkout' });
  }
});

// Fallback endpoint: finalize a Checkout session by session id (useful in dev when webhooks are not configured)
// This endpoint retrieves the Checkout session and the associated subscription from Stripe,
// then upserts the subscription into the local database using the same logic as the webhook handler.
router.post('/complete-checkout-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return res.status(404).json({ error: 'Checkout session not found' });
    if (session.mode !== 'subscription') return res.status(400).json({ error: 'Session is not a subscription' });
    const stripeSubId = session.subscription;
    if (!stripeSubId) return res.status(400).json({ error: 'No subscription attached to session' });

    const subscriptionObj = await stripe.subscriptions.retrieve(stripeSubId, { expand: ['latest_invoice.payment_intent'] });

    // Resolve user: try metadata.subscribeToken, then stripe customer id, then session customer email
    const meta = subscriptionObj?.metadata || {};
    let user = null;
    if (meta.subscribeToken) {
      try {
        const payload = jwt.verify(meta.subscribeToken, JWT_SECRET);
        if (payload && payload.id) user = await prisma.user.findUnique({ where: { id: payload.id } });
      } catch (e) { /* invalid token - ignore */ }
    }
    if (!user && subscriptionObj.customer) {
      user = await prisma.user.findFirst({ where: { stripeCustomerId: subscriptionObj.customer } });
    }
    if (!user && session.customer_details && session.customer_details.email) {
      const sessEmail = String(session.customer_details.email).trim();
      user = await prisma.user.findFirst({ where: { email: { equals: sessEmail, mode: 'insensitive' } } });
    }

    // Upsert subscription record
    const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } });
    const status = subscriptionObj.status || 'active';
    const trialStart = subscriptionObj.trial_start ? new Date(subscriptionObj.trial_start * 1000) : null;
    const trialEnd = subscriptionObj.trial_end ? new Date(subscriptionObj.trial_end * 1000) : null;

    let resultSub;
    if (existing) {
      resultSub = await prisma.subscription.update({ where: { id: existing.id }, data: { status, currentPeriodStart: subscriptionObj.current_period_start ? new Date(subscriptionObj.current_period_start * 1000) : null, currentPeriodEnd: subscriptionObj.current_period_end ? new Date(subscriptionObj.current_period_end * 1000) : null } });
    } else {
      resultSub = await prisma.subscription.create({ data: {
        userId: user ? user.id : null,
        stripeSubscriptionId: stripeSubId,
        plan: meta.plan || 'unknown',
        status: status,
        trialStart: trialStart,
        trialEnd: trialEnd,
        currentPeriodStart: subscriptionObj.current_period_start ? new Date(subscriptionObj.current_period_start * 1000) : null,
        currentPeriodEnd: subscriptionObj.current_period_end ? new Date(subscriptionObj.current_period_end * 1000) : null,
      }});
    }

    // If user exists, create refresh token row so frontend can call refresh to login
    if (user) {
      try {
        const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, centerId: user.centerId || null }, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user.id, centerId: user.centerId || null }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
        await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
        await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
        // Note: we cannot set cookies here for the client's browser if this endpoint is called from the frontend after redirect
      } catch (e) {
        console.error('Error creating session tokens in complete-checkout-session', e);
      }
    }

    res.json({ ok: true, subscription: resultSub });
  } catch (e) {
    console.error('complete-checkout-session error', e && e.message ? e.message : e);
    res.status(500).json({ error: 'Erreur lors de la finalisation de la session Checkout' });
  }
});

// Create subscription using a short-lived subscribeToken (used after a 402 login)
router.post('/create-with-token', async (req, res) => {
  try {
    const { subscribeToken, plan, paymentMethodId, mode } = req.body;
    if (!subscribeToken || !plan || !paymentMethodId) return res.status(400).json({ error: 'Missing fields' });
    let payload;
    try { payload = jwt.verify(subscribeToken, JWT_SECRET); } catch (e) { return res.status(403).json({ error: 'Invalid or expired token' }); }
    if (!payload || payload.type !== 'subscribe' || !payload.id) return res.status(403).json({ error: 'Invalid token payload' });
    const userId = payload.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });

    const trialDays = mode === 'discovery' ? 15 : 30;
    const trialEnd = Math.floor(Date.now() / 1000) + trialDays * 24 * 3600;
  let effectivePlan = plan;
  const selectedPlan = req.body.selectedPlan;
  if (plan === 'decouverte') {
    if (!selectedPlan || !['essentiel', 'pro'].includes(selectedPlan)) return res.status(400).json({ error: 'For decouverte you must select either "essentiel" or "pro" as selectedPlan' });
    effectivePlan = selectedPlan;
  }
  const priceId = await resolvePriceId(effectivePlan);

    // Idempotency: prevent duplicate subscriptions for the same user
    const existing = await prisma.subscription.findFirst({ where: { userId: user.id, status: { in: ['trialing', 'active', 'past_due'] } } });
    if (existing) {
      let stripeSub = null;
      try {
        if (existing.stripeSubscriptionId) stripeSub = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
      } catch (e) {
        // ignore
      }
      // also create session cookies if needed (user may not be logged in)
  const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, centerId: user.centerId || null }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id, centerId: user.centerId || null }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
  const baseCookie = { httpOnly: true, path: '/', secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'lax' };
  res.cookie('accessToken', accessToken, Object.assign({ maxAge: 15*60*1000 }, baseCookie));
  res.cookie('refreshToken', refreshToken, Object.assign({ maxAge: 7*24*60*60*1000 }, baseCookie));
      return res.json({ subscription: stripeSub || existing });
    }

    if (!priceId) {
      console.error('create-with-token error: missing priceId for plan', plan);
      return res.status(500).json({ error: 'Internal server error: price id not configured for selected plan' });
    }

    let subscription;
    try {
      subscription = await stripe.subscriptions.create({ customer: customerId, items: [{ price: priceId }], trial_end: trialEnd, proration_behavior: 'none' });
    } catch (stripeErr) {
      console.error('Stripe subscriptions.create failed (create-with-token)', stripeErr && stripeErr.message ? stripeErr.message : stripeErr);
      console.error(stripeErr && stripeErr.stack ? stripeErr.stack : stripeErr);
      const message = (process.env.NODE_ENV === 'production') ? 'Erreur lors de la création de l\'abonnement' : (stripeErr && stripeErr.message ? stripeErr.message : 'Stripe error');
      // Return Stripe error message in non-production for debugging
      return res.status(500).json({ error: message, stripeError: (stripeErr && stripeErr.raw && stripeErr.raw.message) ? stripeErr.raw.message : (stripeErr && stripeErr.message ? stripeErr.message : String(stripeErr)) });
    }

    const sub = await prisma.subscription.create({ data: { userId: user.id, stripeSubscriptionId: subscription.id, plan, status: 'trialing', trialStart: new Date(), trialEnd: new Date(trialEnd * 1000) } });
    res.json({ subscription: sub });
  } catch (e) {
  console.error('[subscriptions.create-with-token] Unexpected error', e && e.message ? e.message : e);
  console.error(e && e.stack ? e.stack : e);
    res.status(500).json({ error: 'Erreur lors de la création de l\'abonnement' });
  }
});

// Debug endpoints removed: `debug-create-with-token` and `create-with-token-test-pm` were for local debugging only and
// have been removed to keep production routes consistent with development.



// Cancel subscription (at period end or immediately)
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const { immediately } = req.body;
    const user = req.user;
    const sub = await prisma.subscription.findFirst({ where: { userId: user.id } });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (!sub.stripeSubscriptionId) return res.status(400).json({ error: 'No stripe subscription id' });

    if (immediately) {
      await stripe.subscriptions.del(sub.stripeSubscriptionId);
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'canceled', canceledAt: new Date() } });
      return res.json({ success: true });
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur lors de l\'annulation' });
  }
});

// Get subscription status
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const sub = await prisma.subscription.findFirst({ where: { userId: user.id } });
    if (!sub) return res.json({ subscription: null });
    res.json({ subscription: sub });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;