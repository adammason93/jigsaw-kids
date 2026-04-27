/**
 * Shared kid-friendly features: sound, haptics, read-aloud, stats, confetti, settings.
 * No build step — attach via <script src="../js/kids-core.js"></script>
 */
(function (global) {
  "use strict";

  var K = {
    K_SOUND: "kidsSound",
    K_HAPTIC: "kidsHaptic",
    K_READ: "kidsReadAloud",
    K_CONTRAST: "kidsHighContrast",
    K_REDUCE: "kidsForceReduceMotion",
    K_STATS: "kidsStatsV1",
    K_PROFILE: "kidsProfileV1",
  };

  function getStr(key, def) {
    try {
      var v = localStorage.getItem(key);
      return v === null || v === "" ? def : v;
    } catch (e) {
      return def;
    }
  }

  function setStr(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch (e) {}
  }

  K.isSoundOn = function () {
    return getStr(K.K_SOUND, "1") === "1";
  };
  K.setSoundOn = function (on) {
    setStr(K.K_SOUND, on ? "1" : "0");
    K._updateBar();
  };
  K.isHapticOn = function () {
    return getStr(K.K_HAPTIC, "1") === "1";
  };
  K.setHapticOn = function (on) {
    setStr(K.K_HAPTIC, on ? "1" : "0");
  };
  K.isReadAloudOn = function () {
    return getStr(K.K_READ, "0") === "1";
  };
  K.setReadAloudOn = function (on) {
    setStr(K.K_READ, on ? "1" : "0");
  };
  K.isHighContrast = function () {
    return getStr(K.K_CONTRAST, "0") === "1";
  };
  K.setHighContrast = function (on) {
    setStr(K.K_CONTRAST, on ? "1" : "0");
    document.documentElement.classList.toggle("kids-high-contrast", on);
  };
  K.isForceReduceMotion = function () {
    return getStr(K.K_REDUCE, "0") === "1";
  };
  K.setForceReduceMotion = function (on) {
    setStr(K.K_REDUCE, on ? "1" : "0");
    document.documentElement.classList.toggle("kids-reduce-motion", on);
  };

  K.applyBodyClasses = function () {
    document.documentElement.classList.toggle("kids-high-contrast", K.isHighContrast());
    document.documentElement.classList.toggle("kids-reduce-motion", K.isForceReduceMotion());
  };

  var audioCtx = null;
  function getCtx() {
    if (!K.isSoundOn()) {
      return null;
    }
    if (!audioCtx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) {
        return null;
      }
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /** type: "tap" | "ok" | "no" | "win" | "roll" */
  K.playSound = function (type) {
    var ctx = getCtx();
    if (!ctx) {
      return;
    }
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    var start = ctx.currentTime;
    var f0 = 440;
    var f1 = 440;
    var dur = 0.08;
    var vol = 0.06;
    if (type === "tap") {
      f0 = 300;
      f1 = 420;
      dur = 0.04;
    } else if (type === "ok") {
      f0 = 523;
      f1 = 784;
      dur = 0.12;
      vol = 0.08;
    } else if (type === "no") {
      f0 = 180;
      f1 = 120;
      dur = 0.18;
      vol = 0.05;
    } else if (type === "win") {
      f0 = 392;
      f1 = 523;
      dur = 0.25;
      vol = 0.09;
    } else if (type === "roll") {
      f0 = 350;
      f1 = 220;
      dur = 0.06;
    }
    o.frequency.setValueAtTime(f0, start);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), start + dur);
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur + 0.02);
    o.type = "sine";
    o.start(start);
    o.stop(start + dur + 0.05);
  };

  K.haptic = function (kind) {
    if (!K.isHapticOn() || !global.navigator || !global.navigator.vibrate) {
      return;
    }
    if (kind === "light") {
      global.navigator.vibrate(12);
    } else if (kind === "success") {
      global.navigator.vibrate([10, 40, 15]);
    } else {
      global.navigator.vibrate(18);
    }
  };

  K.speak = function (text) {
    if (!K.isReadAloudOn() || !text || !global.speechSynthesis) {
      return;
    }
    try {
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.pitch = 1.05;
      u.lang = document.documentElement.lang || "en-GB";
      global.speechSynthesis.speak(u);
    } catch (e) {}
  };

  K.stopSpeak = function () {
    if (global.speechSynthesis) {
      try {
        global.speechSynthesis.cancel();
      } catch (e) {}
    }
  };

  K.shouldReduceMotion = function () {
    if (K.isForceReduceMotion()) {
      return true;
    }
    return global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  K.recordGame = function (gameId) {
    var raw = getStr(K.K_STATS, "{}");
    var o;
    try {
      o = JSON.parse(raw);
    } catch (e) {
      o = {};
    }
    o.plays = (o.plays || 0) + 1;
    o[gameId] = (o[gameId] || 0) + 1;
    o.last = new Date().toISOString();
    setStr(K.K_STATS, JSON.stringify(o));
  };

  K.getStats = function () {
    var raw = getStr(K.K_STATS, "{}");
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { plays: 0 };
    }
  };

  K.getProfile = function () {
    var raw = getStr(K.K_PROFILE, "{}");
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { name: "", char: "" };
    }
  };

  K.setProfile = function (name, char) {
    setStr(
      K.K_PROFILE,
      JSON.stringify({ name: (name || "").trim(), char: char || "" })
    );
  };

  K.confetti = function (container) {
    if (K.shouldReduceMotion()) {
      return;
    }
    var el = container || document.body;
    var layer = document.createElement("div");
    layer.className = "kids-confetti-layer";
    layer.setAttribute("aria-hidden", "true");
    var colors = ["#f472b6", "#a78bfa", "#34d399", "#fbbf24", "#60a5fa", "#fb923c"];
    for (var i = 0; i < 48; i++) {
      var p = document.createElement("span");
      p.className = "kids-confetti-piece";
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.4 + "s";
      p.style.transform = "rotate(" + Math.random() * 180 + "deg)";
      layer.appendChild(p);
    }
    el.appendChild(layer);
    setTimeout(function () {
      if (layer.parentNode) {
        layer.parentNode.removeChild(layer);
      }
    }, 4000);
  };

  K._barEl = null;
  K._updateBar = function () {
    if (!K._barEl) {
      return;
    }
    var b = K._barEl.querySelector(".kids-fbar__mute");
    if (b) {
      b.setAttribute("aria-pressed", K.isSoundOn() ? "false" : "true");
      b.textContent = K.isSoundOn() ? "🔊" : "🔇";
      b.title = K.isSoundOn() ? "Sound on" : "Sound off (muted)";
    }
  };

  K.init = function (opts) {
    opts = opts || {};
    K.applyBodyClasses();
    if (opts.skipBar) {
      return;
    }
    if (document.querySelector(".kids-fbar")) {
      return;
    }
    var bar = document.createElement("div");
    bar.className = "kids-fbar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Sound and help");
    bar.innerHTML =
      '<button type="button" class="kids-fbar__mute" aria-pressed="false" title="Mute">🔊</button>' +
      '<button type="button" class="kids-fbar__help" type="button" title="Grown-up settings">⚙️</button>';
    document.body.appendChild(bar);
    K._barEl = bar;
    K._updateBar();
    bar.querySelector(".kids-fbar__mute").addEventListener("click", function () {
      K.setSoundOn(!K.isSoundOn());
    });
    bar.querySelector(".kids-fbar__help").addEventListener("click", function () {
      K.openSettings();
    });
  };

  K.openSettings = function () {
    var ex = document.getElementById("kidsSettingsDialog");
    if (ex) {
      ex.classList.add("is-open");
      ex.setAttribute("aria-hidden", "false");
      return;
    }
    var d = document.createElement("div");
    d.id = "kidsSettingsDialog";
    d.className = "kids-settings";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-modal", "true");
    d.setAttribute("aria-labelledby", "kidsSetTitle");
    d.innerHTML =
      '<div class="kids-settings__backdrop" data-close="1"></div>' +
      '<div class="kids-settings__panel">' +
      "<h2 id=\"kidsSetTitle\" class=\"kids-settings__title\">Grown-up &amp; comfort</h2>" +
      "<p class=\"kids-settings__lead\">These stay on this device. Nothing is sent to a server yet.</p>" +
      '<label class="kids-settings__row"><input type="checkbox" id="kidsSetSound" checked /> <span>Fun sounds (beeps &amp; chimes)</span></label>' +
      '<label class="kids-settings__row"><input type="checkbox" id="kidsSetHap" checked /> <span>Little buzz on taps (if your tablet supports it)</span></label>' +
      '<label class="kids-settings__row"><input type="checkbox" id="kidsSetRead" /> <span>Read questions aloud (read to me)</span></label>' +
      '<label class="kids-settings__row"><input type="checkbox" id="kidsSetHi" /> <span>High contrast (stronger colours)</span></label>' +
      '<label class="kids-settings__row"><input type="checkbox" id="kidsSetMo" /> <span>Calm screen (less movement)</span></label>' +
      "<hr />" +
      "<p class=\"kids-settings__stat\" id=\"kidsStatLine\"></p>" +
      '<button type="button" class="btn kids-settings__close" data-close="1">Done</button>' +
      "</div>";
    document.body.appendChild(d);
    function sync() {
      d.querySelector("#kidsSetSound").checked = K.isSoundOn();
      d.querySelector("#kidsSetHap").checked = K.isHapticOn();
      d.querySelector("#kidsSetRead").checked = K.isReadAloudOn();
      d.querySelector("#kidsSetHi").checked = K.isHighContrast();
      d.querySelector("#kidsSetMo").checked = K.isForceReduceMotion();
      var st = K.getStats();
      var line = d.querySelector("#kidsStatLine");
      if (line) {
        line.textContent =
          "Fun runs on this iPad: " + (st.plays || 0) + " game starts so far. Keep it up!";
      }
    }
    sync();
    d.addEventListener("change", function (e) {
      var t = e.target;
      if (t.id === "kidsSetSound") {
        K.setSoundOn(t.checked);
      }
      if (t.id === "kidsSetHap") {
        K.setHapticOn(t.checked);
      }
      if (t.id === "kidsSetRead") {
        K.setReadAloudOn(t.checked);
      }
      if (t.id === "kidsSetHi") {
        K.setHighContrast(!!t.checked);
      }
      if (t.id === "kidsSetMo") {
        K.setForceReduceMotion(!!t.checked);
      }
    });
    d.addEventListener("click", function (e) {
      if (e.target.getAttribute("data-close")) {
        d.classList.remove("is-open");
        d.setAttribute("aria-hidden", "true");
      }
    });
    d.classList.add("is-open");
    d.setAttribute("aria-hidden", "false");
  };

  K.bindTapSound = function (root) {
    root = root || document;
    root.addEventListener(
      "click",
      function (e) {
        if (
          e.target.closest("a, button, .btn, .mc-btn, [role='button']") &&
          !e.target.closest("#kidsSettingsDialog")
        ) {
          K.playSound("tap");
        }
      },
      true
    );
  };

  global.KidsCore = K;
})(typeof window !== "undefined" ? window : this);
