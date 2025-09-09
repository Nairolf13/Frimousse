// Safely empty the PushSubscription table (destructive).
// Usage: node scripts/empty_push_subs.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  const before = await prisma.pushSubscription.count();
  console.log('PushSubscription rows before:', before);

  if (before === 0) {
    console.log('Nothing to delete. Exiting.');
    return;
  }

  const result = await prisma.pushSubscription.deleteMany({});
  // result.count is present in Prisma deleteMany result
  console.log('Deleted count:', result.count);

  const after = await prisma.pushSubscription.count();
  console.log('PushSubscription rows after:', after);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
