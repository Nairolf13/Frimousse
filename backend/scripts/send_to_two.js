require('dotenv').config();
const { notifyUsers } = require('../lib/pushNotifications');
(async () => {
  try {
    const targets = ['88b2ef5e-53ea-4d67-bea7-84fd300122f7', 'd33aa98c-4b62-4146-9d8a-1b32974faa23'];
    console.log('[send_to_two] targets=', targets);
    await notifyUsers(targets, { title: 'Debug two users', body: 'Test push for two users' });
    console.log('[send_to_two] done');
  } catch (e) {
    console.error('[send_to_two] ERR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
