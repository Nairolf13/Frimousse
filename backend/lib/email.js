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

async function sendMail({ to, subject, text, html, attachments } = {}) {
  if (!process.env.SMTP_HOST) return;
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
  await transporter.sendMail(mailOptions);
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

async function sendTemplatedMail({ templateName, lang, to, subject, text, substitutions = {}, prisma = null }) {
  // If a local logo exists, attach it and replace logoUrl by a CID so images show in email clients
  const attachments = [];
  try {
    const localLogoPath = path.join(__dirname, '..', '..', 'public', 'imgs', 'LogoFrimousse.webp');
    if (fs.existsSync(localLogoPath)) {
      // override substitution to use CID
      substitutions.logoUrl = `cid:logo-frimousse`;
      attachments.push({ filename: 'LogoFrimousse.webp', path: localLogoPath, cid: 'logo-frimousse' });
    }
  } catch (e) {
    // ignore if file checks fail
  }

  const html = renderTemplate(templateName, lang, substitutions);
  // normalize 'to' into array
  let recipients = Array.isArray(to) ? to.slice() : (to ? [to] : []);
  recipients = recipients.map(r => (typeof r === 'string' ? r : '')).filter(Boolean);
  // If prisma provided, filter out opted-out users
  if (prisma) {
    recipients = await filterOptedOutEmails(prisma, recipients);
  }
  if (!recipients.length) return;
  await sendMail({ to: recipients, subject, text, html, attachments: attachments.length ? attachments : undefined });
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
