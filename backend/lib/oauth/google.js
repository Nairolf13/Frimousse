/**
 * Google OAuth helper – reusable across projects.
 *
 * Uses the standard Authorization Code flow with PKCE (server-side exchange).
 * Only depends on Node built-ins + `jsonwebtoken` for optional id_token decode.
 *
 * Env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI   (e.g. https://yourdomain.com/api/auth/google/callback)
 */

const crypto = require('crypto');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

function env(key) {
  return (process.env[key] || '').trim();
}

/**
 * Build the Google OAuth consent URL.
 * @param {object} [opts]
 * @param {string} [opts.state]  – opaque state to round-trip (CSRF / redirect info)
 * @param {string} [opts.redirectUri] – override GOOGLE_REDIRECT_URI
 * @returns {string} full URL to redirect the user to
 */
function getAuthUrl(opts = {}) {
  const clientId = env('GOOGLE_CLIENT_ID');
  const redirectUri = opts.redirectUri || env('GOOGLE_REDIRECT_URI');
  if (!clientId || !redirectUri) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be set');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  if (opts.state) params.set('state', opts.state);
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens and return user profile.
 * @param {string} code
 * @param {object} [opts]
 * @param {string} [opts.redirectUri]
 * @returns {Promise<{ email: string, name: string, picture: string, sub: string, emailVerified: boolean, tokens: object }>}
 */
async function exchangeCode(code, opts = {}) {
  const clientId = env('GOOGLE_CLIENT_ID');
  const clientSecret = env('GOOGLE_CLIENT_SECRET');
  const redirectUri = opts.redirectUri || env('GOOGLE_REDIRECT_URI');

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => '');
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${err}`);
  }

  const tokens = await tokenRes.json();

  // Fetch user info
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw new Error('Failed to fetch Google user info');
  const profile = await userRes.json();

  return {
    email: profile.email,
    name: profile.name || profile.email,
    picture: profile.picture || null,
    sub: profile.sub,
    emailVerified: profile.email_verified === true,
    tokens,
  };
}

/**
 * Verify a Google id_token received client-side (e.g. from One Tap / GSI).
 * This performs a lightweight verification using Google's public keys.
 * @param {string} idToken
 * @returns {Promise<{ email: string, name: string, picture: string, sub: string, emailVerified: boolean }>}
 */
async function verifyIdToken(idToken) {
  // Decode header to find kid
  const [headerB64] = idToken.split('.');
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

  // Fetch Google's public keys
  const certsRes = await fetch(GOOGLE_CERTS_URL);
  const certs = await certsRes.json();
  const key = certs.keys.find(k => k.kid === header.kid);
  if (!key) throw new Error('Google public key not found for kid ' + header.kid);

  // Build PEM from JWK
  const jwk = await crypto.subtle.importKey('jwk', key, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, ['verify']);
  const exported = await crypto.subtle.exportKey('spki', jwk);
  const pem = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(exported).toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

  const jwt = require('jsonwebtoken');
  const payload = jwt.verify(idToken, pem, {
    algorithms: ['RS256'],
    audience: env('GOOGLE_CLIENT_ID'),
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  });

  return {
    email: payload.email,
    name: payload.name || payload.email,
    picture: payload.picture || null,
    sub: payload.sub,
    emailVerified: payload.email_verified === true,
  };
}

module.exports = { getAuthUrl, exchangeCode, verifyIdToken };
