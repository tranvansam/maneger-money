// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  
  // Disable SSR to avoid Firebase issues
  ssr: false,
  
  // Make Firebase config available at runtime
  runtimeConfig: {
    public: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID,
    }
  },
  
  // Transpile Firebase for compatibility
  build: {
    transpile: [
      'firebase',
      'firebase/app',
      'firebase/auth',
      'firebase/analytics',
      'firebase/firestore'
    ]
  },
  
  // Control which modules are loaded client/server side
  vite: {
    optimizeDeps: {
      include: ['firebase/app', 'firebase/auth', 'firebase/firestore']
    },
    define: {
      'process.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY)
    },
    // Relax CORS issues
    server: {
      cors: true,
      proxy: {
        '/identitytoolkit': {
          target: 'https://identitytoolkit.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/identitytoolkit/, '')
        }
      }
    }
  }
})
