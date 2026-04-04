const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Resolves the subscription and centerId for any user type (admin, parent, nanny).
 * Caches the result in req._subCache to avoid duplicate DB queries when
 * multiple middlewares run on the same request.
 *
 * @param {object} user - req.user
 * @param {object} [req]  - Express request (optional, for caching)
 * @returns {{ sub: object|null, centerId: string|null }}
 */
async function resolveSubscription(user, req = null) {
  if (req && req._subCache) return req._subCache;

  let sub = null;
  let centerId = null;

  if (user.role === 'super-admin') {
    const result = { sub: { status: 'active', plan: 'pro' }, centerId: null };
    if (req) req._subCache = result;
    return result;
  }

  if (user.role === 'admin') {
    sub = await prisma.subscription.findFirst({
      where: { userId: user.id, status: { in: ['trialing', 'active'] } },
      orderBy: { createdAt: 'desc' },
    });
    centerId = user.centerId;
  } else {
    // Resolve centerId with all fallbacks: direct → parentId → nannyId
    centerId = user.centerId ?? null;

    if (!centerId && user.parentId) {
      const parent = await prisma.parent.findUnique({ where: { id: user.parentId }, select: { centerId: true } });
      if (parent) centerId = parent.centerId;
    }
    if (!centerId && user.nannyId) {
      const nanny = await prisma.nanny.findUnique({ where: { id: user.nannyId }, select: { centerId: true } });
      if (nanny) centerId = nanny.centerId;
    }

    if (centerId) {
      const admins = await prisma.user.findMany({ where: { centerId }, select: { id: true, role: true } });
      const adminIds = admins
        .filter(a => String(a.role || '').toLowerCase().includes('admin'))
        .map(a => a.id);
      if (adminIds.length > 0) {
        sub = await prisma.subscription.findFirst({
          where: { userId: { in: adminIds }, status: { in: ['trialing', 'active'] } },
          orderBy: { createdAt: 'desc' },
        });
      }
    }
  }

  const result = { sub, centerId };
  if (req) req._subCache = result;
  return result;
}

module.exports = resolveSubscription;
