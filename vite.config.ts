import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'robots.txt',
        'logo-vitbox-48.png',
        'logo-vitbox-64.png',
        'logo-vitbox-96.png',
        'logo-vitbox-128.png',
        'logo-vitbox-192.png',
        'logo-vitbox-256.png',
        'logo-vitbox-384.png',
        'logo-vitbox-512.png',
        'logo-vitbox-maskable-512.png',
        'apple-touch-icon.png',
        'favicon-32x32.png',
        'favicon-16x16.png',
      ],
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
          { src: 'logo-vitbox-48.png', sizes: '48x48', type: 'image/png' },
          { src: 'logo-vitbox-64.png', sizes: '64x64', type: 'image/png' },
          { src: 'logo-vitbox-96.png', sizes: '96x96', type: 'image/png' },
          { src: 'logo-vitbox-128.png', sizes: '128x128', type: 'image/png' },
          { src: 'logo-vitbox-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'logo-vitbox-256.png', sizes: '256x256', type: 'image/png' },
          { src: 'logo-vitbox-384.png', sizes: '384x384', type: 'image/png' },
          { src: 'logo-vitbox-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'logo-vitbox-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
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
