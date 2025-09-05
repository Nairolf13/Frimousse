const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const list = await prisma.child.findMany({ select: { id: true, name: true, birthDate: true, cotisationPaidUntil: true } });
  console.log(`Found ${list.length} children`);
  for (const c of list) {
  console.log(c.id, c.name, c.birthDate ? c.birthDate.toISOString() : null, c.cotisationPaidUntil ? c.cotisationPaidUntil.toISOString() : null);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
