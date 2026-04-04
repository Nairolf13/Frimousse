const resolveSubscription = require('../utils/resolveSubscription');

function isSubscriptionValid(sub) {
  if (!sub) return false;
  if (!['trialing', 'active'].includes(sub.status)) return false;
  if (sub.status === 'trialing' && sub.trialEnd && new Date(sub.trialEnd) < new Date()) return false;
  return true;
}

module.exports = async function requireActiveSubscription(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role === 'super-admin') return next();

    const { sub } = await resolveSubscription(user, req);
    if (isSubscriptionValid(sub)) return next();

    return res.status(402).json({ error: 'Votre période d\'essai a expiré. Veuillez souscrire à un abonnement pour continuer.' });
  } catch (e) {
    console.error('subscriptionMiddleware error', e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
