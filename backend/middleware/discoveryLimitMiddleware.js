const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const limits = {
  nanny: 2,
  child: 2,
  parent: 2,
  report: 2,
};

module.exports = function (resource) {
  return async function (req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (user.role === 'super-admin') return next();

      const sub = await prisma.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
      if (!sub) return next();
      if (String(sub.plan).toLowerCase() !== 'decouverte' && String(sub.plan).toLowerCase() !== 'decouverte') return next();

      const centerId = user.centerId;
      if (!centerId) return next();

      let count = 0;
      switch (resource) {
        case 'nounou':
          count = await prisma.nanny.count({ where: { centerId } });
          break;
        case 'enfant':
          count = await prisma.child.count({ where: { centerId } });
          break;
        case 'parent':
          count = await prisma.parent.count({ where: { centerId } });
          break;
        case 'rapport':
          count = await prisma.report.count({ where: { centerId } });
          break;
        default:
          return next();
      }

      if (count >= (limits[resource] || 0)) {
        return res.status(402).json({ error: `Limite pour le plan Découverte atteinte : impossible d'ajouter d'autres ${resource}s. Veuillez passer à un plan supérieur.` });
      }

      return next();
    } catch (e) {
      console.error('discoveryLimitMiddleware error', e);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  };
};
