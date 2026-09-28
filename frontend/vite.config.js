import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The only chunk above Vite's 500 kB default is the lazily loaded 3D view (three.js + R3F,
    // ~250 kB gzipped), fetched only when a visitor opens the 3D explorer.
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
