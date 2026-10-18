/* Canvas atmosphere behind the 3D book. Independent of the book engine. */
(function () {
  "use strict";

  var Atmosphere = window.WondiiStoryAtmosphere;
  if (!Atmosphere) return;

  var reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mobileQuery = window.matchMedia("(max-width: 760px)");

  function hash(value) {
    var h = 2166136261;
    var text = String(value || "wondii");
    var i;
    for (i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function previewTheme() {
    try {
      var flag = new URLSearchParams(window.location.search).get("atmosphere");
      if (flag && Atmosphere.preset(flag).theme === flag) return flag;
    } catch (error) {
      return "";
    }
    return "";
  }

  function density(quality) {
    if (quality === "static" || reducedQuery.matches) return 0;
    var cores = navigator.hardwareConcurrency || 8;
    var memory = navigator.deviceMemory || 8;
    var low = quality === "low" || cores <= 2 || memory <= 2;
    if (low) return mobileQuery.matches ? 6 : 10;
    return mobileQuery.matches ? 12 : 22;
  }

  function makeParticles(kind, count, rand) {
    var list = [];
    var n = count;
    if (kind === "mist") n = Math.max(5, Math.round(count * 0.4));
    if (kind === "leaf") n = Math.max(8, Math.round(count * 0.75));
    var i;
    for (i = 0; i < n; i += 1) {
      var radius = 1.1 + rand() * 2.4;
      if (kind === "mist") radius = 34 + rand() * 72;
      else if (kind === "leaf") radius = 8 + rand() * 9;
      else if (kind === "bubble") radius = 3 + rand() * 7;
      else if (kind === "firefly") radius = 2.4 + rand() * 2.8;
      else if (kind === "dust") radius = 2 + rand() * 2.6;
      else if (kind === "star") radius = 1.5 + rand() * 2.2;
      list.push({
        x: rand(),
        y: rand(),
        r: radius,
        speed: 0.012 + rand() * 0.03,
        drift: (rand() - 0.5) * 0.02,
        phase: rand() * Math.PI * 2,
        spin: (rand() - 0.5) * 0.4,
        tone: rand() > 0.45 ? 1 : 0
      });
    }
    return list;
  }

  function mount(options) {
    var opts = options || {};
    var container = opts.container;
    var config = Atmosphere.resolve(opts.story);
    var shown = opts.theme && Atmosphere.preset(opts.theme).theme === opts.theme ? opts.theme : config.theme;
    var host = null;
    var canvas = null;
    var ctx = null;
    var particles = [];
    var frame = 0;
    var running = false;
    var paused = false;
    var destroyed = false;
    var rand = mulberry(hash(shown));

    function look() {
      return Atmosphere.preset(shown);
    }

    function count() {
      return density(opts.quality || "auto");
    }

    function spawn() {
      rand = mulberry(hash(shown));
      particles = makeParticles(look().particle, count(), rand);
    }

    function resize() {
      if (!canvas || !host) return;
      var rect = host.getBoundingClientRect();
      var scale = Math.min(window.devicePixelRatio || 1, mobileQuery.matches ? 1.25 : 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      draw(performance.now());
    }

    function paintSky(g, w, h, now) {
      var preset = look();
      var sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, preset.sky[0]);
      sky.addColorStop(1, preset.sky[1]);
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      var lamp = g.createRadialGradient(w * 0.5, h * 0.42, w * 0.02, w * 0.5, h * 0.46, w * 0.42);
      lamp.addColorStop(0, preset.glow);
      lamp.addColorStop(1, "rgba(0, 0, 0, 0)");
      g.fillStyle = lamp;
      g.fillRect(0, 0, w, h);
      var cool = g.createRadialGradient(w * 0.16, h * 0.84, 0, w * 0.16, h * 0.84, w * 0.28);
      cool.addColorStop(0, preset.cool);
      cool.addColorStop(1, "rgba(0, 0, 0, 0)");
      g.fillStyle = cool;
      g.fillRect(0, 0, w, h);
      if (preset.theme === "ocean") {
        g.save();
        g.translate(w * 0.5, -h * 0.05);
        var ray;
        for (ray = -1; ray <= 1; ray += 1) {
          g.save();
          g.rotate((ray * 0.16) + Math.sin(now * 0.00015 + ray) * 0.03);
          g.fillStyle = "rgba(190, 230, 240, 0.045)";
          g.beginPath();
          g.moveTo(-18, 0);
          g.lineTo(18, 0);
          g.lineTo(70, h);
          g.lineTo(-70, h);
          g.closePath();
          g.fill();
          g.restore();
        }
        g.restore();
      }
      var shade = g.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, w * 0.75);
      shade.addColorStop(0, "rgba(0, 0, 0, 0)");
      shade.addColorStop(1, "rgba(0, 0, 0, 0.28)");
      g.fillStyle = shade;
      g.fillRect(0, 0, w, h);
    }

    function paintDot(g, x, y, r, color) {
      var dot = g.createRadialGradient(x, y, 0, x, y, r);
      dot.addColorStop(0, color);
      dot.addColorStop(1, "rgba(0, 0, 0, 0)");
      g.fillStyle = dot;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    function wrap(value) {
      return value - Math.floor(value);
    }

    function paintParticles(g, w, h, now) {
      var preset = look();
      var t = now * 0.001;
      particles.forEach(function (bit) {
        var color = bit.tone ? preset.ink : preset.ink2;
        var x = wrap(bit.x + Math.sin(t * 0.2 + bit.phase) * 0.012) * w;
        var y = bit.y * h;
        g.globalAlpha = 1;
        if (preset.particle === "snow") {
          y = wrap(bit.y + t * bit.speed) * h;
          g.globalAlpha = 0.55;
          g.fillStyle = color;
          g.beginPath();
          g.arc(x, y, bit.r, 0, Math.PI * 2);
          g.fill();
          return;
        }
        if (preset.particle === "bubble") {
          y = wrap(1 - (bit.y + t * bit.speed)) * h;
          g.globalAlpha = 0.4;
          g.strokeStyle = color;
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(x, y, bit.r, 0, Math.PI * 2);
          g.stroke();
          return;
        }
        if (preset.particle === "leaf") {
          x = wrap(bit.x + Math.sin(t * 0.55 + bit.phase) * 0.025) * w;
          y = wrap(bit.y + t * bit.speed * 0.7) * h;
          g.save();
          g.translate(x, y);
          g.rotate(Math.sin(t * 0.45 + bit.phase) + bit.spin);
          g.globalAlpha = 0.72;
          g.fillStyle = color;
          g.beginPath();
          g.moveTo(0, -bit.r);
          g.quadraticCurveTo(bit.r * 0.95, -bit.r * 0.15, 0, bit.r);
          g.quadraticCurveTo(-bit.r * 0.95, -bit.r * 0.15, 0, -bit.r);
          g.fill();
          g.restore();
          return;
        }
        if (preset.particle === "mist") {
          x = wrap(bit.x + t * bit.speed * 0.5) * w;
          y = bit.y * h + Math.sin(t * 0.18 + bit.phase) * 14;
          g.globalAlpha = 0.7;
          paintDot(g, x, y, bit.r, color);
          return;
        }
        if (preset.particle === "dust") {
          x = wrap(bit.x + t * bit.speed * 0.75) * w;
          y = wrap(bit.y + t * bit.speed * 0.28) * h;
          paintDot(g, x, y, bit.r * 3.4, color);
          return;
        }
        if (preset.particle === "firefly") {
          x = wrap(bit.x + Math.sin(t * 0.5 + bit.phase) * 0.035) * w;
          y = wrap(bit.y - t * bit.speed * 0.55) * h;
          var glow = 0.5 + Math.sin(t * 1.1 + bit.phase) * 0.35;
          g.globalAlpha = 0.5 + glow * 0.35;
          paintDot(g, x, y, bit.r * (4.2 + glow * 2.4), color);
          g.globalAlpha = 0.92;
          g.fillStyle = "rgba(255, 252, 230, 0.95)";
          g.beginPath();
          g.arc(x, y, Math.max(1.1, bit.r * 0.42), 0, Math.PI * 2);
          g.fill();
          return;
        }
        if (preset.particle === "star") {
          x = wrap(bit.x + t * bit.speed * 0.55) * w;
          y = wrap(bit.y + Math.sin(t * 0.22 + bit.phase) * 0.012) * h;
          var twinkle = 0.4 + Math.sin(t * 0.85 + bit.phase) * 0.28;
          g.globalAlpha = twinkle;
          paintDot(g, x, y, bit.r * 3.6, color);
          g.globalAlpha = Math.min(1, twinkle + 0.35);
          g.fillStyle = color;
          g.beginPath();
          g.arc(x, y, Math.max(0.9, bit.r * 0.55), 0, Math.PI * 2);
          g.fill();
          return;
        }
        y = wrap(bit.y - t * bit.speed) * h;
        x = wrap(bit.x + Math.sin(t * 0.4 + bit.phase) * 0.016) * w;
        paintDot(g, x, y, bit.r * 4.2, color);
        g.globalAlpha = 0.9;
        g.fillStyle = color;
        g.beginPath();
        g.arc(x, y, Math.max(1.15, bit.r * 0.65), 0, Math.PI * 2);
        g.fill();
        if (bit.tone) {
          g.globalAlpha = 0.75;
          g.strokeStyle = color;
          g.lineWidth = 1.1;
          g.beginPath();
          g.moveTo(x - bit.r * 2.4, y);
          g.lineTo(x + bit.r * 2.4, y);
          g.moveTo(x, y - bit.r * 2.4);
          g.lineTo(x, y + bit.r * 2.4);
          g.stroke();
        }
      });
      g.globalAlpha = 1;
    }

    function draw(now) {
      if (!ctx || !canvas) return;
      var w = canvas.width;
      var h = canvas.height;
      paintSky(ctx, w, h, now || 0);
      if (particles.length) paintParticles(ctx, w, h, now || 0);
    }

    function loop(now) {
      if (!running || destroyed) return;
      frame = window.requestAnimationFrame(loop);
      if (paused || document.visibilityState === "hidden") return;
      draw(now);
    }

    function start() {
      if (destroyed || running) return;
      running = true;
      if (particles.length && !reducedQuery.matches) frame = window.requestAnimationFrame(loop);
      else draw(0);
    }

    function stop() {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    }

    function onHide() {
      if (document.visibilityState === "hidden") paused = true;
      else if (running) paused = false;
    }

    if (!container || !Atmosphere.enabled()) {
      return {
        config: config,
        particleCount: 0,
        setTheme: function () {},
        pause: function () {},
        resume: function () {},
        destroy: function () {}
      };
    }

    host = document.createElement("div");
    host.className = "story-atmosphere";
    host.setAttribute("aria-hidden", "true");
    canvas = document.createElement("canvas");
    canvas.className = "story-atmosphere__canvas";
    host.appendChild(canvas);
    container.insertBefore(host, container.firstChild);
    ctx = canvas.getContext("2d");
    spawn();
    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onHide);

    return {
      config: config,
      get particleCount() { return particles.length; },
      setTheme: function (theme) {
        if (!Atmosphere.preset(theme) || Atmosphere.preset(theme).theme !== theme) return;
        shown = theme;
        spawn();
        draw(performance.now());
      },
      pause: function () {
        paused = true;
      },
      resume: function () {
        paused = false;
        start();
      },
      destroy: function () {
        destroyed = true;
        stop();
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onHide);
        if (host && host.parentNode) host.parentNode.removeChild(host);
        host = null;
        canvas = null;
        ctx = null;
        particles = [];
      }
    };
  }

  var room = document.querySelector(".room");
  var sample = window.WondiiBookSample || null;
  var view = mount({
    container: room,
    story: sample,
    theme: previewTheme()
  });
  if (sample && view.config) sample.atmosphere = view.config;
  window.WondiiStoryAtmosphereView = view;
})();
