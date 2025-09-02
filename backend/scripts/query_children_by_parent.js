const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run(parentId) {
  try {
    console.log('Query children where parents.some.parentId =', parentId);
    const children = await prisma.child.findMany({ where: { parents: { some: { parentId } } }, include: { parents: { include: { parent: true } } } });
    console.log('Found', children.length, 'children');
    for (const c of children) {
      console.log(c.id, c.name, (c.parents || []).map(p => ({parentId: p.parentId, parentEmail: p.parent ? p.parent.email : null}))); 
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

const id = process.argv[2] || '8c927693-0b75-438a-bdb9-16b506bcfd84';
run(id);
