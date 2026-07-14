const CACHE_NAME = 'cmms-v1';
const STATIC_ASSETS = ['/', '/index.html', '/css/styles.css', '/js/api.js', '/js/auth.js', '/js/app.js'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(STATIC_ASSETS); }).then(function() { return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(names) { return Promise.all(names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })); }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('script.google.com') || e.request.url.includes('scriptexec')) {
    return;
  }
  e.respondWith(caches.match(e.request).then(function(r) {
    return r || fetch(e.request).then(function(resp) {
      if (resp.status === 200 && resp.type === 'basic') {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
      }
      return resp;
    });
  }).catch(function() {
    if (e.request.destination === 'document') return caches.match('/index.html');
  }));
});
