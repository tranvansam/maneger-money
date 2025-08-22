import { ref, onMounted } from 'vue'
import { db } from '~/plugins/firebase'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { getToken, onMessage, type Messaging } from 'firebase/messaging'
import { messaging } from '~/plugins/firebase'
import { useAuth } from './useAuth'
import { toast } from 'vue3-toastify'

export const useFcmToken = () => {
  const { user } = useAuth()
  const fcmToken = ref<string | null>(null)
  const isTokenLoading = ref(false)

  // Lấy FCM token
  const getFcmToken = async () => {
    if (!user.value || !messaging) return null

    try {
      isTokenLoading.value = true
      
      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.log('Notification permission denied')
        return null
      }

      // Get token với VAPID key thực tế
      const token = await getToken(messaging as Messaging, {
        vapidKey: 'BHXBw8kOhJVLYVqWZrQueAO1M2f2gjlcIYZxHsWgTV3WIlS7yxB9bEEFefVOGw6Tvv3xoEoBuycxpCBZfcQxESk'
      })

      if (token) {
        console.log('FCM token generated:', token)
        fcmToken.value = token
        await saveTokenToFirestore(token)
        return token
      } else {
        console.log('No FCM token available')
        return null
      }
      
    } catch (error) {
      console.error('Error getting FCM token:', error)
      return null
    } finally {
      isTokenLoading.value = false
    }
  }

  // Lưu token vào Firestore
  const saveTokenToFirestore = async (token: string) => {
    if (!user.value) return

    try {
      const tokenRef = doc(db, 'fcm_tokens', user.value.uid)
      await setDoc(tokenRef, {
        token: token,
        userId: user.value.uid,
        email: user.value.email,
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date()
      })
      console.log('FCM token saved to Firestore')
    } catch (error) {
      console.error('Error saving FCM token:', error)
    }
  }

  // Xóa token khỏi Firestore
  const deleteTokenFromFirestore = async () => {
    if (!user.value) return

    try {
      const tokenRef = doc(db, 'fcm_tokens', user.value.uid)
      await deleteDoc(tokenRef)
      console.log('FCM token deleted from Firestore')
    } catch (error) {
      console.error('Error deleting FCM token:', error)
    }
  }

  // Lắng nghe foreground messages
  const setupForegroundListener = () => {
    if (!messaging) return

    onMessage(messaging as Messaging, (payload) => {
      console.log('Received foreground message:', payload)
      
      const title = payload.notification?.title || 'Thông báo mới'
      const body = payload.notification?.body || payload.data?.body || ''
      
      // Show toast notification
      toast.info(`${title}: ${body}`, {
        autoClose: 5000,
        position: 'top-right',
        closeOnClick: true,
        closeButton: true,
        toastId: payload.messageId, // Prevent duplicate toasts
        style: { 
          marginBottom: '16px', 
          borderRadius: '10px', 
          boxShadow: '0 2px 12px rgba(60,60,60,0.12)',
          fontSize: '14px',
          padding: '12px 16px'
        }
      })

      // Show browser notification if supported
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'manager-money',
          requireInteraction: false,
          silent: false
        })

        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close()
        }, 5000)
      }
    })
  }

  // Khởi tạo FCM
  const initializeFcm = async () => {
    if (!user.value) return

    try {
      console.log('Initializing FCM...')
      await getFcmToken()
      setupForegroundListener()
    } catch (error) {
      console.error('Error initializing FCM:', error)
    }
  }

  // Cleanup khi logout
  const cleanupFcm = async () => {
    try {
      await deleteTokenFromFirestore()
      fcmToken.value = null
    } catch (error) {
      console.error('Error cleaning up FCM:', error)
    }
  }

  onMounted(() => {
    if (user.value) {
      initializeFcm()
    }
  })

  return {
    fcmToken,
    isTokenLoading,
    getFcmToken,
    initializeFcm,
    cleanupFcm,
    saveTokenToFirestore,
    deleteTokenFromFirestore
  }
}