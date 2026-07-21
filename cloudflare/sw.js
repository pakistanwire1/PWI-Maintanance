const CACHE_NAME = 'cmms-v23';
const STATIC_ASSETS = [
  '/', '/index.html', '/css/styles.css',
  '/js/app.js',
  '/js/core/utils.js', '/js/core/icons.js', '/js/core/api.js', '/js/core/session.js',
  '/js/core/router.js', '/js/core/nav.js', '/js/core/loader.js', '/js/core/theme.js',
  '/js/core/notify.js', '/js/core/dashboard.js',
  '/js/pages/machines.js', '/js/pages/assets.js', '/js/pages/users.js',
  '/js/pages/technicians.js', '/js/pages/departments.js', '/js/pages/sections.js',
  '/js/pages/checklists.js', '/js/pages/jobcards.js', '/js/pages/openjc.js',
  '/js/pages/startjc.js', '/js/pages/closejc.js', '/js/pages/pendingjc.js',
  '/js/pages/approvejc.js', '/js/pages/pm.js', '/js/pages/pmhistory.js',
  '/js/pages/spareparts.js', '/js/pages/inventory.js', '/js/pages/inventorytxns.js',
  '/js/pages/stockhistory.js', '/js/pages/goodsreceipt.js', '/js/pages/breakdownhistory.js',
  '/js/pages/notifications.js', '/js/pages/qr.js', '/js/pages/email.js',
  '/js/pages/whatsapp.js', '/js/pages/reports.js', '/js/pages/audit.js',
  '/js/pages/backup.js', '/js/pages/settings.js',
  '/logo.svg', '/favicon.svg'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(c) { return c.addAll(STATIC_ASSETS); })
      .then(function() { return self.skipWaiting(); })
      .catch(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys()
      .then(function(names) {
        return Promise.all(
          names.filter(function(n) { return n !== CACHE_NAME; })
               .map(function(n) { return caches.delete(n); })
        );
      })
      .then(function() { return self.clients.claim(); })
  );
});

var EXTERNAL_HOSTS = [
  'script.google.com',
  'googleapis.com',
  'gstatic.com',
  'unpkg.com',
  'lh3.googleusercontent.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'images.unsplash.com'
];

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.indexOf('/api/') > -1) return;

  for (var i = 0; i < EXTERNAL_HOSTS.length; i++) {
    if (e.request.url.indexOf(EXTERNAL_HOSTS[i]) > -1) return;
  }

  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        return resp;
      }).catch(function() {
        return caches.match(e.request).then(function(r) {
          return r || caches.match('/index.html').then(function(fallback) {
            return fallback || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
          });
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(r) {
      if (r) return r;
      return fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return resp || new Response('', { status: 408, statusText: 'Request Timeout' });
      }).catch(function() {
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
