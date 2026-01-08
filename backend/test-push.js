const prisma = require('./lib/prismaClient');
const { notifyUsers } = require('./lib/pushNotifications');

(async () => {
  const adminId = '9a803463-edff-454f-9711-40cfc9b74fe9';
  console.log('\n=== 🔔 Test envoi notification push ===\n');
  
  await notifyUsers([adminId], { 
    title: 'Test Push ' + new Date().toLocaleTimeString(), 
    body: 'Si tu vois cette notification, ça fonctionne ! ' + new Date().toLocaleTimeString(),
    data: { url: '/dashboard', type: 'test' }
  });
  
  console.log('\n=== ✅ Test terminé ===');
  console.log('Vérifie:');
  console.log('1. Les logs du service worker dans la console (F12 > Console)');
  console.log('2. Si une notification apparaît en haut à droite de ton écran');
  console.log('3. Si tu vois des logs "[SW] Push event received!" dans la console\n');
  
  await prisma.$disconnect();
})().catch(e => { 
  console.error('\n❌ ERREUR:', e.message); 
  console.error(e.stack);
  process.exit(1); 
});
