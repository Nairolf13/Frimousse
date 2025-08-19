const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, centerId: user.centerId || null }, JWT_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id, centerId: user.centerId || null }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}

exports.register = async (req, res) => {
  const { email, password, name, role, nannyId, centerId, centerName } = req.body;
  if (!email || !password || !name || !role) return res.status(400).json({ message: 'Missing fields' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'User already exists' });
  const hash = await bcrypt.hash(password, 10);
  const userData = { email, password: hash, name, role };
  if (nannyId) userData.nannyId = nannyId;

  if (centerId) {
    userData.centerId = centerId;
  } else if (centerName) {
    let center = await prisma.center.findFirst({ where: { name: centerName } });
    if (!center) {
      center = await prisma.center.create({ data: { name: centerName } });
    }
    userData.centerId = center.id;
  }

  console.log('register userData:', userData);

  const user = await prisma.user.create({ data: userData });
  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, nannyId: user.nannyId, centerId: user.centerId || null });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
  res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15*60*1000 });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*60*60*1000 });
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
    const newRefreshToken = generateRefreshToken(user);
    await prisma.refreshToken.create({ data: { token: newRefreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
    const accessToken = generateAccessToken(user);
    res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15*60*1000 });
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*60*60*1000 });
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
