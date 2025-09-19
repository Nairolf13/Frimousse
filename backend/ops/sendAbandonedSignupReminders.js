const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Reminders schedule in hours
const REMINDER_HOURS = [24, 72, 24*7]; // 24h, 72h, 7d

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const users = await prisma.user.findMany({ where: {} });

  for (const u of users) {
    const sub = await prisma.subscription.findFirst({ where: { userId: u.id } });
    if (sub) continue;

    let reminder = await prisma.abandonedSignupReminder.findUnique({ where: { userId: u.id } });
    const createdAt = u.createdAt;
    const hoursSince = (Date.now() - new Date(createdAt).getTime()) / (1000*60*60);

    if (!reminder) {
      if (hoursSince >= 0 && hoursSince <= REMINDER_HOURS[REMINDER_HOURS.length -1]) {
        reminder = await prisma.abandonedSignupReminder.create({ data: { userId: u.id } });
      } else {
        continue;
      }
    }

    if (reminder.sentCount >= REMINDER_HOURS.length) continue;

    const nextReminderHour = REMINDER_HOURS[reminder.sentCount];
    if (hoursSince >= nextReminderHour) {
      const acceptLang = (u.email || '').includes('.com') ? 'en' : 'fr';
      const lang = ['fr', 'en'].includes(acceptLang) ? acceptLang : 'fr';
      const templatePath = path.join(__dirname, '..', 'emailTemplates', `abandoned_signup_${lang}.html`);
      let html = null;
      try { html = fs.readFileSync(templatePath, 'utf8'); } catch (e) { html = null; }
      if (!html) continue;
      html = html.replace(/{{name}}/g, u.name || '').replace(/{{frontendUrl}}/g, frontendUrl);
      try {
        const subject = lang === 'fr' ? 'Finalisez votre inscription sur Frimousse' : 'Finish your Frimousse signup';
        await require('../lib/email').sendTemplatedMail({ templateName: 'abandoned_signup', lang, to: u.email, subject, substitutions: { name: u.name || '', frontendUrl }, prisma });
        await prisma.abandonedSignupReminder.update({ where: { id: reminder.id }, data: { sentCount: reminder.sentCount + 1, lastSentAt: new Date() } });
        console.log(`Reminder sent to ${u.email}`);
      } catch (e) {
        console.error('Failed sending reminder to', u.email, e);
      }
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
