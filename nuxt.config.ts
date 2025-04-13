import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false, // vẫn đúng với Firebase

  modules: ['@vite-pwa/nuxt'],

  // ⚡ Cấu hình PWA tại đây
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Manager Money',
      short_name: 'Money',
      description: 'Ứng dụng quản lý chi tiêu cá nhân',
      lang: 'vi',
      display: 'standalone',
      start_url: '/',
      background_color: '#ffffff',
      theme_color: '#28a745',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      cleanupOutdatedCaches: true
    },
    devOptions: {
      enabled: true
    }
  }
})
