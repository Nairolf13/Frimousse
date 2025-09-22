const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

function isSuperAdmin(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'super-admin' || r === 'super_admin' || r === 'superadmin' || r.includes('super');
}

function isAdminRole(user) {
  if (!user || !user.role) return false;
  const r = String(user.role).toLowerCase();
  return r === 'admin' || r === 'administrator' || r.includes('admin');
}

async function resolveUserCenter(prismaClient, userRecord) {
  if (!userRecord) return null;
  if (userRecord.centerId) return userRecord.centerId;
  if (userRecord.parentId) {
    const p = await prismaClient.parent.findUnique({ where: { id: userRecord.parentId }, select: { centerId: true } });
    if (p && p.centerId) return p.centerId;
  }
  if (userRecord.nannyId) {
    const n = await prismaClient.nanny.findUnique({ where: { id: userRecord.nannyId }, select: { centerId: true } });
    if (n && n.centerId) return n.centerId;
  }
  return null;
}

router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true, centerId: true, parentId: true, nannyId: true, notifyByEmail: true }
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.get('/all', async (req, res) => {
  try {
    const auth = require('../middleware/authMiddleware');

    let where = {};
    try {
      const fakeReq = { cookies: {} };
    } catch (e) {
    }
    const users = await prisma.user.findMany({ select: { id: true, role: true, centerId: true } });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    // Perform a single transaction to remove the user and all related records
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: req.user.id } });
      if (!user) throw new Error('User not found');

      // Collect posts authored by the user so we can remove related medias/likes/comments first
      const posts = await tx.feedPost.findMany({ where: { authorId: user.id }, select: { id: true } });
      const postIds = posts.map(p => p.id);

      // Remove tokens, push subscriptions, notifications, subscriptions
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });
      await tx.pushSubscription.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.subscription.deleteMany({ where: { userId: user.id } });

      // Remove likes and comments made by the user
      await tx.feedLike.deleteMany({ where: { userId: user.id } });
      await tx.feedComment.deleteMany({ where: { authorId: user.id } });

      // Remove likes/comments/media attached to user's posts, then the posts
      if (postIds.length) {
        await tx.feedLike.deleteMany({ where: { postId: { in: postIds } } });
        await tx.feedComment.deleteMany({ where: { postId: { in: postIds } } });
        await tx.feedMedia.deleteMany({ where: { postId: { in: postIds } } });
        await tx.feedPost.deleteMany({ where: { id: { in: postIds } } });
      }

      // Remove the user record (after we've removed records that reference the user)
      await tx.user.delete({ where: { id: user.id } });

  
  await tx.pushSubscription.deleteMany({ where: { userId: user.id } });
  await tx.notification.deleteMany({ where: { userId: user.id } });
    });

    res.json({ success: true });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    res.status(400).json({ error: msg });
  }
});

// Update current user's basic info (name, email, address, etc.)
router.put('/me', auth, async (req, res) => {
  try {
    const { name, email, notifyByEmail, address, postalCode, city, region, country, phone, birthDate } = req.body || {};
    if (!name && !email && typeof notifyByEmail === 'undefined' && typeof address === 'undefined' && typeof postalCode === 'undefined' && typeof city === 'undefined' && typeof region === 'undefined' && typeof country === 'undefined' && typeof phone === 'undefined' && typeof birthDate === 'undefined') {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const data = {};
    if (typeof name === 'string') data.name = name;
    if (typeof email === 'string') data.email = String(email || '').trim().toLowerCase();
    if (typeof notifyByEmail === 'boolean') data.notifyByEmail = notifyByEmail;
    // allow updating address fields on the User record (User owns address)
    if (typeof address !== 'undefined') data.address = address || null;
    if (typeof postalCode !== 'undefined') data.postalCode = postalCode || null;
    if (typeof city !== 'undefined') data.city = city || null;
    if (typeof region !== 'undefined') data.region = region || null;
    if (typeof country !== 'undefined') data.country = country || null;

    const updated = await prisma.user.update({ where: { id: req.user.id }, data, select: { id: true, email: true, name: true, role: true, createdAt: true, centerId: true, notifyByEmail: true, address: true, postalCode: true, city: true, region: true, country: true, parentId: true, nannyId: true } });

    // If phone provided, update linked Parent or Nanny contact as appropriate
    try {
      if (typeof phone !== 'undefined') {
        if (updated.parentId) {
          // update Parent.phone
          await prisma.parent.update({ where: { id: updated.parentId }, data: { phone: phone || null } });
        } else if (updated.nannyId) {
          // update Nanny.contact
          await prisma.nanny.update({ where: { id: updated.nannyId }, data: { contact: phone || null } });
        }
      }

      // If birthDate provided and user is linked to a nanny, update nanny.birthDate
      if (typeof birthDate !== 'undefined' && updated.nannyId) {
        await prisma.nanny.update({ where: { id: updated.nannyId }, data: { birthDate: birthDate ? new Date(birthDate) : null } });
      }
    } catch (innerErr) {
      // log but don't fail the whole request
      console.error('Failed to update linked parent/nanny from /user/me', innerErr && innerErr.message ? innerErr.message : innerErr);
    }

    // Return freshly updated user (including address fields)
    const fresh = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, name: true, role: true, createdAt: true, centerId: true, notifyByEmail: true, address: true, postalCode: true, city: true, region: true, country: true } });
    res.json(fresh);
  } catch (e) {
    const msg = e && e.code === 'P2002' ? 'Email déjà utilisé' : (e && e.message ? e.message : String(e));
    res.status(400).json({ error: msg });
  }
});

// Change current user's password (requires oldPassword)
router.put('/password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Old and new passwords required' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(403).json({ error: 'Ancien mot de passe incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });

    // Revoke refresh tokens so the client must re-login (optional but safer)
    try { await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } }); } catch (e) { /* ignore */ }

    res.json({ message: 'Mot de passe modifié' });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

router.put('/:id/password', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    if (!newPassword || typeof newPassword !== 'string') return res.status(400).json({ error: 'Missing newPassword' });

    // If updating self, delegate to the existing route that requires oldPassword
    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ error: 'Use /api/user/password to change your own password (oldPassword required)' });
    }

    // Only admins or super-admins can reset other users' passwords
    const actor = req.user || {};
    if (!(isAdminRole(actor) || isSuperAdmin(actor))) {
      console.log(`[ADMIN PW RESET] denied - actor not admin`);
      return res.status(403).json({ message: 'Forbidden' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ message: 'User not found' });

    // center scoping: non super-admins can only modify users in their center
    if (!isSuperAdmin(actor)) {
      const actorCenter = actor.centerId || null;
      const targetCenter = await resolveUserCenter(prisma, target);
      if (actorCenter && targetCenter && String(actorCenter) !== String(targetCenter)) {
        console.log(`[ADMIN PW RESET] denied - center mismatch`);
        // hide existence when center differs
        return res.status(404).json({ message: 'User not found' });
      }
    }

    const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: target.id }, data: { password: hash } });
    // revoke refresh tokens for the target user
    try { await prisma.refreshToken.deleteMany({ where: { userId: target.id } }); } catch (e) { /* ignore */ }

  res.json({ message: 'Password updated' });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

module.exports = router;
