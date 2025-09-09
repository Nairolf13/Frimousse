require('dotenv').config();
const { notifyUsers } = require('../lib/pushNotifications');
(async () => {
  try {
    const target = ['d33aa98c-4b62-4146-9d8a-1b32974faa23'];
    console.log('[send_to_user] target=', target);
    await notifyUsers(target, { title: 'Debug single user', body: 'Test push for single user id' });
    console.log('[send_to_user] notifyUsers finished');
  } catch (e) {
    console.error('[send_to_user] ERR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
