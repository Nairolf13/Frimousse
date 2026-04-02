import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { createReadStream, statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = path.join(__dirname, 'build');

// Routes to prerender
const routes = [
  '/',
  '/about',
  '/fonctionnalites',
  '/tarifs',
  '/confidentialite',
  '/cgu',
  '/mentions-legales',
  '/guide-demarrage',
  '/guide-ajouter-enfant',
  '/guide-planning',
  '/guide-export-rapport',
  '/guide-securite',
  '/support',
  '/logiciel-mam',
  '/logiciel-creche',
  '/logiciel-micro-creche',
];

// MIME type map
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Start a static file server that serves build/ and falls back to index.html
 * for any unknown path (SPA routing).
 */
function startLocalServer(port) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      // Strip query string
      let urlPath = req.url.split('?')[0];

      // Try to serve as a static file first
      let filePath = path.join(BUILD_DIR, urlPath);

      const tryFile = (fp) => {
        try {
          const stat = statSync(fp);
          if (stat.isDirectory()) return false;
          const ext = path.extname(fp).toLowerCase();
          const mime = MIME[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': mime });
          createReadStream(fp).pipe(res);
          return true;
        } catch {
          return false;
        }
      };

      // 1. Exact file
      if (tryFile(filePath)) return;
      // 2. With .html extension
      if (tryFile(filePath + '.html')) return;
      // 3. SPA fallback: serve index.html
      res.writeHead(200, { 'Content-Type': 'text/html' });
      createReadStream(path.join(BUILD_DIR, 'index.html')).pipe(res);
    });

    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function prerender() {
  console.log('Starting prerendering...');

  // Pick a random high port to avoid conflicts
  const PORT = 7473;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  // Start local server
  const server = await startLocalServer(PORT);
  console.log(`Local server started at ${BASE_URL}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const route of routes) {
      console.log(`Prerendering ${route}...`);

      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1200, height: 800 });

      // Navigate to local build (not live site)
      const url = BASE_URL + route;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for React to mount and Helmet to inject tags
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get rendered HTML and remove the static canonical that vite baked into
      // index.html (the one WITHOUT data-rh="true"). React Helmet injects the
      // correct per-page canonical with data-rh="true", so we only keep that one.
      let html = await page.evaluate(() => document.documentElement.outerHTML);

      // Remove any <link rel="canonical"> that does NOT carry data-rh="true"
      // (the static fallback from the base index.html)
      html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"(?!\s*data-rh)[^>]*>/gi, (match) => {
        if (/data-rh/i.test(match)) return match;
        return '';
      });

      // Normalize www -> non-www in canonical/og:url tags
      html = html.replace(/https:\/\/www\.lesfrimousses\.com/g, 'https://lesfrimousses.com');

      // Replace local server URL with production URL in any injected absolute links
      html = html.replace(new RegExp(`http://127\\.0\\.0\\.1:${PORT}`, 'g'), 'https://lesfrimousses.com');

      // Determine filename
      let filename;
      if (route === '/') {
        filename = 'index.html';
      } else {
        filename = route.slice(1) + '.html';
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
    server.close();
    console.log('Local server stopped.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  prerender();
}

export { prerender };
