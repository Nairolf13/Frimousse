const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { detectLang, subject: emailSubject } = require('./i18n');

// Creates a User account (with a random temp password) for a Parent that has
// no linked account yet, and emails them an invite link to set their own
// password. Used both when a parent is created directly and when one is
// auto-created while adding a child (parentMail without parentId).
async function createParentUserAndInvite(tx, { parent, centerId, req }) {
  const tempPassword = crypto.randomBytes(12).toString('base64').replace(/\//g, '_');
  const hash = await bcrypt.hash(tempPassword, 10);
  const userData = {
    email: parent.email,
    password: hash,
    name: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
    role: 'parent',
    parentId: parent.id,
  };
  if (centerId) userData.centerId = centerId;
  const user = await tx.user.create({
    data: userData,
    select: { id: true, email: true, name: true, role: true, parentId: true, centerId: true, createdAt: true },
  });

  if (process.env.SMTP_HOST) {
    (async () => {
      try {
        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;
        const inviteToken = jwt.sign({ type: 'invite', userId: user.id }, inviteSecret, { expiresIn: '7d' });
        const inviteUrl = `${loginUrl}/invite?token=${inviteToken}`;
        const lang = req ? detectLang(req) : 'fr';
        const subject = emailSubject('invite_parent', lang);
        await require('./email').sendTemplatedMail({
          templateName: 'welcome_parent',
          lang,
          to: parent.email,
          subject,
          substitutions: { name: parent.firstName || '', inviteUrl },
          prisma: require('./prismaClient'),
        });
      } catch (err) {
        console.error('Failed to send parent invite email', err && err.message ? err.message : err);
      }
    })();
  }

  return user;
}

module.exports = { createParentUserAndInvite };
