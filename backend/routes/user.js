const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/authMiddleware');

const prisma = require('../lib/prismaClient');
const bcrypt = require('bcryptjs');
const { validatePassword } = require('../lib/validatePassword');

let fetchFn;
try {
  fetchFn = globalThis.fetch || require('node-fetch');
} catch (e) {
  fetchFn = globalThis.fetch;
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'PrivacyPictures';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false }, global: { fetch: globalThis.fetch || require('node-fetch') } });

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new Error('Unsupported file type'), false);
    }
    cb(null, true);
  },
});

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
    select: { id: true, email: true, name: true, role: true, createdAt: true, centerId: true, parentId: true, nannyId: true, notifyByEmail: true, profileCompleted: true, oauthProvider: true, language: true, avatarUrl: true }
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  try {
    // If the user record doesn't contain a centerId, try resolving it from linked parent/nanny
    if (!user.centerId) {
      const resolved = await resolveUserCenter(prisma, user);
      if (resolved) user.centerId = resolved;
    }
  } catch (e) {
    // ignore resolution errors and return whatever we have
  }

  // Attach the current subscription plan so the frontend can gate features
  let plan = null;
  let subscriptionStatus = null;
  try {
    if (user.role === 'super-admin') {
      plan = 'pro'; // super-admin has full access
      subscriptionStatus = 'active';
    } else {
      let sub = null;
      if (user.role === 'admin') {
        sub = await prisma.subscription.findFirst({ where: { userId: user.id, status: { in: ['trialing', 'active'] } }, orderBy: { createdAt: 'desc' } });
      } else {
        // Non-admin: look up center admin's subscription
        let centerId = user.centerId;
        if (!centerId && user.parentId) {
          const parent = await prisma.parent.findUnique({ where: { id: user.parentId } });
          if (parent) centerId = parent.centerId;
        }
        if (!centerId && user.nannyId) {
          const nanny = await prisma.nanny.findUnique({ where: { id: user.nannyId } });
          if (nanny) centerId = nanny.centerId;
        }
        if (centerId) {
          const admins = await prisma.user.findMany({ where: { centerId }, select: { id: true, role: true } });
          const adminIds = admins.filter(a => { const r = String(a.role || '').toLowerCase(); return r.includes('admin') || r.includes('super'); }).map(a => a.id);
          if (adminIds.length > 0) {
            sub = await prisma.subscription.findFirst({ where: { userId: { in: adminIds }, status: { in: ['trialing', 'active'] } }, orderBy: { createdAt: 'desc' } });
          }
        }
      }
      if (sub) {
        plan = sub.plan;
        subscriptionStatus = sub.status;
      }
    }
  } catch (e) {
    // ignore — plan stays null
  }

  res.json({ ...user, plan, subscriptionStatus });
});

router.get('/all', auth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
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

      // Remove support tickets and their replies
      const tickets = await tx.supportTicket.findMany({ where: { userId: user.id }, select: { id: true } });
      const ticketIds = tickets.map(t => t.id);
      if (ticketIds.length) {
        await tx.supportReply.deleteMany({ where: { ticketId: { in: ticketIds } } });
        await tx.supportTicket.deleteMany({ where: { id: { in: ticketIds } } });
      }

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

      // --- Clean up linked Nanny record and all its dependent data ---
      if (user.nannyId) {
        const nannyId = user.nannyId;
        // Remove assignments and reports linked to this nanny
        await tx.assignment.deleteMany({ where: { nannyId } });
        await tx.report.deleteMany({ where: { nannyId } });
        // Remove child-nanny links
        await tx.childNanny.deleteMany({ where: { nannyId } });
        // Disconnect nanny from schedules
        const schedules = await tx.schedule.findMany({ where: { nannies: { some: { id: nannyId } } }, select: { id: true } });
        for (const s of schedules) {
          await tx.schedule.update({ where: { id: s.id }, data: { nannies: { disconnect: { id: nannyId } } } });
        }
      }

      // --- Clean up linked Parent record and all its dependent data ---
      if (user.parentId) {
        const parentId = user.parentId;
        await tx.photoConsent.deleteMany({ where: { parentId } });
        // Nullify email log references before deleting payment histories
        const payments = await tx.paymentHistory.findMany({ where: { parentId }, select: { id: true } });
        const paymentIds = payments.map(p => p.id);
        if (paymentIds.length) {
          await tx.emailLog.updateMany({ where: { paymentHistoryId: { in: paymentIds } }, data: { paymentHistoryId: null } });
        }
        await tx.paymentHistory.deleteMany({ where: { parentId } });
        await tx.parentChild.deleteMany({ where: { parentId } });
      }

      // Remove the user record first (it holds the FK to nanny/parent)
      await tx.user.delete({ where: { id: user.id } });

      // Now delete the orphaned Nanny / Parent records
      if (user.nannyId) {
        await tx.nanny.delete({ where: { id: user.nannyId } });
      }
      if (user.parentId) {
        await tx.parent.delete({ where: { id: user.parentId } });
      }
    });

    res.json({ success: true });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    res.status(400).json({ error: msg });
  }
});

// Complete profile for OAuth users (phone, address, city, postalCode, region, country, centerName)
router.post('/complete-profile', auth, async (req, res) => {
  try {
    const { phone, address, city, postalCode, region, country, centerName } = req.body || {};

    // Validate required fields
    const missing = [];
    if (!phone || !phone.trim()) missing.push('Téléphone');
    if (!centerName || !centerName.trim()) missing.push('Société / Crèche');
    if (!address || !address.trim()) missing.push('Adresse');
    if (!city || !city.trim()) missing.push('Ville');
    if (!postalCode || !postalCode.trim()) missing.push('Code postal');
    if (!country || !country.trim()) missing.push('Pays');
    if (missing.length) {
      return res.status(400).json({ error: `Champs requis : ${missing.join(', ')}` });
    }

    // Update user profile
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        region: (region || '').trim() || null,
        country: country.trim(),
        profileCompleted: true,
      },
    });

    // Update center name if provided
    if (centerName && centerName.trim() && updated.centerId) {
      await prisma.center.update({
        where: { id: updated.centerId },
        data: { name: centerName.trim() },
      });
    }

    res.json({ message: 'Profil complété', profileCompleted: true });
  } catch (e) {
    console.error('complete-profile error', e);
    res.status(400).json({ error: e && e.message ? e.message : String(e) });
  }
});

// Update current user's basic info (name, email, address, etc.)
router.put('/me', auth, async (req, res) => {
  try {
    const { name, email, notifyByEmail, address, postalCode, city, region, country, phone, birthDate, avatarUrl } = req.body || {};
    if (!name && !email && typeof notifyByEmail === 'undefined' && typeof address === 'undefined' && typeof postalCode === 'undefined' && typeof city === 'undefined' && typeof region === 'undefined' && typeof country === 'undefined' && typeof phone === 'undefined' && typeof birthDate === 'undefined' && typeof avatarUrl === 'undefined') {
      return res.status(400).json({ error: 'No fields to update' });
    }
    if (name && String(name).length > 100) return res.status(400).json({ error: 'Nom trop long (max 100 caractères).' });

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
    if (typeof avatarUrl !== 'undefined') data.avatarUrl = avatarUrl || null;

    const updated = await prisma.user.update({ where: { id: req.user.id }, data, select: { id: true, email: true, name: true, role: true, createdAt: true, centerId: true, notifyByEmail: true, address: true, postalCode: true, city: true, region: true, country: true, avatarUrl: true, parentId: true, nannyId: true } });

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
    const fresh = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, name: true, role: true, createdAt: true, centerId: true, notifyByEmail: true, address: true, postalCode: true, city: true, region: true, country: true, avatarUrl: true } });
    res.json(fresh);
  } catch (e) {
    const msg = e && e.code === 'P2002' ? 'Email déjà utilisé' : (e && e.message ? e.message : String(e));
    res.status(400).json({ error: msg });
  }
});

async function uploadViaJwtFallback(bucket, objectPath, buffer, contentType) {
  if (!process.env.SUPABASE_JWT_SECRET) {
    console.warn('SUPABASE_JWT_SECRET not set; cannot perform JWT fallback upload');
    return { ok: false, status: 0, body: 'SUPABASE_JWT_SECRET non configuré' };
  }
  if (!fetchFn) {
    console.warn('fetch not available in this runtime; cannot perform JWT fallback upload');
    return { ok: false, status: 0, body: 'fetch non disponible' };
  }
  try {
    const token = jwt.sign(
      { role: 'service_role', exp: Math.floor(Date.now() / 1000) + 60 * 5 },
      process.env.SUPABASE_JWT_SECRET,
      { algorithm: 'HS256' }
    );
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;
    const headers = { Authorization: `Bearer ${token}` };
    if (contentType) headers['Content-Type'] = contentType;

    const fallbackRes = await fetchFn(url, { method: 'POST', headers, body: buffer });
    const bodyText = await (fallbackRes.text ? fallbackRes.text() : Promise.resolve(''));
    if (!fallbackRes.ok) {
      console.error('JWT fallback upload failed', { status: fallbackRes.status, body: bodyText?.slice ? bodyText.slice(0, 300) : bodyText });
      return { ok: false, status: fallbackRes.status, body: bodyText };
    }
    return { ok: true, status: fallbackRes.status, body: bodyText };
  } catch (e) {
    console.error('JWT fallback upload exception', e && e.message ? e.message : e);
    return { ok: false, status: 0, body: String(e) };
  }
}

router.post('/me/avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    if (!SUPABASE_URL || !SUPABASE_KEY || !SUPABASE_BUCKET) {
      return res.status(503).json({ error: 'Stockage non configuré' });
    }

    const cleanFilename = `${req.user.id}-${Date.now()}.webp`;
    const objectPath = path.posix.join('avatars', cleanFilename);

    const optimized = await sharp(req.file.buffer)
      .rotate()
      .resize(320, 320, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    const { error: uploadError } = await supabase.storage.from(SUPABASE_BUCKET).upload(objectPath, optimized, {
      contentType: 'image/webp',
      upsert: false
    });
    if (uploadError) {
      console.error('Avatar upload error', uploadError);
      const errMessage = String(uploadError.message || uploadError || 'unknown');

      // Fallback path in case service-role client token is broken (JWT signing alternative)
      if (errMessage.toLowerCase().includes('invalid compact jws') || errMessage.toLowerCase().includes('jwt') || errMessage.toLowerCase().includes('auth') || errMessage.toLowerCase().includes('forbidden')) {
        const fallback = await uploadViaJwtFallback(SUPABASE_BUCKET, objectPath, optimized, 'image/webp');
        if (fallback.ok) {
          console.info('Avatar upload succeeded via JWT fallback');
        } else {
          return res.status(500).json({ error: 'Échec du téléversement de l’image', details: errMessage, fallback: fallback.body });
        }
      } else {
        return res.status(500).json({ error: 'Échec du téléversement de l’image', details: errMessage });
      }
    }

    const publicUrlData = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(objectPath);
    const publicUrl = publicUrlData?.data?.publicUrl || publicUrlData?.data?.publicURL || null;

    if (!publicUrl) {
      console.error('Avatar public URL not available', publicUrlData);
      return res.status(500).json({ error: 'Impossible de générer l’URL publique de l’avatar' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: publicUrl },
      select: { avatarUrl: true }
    });

    res.json({ avatarUrl: updated.avatarUrl });
  } catch (e) {
    console.error('Failed to upload avatar', e);
    res.status(500).json({ error: 'Erreur serveur lors de l’envoi de l’avatar' });
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

    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });

    // Revoke refresh tokens so the client must re-login (optional but safer)
    try { await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } }); } catch (e) { /* ignore */ }

    res.json({ message: 'Mot de passe modifié' });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
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
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/tutorial-seen', auth, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { tutorialSeen: true },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/preferences', auth, async (req, res) => {
  try {
    const { cookieConsent, language } = req.body;
    const data = {};
    if (cookieConsent !== undefined) {
      if (!['all', 'essential'].includes(cookieConsent)) return res.status(400).json({ error: 'cookieConsent invalide' });
      data.cookieConsent = cookieConsent;
    }
    if (language !== undefined) {
      if (!['fr', 'en', 'es', 'ar'].includes(language)) return res.status(400).json({ error: 'language invalide' });
      data.language = language;
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Aucune donnée' });
    await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/tutorial-completed', auth, async (req, res) => {
  try {
    const { tourId } = req.body;
    if (!tourId || typeof tourId !== 'string') return res.status(400).json({ error: 'tourId requis' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { tutorialCompleted: true } });
    const current = user?.tutorialCompleted || [];
    if (!current.includes(tourId)) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { tutorialCompleted: { push: tourId } },
      });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/user/:id/delete-orphan — super-admin only, deletes an admin user with no centerId
router.delete('/:id/delete-orphan', auth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (target.centerId) return res.status(400).json({ error: 'Cet utilisateur est rattaché à un centre. Supprimez le centre à la place.' });
    if (target.role === 'super-admin') return res.status(400).json({ error: 'Impossible de supprimer un super-admin.' });

    // Delete dependent records (RefreshToken, PushSubscription, Notification, SupportTicket cascade automatically)
    await prisma.subscription.deleteMany({ where: { userId: id } });
    await prisma.pushSubscription.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/user/:id/delete-orphan error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/* ─── RGPD: export personal data ─── */
router.get('/me/export', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true, centerId: true, nannyId: true, parentId: true },
    });

    const [nanny, parent, notifications, pushSubscriptions, messages, feedPosts, feedComments] = await Promise.all([
      user.nannyId ? prisma.nanny.findUnique({ where: { id: user.nannyId }, select: { id: true, name: true, email: true, contact: true, availability: true, experience: true, birthDate: true } }) : null,
      user.parentId ? prisma.parent.findUnique({ where: { id: user.parentId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, centerId: true, createdAt: true } }) : null,
      prisma.notification.findMany({ where: { userId }, select: { title: true, body: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.pushSubscription.findMany({ where: { userId }, select: { id: true, createdAt: true } }),
      prisma.message.findMany({ where: { senderId: userId }, select: { content: true, createdAt: true, conversationId: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
      prisma.feedPost.findMany({ where: { authorId: userId }, select: { id: true, text: true, visibility: true, createdAt: true, childId: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.feedComment.findMany({ where: { authorId: userId }, select: { text: true, createdAt: true, postId: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);

    // Photo consents given by this parent
    const photoConsents = user.parentId
      ? await prisma.photoConsent.findMany({
          where: { parentId: user.parentId },
          select: { childId: true, consent: true, grantedAt: true, createdAt: true },
        })
      : [];

    // Payment history for this parent
    const paymentHistory = user.parentId
      ? await prisma.paymentHistory.findMany({
          where: { parentId: user.parentId },
          select: { month: true, year: true, total: true, paid: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : [];

    // Children linked to this parent (with medical data)
    const children = user.parentId
      ? await prisma.parentChild.findMany({
          where: { parentId: user.parentId },
          select: {
            child: {
              select: { id: true, name: true, birthDate: true, allergies: true, prescriptionUrl: true, sexe: true, group: true },
            },
          },
        }).then(rows => rows.map(r => r.child))
      : [];

    const exportData = {
      exportDate: new Date().toISOString(),
      account: user,
      profile: nanny || parent || null,
      children,
      photoConsents,
      paymentHistory,
      messages,
      feedPosts,
      feedComments,
      notifications,
      devices: pushSubscriptions.map(s => ({ id: s.id, registeredAt: s.createdAt })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="frimousse-mes-donnees-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(exportData);
  } catch (e) {
    console.error('GET /api/user/me/export error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
