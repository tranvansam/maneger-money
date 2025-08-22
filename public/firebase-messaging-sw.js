importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmr3SW4uIE1hyxEb9CF2PcDqP7sYV-wrw",
  authDomain: "maneger-money.firebaseapp.com",
  projectId: "maneger-money",
  storageBucket: "maneger-money.firebasestorage.app",
  messagingSenderId: "643115939406",
  appId: "1:643115939406:web:3bc790bd7d0c0bf62ab51f",
  measurementId: "G-S0B086MH8W"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages - Cải thiện để hiển thị notification tốt hơn
messaging.onBackgroundMessage(function(payload) {
  console.log('📱 [SW] Received background message:', payload);

  // Lấy thông tin notification từ payload
  const notificationTitle = payload.notification?.title || 
                           payload.data?.title || 
                           'Manager Money';
  
  const notificationBody = payload.notification?.body || 
                          payload.data?.body || 
                          'Bạn có thông báo mới';
  
  const notificationIcon = payload.notification?.icon || 
                          payload.data?.icon || 
                          '/icon-192.png';

  console.log('📱 [SW] Showing notification:', {
    title: notificationTitle,
    body: notificationBody,
    icon: notificationIcon
  });
  
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: '/icon-192.png',
    tag: 'manager-money-notification',
    data: {
      ...payload.data,
      timestamp: Date.now(),
      click_action: payload.notification?.click_action || payload.data?.click_action
    },
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200], // Vibration pattern
    actions: [
      {
        action: 'open',
        title: 'Mở',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Đóng',
        icon: '/icon-192.png'
      }
    ],
    // Thêm sound cho mobile
    sound: 'default'
  };

  // Hiển thị notification
  return self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('✅ [SW] Notification displayed successfully');
    })
    .catch((error) => {
      console.error('❌ [SW] Error showing notification:', error);
    });
});

// Handle notification click events - Cải thiện navigation
self.addEventListener('notificationclick', function(event) {
  console.log('🖱️ [SW] Notification click received:', event);

  // Đóng notification ngay lập tức
  event.notification.close();

  // Xử lý action
  if (event.action === 'close') {
    console.log('🖱️ [SW] User clicked close action');
    return;
  }

  // Xử lý mở app
  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(function(clientList) {
      console.log('🖱️ [SW] Found clients:', clientList.length);
      
      // Tìm client đang mở
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        console.log('🖱️ [SW] Checking client:', client.url);
        
        // Nếu có client đang mở, focus vào nó
        if (client.url.includes(window.location.origin) && 'focus' in client) {
          console.log('🖱️ [SW] Focusing existing client');
          
          // Navigate to specific page if có eventId
          if (event.notification.data?.eventId) {
            const eventUrl = `/events/${event.notification.data.eventId}`;
            console.log('🖱️ [SW] Navigating to event:', eventUrl);
            return client.navigate(eventUrl).then(() => client.focus());
          } else {
            return client.focus();
          }
        }
      }
      
      // Nếu không có client nào đang mở, mở mới
      console.log('🖱️ [SW] Opening new window');
      let url = '/';
      
      // Navigate to specific event if eventId is provided
      if (event.notification.data?.eventId) {
        url = `/events/${event.notification.data.eventId}`;
        console.log('🖱️ [SW] Opening event URL:', url);
      }
      
      return clients.openWindow(url);
    }).catch((error) => {
      console.error('❌ [SW] Error handling notification click:', error);
      // Fallback: mở trang chủ
      return clients.openWindow('/');
    })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', function(event) {
  console.log('❌ [SW] Notification closed:', event);
});

// Handle service worker installation - Cải thiện
self.addEventListener('install', function(event) {
  console.log('🔧 [SW] Service Worker installing...');
  
  // Skip waiting để activate ngay lập tức
  self.skipWaiting();
  
  console.log('✅ [SW] Service Worker installed successfully');
});

// Handle service worker activation - Cải thiện
self.addEventListener('activate', function(event) {
  console.log('🚀 [SW] Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Claim all clients
      clients.claim(),
      
      // Clear old caches nếu có
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== 'firebase-messaging-sw') {
              console.log('🗑️ [SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ]).then(() => {
      console.log('✅ [SW] Service Worker activated successfully');
    })
  );
});

// Handle push events (fallback)
self.addEventListener('push', function(event) {
  console.log('📱 [SW] Push event received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('📱 [SW] Push data:', data);
      
      // Hiển thị notification từ push event
      const notificationTitle = data.title || 'Manager Money';
      const notificationBody = data.body || 'Bạn có thông báo mới';
      
      const notificationOptions = {
        body: notificationBody,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'manager-money-push',
        data: data,
        requireInteraction: false,
        silent: false
      };
      
      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
      );
    } catch (error) {
      console.error('❌ [SW] Error parsing push data:', error);
    }
  }
});

// Handle message events (for debugging)
self.addEventListener('message', function(event) {
  console.log('💬 [SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle test background notification
  if (event.data && event.data.type === 'TEST_BACKGROUND_NOTIFICATION') {
    console.log('🧪 [SW] Test background notification received:', event.data);
    
    const { title, body, icon, eventId } = event.data.data;
    
    const notificationOptions = {
      body: body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-background-notification',
      data: {
        eventId: eventId,
        timestamp: Date.now(),
        test: true
      },
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Mở',
          icon: '/icon-192.png'
        },
        {
          action: 'close',
          title: 'Đóng',
          icon: '/icon-192.png'
        }
      ]
    };
    
    // Show notification after a delay to simulate background
    setTimeout(() => {
      self.registration.showNotification(title, notificationOptions)
        .then(() => {
          console.log('✅ [SW] Test background notification displayed');
          
          // Send message back to app
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'BACKGROUND_NOTIFICATION_TEST',
                success: true,
                timestamp: Date.now()
              });
            });
          });
        })
        .catch((error) => {
          console.error('❌ [SW] Error showing test notification:', error);
        });
    }, 2000); // 2 second delay
  }
});

console.log('✅ [SW] Firebase messaging service worker loaded successfully'); 