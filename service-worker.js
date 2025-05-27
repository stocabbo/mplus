
const CACHE_NAME = 'mplus-cache-v1';
const CACHE_PREFIX = '/mplus';

const ASSETS_TO_CACHE = [
  `${CACHE_PREFIX}/`,
  `${CACHE_PREFIX}/index.html`,
  `${CACHE_PREFIX}/style.css`,
  `${CACHE_PREFIX}/script.js`,
  `${CACHE_PREFIX}/manifest.json`,
  `${CACHE_PREFIX}/offline.html`,
  `${CACHE_PREFIX}/favicon.ico`,
  `${CACHE_PREFIX}/icon-192.png`,
  `${CACHE_PREFIX}/icon-512.png`
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      return caches.match(`${CACHE_PREFIX}/offline.html`);
    })
  );
});
