const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PLAN_LIMITS = {
  decouverte: { nanny: 2, child: 2, parent: 2, report: 2 },
  essentiel:  { nanny: 10, child: 10, parent: 10, report: 10 },
  pro:        { nanny: Infinity, child: Infinity, parent: Infinity, report: Infinity },
};

const RESOURCE_LABELS = {
  nanny: 'nounous',
  child: 'enfants',
  parent: 'parents',
  report: 'rapports',
};

module.exports = function (resource) {
  return async function (req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (user.role === 'super-admin') return next();

      // Resolve the subscription for this user:
      // - admins have their own subscription
      // - parents/nannies inherit the subscription of their center's admin
      let sub = null;
      if (user.role === 'admin') {
        sub = await prisma.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
      } else {
        let centerId = user.centerId;
        if (!centerId && user.parentId) {
          const parent = await prisma.parent.findUnique({ where: { id: user.parentId } });
          if (parent) centerId = parent.centerId;
        }
        if (centerId) {
          const admins = await prisma.user.findMany({ where: { centerId }, select: { id: true, role: true } });
          const adminIds = admins
            .filter(a => { const r = String(a.role || '').toLowerCase(); return r.includes('admin') || r.includes('super'); })
            .map(a => a.id);
          if (adminIds.length > 0) {
            sub = await prisma.subscription.findFirst({ where: { userId: { in: adminIds } }, orderBy: { createdAt: 'desc' } });
          }
        }
      }

      if (!sub) return next();

      const plan = String(sub.plan).toLowerCase();
      const planLimits = PLAN_LIMITS[plan];
      if (!planLimits) return next(); // unknown plan — no limits

      // Scope count to the center (not just the requesting user)
      const centerId = user.centerId || (user.parentId ? (await prisma.parent.findUnique({ where: { id: user.parentId } }))?.centerId : null);
      if (!centerId) return next();

      const limit = planLimits[resource];
      if (limit === undefined || limit === Infinity) return next();

      let count = 0;
      switch (resource) {
        case 'nanny':
          count = await prisma.nanny.count({ where: { centerId } });
          break;
        case 'child':
          count = await prisma.child.count({ where: { centerId } });
          break;
        case 'parent':
          count = await prisma.parent.count({ where: { centerId } });
          break;
        case 'report':
          count = await prisma.report.count({ where: { centerId } });
          break;
        default:
          return next();
      }

      const label = RESOURCE_LABELS[resource] || resource;
      if (count >= limit) {
        const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
        return res.status(402).json({ error: `Limite pour le plan ${planLabel} atteinte : impossible d'ajouter d'autres ${label}. Veuillez passer à un plan supérieur.` });
      }

      return next();
    } catch (e) {
      console.error('discoveryLimitMiddleware error', e);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  };
};
