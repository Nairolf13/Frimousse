const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose(childId) {
  try {
    console.log('Diagnosing child id:', childId);

    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: { parents: { include: { parent: true } } },
    });

    if (!child) {
      console.log('-> Child not found');
      return;
    }

    console.log('-> Child', { id: child.id, name: child.name, centerId: child.centerId });

    const parentLinks = child.parents || [];
    console.log('-> Linked parents count:', parentLinks.length);

    for (const pc of parentLinks) {
      const p = pc.parent;
      console.log(`  - Parent link: parentId=${pc.parentId}`);
      if (p) {
        console.log('    parent record:', { id: p.id, firstName: p.firstName, lastName: p.lastName, email: p.email, centerId: p.centerId });
        // find any User linked to this parent
        const user = await prisma.user.findFirst({ where: { parentId: p.id }, select: { id: true, email: true, centerId: true, role: true } });
        if (user) console.log('    linked user:', user);
        else console.log('    linked user: none');
      } else {
        console.log('    parent record: missing (or deleted)');
      }
    }

    // Show admins for the child's center (if any)
    if (child.centerId) {
      const admins = await prisma.user.findMany({ where: { centerId: child.centerId }, select: { id: true, email: true, role: true, centerId: true } });
      console.log('-> Users in child.center:', admins.length);
      for (const a of admins) console.log('   -', a);
    } else {
      console.log('-> Child has no centerId set');
    }

    // Extra: show Parent table rows without centerId for this center
    const parentsWithoutCenter = await prisma.parent.findMany({ where: { centerId: null }, take: 20, select: { id: true, email: true, firstName: true, lastName: true } });
    if (parentsWithoutCenter.length) {
      console.log('-> Found parents without centerId (sample up to 20):');
      for (const p of parentsWithoutCenter) console.log('   -', p);
    }

    // Extra: show users without centerId but with parentId
    const usersParentWithoutCenter = await prisma.user.findMany({ where: { centerId: null, parentId: { not: null } }, take: 20, select: { id: true, email: true, parentId: true } });
    if (usersParentWithoutCenter.length) {
      console.log('-> Users with parentId but no centerId (sample up to 20):');
      for (const u of usersParentWithoutCenter) console.log('   -', u);
    }

  } catch (err) {
    console.error('Error during diagnose:', err);
  } finally {
    await prisma.$disconnect();
  }
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.log('Usage: node diagnose_child.js <childId> [childId2 ...]');
  process.exit(1);
}

(async () => {
  for (const id of ids) {
    await diagnose(id);
  }
})();
