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
    // Split large vendor libraries into separate chunks to reduce the main entry bundle size
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('@fullcalendar')) return 'vendor-fullcalendar';
            if (id.includes('@supabase') || id.includes('gotrue') || id.includes('postgrest')) return 'vendor-supabase';
            if (id.includes('stripe') || id.includes('@stripe')) return 'vendor-stripe';
            if (id.includes('lodash')) return 'vendor-lodash';
            if (id.includes('date-fns') || id.includes('dayjs')) return 'vendor-date';
            return 'vendor-others';
          }
        }
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
