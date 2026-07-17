import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react', 'react-hot-toast'],
        }
      }
    },
    chunkSizeWarningLimit: 500
  },
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      // Keep custom push + notificationclick listeners from src/sw.js in production builds.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST',
        globPatterns: [
          '**/*.{html,js,mjs,css,woff,woff2,ttf,eot,otf,png,jpg,jpeg,webp,gif,svg,ico,json,webmanifest}',
          'logo2/**/*.{png,jpg,jpeg,webp,gif,svg}',
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      // Note: workbox.runtimeCaching is intentionally omitted.
      // With strategies: 'injectManifest', runtime caching is handled entirely
      // inside src/sw.js (the custom service worker), not here.
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
