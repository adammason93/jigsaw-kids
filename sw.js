/* Minimal offline shell — network-first, cache as fallback for same-origin */
const CACHE = "jigsaw-kids-v30";
const SHELL = [
  "./index.html",
  "./portal.css",
  "./js/kids-core.js",
  "./js/kids-core.css",
  "./jigsaw.css",
  "./jigsaw.js",
  "./tablet-ipad.css",
  "./games/jigsaw.html",
  "./games/images/jigsaw-presets/sofia-tractor.png",
  "./games/images/jigsaw-presets/sofia-baby-bedtime.png",
  "./games/images/jigsaw-presets/baby-sister-onesie.png",
  "./games/math-race.html",
  "./games/math-race.css",
  "./games/math-race.js",
  "./games/images/math-race-hero.png",
  "./games/noughts-crosses.html",
  "./games/noughts-crosses.css",
  "./games/noughts-crosses.js",
  "./games/connect-four.html",
  "./games/connect-four.css",
  "./games/connect-four.js",
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k !== CACHE;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || e.request.url.indexOf("http") !== 0) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(function (r) {
        return r;
      })
      .catch(function () {
        return caches.match(e.request).then(function (c) {
          return c || caches.match("./index.html");
        });
      })
  );
});
