// sw.js
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
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// הקוד הקיים של ה-Service Worker נשאר אותו דבר
