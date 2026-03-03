const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Liste des bases de données
    const dbs = await prisma.$queryRaw`SELECT datname FROM pg_database WHERE datistemplate = false`;
    console.log('Bases de données:', dbs.map(r => r.datname));
    
    // Liste des rôles
    const roles = await prisma.$queryRaw`SELECT rolname FROM pg_roles`;
    console.log('Utilisateurs:', roles.map(r => r.rolname));
    
    // Vérifier si frimousseprod existe
    const hasProd = dbs.some(r => r.datname === 'frimousseprod');
    console.log('\nBase frimousseprod existe:', hasProd);
    
    // Vérifier si nairolf existe
    const hasNairolf = roles.some(r => r.rolname === 'nairolf');
    console.log('Utilisateur nairolf existe:', hasNairolf);
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('Erreur:', err.message);
  }
}

main();
