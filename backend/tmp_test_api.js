const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Tu dois remplacer ce cookie par ton vrai cookie de session
    const response = await fetch('http://localhost:3000/api/admin/centers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Ajoute ici ton cookie si nécessaire
      },
      credentials: 'include'
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('\nRéponse API:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

testAPI();
