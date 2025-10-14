import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes à pré-rendre
const routes = [
  '/',
  '/login',
  '/feed',
  '/dashboard',
  '/features',
  '/about',
  '/legal-notice'
];

// Template HTML de base avec SEO et contenu statique pour la landing page
const createHtmlTemplate = (route, title, description) => {
  // Contenu spécifique pour la landing page
  const landingContent = route === '/' ? `
    <div id="root">
      <!-- Landing Page Content for SEO -->
      <div style="min-height: 100vh; background: linear-gradient(135deg, #a9ddf2 0%, #f7f4d7 100%);">
        <!-- Hero Section -->
        <section style="padding: 4rem 1rem; text-align: center; max-width: 1200px; margin: 0 auto;">
          <div style="background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 2rem; padding: 3rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.3);">
            <img src="/imgs/LogoFrimousse.webp" alt="Les Frimousses" style="width: 120px; height: 120px; margin: 0 auto 2rem; display: block;" />
            <h1 style="font-size: 2.5rem; font-weight: 800; color: #0b5566; margin-bottom: 1rem; line-height: 1.2;">Les Frimousses</h1>
            <p style="font-size: 1.25rem; color: #08323a; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">Application de gestion de garde d'enfants : planning, rapports, gestion des parents et communications pour crèches et assistantes maternelles.</p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
              <a href="/register" style="background: linear-gradient(135deg, #0b5566 0%, #0b83a3 100%); color: white; padding: 0.75rem 2rem; border-radius: 9999px; text-decoration: none; font-weight: 600; display: inline-block;">Commencer</a>
              <a href="/features" style="background: rgba(255,255,255,0.9); color: #0b5566; padding: 0.75rem 2rem; border-radius: 9999px; text-decoration: none; font-weight: 600; display: inline-block; border: 1px solid rgba(11,85,102,0.2);">Découvrir</a>
            </div>
          </div>
        </section>

        <!-- Features Section -->
        <section style="padding: 4rem 1rem; background: rgba(255,255,255,0.1);">
          <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: 2rem; font-weight: 700; color: #0b5566; margin-bottom: 3rem;">Pourquoi choisir Les Frimousses ?</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
              <div style="background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.3);">
                <h3 style="font-weight: 600; color: #0b5566; margin-bottom: 1rem;">Gestion simplifiée</h3>
                <p style="color: #08323a;">Automatisez vos plannings, inscriptions et rapports pour vous concentrer sur l'essentiel : les enfants.</p>
              </div>
              <div style="background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.3);">
                <h3 style="font-weight: 600; color: #0b5566; margin-bottom: 1rem;">Communication facilitée</h3>
                <p style="color: #08323a;">Notifications, documents, actualités et échanges avec les familles pour une relation de confiance.</p>
              </div>
              <div style="background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.3);">
                <h3 style="font-weight: 600; color: #0b5566; margin-bottom: 1rem;">Sécurité & RGPD</h3>
                <p style="color: #08323a;">Données protégées, accès sécurisés, conformité RGPD et confidentialité garantie pour tous les utilisateurs.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Stats Section -->
        <section style="padding: 4rem 1rem; background: linear-gradient(135deg, #a9ddf2 0%, #f7f4d7 100%);">
          <div style="max-width: 800px; margin: 0 auto; text-align: center;">
            <div style="display: flex; justify-content: center; gap: 3rem; flex-wrap: wrap;">
              <div style="background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.3); min-width: 140px;">
                <div style="font-size: 2rem; font-weight: 700; color: #0b5566; margin-bottom: 0.5rem;">100+</div>
                <div style="color: #0b5566; font-weight: 600;">Familles<br />inscrites</div>
              </div>
              <div style="background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.3); min-width: 140px;">
                <div style="font-size: 2rem; font-weight: 700; color: #0b5566; margin-bottom: 0.5rem;">10+</div>
                <div style="color: #0b5566; font-weight: 600;">Associations<br />suivies</div>
              </div>
              <div style="background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.3); min-width: 140px;">
                <div style="font-size: 2rem; font-weight: 700; color: #0b5566; margin-bottom: 0.5rem;">99%</div>
                <div style="color: #0b5566; font-weight: 600;">Utilisateurs<br />satisfaits</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  ` : `
    <div id="root">
      <!-- Loading placeholder -->
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #f7f4d7;">
        <div style="text-align: center;">
          <img src="/imgs/LogoFrimousse.webp" alt="Les Frimousses" style="width: 100px; height: 100px;" />
          <h1 style="color: #08323a; font-family: system-ui, sans-serif;">Les Frimousses</h1>
          <p style="color: #08323a;">Chargement en cours...</p>
        </div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="robots" content="index, follow" />

  <!-- Open Graph -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://lesfrimousses.com${route}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />

  <!-- Preload critical resources -->
  <link rel="preload" href="/assets/index.css" as="style" />
  <link rel="preload" href="/assets/index.js" as="script" />

  <!-- Favicon -->
  <link rel="icon" type="image/webp" href="/imgs/LogoFrimousse.webp" />

  <!-- Canonical URL -->
  <link rel="canonical" href="https://lesfrimousses.com${route}" />

  <!-- Styles -->
  <link rel="stylesheet" href="/assets/index.css" />
</head>
<body>
  ${landingContent}

  <!-- Scripts -->
  <script type="module" src="/assets/index.js"></script>

  <!-- SEO: Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${title}",
    "description": "${description}",
    "url": "https://lesfrimousses.com${route}",
    "publisher": {
      "@type": "Organization",
      "name": "Les Frimousses",
      "url": "https://lesfrimousses.com"
    }
  }
  </script>
</body>
</html>`;
};

// Configuration des métadonnées pour chaque route
const routeMetadata = {
  '/': {
    title: 'Les Frimousses - Gestion de garde d\'enfants',
    description: 'Application de gestion de garde d\'enfants : planning, rapports, gestion des parents et communications pour crèches et assistantes maternelles.'
  },
  '/login': {
    title: 'Connexion - Les Frimousses',
    description: 'Connectez-vous à votre compte Les Frimousses pour gérer votre garde d\'enfants.'
  },
  '/feed': {
    title: 'Fil d\'actualité - Les Frimousses',
    description: 'Découvrez les dernières actualités et mises à jour de votre garde d\'enfants.'
  },
  '/dashboard': {
    title: 'Tableau de bord - Les Frimousses',
    description: 'Gérez votre garde d\'enfants : planning, enfants, rapports et communications.'
  },
  '/features': {
    title: 'Fonctionnalités - Les Frimousses',
    description: 'Découvrez toutes les fonctionnalités de l\'application Les Frimousses pour la gestion de garde d\'enfants.'
  },
  '/about': {
    title: 'À propos - Les Frimousses',
    description: 'En savoir plus sur Les Frimousses, l\'application de gestion de garde d\'enfants pour crèches et assistantes maternelles.'
  },
  '/legal-notice': {
    title: 'Mentions légales - Les Frimousses',
    description: 'Mentions légales et conditions d\'utilisation de l\'application Les Frimousses.'
  }
};

function preRender() {
  const distDir = path.join(__dirname, '..', 'dist');

  // Créer le répertoire dist s'il n'existe pas
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  routes.forEach(route => {
    const metadata = routeMetadata[route] || routeMetadata['/'];
    const htmlContent = createHtmlTemplate(route, metadata.title, metadata.description);

    // Pour la route racine, utiliser index.html
    const fileName = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
    const filePath = path.join(distDir, fileName);

    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`✅ Pre-rendered: ${fileName}`);
  });

  console.log('🎉 Pre-rendering terminé !');
}

preRender();