const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating default center and assigning existing records to it...');
  const center = await prisma.center.create({ data: { name: 'Default Center' } });
  const centerId = center.id;
  // Update users without center
  await prisma.user.updateMany({ where: { centerId: null }, data: { centerId } });
  await prisma.parent.updateMany({ where: { centerId: null }, data: { centerId } });
  await prisma.child.updateMany({ where: { centerId: null }, data: { centerId } });
  await prisma.nanny.updateMany({ where: { centerId: null }, data: { centerId } });
  await prisma.assignment.updateMany({ where: { centerId: null }, data: { centerId } });
  await prisma.schedule.updateMany({ where: { centerId: null }, data: { centerId } });
  await prisma.report.updateMany({ where: { centerId: null }, data: { centerId } });
  console.log('Backfill completed. Center id:', centerId);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
