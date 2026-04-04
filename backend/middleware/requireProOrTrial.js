const resolveSubscription = require('../utils/resolveSubscription');

/**
 * Allows access only when:
 *  - user is super-admin
 *  - the center's subscription is trialing (essai gratuit, non expiré)
 *  - the center's subscription is active AND plan = 'pro'
 */
module.exports = async function requireProOrTrial(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role === 'super-admin') return next();

    const { sub } = await resolveSubscription(user, req);

    if (!sub) {
      return res.status(403).json({ error: 'Cette fonctionnalité est réservée au plan Pro ou à la période d\'essai.' });
    }

    if (sub.status === 'trialing') {
      if (sub.trialEnd && new Date(sub.trialEnd) < new Date()) {
        return res.status(403).json({ error: 'Votre période d\'essai a expiré. Passez au plan Pro pour accéder à la messagerie.' });
      }
      return next();
    }

    if (sub.status === 'active' && (sub.plan || '').toLowerCase() === 'pro') {
      return next();
    }

    return res.status(403).json({ error: 'Cette fonctionnalité est réservée au plan Pro.' });
  } catch (e) {
    console.error('requireProOrTrial error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
