const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { sendTemplatedMail } = require('../lib/email');
const { detectLang, subject: emailSubject } = require('../lib/i18n');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const { validatePassword } = require('../lib/validatePassword');
const { notifyUsers } = require('../lib/pushNotifications');

// Session durations
const ACCESS_TOKEN_TTL_MS  = 15 * 60 * 1000;          // 15 minutes
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_TOKEN_TTL_JWT = '30d';

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, centerId: user.centerId || null }, JWT_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id, centerId: user.centerId || null }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL_JWT });
}

function cookieOptions() {
  // Frontend and API share the same domain (lesfrimousses.com) so SameSite=Lax works in prod
  // and is required for Safari PWA (ITP blocks SameSite=None even for first-party cookies).
  const base = { httpOnly: true, path: '/', secure: process.env.NODE_ENV === 'production' };
  base.sameSite = 'lax';
  return base;
}

exports.register = async (req, res) => {
  // normalize email to avoid case-sensitivity issues
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password, name, role, nannyId, centerId, centerName, plan, address, city, postalCode, region, country } = req.body;
  if (!email || !password || !name || !role) return res.status(400).json({ message: 'Missing fields' });
  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  // Whitelist allowed roles — never trust the client for privileged roles
  const ALLOWED_ROLES = ['admin', 'nanny', 'parent'];
  if (!ALLOWED_ROLES.includes(String(role).toLowerCase())) {
    return res.status(400).json({ message: 'Rôle invalide.' });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'Un compte existe déjà pour cette adresse e-mail.' });
  const hash = await bcrypt.hash(password, 10);
  const userData = { email, password: hash, name, role: String(role).toLowerCase() };
  // optional address fields
  if (address) userData.address = address;
  if (city) userData.city = city;
  if (postalCode) userData.postalCode = postalCode;
  if (region) userData.region = region;
  if (country) userData.country = country;
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

  // Generate 6-digit verification code
  const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
  const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  userData.emailVerified = false;
  userData.verificationCode = verificationCode;
  userData.verificationCodeExpires = verificationCodeExpires;
  
  let user;
  try {
    user = await prisma.user.create({ data: userData });
  } catch (err) {
    // Handle unique constraint race (email already created)
    if (err && err.code === 'P2002') return res.status(409).json({ message: 'Un compte existe déjà pour cette adresse e-mail.' });
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

  // Notify super-admins of new registration (fire and forget)
  (async () => {
    try {
      const superAdmins = await prisma.user.findMany({ where: { role: 'super-admin' }, select: { id: true } });
      const superAdminIds = superAdmins.map(u => u.id);
      if (superAdminIds.length > 0) {
        await notifyUsers(superAdminIds, {
          title: 'Nouvelle inscription',
          body: `${user.name || user.email} vient de créer un compte (${user.role}).`,
          tag: 'frimousse-new-user',
          data: { url: '/admin' }
        });
      }
    } catch (e) {
      console.error('Failed to notify super-admins of new registration', e);
    }
  })();

  // Send verification email instead of welcome email
  (async () => {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const lang = detectLang(req);
      const subject = emailSubject('verification', lang);
      await require('../lib/email').sendTemplatedMail({
        templateName: 'verification',
        lang,
        to: user.email,
        subject,
        substitutions: {
          name: user.name || '',
          code: verificationCode,
          logoUrl: `${frontendUrl}/imgs/FrimousseLogo.webp`
        },
        prisma
      });
    } catch (err) {
      console.error('Failed to send verification email', err);
    }
  })();
  
  res.status(201).json({ 
    id: user.id, 
    email: user.email, 
    name: user.name, 
    role: user.role, 
    nannyId: user.nannyId, 
    centerId: user.centerId || null,
    requiresVerification: true 
  });
};

exports.login = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Adresse e-mail inconnue. Vérifiez l'adresse saisie." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Mot de passe incorrect. Utilisez 'Mot de passe oublié' si nécessaire." });
    
    // Check if email is verified
    if (!user.emailVerified) {
      // only generate/send a new code if there isn't one or it has expired
      const now = new Date();
      if (!user.verificationCode || !user.verificationCodeExpires || now > user.verificationCodeExpires) {
        const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
        const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: { verificationCode, verificationCodeExpires }
        });

        // try sending email, but ignore any failure so login path still returns 403
        (async () => {
          try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const lang = 'fr';
            const subject = 'Code de vérification - Frimousse';
            await require('../lib/email').sendTemplatedMail({
              templateName: 'verification',
              lang,
              to: user.email,
              subject,
              substitutions: {
                name: user.name || '',
                code: verificationCode,
                logoUrl: `${frontendUrl}/imgs/FrimousseLogo.webp`
              },
              prisma
            });
          } catch (err) {
            console.error('Failed to send verification email on login attempt', err);
          }
        })();
      }

      return res.status(403).json({ 
        error: 'email_not_verified',
        message: "Veuillez vérifier votre adresse email avant de vous connecter.",
        email: user.email
      });
    }
    
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
  // Block orphan admins (role=admin but no centerId) — they would see data from all centers
  if (user.role === 'admin' && !user.centerId) {
    return res.status(403).json({ error: 'Votre compte admin n\'est pas rattaché à un centre. Contactez le support.' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) } });
  res.cookie('accessToken', accessToken, Object.assign({ maxAge: ACCESS_TOKEN_TTL_MS }, cookieOptions()));
  res.cookie('refreshToken', refreshToken, Object.assign({ maxAge: REFRESH_TOKEN_TTL_MS }, cookieOptions()));
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, centerId: user.centerId || null });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: "Erreur serveur. Impossible de se connecter pour le moment, veuillez réessayer plus tard." });
  }
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });
  try {
    // Verify JWT signature first (fast, no DB hit)
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Atomically delete the exact token — if another request already consumed it,
    // deleteMany returns count=0 and we reject immediately (no race window)
    const deleted = await prisma.refreshToken.deleteMany({
      where: { token: refreshToken, userId: payload.id },
    });
    if (deleted.count === 0) {
      // Token already rotated by a concurrent request — tell client to retry
      // with the new cookie that was already set by the winning request
      return res.status(403).json({ message: 'Token already rotated' });
    }

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
    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: user.id, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
    });
    const accessToken = generateAccessToken(user);
    res.cookie('accessToken', accessToken, Object.assign({ maxAge: ACCESS_TOKEN_TTL_MS }, cookieOptions()));
    res.cookie('refreshToken', newRefreshToken, Object.assign({ maxAge: REFRESH_TOKEN_TTL_MS }, cookieOptions()));
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
  // Clear cookies using the same options used when creating them so the browser accepts the removal
  try {
    const opts = cookieOptions();
    // set expired cookies for both access and refresh tokens
    res.cookie('accessToken', '', Object.assign({}, opts, { maxAge: 0 }));
    res.cookie('refreshToken', '', Object.assign({}, opts, { maxAge: 0 }));
  } catch (e) {
    // fallback to clearCookie if cookieOptions fails for some reason
    try { res.clearCookie('accessToken'); res.clearCookie('refreshToken'); } catch (_) { /* ignore */ }
  }
  res.json({ message: 'Logged out' });
};

// Forgot password: generate a short-lived token and send reset email
exports.forgotPassword = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email requis' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ ok: true }); // don't reveal existence
  // Use the refresh token secret if available to match verification in resetPassword
  const resetSecret = REFRESH_TOKEN_SECRET || JWT_SECRET;
  const resetToken = jwt.sign({ id: user.id, type: 'reset' }, resetSecret, { expiresIn: '1h' });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    // send templated email (lang detection)
    const lang = detectLang(req);
    try {
  await sendTemplatedMail({ templateName: 'reset', lang, to: user.email, subject: emailSubject('reset', lang), substitutions: { name: user.name || '', resetUrl }, prisma });
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
  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
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

// Verify email with code
exports.verifyEmail = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email et code requis' });
    }
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    if (user.emailVerified) {
      return res.json({ ok: true, message: 'Email déjà vérifié' });
    }
    
    if (!user.verificationCode || !user.verificationCodeExpires) {
      return res.status(400).json({ error: 'Aucun code de vérification en attente' });
    }
    
    if (new Date() > new Date(user.verificationCodeExpires)) {
      return res.status(400).json({ error: 'Code expiré. Demandez un nouveau code.', expired: true });
    }
    
    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Code incorrect' });
    }
    
    // Mark email as verified and clear the code
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpires: null
      }
    });
    
    // create tokens and set cookies (log the user in immediately)
    const accessToken = generateAccessToken(updated);
    const refreshToken = generateRefreshToken(updated);
    await prisma.refreshToken.deleteMany({ where: { userId: updated.id } });
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: updated.id, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) } });
    res.cookie('accessToken', accessToken, Object.assign({ maxAge: ACCESS_TOKEN_TTL_MS }, cookieOptions()));
    res.cookie('refreshToken', refreshToken, Object.assign({ maxAge: REFRESH_TOKEN_TTL_MS }, cookieOptions()));
    
    // Send welcome email now that email is verified
    (async () => {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const lang = 'fr';
        const subject = 'Bienvenue sur Frimousse';
        await require('../lib/email').sendTemplatedMail({
          templateName: 'welcome',
          lang,
          to: user.email,
          subject,
          substitutions: {
            name: user.name || '',
            loginUrl: `${frontendUrl}/login`
          },
          prisma
        });
      } catch (err) {
        console.error('Failed to send welcome email after verification', err);
      }
    })();
    
    // respond with some user data so frontend can redirect
    return res.json({ ok: true, id: updated.id, email: updated.email, name: updated.name, role: updated.role, centerId: updated.centerId || null });
  } catch (err) {
    console.error('verifyEmail error', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Resend verification code
exports.resendVerification = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    
    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    if (user.emailVerified) {
      return res.json({ ok: true, message: 'Email déjà vérifié' });
    }
    
    // Generate new code
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationCodeExpires
      }
    });
    
    // Send new verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const lang = 'fr';
    const subject = 'Nouveau code de vérification - Frimousse';
    await require('../lib/email').sendTemplatedMail({
      templateName: 'verification',
      lang,
      to: user.email,
      subject,
      substitutions: {
        name: user.name || '',
        code: verificationCode,
                logoUrl: `${frontendUrl}/imgs/FrimousseLogo.webp`
      },
      prisma
    });
    
    return res.json({ ok: true });
  } catch (err) {
    console.error('resendVerification error', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
