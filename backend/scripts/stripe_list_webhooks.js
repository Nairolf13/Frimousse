require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
(async () => {
  try {
    const whs = await stripe.webhookEndpoints.list({ limit: 20 });
    console.log('webhook endpoints count:', whs.data.length);
    whs.data.forEach(w => console.log({ id: w.id, url: w.url, status: w.status, description: w.description }));
  } catch (e) { console.error('stripe error', e && e.message ? e.message : e); }
})();
