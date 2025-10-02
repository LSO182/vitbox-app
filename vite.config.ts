import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'robots.txt', 'logo-vitbox-192.png', 'logo-vitbox-512.png'],
      manifest: {
        name: 'Vitbox Gym',
        short_name: 'Vitbox',
        description: 'Gestión de clases y turnos del gimnasio Vitbox',
        theme_color: '#0d6efd',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'logo-vitbox-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'logo-vitbox-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
