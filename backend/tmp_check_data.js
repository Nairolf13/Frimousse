const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Vérifier si des assignments existent pour février 2026
  const febAssignments = await prisma.assignment.count({
    where: {
      date: {
        gte: new Date(2026, 1, 1),  // Feb 1, 2026
        lte: new Date(2026, 1, 28)  // Feb 28, 2026
      }
    }
  });
  console.log('Assignments en février 2026:', febAssignments);
  
  // Compter les parents
  const parentCount = await prisma.parent.count();
  console.log('Nombre de parents:', parentCount);
  
  // Derniers emails envoyés
  const lastEmails = await prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, subject: true, status: true }
  });
  console.log('\n5 derniers emails envoyés:');
  console.log(JSON.stringify(lastEmails, null, 2));
  
  // Derniers PaymentHistory créés
  const lastPayments = await prisma.paymentHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, month: true, year: true, total: true }
  });
  console.log('\n5 derniers PaymentHistory:');
  console.log(JSON.stringify(lastPayments, null, 2));
  
  await prisma.$disconnect();
})();
