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

// Installation
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // ניקוי מטמונים ישנים
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => caches.delete(cacheName))
                );
            }),
            // תביעת שליטה על כל הלקוחות
            clients.claim()
        ])
    );
});

// Fetch - טיפול בבקשות רשת
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // החזרה מהמטמון אם קיים
                if (response) {
                    return response;
                }

                // אם לא קיים במטמון, בצע בקשת רשת
                return fetch(event.request)
                    .then((response) => {
                        // בדוק שהתגובה תקינה
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // שכפל את התגובה כי היא יכולה להיות בשימוש רק פעם אחת
                        const responseToCache = response.clone();

                        // שמור במטמון
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    });
            })
    );
});

// Push - טיפול בהתראות
self.addEventListener('push', (event) => {
    const options = {
        body: event.data?.text() || 'יש לך התראה חדשה!',
        icon: '/TimeMaster/logo1.png',
        badge: '/TimeMaster/logo3.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification('TimeMaster', options)
    );
});

// Notification Click - טיפול בלחיצה על התראה
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({type: 'window'})
            .then((clientList) => {
                // אם יש חלון פתוח, התמקד בו
                if (clientList.length > 0) {
                    return clientList[0].focus();
                }
                // אחרת פתח חלון חדש
                return clients.openWindow('/TimeMaster/');
            })
    );
});

// Periodic Sync - סנכרון תקופתי
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'pomodoro-sync') {
        event.waitUntil(
            // כאן תוכל להוסיף לוגיקת סנכרון
            console.log('Performing periodic sync')
        );
    }
});

// Message - טיפול בהודעות מהאפליקציה
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'SET_SYNC_INTERVAL') {
        // טיפול בהגדרת מרווח הסנכרון
        console.log('Setting sync interval to:', event.data.interval);
    }
});
