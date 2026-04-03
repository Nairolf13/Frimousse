/**
 * Blocks admin users that have no centerId in the database.
 * A null centerId on an admin account bypasses all center-scoping filters
 * because patterns like `if (req.user.centerId) where.centerId = ...` evaluate
 * to false, returning data from ALL centers.
 *
 * super-admin is intentionally exempt (god-mode access by design).
 * parents and nannies have their own scoping via parentId/nannyId.
 */
module.exports = function requireCenterId(req, res, next) {
  const user = req.user;
  if (!user) return next(); // not authenticated yet, auth middleware handles that

  const role = String(user.role || '').toLowerCase();
  const isSuperAdmin = role === 'super-admin' || role === 'super_admin' || role === 'superadmin' || role.includes('super');

  // Only enforce on admin accounts — other roles (parent, nanny) scope by their own IDs
  if (role === 'admin' && !isSuperAdmin && !user.centerId) {
    console.warn(`[requireCenterId] admin user ${user.id} (${user.email}) has no centerId — access blocked`);
    return res.status(403).json({ error: 'Votre compte admin n\'est pas rattaché à un centre. Contactez le support.' });
  }

  return next();
};
