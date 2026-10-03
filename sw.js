// Caches slide images on the device so repeat opens (and flipping back) are instant.
// Bump CACHE when you republish slides under the same URLs.
var CACHE = 'slides-v1';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

function isSlide(url) { return /\/slides\/slide-\d+\.(png|webp)$/.test(url); }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || !isSlide(req.url)) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req.url).then(function (hit) {
      if (hit) return hit;
      return fetch(req.url, { mode: 'cors' }).then(function (r) {
        if (r.ok) c.put(req.url, r.clone());
        return r;
      }).catch(function () { return fetch(req); });
    });
  }));
});

// Background download of the whole deck, 3 at a time.
self.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'precache') return;
  var urls = e.data.urls, i = 0;
  e.waitUntil(caches.open(CACHE).then(function (c) {
    function worker() {
      if (i >= urls.length) return Promise.resolve();
      var u = urls[i++];
      return c.match(u).then(function (hit) {
        if (hit) return;
        return fetch(u, { mode: 'cors' }).then(function (r) {
          if (r.ok) return c.put(u, r);
        }).catch(function () {});
      }).then(worker);
    }
    return Promise.all([worker(), worker(), worker()]);
  }));
});
