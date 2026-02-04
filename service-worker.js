const CACHE_NAME = 'estoque-app-v3';
const urlsToCache = [
  '/',
  '/deposito.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).catch(e => console.error('Cache failed', e))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res && res.status === 200) {
          const r = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, r));
        }
        return res;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          try {
            const accept = event.request.headers.get('accept') || '';
            if (event.request.destination === 'script' || accept.indexOf('javascript') !== -1) {
              return new Response('// offline script stub', { headers: { 'Content-Type': 'application/javascript' } });
            }
          } catch (e) {}
          if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').indexOf('text/html') !== -1) {
            return caches.match('/deposito.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});