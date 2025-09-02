const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug(childId) {
  try {
    console.log('Lookup child:', childId);
    const child = await prisma.child.findUnique({ where: { id: childId }, include: { parents: { include: { parent: true } } } });
    if (!child) {
      console.log('No child found', childId);
      process.exit(0);
    }
    console.log('Child:', { id: child.id, name: child.name, centerId: child.centerId });
    console.log('Parents linked count:', (child.parents || []).length);
    for (const pc of child.parents) {
      console.log(' - parent link', { parentId: pc.parentId, parentName: pc.parent ? `${pc.parent.firstName} ${pc.parent.lastName}` : null, parentEmail: pc.parent ? pc.parent.email : null });
    }
  } catch (err) {
    console.error('Error', err);
  } finally {
    await prisma.$disconnect();
  }
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.log('Usage: node debug_child_parents.js <childId> [childId2 ...]');
  process.exit(1);
}
(async () => {
  for (const id of ids) {
    await debug(id);
  }
})();
