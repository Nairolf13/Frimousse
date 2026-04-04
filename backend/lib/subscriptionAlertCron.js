/**
 * subscriptionAlertCron.js
 *
 * Two jobs:
 *  1. Trial expiry alerts — runs daily at 08:00 (Europe/Paris)
 *     Sends an email to admins whose trial ends in exactly 7 days or 1 day.
 *
 *  2. Payment failed alerts — called directly from the Stripe webhook
 *     (invoice.payment_failed) so there is no cron for this one.
 */

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendTemplatedMail } = require('./email');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://lesfrimousses.com';
const cronTimezone = process.env.CRON_TZ || 'Europe/Paris';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ---------------------------------------------------------------------------
// Trial expiry alert — check every day
// ---------------------------------------------------------------------------

async function checkTrialAlerts() {
  const today = startOfDayUTC(new Date());
  const in7 = startOfDayUTC(addDays(today, 7));
  const in7End = new Date(in7.getTime() + 24 * 60 * 60 * 1000);
  const in1 = startOfDayUTC(addDays(today, 1));
  const in1End = new Date(in1.getTime() + 24 * 60 * 60 * 1000);

  // Find trialing subscriptions whose trialEnd falls in the two windows
  const subs = await prisma.subscription.findMany({
    where: {
      status: 'trialing',
      trialEnd: {
        gte: in7,
        lt: in7End,
      },
    },
  });

  // Also find subscriptions expiring in 1 day
  const subs1 = await prisma.subscription.findMany({
    where: {
      status: 'trialing',
      trialEnd: {
        gte: in1,
        lt: in1End,
      },
    },
  });

  const allSubs = [...subs.map(s => ({ ...s, daysLeft: 7 })), ...subs1.map(s => ({ ...s, daysLeft: 1 }))];

  for (const sub of allSubs) {
    if (!sub.userId) continue;
    try {
      const user = await prisma.user.findUnique({ where: { id: sub.userId }, select: { email: true, name: true } });
      if (!user || !user.email) continue;

      const trialEndDate = sub.trialEnd ? new Date(sub.trialEnd).toLocaleDateString('fr-FR') : '';
      const planLabel = sub.plan ? (sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)) : 'votre plan';
      const daysLeft = sub.daysLeft;

      const subject = daysLeft === 1
        ? `⚠️ Votre période d'essai se termine demain`
        : `📅 Votre période d'essai se termine dans ${daysLeft} jours`;

      const content = `
        <p>Bonjour ${user.name || ''},</p>
        <p>Votre période d'essai <strong>${planLabel}</strong> sur Les Frimousses se termine le <strong>${trialEndDate}</strong> (dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}).</p>
        <p>Pour continuer à accéder à toutes les fonctionnalités sans interruption, assurez-vous que vos informations de paiement sont bien renseignées.</p>
        <p style="margin-top: 24px;">
          <a href="${FRONTEND_URL}/subscription"
             style="background:#0b5566;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
            Gérer mon abonnement
          </a>
        </p>
        <p style="margin-top:16px;font-size:13px;color:#666;">
          Si vous avez des questions, contactez notre support depuis votre espace personnel.
        </p>
      `;

      await sendTemplatedMail({
        templateName: 'generic',
        lang: 'fr',
        to: user.email,
        subject,
        substitutions: { title: 'Période d\'essai', content },
        bypassOptOut: true,
      });

      console.log(`[subscriptionAlertCron] Trial alert sent to ${user.email} (daysLeft=${daysLeft})`);
    } catch (e) {
      console.error('[subscriptionAlertCron] Failed to send trial alert for sub', sub.id, e && e.message ? e.message : e);
    }
  }
}

// ---------------------------------------------------------------------------
// Payment failed notification — called from webhook handler
// ---------------------------------------------------------------------------

async function sendPaymentFailedAlert(stripeSubscriptionId) {
  try {
    const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId } });
    if (!sub || !sub.userId) return;

    const user = await prisma.user.findUnique({ where: { id: sub.userId }, select: { email: true, name: true } });
    if (!user || !user.email) return;

    const planLabel = sub.plan ? (sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)) : 'votre plan';

    const content = `
      <p>Bonjour ${user.name || ''},</p>
      <p>Le prélèvement de votre abonnement <strong>${planLabel}</strong> sur Les Frimousses a <strong style="color:red;">échoué</strong>.</p>
      <p>Pour éviter la suspension de votre accès, merci de mettre à jour votre moyen de paiement dès que possible.</p>
      <p style="margin-top: 24px;">
        <a href="${FRONTEND_URL}/subscription"
           style="background:#dc2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
          Mettre à jour mon paiement
        </a>
      </p>
      <p style="margin-top:16px;font-size:13px;color:#666;">
        Si vous avez des questions, contactez notre support depuis votre espace personnel.
      </p>
    `;

    await sendTemplatedMail({
      templateName: 'generic',
      lang: 'fr',
      to: user.email,
      subject: '🔴 Échec de prélèvement — action requise',
      substitutions: { title: 'Échec de paiement', content },
      bypassOptOut: true,
    });

    console.log(`[subscriptionAlertCron] Payment failed alert sent to ${user.email}`);
  } catch (e) {
    console.error('[subscriptionAlertCron] Failed to send payment failed alert', e && e.message ? e.message : e);
  }
}

// ---------------------------------------------------------------------------
// Send payment succeeded alert
// ---------------------------------------------------------------------------

async function sendPaymentSucceededAlert(stripeSubscriptionId) {
  try {
    const sub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId } });
    if (!sub || !sub.userId) return;

    const user = await prisma.user.findUnique({ where: { id: sub.userId }, select: { email: true, name: true } });
    if (!user || !user.email) return;

    const planLabel = sub.plan ? (sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)) : 'votre plan';

    const content = `
      <p>Bonjour ${user.name || ''},</p>
      <p>Votre paiement pour l'abonnement <strong>${planLabel}</strong> sur Les Frimousses a bien été <strong style="color:#16a34a;">accepté</strong>.</p>
      <p>Votre accès est actif et vos fonctionnalités sont disponibles immédiatement.</p>
      <p>Vous pouvez consulter vos factures et gérer votre abonnement depuis votre espace personnel.</p>
      <p style="margin-top: 24px;">
        <a href="${FRONTEND_URL}/subscription"
           style="background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
          Voir mon abonnement
        </a>
      </p>
      <p style="margin-top:16px;font-size:13px;color:#666;">
        Merci de faire confiance à Frimousse pour la gestion de votre crèche.
      </p>
    `;

    await sendTemplatedMail({
      templateName: 'generic',
      lang: 'fr',
      to: user.email,
      subject: '✅ Paiement confirmé — abonnement actif',
      substitutions: { title: 'Paiement confirmé', content },
      bypassOptOut: true,
    });

    console.log(`[subscriptionAlertCron] Payment succeeded alert sent to ${user.email}`);
  } catch (e) {
    console.error('[subscriptionAlertCron] Failed to send payment succeeded alert', e && e.message ? e.message : e);
  }
}

// ---------------------------------------------------------------------------
// Trial expiration cleanup — marks expired trialing subscriptions as canceled
// ---------------------------------------------------------------------------

async function expireTrials() {
  try {
    const now = new Date();
    const result = await prisma.subscription.updateMany({
      where: {
        status: 'trialing',
        trialEnd: { lt: now },
      },
      data: {
        status: 'canceled',
        canceledAt: now,
      },
    });
    if (result.count > 0) {
      console.log(`[subscriptionAlertCron] Expired ${result.count} trial(s) → status set to canceled`);
    }
  } catch (e) {
    console.error('[subscriptionAlertCron] expireTrials failed', e && e.message ? e.message : e);
  }
}

// ---------------------------------------------------------------------------
// Schedule daily jobs
// ---------------------------------------------------------------------------

const cronEnabled = process.env.ENABLE_PAYMENT_CRON !== 'false';

let task = null;
let expireTask = null;

if (cronEnabled) {
  // 08:00 — send trial expiry alerts (7 days and 1 day before end)
  task = cron.schedule('0 8 * * *', async () => {
    console.log('[subscriptionAlertCron] Running trial expiry check...');
    try {
      await checkTrialAlerts();
    } catch (e) {
      console.error('[subscriptionAlertCron] checkTrialAlerts failed', e);
    }
  }, { scheduled: true, timezone: cronTimezone });

  // 00:05 — expire trials that ended since last run
  expireTask = cron.schedule('5 0 * * *', async () => {
    console.log('[subscriptionAlertCron] Running trial expiration cleanup...');
    await expireTrials();
  }, { scheduled: true, timezone: cronTimezone });

  console.log(`Subscription alert cron scheduled (daily 08:00 alerts + 00:05 cleanup, tz=${cronTimezone})`);
}

module.exports = { checkTrialAlerts, expireTrials, sendPaymentFailedAlert, sendPaymentSucceededAlert, task, expireTask };
