const CACHE_NAME = 'timemaster-v1';
const urlsToCache = [
    '.',
    'index.html',
    'logo.svg',
    'logo1.png',
    'logo2.png',
    'logo3.png',
    'manifest.json',
    'script.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => caches.delete(cacheName))
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
            .catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('index.html');
                }
            })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({type: 'window'}).then(clientList => {
            for (let client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

self.addEventListener('push', (event) => {
    const options = {
        body: event.data?.text() || 'זמן לבדוק את הטיימר!',
        icon: 'logo1.png',
        badge: 'logo3.png',
        vibrate: [200, 100, 200],
        requireInteraction: true
    };

    event.waitUntil(
        self.registration.showNotification('TimeMaster', options)
    );
});
