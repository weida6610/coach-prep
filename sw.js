const CACHE_NAME = 'coach-prep-v40';
const ASSETS = [
  '/coach-prep/index.html',
  '/coach-prep/style.css',
  '/coach-prep/app.js',
  '/coach-prep/data.js',
  '/coach-prep/views.js',
  '/coach-prep/prep.js',
  '/coach-prep/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
