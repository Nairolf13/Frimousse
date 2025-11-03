const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate tokens with the same expirations as authController
function generateAccessTokenForMiddleware(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, centerId: user.centerId || null }, JWT_SECRET, { expiresIn: '15m' });
}
function generateRefreshTokenForMiddleware(user) {
  // include a small random nonce (jti) so tokens generated concurrently are unique
  const payload = { id: user.id, centerId: user.centerId || null };
  const jwtId = crypto.randomBytes(8).toString('hex');
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d', jwtid: jwtId });
}

function cookieOptions() {
  const base = { httpOnly: true, path: '/', secure: process.env.NODE_ENV === 'production' };
  base.sameSite = process.env.NODE_ENV === 'production' ? 'None' : 'lax';
  return base;
}

module.exports = async function (req, res, next) {
  const token = req.cookies.accessToken;
  // helper to set req.user from a user record
  const setUserOnRequest = (user) => {
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      nannyId: user.nannyId,
      parentId: user.parentId,
      centerId: user.centerId || null
    };
  };

  // Try verify access token first
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      if (!user) return res.status(401).json({ message: 'Invalid token - user not found' });
      setUserOnRequest(user);
      return next();
    } catch (err) {
      // fallthrough to attempt refresh below
      console.warn('Access token invalid or expired, attempting refresh if refreshToken cookie is present');
    }
  }

  // If we reach here, access token missing or invalid -> try refresh token
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: 'No token' });

  try {
    // Ensure refresh token exists in DB
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored) return res.status(403).json({ message: 'Invalid refresh token' });

    // Verify refresh JWT
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Enforce subscription rules (same as authController.refresh)
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
    if (!ok) return res.status(402).json({ error: 'Vous devez vous abonner pour avoir accès à votre compte.' });

    // rotate refresh tokens: delete old, create new
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    // attempt to create a new refresh token, retrying on token collision
    const maxRetries = 5;
    let created = false;
    let newRefreshToken = null;
    for (let attempt = 0; attempt < maxRetries && !created; attempt++) {
      newRefreshToken = generateRefreshTokenForMiddleware(user);
      try {
        await prisma.refreshToken.create({ data: { token: newRefreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
        created = true;
        break;
      } catch (e) {
        // If collision on unique token, retry (very unlikely). For other errors, rethrow.
        const msg = (e && e.code) ? e.code : (e && e.message ? e.message : String(e));
        if (msg && (msg === 'P2002' || String(msg).toLowerCase().includes('unique'))) {
          console.warn('Refresh token collision detected, retrying', { attempt, err: e && e.message ? e.message : e });
          // small backoff
          await new Promise(r => setTimeout(r, 50 + Math.floor(Math.random()*100)));
          continue;
        }
        throw e;
      }
    }
    if (!created) {
      throw new Error('Failed to create unique refresh token after multiple attempts');
    }
    const accessTokenNew = generateAccessTokenForMiddleware(user);
    // set cookies using same options as authController
    res.cookie('accessToken', accessTokenNew, Object.assign({ maxAge: 15*60*1000 }, cookieOptions()));
    res.cookie('refreshToken', newRefreshToken, Object.assign({ maxAge: 7*24*60*60*1000 }, cookieOptions()));

    setUserOnRequest(user);
    return next();
  } catch (err) {
    console.error('authMiddleware refresh error', err && err.message ? err.message : err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
