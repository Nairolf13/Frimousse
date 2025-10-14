import { fileURLToPath } from 'url'
import path from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { generatePages } = require('vite-plugin-ssr/node')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const root = path.resolve(__dirname, '..')
  // generate only landing for now
  await generatePages({
    root,
    outDir: path.join(root, 'dist-ssg'),
    baseUrl: 'https://lesfrimousses.com',
    routes: ['/landing'],
  })
  console.log('SSG generation finished')
}

main().catch(err => { console.error(err); process.exit(1) })
