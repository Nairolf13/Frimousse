/**
 * Shared helper: find-or-create a User from OAuth profile data.
 *
 * Reusable across any provider – just pass the normalized profile.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ email: string, name: string, provider: string, providerId: string, emailVerified?: boolean, mode?: 'login'|'register' }} profile
 * @returns {Promise<{ user: object, isNew: boolean }>}
 */
async function handleOAuthUser(prisma, { email, name, provider, providerId, emailVerified = true, mode = 'register' }) {
  if (!email) throw new Error('OAuth profile must include an email');

  // 1) Try to find an existing user by provider + providerId
  let user = await prisma.user.findFirst({
    where: { oauthProvider: provider, oauthProviderId: providerId },
  });
  if (user) return { user, isNew: false };

  // 2) Try to find an existing user by email (link to existing account)
  user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (user) {
    // Link this OAuth provider to the existing account
    try {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          oauthProvider: provider,
          oauthProviderId: providerId,
          // If their email wasn't verified yet but the OAuth provider says it is, mark it verified
          ...(emailVerified && !user.emailVerified ? { emailVerified: true, verificationCode: null, verificationCodeExpires: null } : {}),
        },
      });
    } catch (e) {
      // If update fails (e.g. missing columns), just return the user as-is
      console.warn('handleOAuthUser: failed to link provider to existing user', e && e.message ? e.message : e);
    }
    return { user, isNew: false };
  }

  // 3) If mode is 'login', don't create a new account – the user must register first
  if (mode === 'login') {
    return { user: null, isNew: false };
  }

  // 4) Create new user
  //    Use a random password since they don't need one for OAuth login
  const bcrypt = require('bcryptjs');
  const randomPassword = require('crypto').randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(randomPassword, 10);

  // Create a default center for new admin users (same logic as register)
  const totalUsers = await prisma.user.count();
  const role = totalUsers === 0 ? 'admin' : 'admin'; // new OAuth user = admin (they create their own center)

  const centerData = await prisma.center.create({ data: { name: `${name} - Centre` } });

  user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      password: hash,
      name,
      role,
      centerId: centerData.id,
      emailVerified: emailVerified,
      profileCompleted: false,
      oauthProvider: provider,
      oauthProviderId: providerId,
    },
  });

  // Create a free trial subscription (same as register decouverte)
  try {
    const trialDays = 15;
    const trialEnd = new Date(Date.now() + trialDays * 24 * 3600 * 1000);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeSubscriptionId: null,
        plan: 'decouverte',
        status: 'trialing',
        trialStart: new Date(),
        trialEnd,
      },
    });
  } catch (e) {
    console.error('handleOAuthUser: failed to create trial subscription', e);
  }

  return { user, isNew: true };
}

module.exports = handleOAuthUser;
