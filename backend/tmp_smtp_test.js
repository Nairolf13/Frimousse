const path = require('path');
// Load .env like the server does
require('dotenv').config({ path: path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? '.env.production' : '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { sendMail } = require('./lib/email');

async function main() {
	const to = process.env.SMTP_TEST_TO || process.env.SMTP_USER;
	if (!to) {
		console.error('No recipient configured. Set SMTP_TEST_TO or ensure SMTP_USER is set in env.');
		process.exit(2);
	}
	try {
		await sendMail({
			to,
			subject: 'Frimousse SMTP test',
			text: 'Ceci est un email de test envoyé depuis backend/tmp_smtp_test.js. Si vous le recevez, la configuration SMTP fonctionne.'
		});
		console.log('SMTP test: email envoyé avec succès à', to);
		process.exit(0);
	} catch (err) {
		console.error('SMTP test: erreur lors de l\'envoi du mail');
		console.error(err && err.message ? err.message : err);
		process.exit(3);
	}
}

main();
