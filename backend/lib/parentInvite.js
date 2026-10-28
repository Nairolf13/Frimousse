const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { detectLang, subject: emailSubject } = require('./i18n');

// Invite tokens default to 30 days (was 7) — invitations routinely sit
// unread in an inbox for longer than a week, and until the resend flow
// existed an expired token left the recipient with no way to recover.
const INVITE_TOKEN_TTL = '30d';

// Signs an invite token and emails the "set your password" link to a user.
// Shared by account creation and by the resend-invite flow so both stay
// in sync (same secret, same TTL, same email template).
async function sendParentInviteEmail({ userId, email, firstName, lang, prisma }) {
  if (!process.env.SMTP_HOST) return;
  try {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteSecret = process.env.INVITE_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;
    const inviteToken = jwt.sign({ type: 'invite', userId }, inviteSecret, { expiresIn: INVITE_TOKEN_TTL });
    const inviteUrl = `${loginUrl}/invite?token=${inviteToken}`;
    const subject = emailSubject('invite_parent', lang || 'fr');
    await require('./email').sendTemplatedMail({
      templateName: 'welcome_parent',
      lang: lang || 'fr',
      to: email,
      subject,
      substitutions: { name: firstName || '', inviteUrl },
      prisma,
      // Setting a password is the only way this account becomes usable at
      // all — never let a notification opt-out silently swallow it.
      respectOptOut: false,
    });
  } catch (err) {
    console.error('Failed to send parent invite email', err && err.message ? err.message : err);
  }
}

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

  (async () => {
    await sendParentInviteEmail({
      userId: user.id,
      email: parent.email,
      firstName: parent.firstName,
      lang: req ? detectLang(req) : 'fr',
      prisma: require('./prismaClient'),
    });
  })();

  return user;
}

module.exports = { createParentUserAndInvite, sendParentInviteEmail, INVITE_TOKEN_TTL };
