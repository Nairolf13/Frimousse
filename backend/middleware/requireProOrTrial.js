const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Allows access only when:
 *  - user is super-admin
 *  - the center's subscription is trialing (essai gratuit)
 *  - the center's subscription is active AND plan = 'pro'
 */
module.exports = async function requireProOrTrial(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role === 'super-admin') return next();

    // Find the subscription for this user's center
    let adminIds = [];

    if (user.role === 'admin') {
      adminIds = [user.id];
    } else {
      let centerId = user.centerId;
      if (!centerId && user.parentId) {
        const parent = await prisma.parent.findUnique({ where: { id: user.parentId } });
        if (parent) centerId = parent.centerId;
      }
      if (centerId) {
        const admins = await prisma.user.findMany({ where: { centerId }, select: { id: true, role: true } });
        adminIds = admins.filter(a => String(a.role || '').toLowerCase().includes('admin')).map(a => a.id);
      }
    }

    if (adminIds.length === 0) {
      return res.status(403).json({ error: 'Cette fonctionnalité est réservée au plan Pro ou à la période d\'essai.' });
    }

    const sub = await prisma.subscription.findFirst({
      where: { userId: { in: adminIds }, status: { in: ['trialing', 'active'] } },
    });

    if (!sub) {
      return res.status(403).json({ error: 'Cette fonctionnalité est réservée au plan Pro ou à la période d\'essai.' });
    }

    // trialing → always OK (within trial period)
    if (sub.status === 'trialing') {
      if (sub.trialEnd && new Date(sub.trialEnd) < new Date()) {
        return res.status(403).json({ error: 'Votre période d\'essai a expiré. Passez au plan Pro pour accéder à la messagerie.' });
      }
      return next();
    }

    // active → must be pro plan
    if (sub.status === 'active' && (sub.plan || '').toLowerCase() === 'pro') {
      return next();
    }

    return res.status(403).json({ error: 'Cette fonctionnalité est réservée au plan Pro.' });
  } catch (e) {
    console.error('requireProOrTrial error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
