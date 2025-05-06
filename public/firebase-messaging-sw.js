importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmr3SW4uIE1hyxEb9CF2PcDqP7sYV-wrw",
  authDomain: "maneger-money.firebaseapp.com",
  projectId: "maneger-money",
  storageBucket: "maneger-money.appspot.com",
  messagingSenderId: "643115939406",
  appId: "1:643115939406:web:3bc790bd7d0c0bf62ab51f",
  measurementId: "G-S0B086MH8W"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Thông báo mới';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'manager-money',
    data: payload.data || {},
    requireInteraction: false,
    silent: false
  };

  // Show notification
  if (typeof self.registration.showNotification === 'function') {
    self.registration.showNotification(notificationTitle, notificationOptions)
      .catch(error => {
        console.error('Error showing notification:', error);
      });
  }
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received:', event);

  event.notification.close();

  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: "window"
    }).then(function(clientList) {
      // If a window tab is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window tab is open, open a new one
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

// Handle service worker installation
self.addEventListener('install', function(event) {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', function(event) {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
}); 