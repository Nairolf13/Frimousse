/**
 * dataRetentionCron.js
 *
 * Automatic data purge following RGPD Art. 5(1)(e) — storage limitation.
 *
 * Retention rules:
 *  - Notifications          : deleted after 6 months
 *  - Messages               : deleted after 3 years
 *  - Feed posts + media     : deleted after 3 years
 *  - Push subscriptions     : deleted after 2 years (device likely replaced)
 *  - Inactive users         : anonymized after 2 years without login (account kept, PII wiped)
 *
 * Runs daily at 02:00 (Europe/Paris) to avoid peak hours.
 */

const cron = require('node-cron');
const prisma = require('./prismaClient');

const cronTimezone = process.env.CRON_TZ || 'Europe/Paris';
const cronEnabled = process.env.ENABLE_PAYMENT_CRON !== 'false';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function subtractMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function subtractYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

// ---------------------------------------------------------------------------
// Purge jobs
// ---------------------------------------------------------------------------

async function purgeOldNotifications() {
  const cutoff = subtractMonths(new Date(), 6);
  const result = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (result.count > 0) {
    console.log(`[dataRetentionCron] Deleted ${result.count} notifications older than 6 months`);
  }
}

async function purgeOldMessages() {
  const cutoff = subtractYears(new Date(), 3);
  const result = await prisma.message.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (result.count > 0) {
    console.log(`[dataRetentionCron] Deleted ${result.count} messages older than 3 years`);
  }
}

async function purgeOldFeedPosts() {
  const cutoff = subtractYears(new Date(), 3);
  // Comments are cascade-deleted by Prisma relations; media must be deleted first
  const oldPosts = await prisma.feedPost.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true },
  });
  if (oldPosts.length === 0) return;

  const postIds = oldPosts.map(p => p.id);

  // Delete child records first (comments, likes, media)
  await prisma.feedComment.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.feedLike.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.feedMedia.deleteMany({ where: { postId: { in: postIds } } });
  const result = await prisma.feedPost.deleteMany({ where: { id: { in: postIds } } });

  console.log(`[dataRetentionCron] Deleted ${result.count} feed posts older than 3 years`);
}

async function purgeOldPushSubscriptions() {
  const cutoff = subtractYears(new Date(), 2);
  const result = await prisma.pushSubscription.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (result.count > 0) {
    console.log(`[dataRetentionCron] Deleted ${result.count} push subscriptions older than 2 years`);
  }
}

/**
 * Anonymize inactive users (no login for 2 years).
 * We cannot determine last login from the schema, so we use updatedAt on the User record.
 * The name and email are replaced with anonymized placeholders; the account is kept for
 * audit trail purposes (e.g. payment history foreign keys).
 */
async function anonymizeInactiveUsers() {
  const cutoff = subtractYears(new Date(), 2);

  const inactive = await prisma.user.findMany({
    where: {
      updatedAt: { lt: cutoff },
      // Exclude super-admins
      NOT: { role: { in: ['super-admin', 'super_admin', 'SUPER_ADMIN'] } },
      // Skip already-anonymized accounts
      NOT: { email: { startsWith: 'anonymized-' } },
    },
    select: { id: true },
  });

  if (inactive.length === 0) return;

  let count = 0;
  for (const u of inactive) {
    try {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          name: 'Compte supprimé',
          email: `anonymized-${u.id}@deleted.invalid`,
          avatarUrl: null,
        },
      });
      count++;
    } catch (e) {
      console.error(`[dataRetentionCron] Failed to anonymize user ${u.id}`, e && e.message ? e.message : e);
    }
  }

  if (count > 0) {
    console.log(`[dataRetentionCron] Anonymized ${count} inactive users (no activity for 2 years)`);
  }
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function runDataRetention() {
  console.log('[dataRetentionCron] Starting data retention run...');
  try { await purgeOldNotifications(); } catch (e) { console.error('[dataRetentionCron] purgeOldNotifications failed', e && e.message ? e.message : e); }
  try { await purgeOldMessages(); } catch (e) { console.error('[dataRetentionCron] purgeOldMessages failed', e && e.message ? e.message : e); }
  try { await purgeOldFeedPosts(); } catch (e) { console.error('[dataRetentionCron] purgeOldFeedPosts failed', e && e.message ? e.message : e); }
  try { await purgeOldPushSubscriptions(); } catch (e) { console.error('[dataRetentionCron] purgeOldPushSubscriptions failed', e && e.message ? e.message : e); }
  try { await anonymizeInactiveUsers(); } catch (e) { console.error('[dataRetentionCron] anonymizeInactiveUsers failed', e && e.message ? e.message : e); }
  console.log('[dataRetentionCron] Data retention run complete.');
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

let task = null;

if (cronEnabled) {
  // 02:00 daily — low-traffic window
  task = cron.schedule('0 2 * * *', async () => {
    await runDataRetention();
  }, { scheduled: true, timezone: cronTimezone });

  console.log(`Data retention cron scheduled (daily 02:00, tz=${cronTimezone})`);
}

module.exports = { runDataRetention, task };
