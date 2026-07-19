// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDPp_SyvQJApKckpT-YpGBbfMMBAkpvj7A",
    authDomain: "pzemm-6b93a.firebaseapp.com",
    databaseURL: "https://pzemm-6b93a-default-rtdb.firebaseio.com/",
    projectId: "pzemm-6b93a",
    storageBucket: "pzemm-6b93a.firebasestorage.app",
    messagingSenderId: "160759139666",
    appId: "1:160759139666:web:68172f5527557b36507e8b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Notifikasi background:', payload);
    const { title, body, icon } = payload.notification || {};
    return self.registration.showNotification(title || '🔔 Peringatan Kos', {
        body: body || 'Ada notifikasi baru!',
        icon: icon || 'https://via.placeholder.com/192x192/007bff/white?text=Kos',
        vibrate: [200, 100, 200],
        data: payload.data || {},
        requireInteraction: true
    });
});

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