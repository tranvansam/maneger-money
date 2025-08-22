import { ref, onMounted } from 'vue'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '~/plugins/firebase'
import { useAuth } from '~/composables/useAuth'

export const useFcmBackground = () => {
  const { user } = useAuth()
  const fcmToken = ref<string | null>(null)
  const isInitialized = ref(false)
  const error = ref<string | null>(null)

  // Kiểm tra FCM có được hỗ trợ không
  const isSupported = async () => {
    if (typeof window === 'undefined') return false
    if (!('serviceWorker' in navigator)) return false
    if (!('Notification' in window)) return false
    return true
  }

  // Lưu token vào Firestore
  const saveTokenToFirestore = async (token: string) => {
    if (!user.value) return

    try {
      const tokenRef = doc(db, 'fcm_tokens', user.value.uid)
      await setDoc(tokenRef, {
        token: token,
        userId: user.value.uid,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        lastUsed: new Date(),
        createdAt: new Date(),
        isActive: true
      })

      // Cập nhật trạng thái notification trong user document
      const userRef = doc(db, 'users', user.value.uid)
      await updateDoc(userRef, {
        notificationEnabled: true,
        lastTokenUpdate: new Date()
      })

      console.log('✅ FCM token saved to Firestore')
    } catch (err) {
      console.error('❌ Error saving FCM token:', err)
      throw err
    }
  }

  // Lấy FCM token
  const getFcmToken = async () => {
    if (typeof window === 'undefined' || !user.value) return null

    try {
      console.log('🔍 Getting FCM token...')
      
      // Kiểm tra hỗ trợ
      if (!(await isSupported())) {
        console.log('❌ FCM not supported')
        return null
      }

      // Kiểm tra quyền notification
      if (Notification.permission !== 'granted') {
        console.log('❌ Notification permission not granted')
        return null
      }

      // Đăng ký Service Worker
      console.log('🔧 Registering service worker...')
      let swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
      
      if (!swRegistration) {
        console.log('📝 Creating new service worker registration...')
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })
        console.log('✅ Service worker registered:', swRegistration)
      } else {
        console.log('✅ Service worker already registered:', swRegistration)
      }

      // Lấy messaging instance
      const messaging = getMessaging()
      
      // Lấy token với VAPID key mới
      console.log('🔑 Getting token with VAPID key...')
      const token = await getToken(messaging as Messaging, {
        vapidKey: 'BJttP6I-bpC5F1e5jIO4ABkEiVBkip5hqPXWdXOF_xOe7rI8ORxSa0DiRAzV4AFX88ITD5W13I4BOhDYZC4fhaM',
        serviceWorkerRegistration: swRegistration
      })

      if (token) {
        console.log('✅ FCM Token received:', token.substring(0, 20) + '...')
        fcmToken.value = token
        await saveTokenToFirestore(token)
        return token
      } else {
        console.log('❌ No FCM token received')
        return null
      }

    } catch (fcmError) {
      console.error('❌ FCM Error:', fcmError)
      error.value = fcmError instanceof Error ? fcmError.message : String(fcmError)
      
      // Nếu lỗi 401, tạm thời disable
      if (error.value.includes('401') || error.value.includes('Unauthorized')) {
        console.log('🚫 Disabling FCM due to 401 error')
        localStorage.setItem('disable_fcm_401', 'true')
      }
      
      return null
    }
  }

  // Setup foreground listener
  const setupForegroundListener = () => {
    if (typeof window === 'undefined') return

    try {
      const messaging = getMessaging()
      
      onMessage(messaging, (payload) => {
        console.log('📱 Foreground message received:', payload)
        
        // Hiển thị notification khi app đang mở
        if (Notification.permission === 'granted') {
          const notification = new Notification(payload.notification?.title || 'Thông báo mới', {
            body: payload.notification?.body || payload.data?.body || 'Bạn có thông báo mới',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'fcm-notification',
            data: payload.data
          })

          // Xử lý click notification
          notification.onclick = () => {
            notification.close()
            
            // Navigate to specific page if có eventId
            if (payload.data?.eventId) {
              window.location.href = `/events/${payload.data.eventId}`
            }
          }
        }
      })

      console.log('✅ Foreground listener setup complete')
    } catch (err) {
      console.error('❌ Error setting up foreground listener:', err)
    }
  }

  // Initialize FCM
  const initializeFcm = async () => {
    if (isInitialized.value) return

    try {
      console.log('🚀 Initializing FCM...')
      
      // Kiểm tra disable flags
      const disableFcm = localStorage.getItem('disable_fcm') === 'true'
      const disableFcm401 = localStorage.getItem('disable_fcm_401') === 'true'
      
      if (disableFcm || disableFcm401) {
        console.log('🚫 FCM temporarily disabled due to issues')
        return
      }

      // Lấy token
      await getFcmToken()
      
      // Setup foreground listener
      setupForegroundListener()
      
      isInitialized.value = true
      console.log('✅ FCM initialization complete')
      
    } catch (err) {
      console.error('❌ Error initializing FCM:', err)
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  // Request notification permission
  const requestPermission = async () => {
    if (typeof window === 'undefined') return false

    try {
      if (Notification.permission === 'granted') {
        await initializeFcm()
        return true
      }

      if (Notification.permission === 'denied') {
        console.log('❌ Notification permission denied')
        return false
      }

      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        await initializeFcm()
        return true
      } else {
        console.log('❌ Notification permission not granted')
        return false
      }
    } catch (err) {
      console.error('❌ Error requesting permission:', err)
      return false
    }
  }

  // Remove FCM token (khi logout)
  const removeFcmToken = async () => {
    if (!user.value) return

    try {
      const tokenRef = doc(db, 'fcm_tokens', user.value.uid)
      await updateDoc(tokenRef, {
        isActive: false,
        lastUsed: new Date()
      })
      
      fcmToken.value = null
      console.log('✅ FCM token removed')
    } catch (err) {
      console.error('❌ Error removing FCM token:', err)
    }
  }

  // Reset FCM (để test lại)
  const resetFcm = () => {
    localStorage.removeItem('disable_fcm')
    localStorage.removeItem('disable_fcm_401')
    fcmToken.value = null
    isInitialized.value = false
    error.value = null
    console.log('🔄 FCM reset complete')
  }

  return {
    fcmToken,
    isInitialized,
    error,
    initializeFcm,
    requestPermission,
    removeFcmToken,
    resetFcm
  }
}
