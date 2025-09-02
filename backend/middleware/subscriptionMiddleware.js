const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async function requireActiveSubscription(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    // Super-admin bypass
    if (user.role === 'super-admin') return next();

    // Admins must have their own active/trialing subscription
    if (user.role === 'admin') {
      const sub = await prisma.subscription.findFirst({ where: { userId: user.id, status: { in: ['trialing', 'active'] } } });
      if (sub) return next();
      return res.status(402).json({ error: 'Vous devez vous abonner pour avoir accès à votre compte.' });
    }

    // Non-admins (parents, nannies, etc): allow when the center has at least one admin with an active/trialing subscription
    let centerId = user.centerId;
    // some users (parents) may be linked via parent record
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
      if (adminIds.length === 0) return res.status(402).json({ error: 'Vous devez vous abonner pour avoir accès à votre compte.' });
      const sub = await prisma.subscription.findFirst({ where: { userId: { in: adminIds }, status: { in: ['trialing', 'active'] } } });
      if (sub) return next();
    }

    return res.status(402).json({ error: 'Vous devez vous abonner pour avoir accès à votre compte.' });
  } catch (e) {
    console.error('subscriptionMiddleware error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
