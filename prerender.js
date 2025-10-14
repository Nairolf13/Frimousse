import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://lesfrimousses.com';
const BUILD_DIR = path.join(__dirname, 'build');

// Routes to prerender
const routes = [
  '/',
  '/about',
  '/fonctionnalites',
  '/tarifs',
  '/support',
  '/confidentialite',
  '/cgu',
  '/mentions-legales',
  '/guide-demarrage',
  '/guide-ajouter-enfant',
  '/guide-planning',
  '/guide-export-rapport',
  '/guide-securite',
  '/login',
  '/register',
  '/reset-password',
  '/invite'
];

async function prerender() {
  console.log('Starting prerendering...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const route of routes) {
      console.log(`Prerendering ${route}...`);

      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1200, height: 800 });

      // Navigate to the page
      const url = BASE_URL + route;
      await page.goto(url, { waitUntil: 'networkidle0' });

      // Wait for Tailwind CSS to be fully loaded and applied
      await page.waitForFunction(() => {
        // Check if Tailwind utility classes are applied (look for common Tailwind classes)
        const body = document.body;
        const hasTailwindClasses = body.classList.length > 0 ||
          document.querySelector('[class*="bg-"]') ||
          document.querySelector('[class*="text-"]') ||
          document.querySelector('[class*="p-"]') ||
          document.querySelector('[class*="m-"]');
        return hasTailwindClasses;
      }, { timeout: 10000 });

      // Additional wait for any dynamic styling
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the rendered HTML
      const html = await page.evaluate(() => {
        return document.documentElement.outerHTML;
      });

      // Determine filename
      let filename;
      if (route === '/') {
        filename = 'index.html';
      } else {
        filename = route.slice(1) + '.html'; // Remove leading slash
      }

      const filepath = path.join(BUILD_DIR, filename);

      // Write to file
      fs.writeFileSync(filepath, html, 'utf8');
      console.log(`Saved ${filepath}`);

      await page.close();
    }

    console.log('Prerendering completed!');
  } catch (error) {
    console.error('Error during prerendering:', error);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  prerender();
}

export { prerender };