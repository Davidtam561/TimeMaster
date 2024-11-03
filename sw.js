const CACHE_NAME = 'timemaster-v1';
const urlsToCache = [
    '/TimeMaster/',
    '/TimeMaster/index.html',
    '/TimeMaster/logo.svg',
    '/TimeMaster/logo1.png',
    '/TimeMaster/logo2.png',
    '/TimeMaster/logo3.png',
    '/TimeMaster/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => caches.delete(cacheName))
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

self.addEventListener('push', (event) => {
    const options = {
        body: event.data?.text() || 'זמן לבדוק את הטיימר!',
        icon: '/TimeMaster/logo1.png',
        badge: '/TimeMaster/logo3.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        silent: false,
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'פתח את האפליקציה'
            },
            {
                action: 'close',
                title: 'סגור'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('TimeMaster', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    event.waitUntil(
        clients.matchAll({type: 'window', includeUncontrolled: true})
            .then((clientList) => {
                const hadWindowToFocus = clientList.some((client) => {
                    if (client.url === '/TimeMaster/') {
                        client.focus();
                        return true;
                    }
                    return false;
                });

                if (!hadWindowToFocus) {
                    clients.openWindow('/TimeMaster/').then((windowClient) => {
                        windowClient?.focus();
                    });
                }
            })
    );
});

self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
