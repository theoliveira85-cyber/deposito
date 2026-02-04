const CACHE_NAME = 'estoque-app-v1';
const urlsToCache = [
  '/',
  '/deposito.html',
  '/manifest.json',
  // CDN resources we want available offline (precache during install)
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
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
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // Cache successful responses for future offline use
        if (res && res.status === 200) {
          const r = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, r));
        }
        return res;
      })
      .catch(() => {
        // On failure (offline), try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;

          // If it's a script and not cached, return an empty JS stub to avoid syntax errors
          try {
            const accept = event.request.headers.get('accept') || '';
            if (event.request.destination === 'script' || accept.indexOf('javascript') !== -1) {
              return new Response('// offline script stub', { headers: { 'Content-Type': 'application/javascript' } });
            }
          } catch (e) {
            // ignore header read errors
          }

          // If it's a navigation (HTML), return the cached app shell if available
          if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').indexOf('text/html') !== -1) {
            return caches.match('/deposito.html');
          }

          // Otherwise, respond with a generic fallback (could be Image/text)
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});