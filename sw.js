/**
 * TipTap Service Worker
 * Cache-first strategy for local assets + CDN dependencies.
 * Bump CACHE_VERSION to trigger an update flow.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `tiptap-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/variables.css',
  './manifest.json',
  './data/timezones.json',
  './data/gift.svg',
  './data/time.svg',
  // CDN dependencies
  'https://cdnjs.cloudflare.com/ajax/libs/dexie/3.2.4/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Listen for skip-waiting message from update toast
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
