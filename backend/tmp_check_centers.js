const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCenters() {
  try {
    console.log('=== Vérification des centres ===\n');
    
    const centers = await prisma.center.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        users: {
          where: {
            OR: [
              { role: 'admin' },
              { role: 'super-admin' }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
            city: true,
            postalCode: true,
            region: true,
            country: true,
            role: true
          },
          take: 1
        }
      }
    });

    console.log(`Nombre de centres trouvés: ${centers.length}\n`);

    centers.forEach(center => {
      console.log(`Centre: ${center.name}`);
      console.log(`  ID: ${center.id}`);
      console.log(`  Créé le: ${center.createdAt}`);
      console.log(`  Admins trouvés: ${center.users.length}`);
      
      if (center.users.length > 0) {
        const admin = center.users[0];
        console.log(`  Admin:`);
        console.log(`    Nom: ${admin.name}`);
        console.log(`    Email: ${admin.email}`);
        console.log(`    Role: ${admin.role}`);
        console.log(`    Adresse: ${admin.address || 'NON RENSEIGNÉE'}`);
        console.log(`    Ville: ${admin.city || 'NON RENSEIGNÉE'}`);
        console.log(`    Code postal: ${admin.postalCode || 'NON RENSEIGNÉ'}`);
        console.log(`    Région: ${admin.region || 'NON RENSEIGNÉE'}`);
        console.log(`    Pays: ${admin.country || 'NON RENSEIGNÉ'}`);
      } else {
        console.log(`  ⚠️ AUCUN ADMIN TROUVÉ POUR CE CENTRE!`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCenters();
