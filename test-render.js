import puppeteer from 'puppeteer';

const baseUrl = 'http://localhost:5173';
const routes = [
  '/',
  '/about',
  '/fonctionnalites',
  '/tarifs',
  '/cgu',
  '/confidentialite',
  '/mentions-legales',
  '/guide-demarrage',
  '/guide-ajouter-enfant',
  '/guide-planning',
  '/guide-export-rapport',
  '/guide-securite',
  '/support',
  '/login',
  '/register',
  '/reset-password',
  '/invite',
];

const urls = routes.map(route => `${baseUrl}${route}`);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const url of urls) {
    const page = await browser.newPage();
    console.log(`\n🔍 Test de la page : ${url}`);

    const loadedResources = {
      css: 0,
      images: 0,
      failed: [],
    };

    // Écoute les requêtes réseau pour vérifier les ressources chargées
    page.on('response', async (response) => {
      const req = response.request();
      const type = req.resourceType();

      if (type === 'stylesheet') loadedResources.css++;
      if (type === 'image') loadedResources.images++;

      if (!response.ok()) {
        loadedResources.failed.push({
          url: req.url(),
          status: response.status(),
        });
      }
    });

    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle2', // Attend que tout soit chargé
        timeout: 60000,
      });

      if (!response || !response.ok()) {
        console.log(`❌ Erreur HTTP pour ${url}: ${response ? response.status() : 'Aucune réponse'}`);
        continue;
      }

      // Vérifie le contenu HTML
      const content = await page.content();
      const length = content.length;

      // Vérifie la présence d'éléments clés
      const hasHead = await page.$('head') !== null;
      const hasBody = await page.$('body') !== null;

      console.log(`✅ HTML rendu (${length} caractères)`);
      console.log(`🧩 Structure : head=${hasHead}, body=${hasBody}`);

      // Vérifie les ressources
      console.log(`🎨 CSS chargés : ${loadedResources.css}`);
      console.log(`🖼️ Images chargées : ${loadedResources.images}`);

      if (loadedResources.failed.length > 0) {
        console.log(`⚠️ Ressources échouées :`);
        loadedResources.failed.forEach(r =>
          console.log(`   - ${r.url} [${r.status}]`)
        );
      }

      // Capture d’écran pour vérification visuelle
      const safeName = url.replace(/https?:\/\//, '').replace(/[^\w]/g, '_');
      await page.screenshot({
        path: `render-${safeName}.png`,
        fullPage: true
      });

      console.log(`📸 Capture enregistrée : render-${safeName}.png`);
    } catch (error) {
      console.error(`💥 Erreur sur ${url}:`, error.message);
    }

    await page.close();
  }

  await browser.close();
  console.log('\n✅ Test terminé.');
})();