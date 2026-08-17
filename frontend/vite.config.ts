import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // Load env so we can inject Firebase config into the service worker via define
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      proxy: {
        '/api': 'http://localhost:3000',
      },
    },
    esbuild: {
      drop: ['debugger'],
    },
    // Inject Firebase config as global constants into sw.js so the service worker
    // can initialise Firebase without ES module imports (importScripts compat).
    define: {
      'self.__FIREBASE_API_KEY__': JSON.stringify(env.VITE_FIREBASE_API_KEY || ''),
      'self.__FIREBASE_AUTH_DOMAIN__': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'self.__FIREBASE_PROJECT_ID__': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      'self.__FIREBASE_STORAGE_BUCKET__': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'self.__FIREBASE_MESSAGING_SENDER_ID__': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'self.__FIREBASE_APP_ID__': JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
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
  };
})

