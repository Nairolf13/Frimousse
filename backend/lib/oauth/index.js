/**
 * OAuth Module – Reusable Google OAuth helper.
 *
 * Exports:
 *  - google   : { getAuthUrl, exchangeCode, verifyIdToken }
 *  - handleOAuthUser(prisma, { email, name, provider, providerId, emailVerified }) → User
 *
 * Required env vars (see README.md in this folder):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 */

const google = require('./google');
const handleOAuthUser = require('./handleOAuthUser');

module.exports = { google, handleOAuthUser };
