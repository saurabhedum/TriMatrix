// Basic service worker to make PWA installable
const CACHE_NAME = 'trimatrix-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // Basic fallback
      return caches.match(event.request);
    })
  );
});
