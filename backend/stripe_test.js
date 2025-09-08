require('dotenv').config({ path: './backend/.env' });
const key = process.env.STRIPE_SECRET_KEY || '';
const stripe = require('stripe')(key);
stripe.customers.list({ limit: 1 })
  .then(r => {
  })
  .catch(err => {
    console.error('Stripe test ERROR:', err && err.message ? err.message : err);
    if (err && err.raw && err.raw.message) console.error('Stripe raw message:', err.raw.message);
    process.exit(1);
  });
