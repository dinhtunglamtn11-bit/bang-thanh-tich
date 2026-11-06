// Service worker: ưu tiên mạng, rơi về bộ nhớ đệm khi offline.
const CACHE = 'pixel-v1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com|gstatic\.com\/firebasejs/.test(url.host + url.pathname)) return;
  e.respondWith(fetch(req).then(r => { if (r && r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(req, c)); } return r; }).catch(() => caches.match(req)));
});
