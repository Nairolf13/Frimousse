/* E2E test: create user+nanny+assignment+report, call POST /api/user/delete, verify cascade-like deletions */
require('dotenv').config({ path: '.env' });
const fetch = global.fetch || require('node-fetch');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
// Force the API URL to the backend server for local E2E tests.
// Some .env setups set API_URL to the frontend dev server; override it here.
const API_URL = process.env.API_URL_TEST || 'http://localhost:4000';

(async () => {
  try {
    console.log('E2E delete-user test starting...');
    // 1) find or create a center
    let center = await prisma.center.findFirst();
    if (!center) {
      center = await prisma.center.create({ data: { name: 'E2E Center' } });
    }
    console.log('Using center', center.id);

    // 2) create a nanny
    const nanny = await prisma.nanny.create({ data: { name: 'E2E Nanny', email: 'e2e.nanny@local', experience: 1, availability: 'Disponible', centerId: center.id } });
    console.log('Created nanny', nanny.id);

    // 3) create a child
    const child = await prisma.child.create({ data: { name: 'E2E Child', age: 3, centerId: center.id } });
    console.log('Created child', child.id);

    // 4) create an assignment referencing nanny & child
    const assignment = await prisma.assignment.create({ data: { date: new Date(), childId: child.id, nannyId: nanny.id, centerId: center.id } });
    console.log('Created assignment', assignment.id);

    // 5) create a report referencing nanny & child
    const report = await prisma.report.create({ data: { priority: 'low', type: 'note', status: 'open', childId: child.id, nannyId: nanny.id, summary: 'E2E', details: 'E2E details', date: new Date(), time: '09:00' , centerId: center.id } });
    console.log('Created report', report.id);

    // 6) create a user linked to nanny
  const passwordHash = '$2a$10$Cn8f/FAKEHASHgZPUn9oF7e'; // placeholder (not used for login here)
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const testEmail = `e2e.user+${unique}@local`;
  const user = await prisma.user.create({ data: { email: testEmail, password: passwordHash, name: 'E2E User', role: 'nanny', nannyId: nanny.id, centerId: center.id } });
    console.log('Created user', user.id);

    // 7) generate tokens and store refresh token in DB
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, centerId: user.centerId || null }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, centerId: user.centerId || null }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
    console.log('Tokens created');

    // 8) call deletion endpoint
    console.log('Calling POST /api/user/delete');
    const res = await fetch(`${API_URL}/api/user/delete`, { method: 'POST', headers: { Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}` } });
    console.log('Response status', res.status);
    const text = await res.text();
    console.log('Response body:', text);

    // 9) verify DB state
    const foundUser = await prisma.user.findUnique({ where: { id: user.id } });
    const foundRefresh = await prisma.refreshToken.findFirst({ where: { userId: user.id } });
    const foundNanny = await prisma.nanny.findUnique({ where: { id: nanny.id } });
    const foundAssignment = await prisma.assignment.findUnique({ where: { id: assignment.id } });
    const foundReport = await prisma.report.findUnique({ where: { id: report.id } });

    console.log('Post-delete checks: user=', !!foundUser, 'refreshToken=', !!foundRefresh, 'nanny=', !!foundNanny, 'assignment=', !!foundAssignment, 'report=', !!foundReport);

    console.log('E2E delete-user test finished.');
  } catch (e) {
    console.error('E2E test error', e);
  } finally {
    await prisma.$disconnect();
  }
})();
