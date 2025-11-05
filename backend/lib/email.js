const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function renderTemplate(templateName, lang, substitutions = {}) {
  const templatePath = path.join(__dirname, '..', 'emailTemplates', `${templateName}_${lang}.html`);
  let html = null;
  try {
    html = fs.readFileSync(templatePath, 'utf8');
    for (const key of Object.keys(substitutions)) {
      const re = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(re, substitutions[key] == null ? '' : substitutions[key]);
    }
  } catch (e) {
    return null;
  }
  return html;
}

async function sendMail({ to, subject, text, html, attachments, prisma = null, paymentHistoryId = null, bypassOptOut = false, recipientsText = null } = {}) {
  // Allow an env toggle to completely disable outgoing emails (useful for staging/testing)
  const emailEnabled = process.env.EMAIL_SEND_ENABLED !== 'false';
  if (!emailEnabled) {
    if (prisma) {
      try {
        await prisma.emailLog.create({ data: { paymentHistoryId: paymentHistoryId || null, recipients: JSON.stringify(Array.isArray(to) ? to : [to]), recipientsText: recipientsText || (Array.isArray(to) ? to.join(', ') : String(to)), subject: subject || null, messageId: null, status: 'skipped', errorText: 'EMAIL_SEND_ENABLED=false', bypassOptOut: !!bypassOptOut } });
      } catch (e) {
        console.error('Failed to write EmailLog (skipped):', e && e.message ? e.message : e);
      }
    }
    console.log('Emails are disabled by EMAIL_SEND_ENABLED=false — skipping sendMail');
    return;
  }
  if (!process.env.SMTP_HOST) {
    // Diagnostic: if SMTP is not configured, record a non-intrusive EmailLog so we can
    // differentiate "cron ran but no SMTP configured" from other failures.
    if (prisma) {
      try {
        await prisma.emailLog.create({ data: { paymentHistoryId: paymentHistoryId || null, recipients: JSON.stringify(Array.isArray(to) ? to : [to]), recipientsText: recipientsText || (Array.isArray(to) ? to.join(', ') : String(to)), subject: subject || null, messageId: null, status: 'no_smtp', errorText: 'SMTP_HOST not configured', bypassOptOut: !!bypassOptOut } });
      } catch (e) {
        console.error('Failed to write EmailLog (no_smtp):', e && e.message ? e.message : e);
      }
    }
    console.log('SMTP_HOST not configured — cannot send email (created no_smtp EmailLog if prisma provided)');
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  const mailOptions = {
    from: process.env.SMTP_FROM || `no-reply@${process.env.SMTP_HOST || 'example.com'}`,
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    text,
    html: html || undefined,
    attachments: attachments || undefined,
  };
  try {
    console.log(`Attempting to send email to ${mailOptions.to} subject="${subject || ''}"`);
    const info = await transporter.sendMail(mailOptions);
    // If prisma provided, create EmailLog entry
    if (prisma) {
      try {
  await prisma.emailLog.create({ data: { paymentHistoryId: paymentHistoryId || null, recipients: JSON.stringify(Array.isArray(to) ? to : [to]), recipientsText: recipientsText || (Array.isArray(to) ? to.join(', ') : String(to)), subject: subject || null, messageId: info.messageId || null, status: 'sent', errorText: null, bypassOptOut: !!bypassOptOut } });
      } catch (e) {
        console.error('Failed to write EmailLog (sent):', e && e.message ? e.message : e);
      }
    }
    return info;
  } catch (e) {
    if (prisma) {
      try {
  await prisma.emailLog.create({ data: { paymentHistoryId: paymentHistoryId || null, recipients: JSON.stringify(Array.isArray(to) ? to : [to]), recipientsText: recipientsText || (Array.isArray(to) ? to.join(', ') : String(to)), subject: subject || null, messageId: null, status: 'failed', errorText: e && e.message ? e.message : String(e), bypassOptOut: !!bypassOptOut } });
      } catch (ee) {
        console.error('Failed to write EmailLog (failed):', ee && ee.message ? ee.message : ee);
      }
    }
    throw e;
  }
}

async function filterOptedOutEmails(prisma, emails) {
  if (!prisma || !Array.isArray(emails) || emails.length === 0) return emails.filter(Boolean);
  try {
    // Resolve users by email in a case-insensitive way and exclude those with notifyByEmail === false
    // Prisma doesn't support `in` with mode:'insensitive', so build an OR of equals with mode insensitive
    const cleaned = emails.map(e => String(e || '').trim()).filter(Boolean);
    if (cleaned.length === 0) return [];
    const or = cleaned.map(e => ({ email: { equals: e, mode: 'insensitive' } }));
    const users = await prisma.user.findMany({ where: { OR: or }, select: { email: true, notifyByEmail: true } }).catch(() => []);
    const optedOut = new Set((users || []).filter(u => u.notifyByEmail === false).map(u => String(u.email || '').toLowerCase()));
    return emails.filter(e => e && !optedOut.has(String(e).trim().toLowerCase()));
  } catch (e) {
    return emails.filter(Boolean);
  }
}

async function sendTemplatedMail({ templateName, lang, to, subject, text, substitutions = {}, prisma = null, attachments: extraAttachments = [], respectOptOut = true, paymentHistoryId = null, bypassOptOut = false, recipientsText = null }) {

  const html = renderTemplate(templateName, lang, substitutions);
  // normalize 'to' into array
  let recipients = Array.isArray(to) ? to.slice() : (to ? [to] : []);
  recipients = recipients.map(r => (typeof r === 'string' ? r : '')).filter(Boolean);
  // If prisma provided and respecting opt-out, filter out opted-out users
  if (prisma && respectOptOut) {
    recipients = await filterOptedOutEmails(prisma, recipients);
  }
  if (!recipients.length) return;
  // merge attachments: logo + extraAttachments
  const attachments = [];
  try {
    const localLogoPath = path.join(__dirname, '..', '..', 'public', 'imgs', 'LogoFrimousse.webp');
    if (fs.existsSync(localLogoPath)) {
      substitutions.logoUrl = `cid:logo-frimousse`;
      attachments.push({ filename: 'LogoFrimousse.webp', path: localLogoPath, cid: 'logo-frimousse' });
    }
  } catch (e) {
    // ignore
  }
  if (Array.isArray(extraAttachments) && extraAttachments.length) {
    // expected extraAttachments items to follow nodemailer's attachment spec (filename, content, contentType, contentDisposition, content etc.)
    for (const a of extraAttachments) attachments.push(a);
  }

  await sendMail({ to: recipients, subject, text, html, attachments: attachments.length ? attachments : undefined, prisma, paymentHistoryId, bypassOptOut, recipientsText });
}

async function getParentEmailsForDate(prisma, date, centerId, isSuperAdmin) {
  const where = { date: new Date(date) };
  if (!isSuperAdmin && centerId) where.centerId = centerId;
  const assignments = await prisma.assignment.findMany({ where, include: { child: { include: { parents: { include: { parent: true } } } } } });
  const parentEmails = [];
  for (const a of assignments) {
    const child = a.child;
    if (!child) continue;
    (child.parents || []).forEach(p => { if (p && p.parent && p.parent.email) parentEmails.push(p.parent.email); });
  }
  return [...new Set(parentEmails)].filter(Boolean);
}

module.exports = { renderTemplate, sendMail, sendTemplatedMail, getParentEmailsForDate };
