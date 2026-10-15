// Service worker: app shell offline + cache delle immagini remote già viste.
const VERSION = 'tunaid-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './js/fish.js',
  './js/scoring.js',
  './js/species.js',
  './js/ui.js',
  './js/views/catalog.js',
  './js/views/home.js',
  './js/views/library.js',
  './js/views/quiz.js',
  './js/views/settings.js',
  './js/views/stats.js',
  './js/views/tools.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'tunaid-img').map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Immagini esterne: rete prima, poi cache (consente l'uso offline delle foto già viste)
  if (url.origin !== location.origin) {
    if (req.destination !== 'image') return;
    e.respondWith(
      caches.open('tunaid-img').then(async (cache) => {
        try {
          const res = await fetch(req);
          cache.put(req, res.clone());
          return res;
        } catch {
          const hit = await cache.match(req);
          if (hit) return hit;
          throw new Error('offline');
        }
      }),
    );
    return;
  }

  // App shell: cache prima, aggiornata in background
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
