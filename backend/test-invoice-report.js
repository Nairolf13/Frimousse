const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the payment cron function
const { calculatePaymentsForMonth } = require('./lib/paymentCron');

(async () => {
  console.log('\n=== 🧪 Test du rapport d\'envoi des factures ===\n');
  
  // Test pour le mois précédent (décembre 2025)
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth() - 1; // Mois précédent (0-11)
  const targetYear = monthIndex === -1 ? year - 1 : year;
  const targetMonthIndex = monthIndex === -1 ? 11 : monthIndex;
  
  const monthName = new Date(targetYear, targetMonthIndex, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  
  console.log(`📅 Test pour : ${monthName}`);
  console.log(`   Year: ${targetYear}, Month Index: ${targetMonthIndex}\n`);
  
  // Vérifier qu'il y a des super-admins
  const superAdmins = await prisma.user.findMany({ 
    where: { role: { in: ['super-admin', 'super_admin', 'superadmin'] } }, 
    select: { id: true, email: true, name: true } 
  });
  
  console.log(`👤 Super-admins trouvés : ${superAdmins.length}`);
  superAdmins.forEach(admin => {
    console.log(`   - ${admin.name} (${admin.email})`);
  });
  console.log('');
  
  // Vérifier combien de parents ont des factures à envoyer
  const parents = await prisma.parent.findMany({
    include: { 
      children: { include: { child: true } }
    }
  });
  
  console.log(`👨‍👩‍👧 Parents dans la base : ${parents.length}\n`);
  
  console.log('🚀 Lancement du calcul et envoi des factures...\n');
  console.log('─────────────────────────────────────────────────\n');
  
  try {
    await calculatePaymentsForMonth(targetYear, targetMonthIndex);
    
    console.log('\n─────────────────────────────────────────────────');
    console.log('\n✅ Test terminé avec succès !');
    console.log('\n📊 Vérifications à faire :');
    console.log('1. Regarde les logs ci-dessus pour voir le résumé');
    console.log('2. Vérifie ta boîte email pour le rapport détaillé');
    console.log('3. Vérifie la notification push dans ton navigateur');
    console.log('4. Vérifie la pastille "Notifications" dans la sidebar\n');
  } catch (error) {
    console.error('\n❌ Erreur pendant le test :', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
})();
