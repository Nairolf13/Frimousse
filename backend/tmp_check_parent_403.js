const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function checkUser() {
  // Le refreshToken depuis les cookies de production
  const refreshTokenFromCookie = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNhMmMxZGE1LWRhMDktNDBhNy1hZTkyLWI3ODY5NTZjYzZmMiIsImNlbnRlcklkIjoiNzRkN2ZkZjMtZTAzMS00M2JlLTg1OTYtYjljMWEwMDIyNTNhIiwiaWF0IjoxNzY3ODg0MjAyLCJleHAiOjE3Njg0ODkwMDJ9.FUNNIsLfB2wDkC3maQADWD5JeUTPG9y1Dbkmu4oOBnY';
  const userId = '3a2c1da5-da09-40a7-ae92-b786956cc6f2';
  
  console.log('=== Vérification du refreshToken dans la DB ===');
  const stored = await prisma.refreshToken.findUnique({ 
    where: { token: refreshTokenFromCookie } 
  });
  
  if (!stored) {
    console.log('❌ REFRESH TOKEN NON TROUVÉ DANS LA BASE');
    console.log('Le refreshToken n\'existe pas dans la table refreshToken.');
    console.log('Cela explique le 403 "Invalid refresh token"');
    console.log('\nSolutions:');
    console.log('1. Se déconnecter et se reconnecter pour générer un nouveau token');
    console.log('2. Vérifier que les tokens ne sont pas supprimés lors du déploiement');
  } else {
    console.log('✓ RefreshToken trouvé dans la DB');
    console.log('Token:', {
      userId: stored.userId,
      createdAt: stored.createdAt
    });
  }
  
  console.log('\n=== Décodage du JWT ===');
  try {
    const decoded = jwt.decode(refreshTokenFromCookie);
    console.log('Token décodé:', decoded);
    console.log('Expire le:', new Date(decoded.exp * 1000).toLocaleString());
    console.log('Actuellement:', new Date().toLocaleString());
    
    if (decoded.exp * 1000 < Date.now()) {
      console.log('❌ TOKEN EXPIRÉ');
    } else {
      console.log('✓ Token encore valide');
    }
  } catch (e) {
    console.log('Erreur décodage:', e.message);
  }
  
  console.log('\n=== Vérification de l\'utilisateur ===');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    console.log('❌ UTILISATEUR NON TROUVÉ');
    await prisma.$disconnect();
    return;
  }
  
  console.log('User:', {
    id: user.id,
    email: user.email,
    role: user.role,
    parentId: user.parentId,
    centerId: user.centerId
  });
  
  if (user.role === 'super-admin') {
    console.log('\n✓ user.role === "super-admin" → DEVRAIT avoir accès');
  } else {
    console.log(`\n✗ user.role !== "super-admin" (valeur: "${user.role}")`);
  }
  
  if (user && user.parentId) {
    const parent = await prisma.parent.findUnique({ where: { id: user.parentId } });
    console.log('\nParent:', {
      id: parent?.id,
      centerId: parent?.centerId
    });
  }
  
  console.log('\n=== Vérification des admins du centre ===');
  const admins = await prisma.user.findMany({ 
    where: { centerId }, 
    select: { id: true, role: true, email: true } 
  });
  console.log('Admins trouvés:', admins.length);
  admins.forEach(a => console.log(`  - ${a.email} (${a.role})`));
  
  const adminIds = admins.filter(a => {
    const r = String(a.role || '').toLowerCase();
    return r.includes('admin') || r.includes('super');
  }).map(a => a.id);
  
  console.log('\nAdmin IDs filtrés:', adminIds);
  
  console.log('\n=== Vérification des subscriptions ===');
  const subs = await prisma.subscription.findMany({ 
    where: { userId: { in: adminIds } } 
  });
  console.log('Subscriptions trouvées:', subs.length);
  subs.forEach(s => console.log(`  - User ${s.userId}: ${s.status} (expires: ${s.currentPeriodEnd})`));
  
  const activeSubs = subs.filter(s => ['trialing', 'active'].includes(s.status));
  console.log('\nSubscriptions actives:', activeSubs.length);
  
  console.log('\n=== Résultat ===');
  if (activeSubs.length > 0) {
    console.log('✓ L\'utilisateur DEVRAIT avoir accès');
  } else {
    console.log('✗ L\'utilisateur N\'A PAS de subscription active');
  }
  
  await prisma.$disconnect();
}

checkUser().catch(e => { 
  console.error('Erreur:', e); 
  process.exit(1); 
});
