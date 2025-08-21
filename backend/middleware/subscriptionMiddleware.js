const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async function requireActiveSubscription(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
  // Allow only super-admin to bypass subscription requirement
  if (user.role === 'super-admin') return next();

    const sub = await prisma.subscription.findFirst({ where: { userId: user.id } });
    if (!sub) return res.status(402).json({ error: 'Vous devez vous abonner pour avoir accès à votre compte.' });

    if (sub.status === 'active' || sub.status === 'trialing') return next();

    return res.status(402).json({ error: 'Vous devez vous abonner pour avoir accès à votre compte.' });
  } catch (e) {
    console.error('subscriptionMiddleware error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
