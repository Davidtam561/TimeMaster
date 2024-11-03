const CACHE_NAME = 'timemaster-v1';
const urlsToCache = ['/TimeMaster/','/TimeMaster/index.html','/TimeMaster/logo.svg','/TimeMaster/logo1.png','/TimeMaster/logo2.png','/TimeMaster/logo3.png','/TimeMaster/manifest.json'];
self.addEventListener('install',(event)=>{event.waitUntil(caches.open(CACHE_NAME).then((cache)=>{return cache.addAll(urlsToCache)}));self.skipWaiting()});
self.addEventListener('activate',(event)=>{event.waitUntil(clients.claim())});
self.addEventListener('fetch',(event)=>{event.respondWith(caches.match(event.request).then((response)=>{if(response){return response}return fetch(event.request)}))});
self.addEventListener('push',(event)=>{const options={body:event.data?.text()||'יש לך התראה חדשה!',icon:'/TimeMaster/logo1.png',badge:'/TimeMaster/logo3.png',vibrate:[200,100,200]};event.waitUntil(self.registration.showNotification('TimeMaster',options))});
self.addEventListener('notificationclick',(event)=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window'}).then((clientList)=>{if(clientList.length>0){return clientList[0].focus()}return clients.openWindow('/TimeMaster/')}))});
