const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateCotisationDates() {
  console.log('Starting cotisation date migration...');

  try {
    const now = new Date();
    // Get all nannies with cotisationPaidUntil in the future
    const nannies = await prisma.nanny.findMany({
      where: {
        cotisationPaidUntil: {
          gt: now // Only future dates
        }
      },
      select: {
        id: true,
        cotisationPaidUntil: true
      }
    });

    console.log(`Found ${nannies.length} nannies with future cotisation dates`);

    // Set all to November 1st, 2025 (1st of next month)
    const newDate = new Date(2025, 10, 1, 0, 0, 0, 0); // November is month 10 in JS

    for (const nanny of nannies) {
      await prisma.nanny.update({
        where: { id: nanny.id },
        data: { cotisationPaidUntil: newDate }
      });

      console.log(`Updated nanny ${nanny.id}: ${nanny.cotisationPaidUntil.toISOString()} -> ${newDate.toISOString()}`);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateCotisationDates();