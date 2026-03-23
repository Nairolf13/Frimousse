/**
 * OAuth Routes – Google sign-in/sign-up
 *
 * GET  /api/auth/google            → redirect to Google consent
 * GET  /api/auth/google/callback   → handle Google callback → set cookies → redirect
 * POST /api/auth/google/token      → exchange a Google id_token (One Tap / mobile)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { google, handleOAuthUser } = require('../lib/oauth');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, centerId: user.centerId || null }, JWT_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id, centerId: user.centerId || null }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

function cookieOptions() {
  const base = { httpOnly: true, path: '/', secure: process.env.NODE_ENV === 'production' };
  base.sameSite = process.env.NODE_ENV === 'production' ? 'None' : 'lax';
  return base;
}

/**
 * After OAuth find-or-create, set auth cookies and redirect to the frontend.
 */
async function loginAndRedirect(res, user, isNew) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  res.cookie('accessToken', accessToken, Object.assign({ maxAge: 15 * 60 * 1000 }, cookieOptions()));
  res.cookie('refreshToken', refreshToken, Object.assign({ maxAge: 7 * 24 * 60 * 60 * 1000 }, cookieOptions()));

  // New OAuth users need to complete their profile first
  const destination = (isNew || !user.profileCompleted) ? '/complete-profile' : '/dashboard';
  return res.redirect(`${FRONTEND_URL}${destination}`);
}

/**
 * After OAuth find-or-create for API calls (One Tap / mobile), return JSON.
 */
async function loginAndRespond(res, user, isNew) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  res.cookie('accessToken', accessToken, Object.assign({ maxAge: 15 * 60 * 1000 }, cookieOptions()));
  res.cookie('refreshToken', refreshToken, Object.assign({ maxAge: 7 * 24 * 60 * 60 * 1000 }, cookieOptions()));

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    centerId: user.centerId || null,
    isNew,
  });
}

// ═══════════════════════════════════════════════════════
//  GOOGLE
// ═══════════════════════════════════════════════════════

// Step 1: redirect user to Google
router.get('/google', (req, res) => {
  try {
    const csrfToken = crypto.randomBytes(16).toString('hex');
    const state = Buffer.from(JSON.stringify({ from: req.query.from || 'login', csrf: csrfToken })).toString('base64url');
    // Store the csrf token in a short-lived httpOnly cookie to verify at callback
    const cookieOpts = { httpOnly: true, path: '/', maxAge: 10 * 60 * 1000, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'lax' };
    res.cookie('oauth_csrf', csrfToken, cookieOpts);
    const url = google.getAuthUrl({ state });
    res.redirect(url);
  } catch (err) {
    console.error('OAuth Google redirect error', err);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_config`);
  }
});

// Step 2: Google redirects back here
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}/login?error=oauth_no_code`);

    // Verify CSRF token
    let parsedState = {};
    try { parsedState = JSON.parse(Buffer.from(String(state || ''), 'base64url').toString()); } catch {}
    const expectedCsrf = req.cookies && req.cookies.oauth_csrf;
    if (!expectedCsrf || !parsedState.csrf || parsedState.csrf !== expectedCsrf) {
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_csrf`);
    }
    // Clear the csrf cookie
    res.clearCookie('oauth_csrf', { path: '/' });

    const mode = parsedState.from || 'register';

    const profile = await google.exchangeCode(code);
    const { user, isNew } = await handleOAuthUser(prisma, {
      email: profile.email,
      name: profile.name,
      provider: 'google',
      providerId: profile.sub,
      emailVerified: profile.emailVerified,
      mode,
    });

    if (!user) return res.redirect(`${FRONTEND_URL}/login?error=oauth_no_account`);

    return loginAndRedirect(res, user, isNew);
  } catch (err) {
    console.error('OAuth Google callback error', err);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// Alternative: frontend sends a Google id_token (One Tap)
router.post('/google/token', async (req, res) => {
  try {
    const { idToken, credential } = req.body;
    const token = idToken || credential;
    if (!token) return res.status(400).json({ error: 'id_token requis' });

    const profile = await google.verifyIdToken(token);
    const { user, isNew } = await handleOAuthUser(prisma, {
      email: profile.email,
      name: profile.name,
      provider: 'google',
      providerId: profile.sub,
      emailVerified: profile.emailVerified,
    });

    return loginAndRespond(res, user, isNew);
  } catch (err) {
    console.error('OAuth Google token error', err);
    res.status(401).json({ error: 'Token Google invalide' });
  }
});

module.exports = router;
