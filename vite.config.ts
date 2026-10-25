import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// GitHub Pages serves project sites from /<repo>/. Set VITE_BASE_PATH="/" for a custom domain.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/home-heroes/';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'أبطال البيت — Home Heroes',
          short_name: 'أبطال البيت',
          description: 'تحدّي أبطال البيت — معًا نحو المسؤولية والنجاح والتميّز',
          lang: 'ar',
          dir: 'rtl',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#FBF8FF',
          theme_color: '#6D3FD6',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // never cache Supabase API responses: family data must always be fresh and private
          navigateFallback: 'index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          // fonts are self-hosted: the app makes no third-party requests
        },
      }),
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('radix-ui') || id.includes('@radix-ui')) return 'radix';
          },
        },
      },
    },
  };
});
