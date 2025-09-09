require('dotenv').config();
const { notifyUsers } = require('../lib/pushNotifications');
(async () => {
  try {
    const nannyUserId = 'd33aa98c-4b62-4146-9d8a-1b32974faa23';
    console.log('[admin-notify] target nannyUserId=', nannyUserId);
    const payload = { title: 'Affectation (admin)', body: "Vous avez une nouvelle affectation (créée par un administrateur)", data: { url: '/planning', assignmentId: 'test-admin-assign' } };
    await notifyUsers([nannyUserId], payload);
    console.log('[admin-notify] notifyUsers finished');
  } catch (e) {
    console.error('[admin-notify] ERR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
