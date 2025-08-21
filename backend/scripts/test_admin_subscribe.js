const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const fetch = global.fetch || require('node-fetch');
(async () => {
  try {
    const email = 'fb_du_13@live.fr';
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return console.error('User not found:', email);
    const token = jwt.sign({ id: user.id, type: 'subscribe' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    console.log('Using user', { id: user.id, email: user.email });
    const res = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/api/subscriptions/create-with-token-test-pm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribeToken: token, plan: 'essentiel', mode: 'direct' })
    });
    const txt = await res.text();
    console.log('Status', res.status, 'Response:', txt);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
