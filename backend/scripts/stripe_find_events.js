require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const subId = process.argv[2];
const customerId = process.argv[3];
(async () => {
  if (!subId && !customerId) return console.error('Usage: node stripe_find_events.js <subscriptionId?> <customerId?>');
  try {
    const events = await stripe.events.list({ limit: 100 });
    const matches = events.data.filter(ev => {
      try {
        const obj = ev.data && ev.data.object;
        if (!obj) return false;
        const str = JSON.stringify(obj);
        if (subId && str.includes(subId)) return true;
        if (customerId && str.includes(customerId)) return true;
        return false;
      } catch (e) { return false; }
    });
    console.log('found events:', matches.length);
    matches.forEach(ev => {
      console.log('event:', ev.id, ev.type, 'created:', new Date(ev.created*1000).toISOString());
    });
  } catch (e) {
    console.error('stripe error', e && e.message ? e.message : e);
  }
})();
