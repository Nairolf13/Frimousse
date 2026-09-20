const prisma = require('./prismaClient');

// Records a sensitive deletion (parent, nanny, child, center) so a super-admin
// can later answer "who deleted this and when" — e.g. when a family disputes
// a missing invoice or child record. Never throws: an audit log failure must
// not block or roll back the deletion it is describing.
async function logDeletion({ action, targetType, targetId, snapshot, actor, centerId, centerName }) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId,
        snapshot: snapshot ?? undefined,
        actorId: actor?.id || null,
        actorName: actor?.name || null,
        actorEmail: actor?.email || null,
        centerId: centerId || actor?.centerId || null,
        centerName: centerName || null,
      },
    });
  } catch (e) {
    console.error('Failed to write audit log', action, targetType, targetId, e && e.message ? e.message : e);
  }
}

module.exports = { logDeletion };
