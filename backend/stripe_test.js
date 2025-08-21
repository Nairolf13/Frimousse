require('dotenv').config({ path: './backend/.env' });
const key = process.env.STRIPE_SECRET_KEY || '';
console.log('Loaded STRIPE_SECRET_KEY length=', key.length, 'startsWith sk_=', key.startsWith('sk_'));
const stripe = require('stripe')(key);
stripe.customers.list({ limit: 1 })
  .then(r => {
    console.log('Stripe test OK, customers:', r.data.length);
  })
  .catch(err => {
    console.error('Stripe test ERROR:', err && err.message ? err.message : err);
    if (err && err.raw && err.raw.message) console.error('Stripe raw message:', err.raw.message);
    process.exit(1);
  });
