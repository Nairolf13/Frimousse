const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
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
  // Determine center assignment rules:
  // - If this is the very first user in the system, force admin role and create a new Center.
  // - If the new user's role is 'admin', always create a new Center and assign its id (unique per admin).
  // - If an authenticated admin is creating a non-admin user, allow assigning a center (validate centerId,
  //   inherit admin's centerId, or create a new center when centerName is provided).
  // - Otherwise, ignore any center fields from the client.
  const totalUsers = await prisma.user.count();
  if (totalUsers === 0) {
    // First user -> create a center and force admin role
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

  const user = await prisma.user.create({ data: userData });

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
