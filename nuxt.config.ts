import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false,
  modules: ['@vite-pwa/nuxt'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Manager Money',
      short_name: 'Quản lý chi tiêu',
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
  },

  app: {
    head: {
      title: 'SamTV',
      meta: [
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        },
        {
          name: 'apple-mobile-web-app-capable',
          content: 'yes'
        },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent'
        },
        {
          name: 'apple-mobile-web-app-title',
          content: 'SamTV'
        }
      ],
      link: [
        { rel: 'apple-touch-icon', href: '/icon-192.png' },
        {
          rel: 'apple-touch-startup-image',
          href: '/splash-1125x2436.png',
          media: '(device-width: 375px) and (device-height: 812px)'
        }
      ]
    }
  },

  compatibilityDate: '2025-04-13'
})