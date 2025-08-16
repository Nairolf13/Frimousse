require('dotenv').config({ path: '../.env' });
const nodemailer = require('nodemailer');

(async () => {
  try {
  // debug logging removed

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });

  // verify connection
  await transporter.verify();

    const mailOptions = {
      from: process.env.SMTP_FROM || `no-reply@${process.env.SMTP_HOST || 'example.com'}`,
      to: process.env.SMTP_USER || 'test@example.com',
      subject: 'Frimousse SMTP test',
      text: 'This is a test email from Frimousse project.',
    };

  const info = await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('SMTP test failed:');
    console.error(err && err.message ? err.message : err);
    if (err && err.response) console.error('SMTP response:', err.response);
    process.exitCode = 1;
  }
})();
