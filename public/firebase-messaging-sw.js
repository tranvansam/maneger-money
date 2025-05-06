importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

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
messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title || 'Thông báo mới';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png',
    data: payload.data
  };
  // Chỉ show notification nếu trình duyệt hỗ trợ
  if (typeof self.registration.showNotification === 'function') {
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
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