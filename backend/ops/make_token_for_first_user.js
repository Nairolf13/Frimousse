#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

(async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({ select: { id: true, email: true, role: true } });
    if (!user) {
      console.error('No user found in database');
      process.exit(2);
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not set in env');
      process.exit(3);
    }
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
    console.log(JSON.stringify({ userId: user.id, email: user.email, role: user.role, token }));
    await prisma.$disconnect();
  } catch (err) {
    console.error('Error generating token:', err && err.message ? err.message : err);
    try { await prisma.$disconnect(); } catch (e) {}
    process.exit(1);
  }
})();
