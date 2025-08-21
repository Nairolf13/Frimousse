require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const customerId = process.argv[2];
(async () => {
  if (!customerId) return console.error('Usage: node stripe_check_customer.js <customerId>');
  try {
    const customer = await stripe.customers.retrieve(customerId);
    console.log('customer:', customer && customer.id ? { id: customer.id, email: customer.email } : customer);
    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
    console.log('subscriptions count:', subs.data.length);
    subs.data.forEach(s => console.log('sub:', s.id, 'status:', s.status, 'current_period_end:', s.current_period_end));
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 5 });
    console.log('invoices count:', invoices.data.length);
    invoices.data.forEach(i => console.log('invoice:', i.id, 'status:', i.status, 'paid:', i.paid, 'amount_due:', i.amount_due));
  } catch (e) {
    console.error('stripe api error', e && e.message ? e.message : e);
  }
})();
