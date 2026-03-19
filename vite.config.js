import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Bercut Barber Shop',
        short_name: 'Bercut',
        theme_color: '#111110',
        background_color: '#FAFAF8',
        display: 'standalone',
        icons: [{ src: '/bercut-icon.png', sizes: '192x192', type: 'image/png' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^\/api\/(?!events).*/,
          handler: 'NetworkFirst',
        }]
      }
    })
  ],
  server: {
    proxy: { '/api': 'http://localhost:3001' }  // proxy to backend during dev
  }
});
