// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@mockups': path.resolve(__dirname, '../mockups'),
    },
  },

  server: {
    fs: {
      // Allow serving files from the root of the project (one level up from frontend/)
      allow: ['..'],
    },
    // Dev proxy — forward /api to backend running on :3000
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Nginx serves the SPA from backend/public in production
    outDir: '../backend/public',
    emptyOutDir: false,
  },
})
