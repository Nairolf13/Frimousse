const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Plan hierarchy: higher index = higher plan
const PLAN_HIERARCHY = ['decouverte', 'essentiel', 'pro'];

/**
 * Middleware factory that restricts access to users whose active subscription
 * is at least `minimumPlan`.
 *
 * Usage: router.post('/endpoint', auth, requirePlan('pro'), handler)
 */
module.exports = function requirePlan(minimumPlan) {
  const minIndex = PLAN_HIERARCHY.indexOf(minimumPlan.toLowerCase());

  return async function (req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Non authentifie.' });

      // Super-admin bypasses all plan restrictions
      if (user.role === 'super-admin') return next();

      // Find the user's active subscription (or their center admin's subscription for non-admin users)
      let sub = null;

      if (user.role === 'admin') {
        sub = await prisma.subscription.findFirst({
          where: { userId: user.id, status: { in: ['trialing', 'active'] } },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        // Non-admin: look up center admin's subscription
        let centerId = user.centerId;
        if (!centerId && user.parentId) {
          const parent = await prisma.parent.findUnique({ where: { id: user.parentId } });
          if (parent) centerId = parent.centerId;
        }
        if (centerId) {
          const admins = await prisma.user.findMany({ where: { centerId }, select: { id: true, role: true } });
          const adminIds = admins
            .filter(a => {
              const r = String(a.role || '').toLowerCase();
              return r.includes('admin') || r.includes('super');
            })
            .map(a => a.id);
          if (adminIds.length > 0) {
            sub = await prisma.subscription.findFirst({
              where: { userId: { in: adminIds }, status: { in: ['trialing', 'active'] } },
              orderBy: { createdAt: 'desc' },
            });
          }
        }
      }

      if (!sub) {
        return res.status(402).json({ error: 'Aucun abonnement actif.' });
      }

      const userPlanIndex = PLAN_HIERARCHY.indexOf(String(sub.plan).toLowerCase());
      if (userPlanIndex < minIndex) {
        const planLabel = minimumPlan.charAt(0).toUpperCase() + minimumPlan.slice(1);
        return res.status(403).json({
          error: `Cette fonctionnalite est reservee au plan ${planLabel} ou superieur.`,
          requiredPlan: minimumPlan,
          currentPlan: sub.plan,
        });
      }

      return next();
    } catch (e) {
      console.error('requirePlan middleware error', e);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  };
};
