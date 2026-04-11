const cron = require('node-cron');
const prisma = require('./prismaClient');
const { sendTemplatedMail } = require('./email');

const cronTimezone = process.env.CRON_TIMEZONE || 'Europe/Paris';
const adminEmail = process.env.SUPER_ADMIN_EMAIL || process.env.SMTP_FROM;
const frontendUrl = process.env.FRONTEND_URL || 'https://lesfrimousses.com';

async function sendNotFoundDigest() {
  if (!adminEmail) {
    console.warn('[notFoundDigestCron] No SUPER_ADMIN_EMAIL or SMTP_FROM configured — skipping digest');
    return;
  }

  try {
    // Fetch unresolved 404s seen in the last 24h, ordered by hit count
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await prisma.notFoundLog.findMany({
      where: { resolved: false, lastSeenAt: { gte: since } },
      orderBy: [{ count: 'desc' }, { lastSeenAt: 'desc' }],
      take: 50,
    });

    if (logs.length === 0) {
      console.log('[notFoundDigestCron] No new 404s in the last 24h — skipping email');
      return;
    }

    // Build HTML rows for the email table
    const rows = logs.map((log, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const lastSeen = new Date(log.lastSeenAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      return `<tr style="background:${bg};">
        <td style="padding:10px 16px;font-size:13px;color:#374151;word-break:break-all;">${escapeHtml(log.url)}</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0b5566;text-align:center;">${log.count}</td>
        <td style="padding:10px 16px;font-size:12px;color:#6b7280;text-align:right;white-space:nowrap;">${lastSeen}</td>
      </tr>`;
    }).join('');

    const date = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    await sendTemplatedMail({
      templateName: 'not_found_digest',
      lang: 'fr',
      to: adminEmail,
      subject: `[Frimousse] ${logs.length} page(s) introuvable(s) — ${date}`,
      substitutions: {
        date,
        count: String(logs.length),
        rows,
        adminUrl: `${frontendUrl}/admin/not-found-logs`,
      },
      bypassOptOut: true,
    });

    console.log(`[notFoundDigestCron] Digest sent — ${logs.length} URL(s) reported`);
  } catch (e) {
    console.error('[notFoundDigestCron] Error:', e?.message);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Every day at 18:30
cron.schedule('30 18 * * *', async () => {
  console.log('[notFoundDigestCron] Running 404 digest...');
  await sendNotFoundDigest();
}, { scheduled: true, timezone: cronTimezone });

console.log('[notFoundDigestCron] Scheduled (daily 18:30, tz=' + cronTimezone + ')');

module.exports = { sendNotFoundDigest };
