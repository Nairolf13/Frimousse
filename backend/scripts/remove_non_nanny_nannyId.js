const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for users with nannyId but role != "nanny"...');
  const affected = await prisma.user.updateMany({
    where: {
      role: { not: 'nanny' },
      nannyId: { not: null },
    },
    data: { nannyId: null },
  });
  console.log(`Updated ${affected.count} users.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
