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

async function sendTemplatedMail({ templateName, lang, to, subject, text, substitutions = {} }) {
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
  await sendMail({ to, subject, text, html, attachments: attachments.length ? attachments : undefined });
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
