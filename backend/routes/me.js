const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const requireAuth = require('../middleware/authMiddleware');

router.get('/', requireAuth, async (req, res) => {
  try {
    // Return the user plus address fields and include linked parent / nanny minimal data
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        nannyId: true,
        parentId: true,
        centerId: true,
        address: true,
        postalCode: true,
        city: true,
        region: true,
        country: true,
        parent: {
          select: {
            id: true,
            phone: true,
          },
        },
        nanny: {
          select: {
            id: true,
            birthDate: true,
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // Attach subscription plan
    let plan = null;
    try {
      if (user.role === 'super-admin') {
        plan = 'pro';
      } else if (user.role === 'admin') {
        const sub = await prisma.subscription.findFirst({ where: { userId: user.id, status: { in: ['trialing', 'active'] } }, orderBy: { createdAt: 'desc' } });
        if (sub) plan = sub.plan;
      } else {
        let centerId = user.centerId;
        if (!centerId && user.parentId) {
          const parent = await prisma.parent.findUnique({ where: { id: user.parentId } });
          if (parent) centerId = parent.centerId;
        }
        if (centerId) {
          const admins = await prisma.user.findMany({ where: { centerId }, select: { id: true, role: true } });
          const adminIds = admins.filter(a => { const r = String(a.role || '').toLowerCase(); return r.includes('admin') || r.includes('super'); }).map(a => a.id);
          if (adminIds.length > 0) {
            const sub = await prisma.subscription.findFirst({ where: { userId: { in: adminIds }, status: { in: ['trialing', 'active'] } }, orderBy: { createdAt: 'desc' } });
            if (sub) plan = sub.plan;
          }
        }
      }
    } catch { /* ignore */ }

    // Normalize phone and birthDate into top-level fields so frontend can read u.phone and u.birthDate
    try {
      const out = Object.assign({}, user);
      // parent.phone vs nanny.contact
      const parentPhone = user.parent && user.parent.phone ? user.parent.phone : null;
      const nannyContact = user.nanny && user.nanny.contact ? user.nanny.contact : null;
      out.phone = parentPhone || nannyContact || null;
      // birthDate from nanny (nannies have birthDate in schema)
      out.birthDate = user.nanny && user.nanny.birthDate ? user.nanny.birthDate : null;
      out.plan = plan;
      res.json(out);
    } catch (e) {
      // fallback: return raw user record
      res.json(user);
    }
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
