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

// ============ NOTIFIKASI BACKGROUND ============
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || '🔔 Peringatan Kos';
    const notificationBody = payload.notification?.body || 'Ada notifikasi baru!';
    const notificationIcon = '/gambar/images.png';
    const notificationBadge = '/gambar/images.png';
    
    // ============ KUSTOMISASI NOTIFIKASI ============
    const options = {
        body: notificationBody,
        icon: notificationIcon,
        badge: notificationBadge,
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,  // Tetap tampil sampai user interaksi
        tag: 'pzem-notification',   // Mencegah notifikasi duplikat
        data: {
            url: '/'
        },
        actions: [
            {
                action: 'open',
                title: '🔍 Lihat Dashboard'
            },
            {
                action: 'close',
                title: '❌ Tutup'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, options);
});

// ============ KETIKA NOTIFIKASI DIKLIK ============
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // ============ CEK ACTION ============
    if (event.action === 'close') {
        return;
    }

    // ============ BUKA DASHBOARD ============
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Cek apakah sudah ada tab yang terbuka
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Buka tab baru jika belum ada
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// ============ SERVICE WORKER INSTALL ============
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installed');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activated');
    event.waitUntil(self.clients.claim());
});