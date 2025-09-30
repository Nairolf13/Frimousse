import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Target modern browsers to avoid unnecessary transpilation/polyfills
  // This instructs Vite/esbuild to emit modern JS (class fields, spread, etc.)
  build: {
    target: 'es2022',
    // Emit sourcemaps in production to debug runtime errors originating from bundles
    sourcemap: true,
    // Let Rollup/Vite automatically determine chunking to avoid circular import ordering issues
    rollupOptions: {
      output: {
        // default chunking (no manualChunks) — keeps natural dependency ordering
      }
    },
    chunkSizeWarningLimit: 800
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
