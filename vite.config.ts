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
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Optimize chunking for better performance
    rollupOptions: {
      output: {
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // forward API requests to the backend. When the backend is down the
      // default Vite proxy prints a scary `ECONNREFUSED` stack trace.  we
      // silence those here by attaching an error handler.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            // ignore connection errors; frontend will handle the failed fetch
            if (err.code === 'ECONNREFUSED') {
              // optionally you could log to console.debug or nothing
              console.debug('backend not running, proxy request failed', req.url);
            } else {
              console.error('proxy error', err);
            }
          });
        }
      }
    },
    // Improve source map handling for development
    sourcemapIgnoreList: (sourcePath) => {
      // Ignore source maps from node_modules and external tools like React DevTools
      return sourcePath.includes('node_modules') || sourcePath.includes('installHook');
    },
  },
})
