const express = require('express');
const router = express.Router();

const prisma = require('../lib/prismaClient');
const requireAuth = require('../middleware/authMiddleware');

router.get('/', requireAuth, async (req, res) => {
  try {
    // Fetch user + subscription en parallèle dès le départ
    const [user, directSub] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true, email: true, name: true, role: true,
          nannyId: true, parentId: true, centerId: true,
          address: true, postalCode: true, city: true, region: true, country: true,
          tutorialSeen: true,
          tutorialCompleted: true,
          cookieConsent: true,
          language: true,
          parent: { select: { id: true, phone: true, centerId: true } },
          nanny: { select: { id: true, birthDate: true, contact: true } },
        },
      }),
      // Pour admin : fetch directement en parallèle (inutilisé pour les autres rôles)
      prisma.subscription.findFirst({
        where: { userId: req.user.id, status: { in: ['trialing', 'active'] } },
        orderBy: { createdAt: 'desc' },
        select: { plan: true },
      }),
    ]);

    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    let plan = null;
    try {
      if (user.role === 'super-admin') {
        plan = 'pro';
      } else if (user.role === 'admin') {
        if (directSub) plan = directSub.plan;
      } else {
        // Nanny/parent : chercher le plan de l'admin du centre
        const centerId = user.centerId || user.parent?.centerId || null;
        if (centerId) {
          // Une seule requête qui joint admins + leur sub
          const adminSub = await prisma.subscription.findFirst({
            where: {
              status: { in: ['trialing', 'active'] },
              user: { centerId, role: { in: ['admin', 'super-admin'] } },
            },
            orderBy: { createdAt: 'desc' },
            select: { plan: true },
          });
          if (adminSub) plan = adminSub.plan;
        }
      }
    } catch { /* ignore */ }

    const out = Object.assign({}, user);
    out.phone = (user.parent?.phone) || (user.nanny?.contact) || null;
    out.birthDate = user.nanny?.birthDate || null;
    out.plan = plan;
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
