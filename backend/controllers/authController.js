const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { sendTemplatedMail } = require('../lib/email');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, centerId: user.centerId || null }, JWT_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id, centerId: user.centerId || null }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

function cookieOptions() {
  // For cross-site auth (frontend on a different origin) we must use SameSite=None and Secure in production.
  const base = { httpOnly: true, path: '/', secure: process.env.NODE_ENV === 'production' };
  base.sameSite = process.env.NODE_ENV === 'production' ? 'None' : 'lax';
  return base;
}

exports.register = async (req, res) => {
  const { email, password, name, role, nannyId, centerId, centerName, plan } = req.body;
  if (!email || !password || !name || !role) return res.status(400).json({ message: 'Missing fields' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'User already exists' });
  const hash = await bcrypt.hash(password, 10);
  const userData = { email, password: hash, name, role };
  if (nannyId) userData.nannyId = nannyId;
  // Determine center assignment rules:
  // - If this is the very first user in the system, force admin role and create a new Center.
  // - If the new user's role is 'admin', always create a new Center and assign its id (unique per admin).
  // - If an authenticated admin is creating a non-admin user, allow assigning a center (validate centerId,
  //   inherit admin's centerId, or create a new center when centerName is provided).
  // - Otherwise, ignore any center fields from the client.
  const totalUsers = await prisma.user.count();
  if (totalUsers === 0) {
    // First user -> create a center and force super-admin role
    const center = await prisma.center.create({ data: { name: centerName || `${name} - Centre` } });
    userData.centerId = center.id;
    userData.role = 'admin';
  } else if (userData.role === 'admin') {
    // Any admin account creation must generate a new Center with a unique id
    const center = await prisma.center.create({ data: { name: centerName || `${name} - Centre` } });
    userData.centerId = center.id;
  } else if (req.user && req.user.role === 'admin') {
    // Admin creating a non-admin user
    if (centerId) {
      // validate provided center exists
      const center = await prisma.center.findUnique({ where: { id: centerId } });
      if (center) userData.centerId = center.id;
    } else if (req.user.centerId) {
      userData.centerId = req.user.centerId;
    } else if (centerName) {
      const center = await prisma.center.create({ data: { name: centerName } });
      userData.centerId = center.id;
    }
  }

  console.log('register userData:', userData);
  let user;
  try {
    user = await prisma.user.create({ data: userData });
  } catch (err) {
    // Handle unique constraint race (email already created)
    if (err && err.code === 'P2002') return res.status(409).json({ message: 'User already exists' });
    console.error('Error creating user in register', err);
    return res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }

  // If client asked for a 'decouverte' free trial, create a trialing subscription record
  try {
    if (plan && String(plan).toLowerCase() === 'decouverte') {
      const trialDays = 15;
      const trialEnd = new Date(Date.now() + trialDays * 24 * 3600 * 1000);
      await prisma.subscription.create({ data: {
        userId: user.id,
        stripeSubscriptionId: null,
        plan: 'decouverte',
        status: 'trialing',
        trialStart: new Date(),
        trialEnd
      }});
    }
  } catch (e) {
    console.error('Failed to create decouverte subscription record', e);
  }

  (async () => {
    try {
      if (process.env.SMTP_HOST && user.email) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
        const templatePath = `${__dirname}/../emailTemplates/welcome_${lang}.html`;
        const fs = require('fs');
        let html = null;
        try {
          html = fs.readFileSync(templatePath, 'utf8');
          html = html.replace(/{{name}}/g, user.name || '').replace(/{{loginUrl}}/g, `${frontendUrl}/login`);
        } catch (e) {
          html = null;
        }
        const subjects = { fr: 'Bienvenue sur Frimousse', en: 'Welcome to Frimousse' };
        const mailOptions = {
          from: process.env.SMTP_FROM || `no-reply@${process.env.SMTP_HOST || 'example.com'}`,
          to: user.email,
          subject: subjects[lang] || subjects.fr,
          text: `Bonjour ${user.name || ''},\n\nBienvenue sur Frimousse ! Connectez-vous: ${frontendUrl}/login`,
          html: html || undefined,
        };
        await transporter.sendMail(mailOptions);
      }
    } catch (err) {
      console.error('Failed to send welcome email', err);
    }
  })();
  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, nannyId: user.nannyId, centerId: user.centerId || null });
};

// Create user + Stripe customer + return SetupIntent client secret for card collection
exports.registerSubscribeInit = async (req, res) => {
  try {
    const { email, password, name, role, centerName, plan } = req.body;
    if (!email || !password || !name || !role || !plan) return res.status(400).json({ message: 'Missing fields' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'User already exists' });
    const hash = await bcrypt.hash(password, 10);
    const userData = { email, password: hash, name, role };
    // center creation rules similar to register
    const totalUsers = await prisma.user.count();
    if (totalUsers === 0) {
      const center = await prisma.center.create({ data: { name: centerName || `${name} - Centre` } });
      userData.centerId = center.id;
      userData.role = 'super-admin';
    } else if (userData.role === 'admin') {
      const center = await prisma.center.create({ data: { name: centerName || `${name} - Centre` } });
      userData.centerId = center.id;
    }

    let user;
    try {
      user = await prisma.user.create({ data: userData });
    } catch (err) {
      if (err && err.code === 'P2002') return res.status(409).json({ message: 'User already exists' });
      console.error('registerSubscribeInit user create error', err);
      return res.status(500).json({ error: 'Erreur lors de la création du compte' });
    }

    // create stripe customer
    const customer = await stripe.customers.create({ email: user.email, name: user.name });
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });

    // create SetupIntent for this customer
    const setupIntent = await stripe.setupIntents.create({ customer: customer.id, payment_method_types: ['card'] });

    // Fire-and-forget welcome email (like register does)
    (async () => {
      try {
        const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
        const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
        await sendTemplatedMail({ templateName: 'welcome', lang, to: user.email, subject: lang === 'fr' ? 'Bienvenue sur Frimousse' : 'Welcome to Frimousse', substitutions: { name: user.name, loginUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : 'http://localhost:5173/login' } });
      } catch (e) {
        console.error('Failed to send welcome email (registerSubscribeInit)', e && e.message ? e.message : e);
      }
    })();

    // create a short-lived subscribe token so we can start a Checkout session without being logged in
    const subscribeToken = jwt.sign({ id: user.id, type: 'subscribe' }, JWT_SECRET, { expiresIn: '5m' });

    // return client secret, temporary user id and subscribe token to start Checkout from the frontend
    res.status(201).json({ clientSecret: setupIntent.client_secret, userId: user.id, subscribeToken });
  } catch (err) {
    console.error('registerSubscribeInit error', err);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
};

// Complete registration: attach payment method, create subscription, create session cookies
exports.registerSubscribeComplete = async (req, res) => {
  try {
    let { userId, plan, paymentMethodId, mode, selectedPlan } = req.body; // mode optional: 'discovery'|'direct'
    if (!userId || !plan || !paymentMethodId) return res.status(400).json({ error: 'Missing fields' });
    if (plan === 'decouverte') {
      if (!selectedPlan || !['essentiel', 'pro'].includes(selectedPlan)) return res.status(400).json({ error: 'For decouverte you must select either "essentiel" or "pro" as selectedPlan' });
      plan = selectedPlan;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const customerId = user.stripeCustomerId;
    if (!customerId) return res.status(400).json({ error: 'Customer absent' });

    console.log('[auth.registerSubscribeComplete] userId=', userId, 'plan=', plan, 'mode=', mode, 'paymentMethodIdPresent=', !!paymentMethodId);
    console.log('[auth.registerSubscribeComplete] user.stripeCustomerId=', customerId);

    // attach payment method and set as default
    try {
      // Attach and ensure the payment method is attached to this customer.
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      // retrieve payment method to verify attachment
      const pmFetched = await stripe.paymentMethods.retrieve(paymentMethodId).catch(() => null);
      if (!pmFetched || pmFetched.customer !== customerId) {
        // Try a second attach attempt
        try {
          await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        } catch (attachErr) {
          console.error('[auth.registerSubscribeComplete] second attach attempt failed', attachErr && attachErr.message ? attachErr.message : attachErr);
          return res.status(500).json({ error: 'Erreur lors de la finalisation de l\'inscription', stripeError: (attachErr && attachErr.raw && attachErr.raw.message) ? attachErr.raw.message : (attachErr && attachErr.message ? attachErr.message : String(attachErr)) });
        }
      }
      await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
    } catch (pmErr) {
      console.error('[auth.registerSubscribeComplete] paymentMethods.attach/update failed', pmErr && pmErr.message ? pmErr.message : pmErr);
      console.error(pmErr && pmErr.stack ? pmErr.stack : pmErr);
      const msg = (process.env.NODE_ENV === 'production') ? 'Erreur lors de la finalisation de l\'inscription' : (pmErr && pmErr.message ? pmErr.message : 'Stripe payment method error');
      return res.status(500).json({ error: msg, stripeError: (pmErr && pmErr.raw && pmErr.raw.message) ? pmErr.raw.message : (pmErr && pmErr.message ? pmErr.message : String(pmErr)) });
    }

    const trialDays = mode === 'discovery' || plan === 'decouverte' ? 15 : 30;
    const trialEnd = Math.floor(Date.now() / 1000) + trialDays * 24 * 3600;

    const priceMap = {
      essentiel: process.env.PRICE_ID_ESSENTIEL,
      pro: process.env.PRICE_ID_PRO,
      decouverte: process.env.PRICE_ID_DECOUVERTE || process.env.PRICE_ID_ESSENTIEL
    };
    let priceId = priceMap[plan] || process.env.PRICE_ID_ESSENTIEL;
    // If the configured priceId is a placeholder value, fallback to ESSENTIEL
    if (!priceId || String(priceId).includes('REPLACE_ME')) {
      priceId = process.env.PRICE_ID_ESSENTIEL;
    }

    if (!priceId) {
      console.error('registerSubscribeComplete error: missing priceId for plan', plan, 'env PRICE_ID_ESSENTIEL present?', !!process.env.PRICE_ID_ESSENTIEL);
      return res.status(500).json({ error: 'Internal server error: price id not configured for selected plan' });
    }

    // Idempotency: if user already has a trialing/active/past_due subscription, return it and login
    const existing = await prisma.subscription.findFirst({ where: { userId: user.id, status: { in: ['trialing', 'active', 'past_due'] } } });
    if (existing) {
      let stripeSub = null;
      try {
        if (existing.stripeSubscriptionId) stripeSub = await stripe.subscriptions.retrieve(existing.stripeSubscriptionId);
      } catch (e) {
        // ignore
      }
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
  const cookieOpts = Object.assign({ maxAge: 15*60*1000 }, cookieOptions());
  const refreshOpts = Object.assign({ maxAge: 7*24*60*60*1000 }, cookieOptions());
  res.cookie('accessToken', accessToken, cookieOpts);
  res.cookie('refreshToken', refreshToken, refreshOpts);
      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role, centerId: user.centerId || null, subscription: stripeSub || existing });
    }

    let subscription;
    try {
      console.log('[auth.registerSubscribeComplete] creating subscription with priceId=', priceId, 'trialEnd=', trialEnd);
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_end: trialEnd,
        proration_behavior: 'none'
      });
    } catch (stripeErr) {
      console.error('[auth.registerSubscribeComplete] Stripe subscription creation failed', stripeErr && stripeErr.message ? stripeErr.message : stripeErr);
      console.error(stripeErr && stripeErr.stack ? stripeErr.stack : stripeErr);
      const message = (process.env.NODE_ENV === 'production') ? 'Erreur lors de la création de l\'abonnement' : (stripeErr && stripeErr.message ? stripeErr.message : 'Stripe error');
      return res.status(500).json({ error: message, stripeError: (stripeErr && stripeErr.raw && stripeErr.raw.message) ? stripeErr.raw.message : (stripeErr && stripeErr.message ? stripeErr.message : String(stripeErr)) });
    }

    const subRecord = await prisma.subscription.create({ data: {
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      plan,
      status: 'trialing',
      trialStart: new Date(),
      trialEnd: new Date(trialEnd * 1000)
    }});

    // create tokens and set cookies (log the user in)
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
  res.cookie('accessToken', accessToken, Object.assign({ maxAge: 15*60*1000 }, cookieOptions()));
  res.cookie('refreshToken', refreshToken, Object.assign({ maxAge: 7*24*60*60*1000 }, cookieOptions()));

    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, centerId: user.centerId || null, subscription: subRecord });
  } catch (err) {
    console.error('registerSubscribeComplete error', err);
    res.status(500).json({ error: 'Erreur lors de la finalisation de l\'inscription' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
  // Enforce subscription: super-admin bypass. For admin users, require their own subscription.
  // For parent/nanny/other non-admin users, allow access when their center has an admin with an active/trialing subscription.
  async function hasValidSubscription(u) {
    if (!u) return false;
    if (u.role === 'super-admin') return true;
    // Admins must have their own subscription
    if (u.role === 'admin') {
      const sub = await prisma.subscription.findFirst({ where: { userId: u.id } });
      return !!sub && ['trialing', 'active'].includes(sub.status);
    }
    // Non-admins: determine centerId (user may be linked to a parent record)
    let centerId = u.centerId;
    if (!centerId && u.parentId) {
      const parent = await prisma.parent.findUnique({ where: { id: u.parentId } });
      if (parent) centerId = parent.centerId;
    }
    if (centerId) {
      // fetch potential admins in that center and check their subscriptions
      const admins = await prisma.user.findMany({ where: { centerId }, select: { id: true, role: true } });
      const adminIds = admins.filter(a => {
        const r = String(a.role || '').toLowerCase();
        return r.includes('admin') || r.includes('super');
      }).map(a => a.id);
      if (adminIds.length === 0) return false;
      const sub = await prisma.subscription.findFirst({ where: { userId: { in: adminIds }, status: { in: ['trialing', 'active'] } } });
      return !!sub;
    }
    return false;
  }

  const allowed = await hasValidSubscription(user);
  if (!allowed) {
    const subscribeToken = jwt.sign({ id: user.id, type: 'subscribe' }, JWT_SECRET, { expiresIn: '5m' });
    return res.status(402).json({ error: 'Vous devez vous abonner pour avoir accès à votre compte.', subscribeToken });
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
  res.cookie('accessToken', accessToken, Object.assign({ maxAge: 15*60*1000 }, cookieOptions()));
  res.cookie('refreshToken', refreshToken, Object.assign({ maxAge: 7*24*60*60*1000 }, cookieOptions()));
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, centerId: user.centerId || null });
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored) return res.status(403).json({ message: 'Invalid refresh token' });
  try {
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    await prisma.refreshToken.deleteMany({ where: { userId: payload.id } });
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Enforce subscription on refresh using same rules as login
    async function hasValidSubscriptionForRefresh(u) {
      if (!u) return false;
      if (u.role === 'super-admin') return true;
      if (u.role === 'admin') {
        const sub = await prisma.subscription.findFirst({ where: { userId: u.id } });
        return !!sub && ['trialing', 'active'].includes(sub.status);
      }
      let centerId = u.centerId;
      if (!centerId && u.parentId) {
        const parent = await prisma.parent.findUnique({ where: { id: u.parentId } });
        if (parent) centerId = parent.centerId;
      }
      if (centerId) {
        const admins = await prisma.user.findMany({ where: { centerId }, select: { id: true, role: true } });
        const adminIds = admins.filter(a => {
          const r = String(a.role || '').toLowerCase();
          return r.includes('admin') || r.includes('super');
        }).map(a => a.id);
        if (adminIds.length === 0) return false;
        const sub = await prisma.subscription.findFirst({ where: { userId: { in: adminIds }, status: { in: ['trialing', 'active'] } } });
        return !!sub;
      }
      return false;
    }

    const ok = await hasValidSubscriptionForRefresh(user);
    if (!ok) {
      return res.status(402).json({ error: 'Vous devez vous abonner pour avoir accès à votre compte.' });
    }
    const newRefreshToken = generateRefreshToken(user);
    await prisma.refreshToken.create({ data: { token: newRefreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
    const accessToken = generateAccessToken(user);
  res.cookie('accessToken', accessToken, Object.assign({ maxAge: 15*60*1000 }, cookieOptions()));
  res.cookie('refreshToken', newRefreshToken, Object.assign({ maxAge: 7*24*60*60*1000 }, cookieOptions()));
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, centerId: user.centerId || null });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

// Forgot password: generate a short-lived token and send reset email
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ ok: true }); // don't reveal existence
    const resetToken = jwt.sign({ id: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    // send templated email (lang detection)
    const acceptLang = (req.headers['accept-language'] || process.env.DEFAULT_LANG || 'fr').split(',')[0].split('-')[0];
    const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
    try {
      await sendTemplatedMail({ templateName: 'reset', lang, to: user.email, subject: lang === 'fr' ? 'Réinitialiser votre mot de passe' : 'Reset your password', substitutions: { name: user.name || '', resetUrl } });
    } catch (e) {
      console.error('Failed to send reset email', e && e.message ? e.message : e);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('forgotPassword error', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Reset password: verify token and update password
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token et mot de passe requis' });
  try {
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET || JWT_SECRET);
    if (!payload || payload.type !== 'reset' || !payload.id) return res.status(400).json({ error: 'Token invalide' });
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('resetPassword error', err);
    return res.status(400).json({ error: 'Token invalide ou expiré' });
  }
};
