(function () {
  "use strict";

  var CACHE_KEY = "portalCastCache";
  var MIN_CAST = 4;
  var MAX_CAST = 8;
  var CUTOUT_HEIGHT = 260;

  var BUILTINS = [
    { id: "builtin:sofia", name: "Sofia", src: "games/images/character-girl-blonde.png" },
    { id: "builtin:isaac", name: "Isaac", src: "games/images/character-baby-coolegg.png" },
    { id: "builtin:babyca", name: "Baby", src: "games/images/character-babyca.png" },
    { id: "builtin:tilly", name: "Tilly", src: "games/images/tilly-mascot.png" },
  ];

  var stage = document.getElementById("homeCastStage");
  var sub = document.getElementById("homeCastSub");
  var bubble = document.getElementById("homeCastBubble");
  var bubbleText = document.getElementById("homeCastBubbleText");
  var bubbleGo = document.getElementById("homeCastBubbleGo");
  if (!stage) return;

  var walkers = [];
  var rafId = 0;
  var lastT = 0;
  var visible = true;
  var activeWalker = null;
  var bubbleTimer = 0;

  function reducedMotion() {
    return (
      document.documentElement.classList.contains("kids-reduce-motion") ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    );
  }

  function readCache() {
    try {
      var arr = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeCache(arr) {
    var list = arr.slice(0, MAX_CAST);
    while (list.length) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(list));
        return;
      } catch (e) {
        list.pop();
      }
    }
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e2) {}
  }

  /** Saved characters are painted on plain off-white — flood-fill it away from the edges so they stand on the stage. */
  function cutoutFromBlob(blob) {
    return new Promise(function (resolve, reject) {
      var objUrl = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var scale = CUTOUT_HEIGHT / img.naturalHeight;
        var w = Math.max(1, Math.round(img.naturalWidth * scale));
        var h = CUTOUT_HEIGHT;
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        var ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(objUrl);
        var data;
        try {
          data = ctx.getImageData(0, 0, w, h);
        } catch (e) {
          resolve(c.toDataURL("image/png"));
          return;
        }
        var px = data.data;
        var seen = new Uint8Array(w * h);
        var stack = [];
        function isBg(i) {
          var o = i * 4;
          var r = px[o];
          var g = px[o + 1];
          var b = px[o + 2];
          var mx = Math.max(r, g, b);
          var mn = Math.min(r, g, b);
          return mn > 205 && mx - mn < 30;
        }
        var x;
        var y;
        for (x = 0; x < w; x++) {
          stack.push(x, (h - 1) * w + x);
        }
        for (y = 0; y < h; y++) {
          stack.push(y * w, y * w + w - 1);
        }
        while (stack.length) {
          var i = stack.pop();
          if (seen[i]) continue;
          seen[i] = 1;
          if (!isBg(i)) continue;
          px[i * 4 + 3] = 0;
          var cx = i % w;
          var cy = (i - cx) / w;
          if (cx > 0) stack.push(i - 1);
          if (cx < w - 1) stack.push(i + 1);
          if (cy > 0) stack.push(i - w);
          if (cy < h - 1) stack.push(i + w);
        }
        // Soften the halo: light pixels touching the cleared area become semi-transparent.
        for (y = 1; y < h - 1; y++) {
          for (x = 1; x < w - 1; x++) {
            var j = y * w + x;
            if (px[j * 4 + 3] === 0) continue;
            if (
              px[(j - 1) * 4 + 3] === 0 ||
              px[(j + 1) * 4 + 3] === 0 ||
              px[(j - w) * 4 + 3] === 0 ||
              px[(j + w) * 4 + 3] === 0
            ) {
              var o2 = j * 4;
              var light = Math.min(px[o2], px[o2 + 1], px[o2 + 2]);
              if (light > 170) px[o2 + 3] = 110;
            }
          }
        }
        var minX = w;
        var minY = h;
        var maxX = -1;
        var maxY = -1;
        for (y = 0; y < h; y++) {
          for (x = 0; x < w; x++) {
            if (px[(y * w + x) * 4 + 3] > 20) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        ctx.putImageData(data, 0, 0);
        if (maxX < 0) {
          resolve(c.toDataURL("image/png"));
          return;
        }
        var tw = maxX - minX + 1;
        var th = maxY - minY + 1;
        var t = document.createElement("canvas");
        t.width = tw;
        t.height = th;
        t.getContext("2d").drawImage(c, minX, minY, tw, th, 0, 0, tw, th);
        resolve(t.toDataURL("image/png"));
      };
      img.onerror = function () {
        URL.revokeObjectURL(objUrl);
        reject(new Error("decode"));
      };
      img.src = objUrl;
    });
  }

  function castWithFill(saved) {
    var list = saved.slice(0, MAX_CAST).map(function (c) {
      return { id: c.id, name: c.name, src: c.thumb, saved: true };
    });
    for (var i = 0; list.length < MIN_CAST && i < BUILTINS.length; i++) {
      list.push({ id: BUILTINS[i].id, name: BUILTINS[i].name, src: BUILTINS[i].src, saved: false });
    }
    return list;
  }

  function castSignature(list) {
    return list
      .map(function (c) {
        return c.id + ":" + c.name;
      })
      .join("|");
  }

  var currentSig = "";

  function buildStage(list) {
    var sig = castSignature(list);
    if (sig === currentSig) return;
    currentSig = sig;
    hideBubble();
    walkers.forEach(function (w) {
      w.el.remove();
    });
    walkers = [];

    var stageW = stage.clientWidth || 800;
    var calm = reducedMotion();
    list.forEach(function (c, idx) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "cast-walker";
      el.setAttribute("aria-label", c.name + " — tap to make a story");
      var lane = idx % 2;
      el.classList.add(lane ? "cast-walker--back" : "cast-walker--front");

      var body = document.createElement("span");
      body.className = "cast-walker__body";
      var img = document.createElement("img");
      img.className = "cast-walker__img";
      img.src = c.src;
      img.alt = "";
      img.draggable = false;
      body.appendChild(img);
      img.addEventListener("load", function () {
        place(w);
      });
      var shadow = document.createElement("span");
      shadow.className = "cast-walker__shadow";
      var tag = document.createElement("span");
      tag.className = "cast-walker__name";
      tag.textContent = c.name;
      var puff = document.createElement("span");
      puff.className = "cast-walker__puff";
      puff.setAttribute("aria-hidden", "true");
      puff.textContent = "✨";
      el.appendChild(shadow);
      el.appendChild(body);
      el.appendChild(tag);
      el.appendChild(puff);
      stage.appendChild(el);

      var slot = (idx + 0.5) / list.length;
      var w = {
        el: el,
        body: body,
        c: c,
        x: calm ? slot * stageW : Math.random() * stageW,
        dir: Math.random() < 0.5 ? -1 : 1,
        speed: 22 + Math.random() * 26,
        pauseUntil: 0,
        nextPauseAt: performance.now() + 3000 + Math.random() * 6000,
        held: false,
      };
      el.style.animationDelay = idx * 0.25 + "s";
      body.style.animationDelay = -Math.random() + "s";
      el.addEventListener("click", function (ev) {
        ev.stopPropagation();
        onTap(w);
      });
      walkers.push(w);
      place(w);
    });
    stage.classList.toggle("is-calm", calm);
  }

  function place(w) {
    var half = w.el.offsetWidth / 2;
    var stageW = stage.clientWidth;
    if (stageW > half * 2 + 12) {
      w.x = Math.max(half + 6, Math.min(stageW - half - 6, w.x));
    }
    w.el.style.transform = "translateX(" + (w.x - half) + "px)";
    w.body.classList.toggle("is-left", w.dir < 0);
  }

  function tick(t) {
    rafId = 0;
    if (!visible || reducedMotion()) {
      lastT = 0;
      return;
    }
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
    lastT = t;
    var stageW = stage.clientWidth;
    walkers.forEach(function (w) {
      if (w.held) return;
      if (t < w.pauseUntil) {
        w.el.classList.add("is-idle");
        return;
      }
      w.el.classList.remove("is-idle", "is-hop");
      if (t > w.nextPauseAt) {
        w.pauseUntil = t + 1200 + Math.random() * 1800;
        w.nextPauseAt = w.pauseUntil + 4000 + Math.random() * 7000;
        if (Math.random() < 0.5) w.el.classList.add("is-hop");
        if (Math.random() < 0.3) w.dir *= -1;
        return;
      }
      var margin = w.el.offsetWidth / 2 + 6;
      w.x += w.dir * w.speed * dt;
      if (w.x < margin) {
        w.x = margin;
        w.dir = 1;
      } else if (w.x > stageW - margin) {
        w.x = stageW - margin;
        w.dir = -1;
      }
      place(w);
    });
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (!rafId && visible && !reducedMotion()) {
      lastT = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  function storyHref(c) {
    return "games/storybook.html?char=" + encodeURIComponent(c.id);
  }

  function onTap(w) {
    if (activeWalker === w && !bubble.hidden) {
      window.location.href = storyHref(w.c);
      return;
    }
    hideBubble();
    activeWalker = w;
    w.held = true;
    w.el.classList.remove("is-hop");
    void w.el.offsetWidth;
    w.el.classList.add("is-hop", "is-picked");
    bubbleText.textContent = "Hi, I’m " + w.c.name + "!";
    bubbleGo.href = storyHref(w.c);
    bubble.hidden = false;
    // Layout boxes, not getBoundingClientRect — the hop/appear animations scale the walker.
    var stageW = stage.clientWidth;
    var stageH = stage.clientHeight;
    var ew = w.el.offsetWidth;
    var eh = w.el.offsetHeight;
    var elBottom = parseFloat(window.getComputedStyle(w.el).bottom) || 0;
    var stageRect = { width: stageW, height: stageH, top: 0, left: 0, bottom: stageH };
    var r = {
      left: w.x - ew / 2,
      right: w.x + ew / 2,
      top: stageH - elBottom - eh,
    };
    var cx = w.x;
    var bw = bubble.offsetWidth;
    var bh = bubble.offsetHeight;
    var roomAbove = r.top;
    bubble.style.top = "";
    bubble.style.bottom = "";
    if (roomAbove >= bh + 16) {
      var left = Math.max(8, Math.min(stageRect.width - bw - 8, cx - bw / 2));
      bubble.classList.remove("is-side");
      bubble.style.left = left + "px";
      bubble.style.setProperty("--tail", cx - left + "px");
      bubble.style.bottom = stageRect.bottom - r.top + 6 + "px";
    } else {
      var toRight = cx < stageRect.width / 2;
      var sideLeft = toRight
        ? r.right - stageRect.left + 4
        : r.left - stageRect.left - bw - 4;
      sideLeft = Math.max(8, Math.min(stageRect.width - bw - 8, sideLeft));
      bubble.classList.add("is-side");
      bubble.classList.toggle("is-side-left", !toRight);
      bubble.style.left = sideLeft + "px";
      bubble.style.top =
        Math.max(8, Math.min(stageRect.height - bh - 8, r.top - stageRect.top + 10)) + "px";
    }
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, 7000);
  }

  function hideBubble() {
    if (bubble) bubble.hidden = true;
    clearTimeout(bubbleTimer);
    if (activeWalker) {
      activeWalker.held = false;
      activeWalker.el.classList.remove("is-picked", "is-hop");
      activeWalker = null;
    }
  }

  document.addEventListener("click", function (e) {
    if (bubble && !bubble.hidden && !bubble.contains(e.target)) hideBubble();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting && !document.hidden;
      if (visible) start();
    }).observe(stage);
  }
  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
    if (visible) start();
  });
  window.addEventListener("resize", function () {
    walkers.forEach(function (w) {
      place(w);
    });
  });

  function setSub(savedCount, signedIn) {
    if (!sub) return;
    if (savedCount > 0) {
      sub.textContent = "Tap a friend to make a story with them!";
    } else if (signedIn) {
      sub.textContent = "Make your own characters — they’ll come and play here!";
    } else {
      sub.textContent = "Tap a friend to say hi — or make your own characters!";
    }
  }

  var cached = readCache();
  buildStage(castWithFill(cached));
  setSub(cached.length, false);
  start();

  function syncFromCloud() {
    var store = window.CharacterStore;
    if (!store || !store.isConfigured()) return;
    store.loadCharacters(function (err, list) {
      if (err || !Array.isArray(list)) return;
      var byId = {};
      cached.forEach(function (c) {
        byId[c.id] = c;
      });
      var wanted = list.slice(0, MAX_CAST);
      var jobs = wanted.map(function (c) {
        if (byId[c.id] && byId[c.id].thumb) {
          return Promise.resolve({ id: c.id, name: c.name, thumb: byId[c.id].thumb });
        }
        return new Promise(function (resolve) {
          store.getCharacterSignedUrl(c.id, function (e2, url) {
            if (e2 || !url) {
              resolve(null);
              return;
            }
            fetch(url)
              .then(function (r) {
                if (!r.ok) throw new Error("http " + r.status);
                return r.blob();
              })
              .then(cutoutFromBlob)
              .then(function (thumb) {
                resolve({ id: c.id, name: c.name, thumb: thumb });
              })
              .catch(function () {
                resolve(null);
              });
          });
        });
      });
      Promise.all(jobs).then(function (rows) {
        var fresh = rows.filter(Boolean);
        cached = fresh;
        writeCache(fresh);
        buildStage(castWithFill(fresh));
        setSub(fresh.length, true);
        start();
      });
    });
  }

  if (document.readyState === "complete") {
    syncFromCloud();
  } else {
    window.addEventListener("load", syncFromCloud);
  }
})();
