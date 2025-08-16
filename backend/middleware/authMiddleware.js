const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async function (req, res, next) {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user data to get centerId and any updates to role
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ message: 'Invalid token - user not found' });
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      nannyId: user.nannyId,
      parentId: user.parentId,
      centerId: user.centerId || null
    };
    next();
  } catch (err) {
    console.error('authMiddleware error', err && err.message ? err.message : err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};
