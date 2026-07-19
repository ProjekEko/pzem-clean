// firebase-messaging-sw.js
// Service Worker untuk notifikasi background
// SIMPAN DI ROOT FOLDER WEB!

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// ============ CONFIG FIREBASE (SAMA DENGAN INDEX.HTML) ============
firebase.initializeApp({
    apiKey: "AIzaSyDPp_SyvQJApKckpT-YpGBbfMMBAkpvj7A",
    authDomain: "pzemm-6b93a.firebaseapp.com",
    databaseURL: "https://pzemm-6b93a-default-rtdb.firebaseio.com/",
    projectId: "pzemm-6b93a",
    storageBucket: "pzemm-6b93a.appspot.com",
    messagingSenderId: "160759139666",
    appId: "PASTE_APP_ID_DARI_FIREBASE_CONSOLE" // ← GANTI!
});

const messaging = firebase.messaging();

// ============ TANGKAP NOTIFIKASI DI BACKGROUND ============
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Notifikasi background:', payload);

    const { title, body, icon } = payload.notification || {};
    const notificationOptions = {
        body: body || 'Ada notifikasi dari sistem kos',
        icon: icon || 'https://via.placeholder.com/192x192/007bff/white?text=Kos',
        badge: 'https://via.placeholder.com/72x72/007bff/white?text=K',
        vibrate: [200, 100, 200],
        data: payload.data || {},
        requireInteraction: true
    };

    return self.registration.showNotification(
        title || '🔔 Peringatan Kos',
        notificationOptions
    );
});

// ============ TANGKAP KLIK NOTIFIKASI ============
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.click_action || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});