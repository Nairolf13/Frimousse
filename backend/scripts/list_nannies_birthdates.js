const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(){
  const nannies = await prisma.nanny.findMany({ select: { id: true, name: true, birthDate: true } });
  console.log('Found', nannies.length, 'nannies');
  for(const n of nannies){
    console.log(n.id, '\t', n.name, '\t', n.birthDate ? n.birthDate.toISOString() : null);
  }
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
