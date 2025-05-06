importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Firebase configuration
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
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  try {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icon.png', // Path to your app icon
      badge: '/badge.png', // Path to your notification badge
      tag: payload.data?.eventId || 'default', // Use event ID as tag if available
      data: payload.data,
      actions: [
        {
          action: 'view',
          title: 'View Event'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error showing notification:', error);
  }
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const eventId = event.notification.data?.eventId;
  let url = 'https://maneger-money.vercel.app/';
  if (eventId) url = `https://maneger-money.vercel.app/events/${eventId}`;
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installed');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(clients.claim());
}); 