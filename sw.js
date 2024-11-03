const CACHE_NAME = 'timemaster-v1';
const urlsToCache = [
    './',
    './index.html',
    './logo.svg',
    './logo1.png',
    './logo2.png',
    './logo3.png',
    './manifest.json',
    './script.js'
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
            .catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});
