const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug(email) {
  try {
    console.log('Lookup parent by email:', email);
    const parent = await prisma.parent.findFirst({ where: { email: { equals: email.trim(), mode: 'insensitive' } }, include: { children: { include: { child: true } }, center: true, user: true } });
    if (!parent) {
      console.log('No parent record found for email', email);
      process.exit(0);
    }
    console.log('Parent:', { id: parent.id, firstName: parent.firstName, lastName: parent.lastName, email: parent.email, centerId: parent.centerId });
    console.log('Linked children count:', parent.children.length);
    for (const pc of parent.children) {
      console.log(' - child', pc.childId, pc.child ? pc.child.name : '(not loaded)');
    }
  } catch (err) {
    console.error('Error', err);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || 'wiredtik@gmail.com';
debug(email);
