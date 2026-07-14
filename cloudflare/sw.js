const CACHE_NAME = 'cmms-v5';
const STATIC_ASSETS = [
  '/', '/index.html', '/css/styles.css', '/js/api.js', '/js/auth.js', '/js/app.js',
  '/logo.svg', '/favicon.svg',
  '/js/pages/dashboard.js', '/js/pages/jobcards.js', '/js/pages/openjc.js', '/js/pages/startjc.js',
  '/js/pages/closejc.js', '/js/pages/pendingjc.js', '/js/pages/machines.js', '/js/pages/assets.js',
  '/js/pages/spareparts.js', '/js/pages/technicians.js', '/js/pages/pm.js', '/js/pages/checklists.js',
  '/js/pages/inventory.js', '/js/pages/goodsreceipt.js', '/js/pages/reports.js', '/js/pages/settings.js',
  '/js/pages/qr.js', '/js/pages/users.js', '/js/pages/departments.js', '/js/pages/sections.js',
  '/js/pages/notifications.js', '/js/pages/email.js', '/js/pages/whatsapp.js', '/js/pages/backup.js',
  '/js/pages/audit.js', '/js/pages/breakdownhistory.js', '/js/pages/pmhistory.js'
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

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  if (e.request.url.indexOf('script.google.com') > -1 ||
      e.request.url.indexOf('googleapis.com') > -1 ||
      e.request.url.indexOf('gstatic.com') > -1 ||
      e.request.url.indexOf('unpkg.com') > -1) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(r) {
      if (r) return r;
      return fetch(e.request).then(function(resp) {
        if (resp.status === 200 && resp.type === 'basic') {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      });
    }).catch(function() {
      if (e.request.destination === 'document') {
        return caches.match('/index.html');
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});
