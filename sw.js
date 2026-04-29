/* Minimal offline shell — network-first, cache as fallback for same-origin */
const CACHE = "jigsaw-kids-v194";
const SHELL = [
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-384-maskable.png",
  "./portal.css",
  "./games/images/tilly-mascot.png",
  "./js/kids-core.js",
  "./js/kids-core.css",
  "./js/score-config.js",
  "./js/kids-game-characters.js",
  "./js/score-cloud.js",
  "./js/game-scorecard.js",
  "./js/game-scorecard.css",
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
  "./games/images/math-race-dino.png",
  "./games/images/math-race-park-wide.png",
  "./games/images/math-race-park-bg.png",
  "./games/images/math-race-birds-sheet.png",
  "./games/images/math-race-finish-line.png",
  "./games/images/math-race-hero.png",
  "./games/noughts-crosses.html",
  "./games/noughts-crosses.css",
  "./games/noughts-crosses.js",
  "./games/images/ttt-play-bg.png",
  "./games/connect-four.html",
  "./games/connect-four.css",
  "./games/connect-four.js",
  "./games/word-search.html",
  "./games/word-search.css",
  "./games/word-search.js",
  "./games/snap.html",
  "./games/snap.css",
  "./games/snap.js",
  "./games/memory.html",
  "./games/memory.css",
  "./games/memory.js",
  "./games/rock-paper-scissors.html",
  "./games/rock-paper-scissors.css",
  "./games/rock-paper-scissors.js",
  "./games/images/portal/rock-paper-scissors-card.png",
  "./games/images/rps/rock.png",
  "./games/images/rps/paper.png",
  "./games/images/rps/scissors.png",
  "./games/snake-arcade.html",
  "./games/snake-arcade.css",
  "./games/snake-arcade.js",
  "./games/images/portal/snake-portal.png",
  "./games/zuma.html",
  "./games/zuma.css",
  "./games/zuma.js",
  "./games/images/portal/zuma-portal.png",
  "./games/images/zuma/bg.svg",
  "./games/images/zuma/bg-leaf.svg",
  "./games/images/zuma/frog.svg",
  "./games/images/zuma/noise.png",
  "./games/images/zuma/leaf-01.svg",
  "./games/images/zuma/leaf-02.svg",
  "./games/images/zuma/leaf-03.svg",
  "./games/images/zuma/leaf-04.svg",
  "./games/images/zuma/leaf-05.svg",
  "./games/images/zuma/leaf-06.svg",
  "./games/marble-tilt.html",
  "./games/marble-tilt.css",
  "./games/marble-tilt.js",
  "./games/images/portal/marble-tilt.svg",
  "./games/images/portal/memory.png",
  "./games/images/memory-size-quick.png",
  "./games/images/memory-size-normal.png",
  "./games/images/memory-size-big.png",
  "./games/images/portal/snap.png",
  "./games/images/character-baby-coolegg.png",
  "./games/images/character-kelly.png",
  "./games/images/character-freya.png",
  "./games/images/character-girl-blonde.png",
  "./games/images/character-sofia-running.png",
  "./games/images/character-babyca.png",
  "./games/images/portal/snakes-ladders.png",
  "./games/images/portal/noughts-crosses.png",
  "./games/images/portal/connect-four.png",
  "./games/images/portal/word-search.png",
  "./games/snakes-ladders.html",
  "./games/snakes-ladders.css",
  "./games/snakes-ladders.js",
  "./games/colouring.html",
  "./games/colouring.css",
  "./games/colouring.js",
  "./games/storybook.html",
  "./games/storybook.css",
  "./games/storybook.js",
  "./games/images/portal/storybook.svg",
  "./games/images/storybook-design-goal-reference.png",
  "./games/images/flip-book/page-front-edge.png",
  "./games/images/flip-book/page-back-edge.png",
  "./games/images/flip-book/flip-book-cover-edge.png",
  "./games/images/flip-book/page-size-reference.png",
  "./games/images/colouring-texture-bg.png",
  "./games/images/portal/colouring.png",
  "./games/images/portal/jigsaw.png",
  "./games/images/colouring/template-mermaid.png",
  "./games/images/colouring/template-dino-hill.png",
  "./games/images/colouring/template-coral-reef.png",
  "./games/images/colouring/template-shark-party.png",
  "./games/images/colouring/template-winged-unicorn.png",
  "./games/images/colouring/template-pony.png",
  "./games/images/colouring/template-winter-friend.png",
  "./games/images/colouring/template-splash-friends.png",
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
