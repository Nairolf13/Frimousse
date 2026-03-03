const { PrismaClient } = require('@prisma/client');

// Connexion à la base de production (mot de passe URL-encodé)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://nairolf:Florian%2A%26%2421051992@localhost:5432/frimousseprod?schema=public'
    }
  }
});

(async () => {
  // Emails de mars 2026 (factures)
  const logs = await prisma.emailLog.findMany({
    where: { 
      createdAt: { gte: new Date('2026-03-01') },
      subject: { contains: 'Facture' }
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, createdAt: true, recipients: true, recipientsText: true, subject: true, status: true }
  });
  console.log('=== BASE PRODUCTION ===');
  console.log('\nEmails factures depuis le 1er mars 2026:');
  console.log(JSON.stringify(logs, null, 2));
  
  // PaymentHistory pour février 2026 (factures du mois précédent)
  const payments = await prisma.paymentHistory.findMany({
    where: { year: 2026, month: 2 },
    take: 20,
    select: { id: true, createdAt: true, parentId: true, month: true, year: true, total: true }
  });
  console.log('\nPaymentHistory pour février 2026:');
  console.log(JSON.stringify(payments, null, 2));
  
  // Tous les emails de mars 2026
  const allMarchLogs = await prisma.emailLog.findMany({
    where: { 
      createdAt: { gte: new Date('2026-03-01') }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, createdAt: true, subject: true, status: true }
  });
  console.log('\nTous les emails depuis le 1er mars 2026:');
  console.log(JSON.stringify(allMarchLogs, null, 2));

  // Derniers PaymentHistory créés (tous mois confondus)
  const lastPayments = await prisma.paymentHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, month: true, year: true, total: true }
  });
  console.log('\n5 derniers PaymentHistory:');
  console.log(JSON.stringify(lastPayments, null, 2));
  
  await prisma.$disconnect();
})();
