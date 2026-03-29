const CACHE = 'korean-app-v2';
const ASSETS = ['./manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // Always network-first for the main HTML page so updates are immediate
  if (url.includes('index.html') || url.endsWith('/') || url === self.location.origin + '/') {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Network-first for API and fonts
  if (url.includes('anthropic.com') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 503})));
    return;
  }

  // Cache-first for everything else (static assets)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return resp;
    }))
  );
});
