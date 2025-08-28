<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { useFcmToken } from '~/composables/useFcmToken'
import { useRegisterSW } from 'virtual:pwa-register/vue'

// Initialize FCM for push notifications
const { initializeFcm } = useFcmToken()



// PWA installation prompt - only in client side
if (process.client) {
  const { registerSW } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registered: ', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    }
  })

  // Handle PWA updates
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      // Show update notification
      if (confirm('Có phiên bản mới! Bạn có muốn cập nhật?')) {
        updateServiceWorker()
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline')
    }
  })
}
</script>

<style>
/* PWA specific styles */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8f9fa;
  /* Fix cho iPhone có notch */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Prevent zoom on input focus for better PWA experience */
input, textarea, select {
  font-size: 16px;
}

/* Smooth transitions for PWA */
* {
  transition: all 0.2s ease-in-out;
}

/* PWA splash screen styles */
@media (display-mode: standalone) {
  body {
    background-color: #28a745;
  }
}
</style>
