/**
 * Snap — flip animal tiles; same animal on the last two = valid snap.
 */
(function () {
  "use strict";

  /** 13 animals × 4 copies each = 52 tiles (like a full deck). */
  var SPECIES = [
    { id: "cat", label: "Cat", emoji: "🐱" },
    { id: "dog", label: "Dog", emoji: "🐶" },
    { id: "lion", label: "Lion", emoji: "🦁" },
    { id: "frog", label: "Frog", emoji: "🐸" },
    { id: "cow", label: "Cow", emoji: "🐄" },
    { id: "pig", label: "Pig", emoji: "🐷" },
    { id: "chick", label: "Chick", emoji: "🐤" },
    { id: "penguin", label: "Penguin", emoji: "🐧" },
    { id: "bunny", label: "Bunny", emoji: "🐰" },
    { id: "bear", label: "Bear", emoji: "🐻" },
    { id: "monkey", label: "Monkey", emoji: "🐵" },
    { id: "bee", label: "Bee", emoji: "🐝" },
    { id: "fish", label: "Fish", emoji: "🐟" },
  ];
  var WIN_SCORE = 100;
  var PENALTY_BONUS = 3;
  var CPU_SNAP_MIN_MS = 380;
  var CPU_SNAP_MAX_MS = 1100;
  var AUTO_FLIP_MS = 1400;

  var screenSetup = document.getElementById("screenSetup");
  var screenPlay = document.getElementById("screenPlay");
  var btnStart = document.getElementById("btnStart");
  var btnFlip = document.getElementById("btnFlip");
  var btnSnap1 = document.getElementById("btnSnap1");
  var btnSnap2 = document.getElementById("btnSnap2");
  var btnAgain = document.getElementById("btnAgain");
  var btnMenu = document.getElementById("btnMenu");
  var chkAuto = document.getElementById("chkAuto");
  var modeLine = document.getElementById("modeLine");
  var statusLine = document.getElementById("statusLine");
  var scoreP1 = document.getElementById("scoreP1");
  var scoreP2 = document.getElementById("scoreP2");
  var stockCountEl = document.getElementById("stockCount");
  var labelP1 = document.getElementById("labelP1");
  var labelP2 = document.getElementById("labelP2");
  var hintP1 = document.getElementById("hintP1");
  var hintP2 = document.getElementById("hintP2");
  var showcase = document.getElementById("showcase");
  var slotPrev = document.getElementById("slotPrev");
  var slotCurr = document.getElementById("slotCurr");
  var compareBanner = document.getElementById("compareBanner");
  var snapMatchPopup = document.getElementById("snapMatchPopup");
  var snapMatchOk = document.getElementById("snapMatchOk");

  if (!screenSetup || !screenPlay || !showcase || !slotPrev || !slotCurr) {
    return;
  }

  /** @type {{ update: function(Function): void, render: function(): void }|null} */
  var snapScorecard = null;
  if (typeof GameScorecard !== "undefined") {
    snapScorecard = GameScorecard.wire({
      storageKey: "snapScorecardV1",
      defaults: {
        friend: { p1: 0, p2: 0 },
        cpu: { you: 0, cpu: 0 },
      },
      display: {
        snapscP1: function (s) {
          return s.friend.p1;
        },
        snapscP2: function (s) {
          return s.friend.p2;
        },
        snapscYou: function (s) {
          return s.cpu.you;
        },
        snapscCpu: function (s) {
          return s.cpu.cpu;
        },
      },
      hintId: "snapscHint",
      btnCopyId: "snapscCopy",
      btnPasteId: "snapscPaste",
      btnResetId: "snapscReset",
    });
    snapScorecard.render();
  }

  var IMG_PREFIX = "__img:";
  var CHARACTER_OPTIONS = [
    { v: IMG_PREFIX + "images/character-babyca.png", label: "Baby" },
    { v: IMG_PREFIX + "images/tilly-mascot.png", label: "Tilly" },
    { v: IMG_PREFIX + "images/character-baby-coolegg.png", label: "Isaac" },
    { v: IMG_PREFIX + "images/character-girl-blonde.png", label: "Sofia" },
    { v: IMG_PREFIX + "images/character-kelly.png", label: "Kelly" },
    { v: IMG_PREFIX + "images/character-freya.png", label: "Freya" },
  ];
  var K_SNAP_CHARS = "snapCharPickV1";
  var DEFAULT_P1 = 3;
  var DEFAULT_P2 = 0;
  var charP1 = CHARACTER_OPTIONS[DEFAULT_P1].v;
  var charP2 = CHARACTER_OPTIONS[DEFAULT_P2].v;

  /** @type {"friend"|"cpu"} */
  var mode = "friend";
  /** 1 = left / Player 1, 2 = right / Player 2 (your side in setup). */
  var humanPlayer = 1;
  var matchPopupOpen = false;
  var matchPopupContinue = null;
  /** No play until 5-1-Go countdown has finished. */
  var countdownLock = false;
  /** Prevents double-stacking countdown if New game is double-tapped. */
  var countdownInProgress = false;
  /** @type {{ id: string, label: string, emoji: string, pal: number }[]} */
  var stock = [];
  /** @type {typeof stock} */
  var center = [];
  /** Tracks pile length last painted — only the newest tile animates; previous tile is promoted in the DOM. */
  var lastRenderedCenterLen = -1;
  var score1 = 0;
  var score2 = 0;
  var gameOver = false;
  var cpuSnapTimer = null;
  var autoFlipTimer = null;

  function buildDeck() {
    var d = [];
    var i;
    var k;
    for (i = 0; i < SPECIES.length; i++) {
      for (k = 0; k < 4; k++) {
        d.push({
          id: SPECIES[i].id,
          label: SPECIES[i].label,
          emoji: SPECIES[i].emoji,
          pal: i % 6,
        });
      }
    }
    return d;
  }

  function shuffle(arr) {
    var i;
    var j;
    var t;
    for (i = arr.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function isImageIcon(icon) {
    return typeof icon === "string" && icon.indexOf(IMG_PREFIX) === 0;
  }

  function imageIconSrc(icon) {
    return icon.slice(IMG_PREFIX.length);
  }

  function isValidToken(v) {
    return (
      v &&
      CHARACTER_OPTIONS.some(function (opt) {
        return opt.v === v;
      })
    );
  }

  function loadSnapCharPicks() {
    try {
      var raw = localStorage.getItem(K_SNAP_CHARS);
      if (!raw) {
        return;
      }
      var o = JSON.parse(raw);
      if (o && isValidToken(o.p1)) {
        charP1 = o.p1;
      }
      if (o && isValidToken(o.p2)) {
        charP2 = o.p2;
      }
    } catch (e) {}
  }

  function saveSnapCharPicks() {
    try {
      localStorage.setItem(
        K_SNAP_CHARS,
        JSON.stringify({ p1: charP1, p2: charP2 })
      );
    } catch (e) {}
  }

  function clearElement(el) {
    if (!el) {
      return;
    }
    if (typeof el.replaceChildren === "function") {
      el.replaceChildren();
    } else {
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    }
  }

  function getSetupModeCpu() {
    var r = document.querySelector('input[name="snapMode"]:checked');
    return r && r.value === "cpu";
  }

  function getSetupSeatN() {
    var r = document.querySelector('input[name="snapSeat"]:checked');
    var n = r ? parseInt(r.value, 10) : 1;
    return n === 2 ? 2 : 1;
  }

  function syncSnapCharHeadings() {
    var cpu = getSetupModeCpu();
    var h = getSetupSeatN();
    var h1 = document.getElementById("headingCharP1");
    var h2 = document.getElementById("headingCharP2");
    var lede = document.getElementById("snapCharLede");
    if (lede) {
      lede.innerHTML = cpu
        ? "Pick a face for <strong>you</strong> and for the <strong>computer</strong> — they show under the scores."
        : "Tap a face for each side. They appear under the scores during the game.";
    }
    if (h1 && h2) {
      if (cpu) {
        if (h === 1) {
          h1.textContent = "You (left)";
          h2.textContent = "Computer (right)";
        } else {
          h1.textContent = "Computer (left)";
          h2.textContent = "You (right)";
        }
      } else {
        h1.textContent = "Player 1 (left)";
        h2.textContent = "Player 2 (right)";
      }
    }
  }

  function setRowSelection(rowEl, value) {
    if (!rowEl) {
      return;
    }
    rowEl.querySelectorAll(".snap-char-opt").forEach(function (el) {
      el.setAttribute(
        "aria-pressed",
        el.getAttribute("data-value") === value ? "true" : "false"
      );
    });
  }

  function buildCharRow(rowEl, which) {
    if (!rowEl) {
      return;
    }
    clearElement(rowEl);
    for (var i = 0; i < CHARACTER_OPTIONS.length; i++) {
      (function (opt) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "snap-char-opt";
        b.setAttribute("data-which", which);
        b.setAttribute("data-value", opt.v);
        b.setAttribute("title", opt.label);
        b.setAttribute("aria-label", opt.label);
        if (isImageIcon(opt.v)) {
          b.classList.add("snap-char-opt--pic");
          var im = document.createElement("img");
          im.className = "snap-char-opt__pic";
          im.src = imageIconSrc(opt.v);
          im.alt = "";
          im.width = 96;
          im.height = 96;
          im.decoding = "async";
          b.appendChild(im);
        } else {
          b.classList.add("snap-char-opt--emoji");
          b.appendChild(document.createTextNode(opt.v));
        }
        b.addEventListener("click", function () {
          if (which === "p1") {
            charP1 = opt.v;
          } else {
            charP2 = opt.v;
          }
          saveSnapCharPicks();
          setRowSelection(rowEl, opt.v);
          if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
            KidsCore.playSound("tap");
          }
        });
        rowEl.appendChild(b);
      })(CHARACTER_OPTIONS[i]);
    }
  }

  function initCharPickers() {
    loadSnapCharPicks();
    var row1 = document.getElementById("charRowP1");
    var row2 = document.getElementById("charRowP2");
    if (row1) {
      buildCharRow(row1, "p1");
    }
    if (row2) {
      buildCharRow(row2, "p2");
    }
    setRowSelection(row1, charP1);
    setRowSelection(row2, charP2);
    syncSnapCharHeadings();
    document.querySelectorAll('input[name="snapMode"]').forEach(function (x) {
      x.addEventListener("change", syncSnapCharHeadings);
    });
    document.querySelectorAll('input[name="snapSeat"]').forEach(function (x) {
      x.addEventListener("change", syncSnapCharHeadings);
    });
  }

  function renderScoreMascot(host, tokenV) {
    if (!host) {
      return;
    }
    clearElement(host);
    if (isImageIcon(tokenV)) {
      var im = document.createElement("img");
      im.src = imageIconSrc(tokenV);
      im.alt = "";
      im.decoding = "async";
      host.appendChild(im);
    } else {
      var sp = document.createElement("span");
      sp.className = "snap-score__mascot--emoji";
      sp.setAttribute("aria-hidden", "true");
      sp.textContent = tokenV;
      host.appendChild(sp);
    }
  }

  function canSnap() {
    if (center.length < 2) {
      return false;
    }
    var a = center[center.length - 1];
    var b = center[center.length - 2];
    return a.id === b.id;
  }

  function clearCpuSnapTimer() {
    if (cpuSnapTimer != null) {
      clearTimeout(cpuSnapTimer);
      cpuSnapTimer = null;
    }
  }

  function clearAutoFlipTimer() {
    if (autoFlipTimer != null) {
      clearInterval(autoFlipTimer);
      autoFlipTimer = null;
    }
  }

  /** The computer is always the other seat. */
  function cpuPlayerNumber() {
    return humanPlayer === 1 ? 2 : 1;
  }

  function scheduleCpuSnap() {
    clearCpuSnapTimer();
    if (mode !== "cpu" || gameOver || matchPopupOpen || countdownLock || !canSnap()) {
      return;
    }
    var delay = CPU_SNAP_MIN_MS + Math.random() * (CPU_SNAP_MAX_MS - CPU_SNAP_MIN_MS);
    cpuSnapTimer = setTimeout(function () {
      cpuSnapTimer = null;
      if (!gameOver && !matchPopupOpen && canSnap()) {
        resolveSnap(cpuPlayerNumber());
      }
    }, delay);
  }

  function maybeStartAutoFlip() {
    clearAutoFlipTimer();
    if (!chkAuto || !chkAuto.checked || gameOver) {
      return;
    }
    autoFlipTimer = window.setInterval(function () {
      if (gameOver || stock.length === 0) {
        clearAutoFlipTimer();
        return;
      }
      if (matchPopupOpen || countdownLock) {
        return;
      }
      if (canSnap()) {
        return;
      }
      flipCard();
    }, AUTO_FLIP_MS);
  }

  function updateScoresUi() {
    if (scoreP1) {
      scoreP1.textContent = String(score1);
    }
    if (scoreP2) {
      scoreP2.textContent = String(score2);
    }
    if (stockCountEl) {
      stockCountEl.textContent = String(stock.length);
    }
  }

  function winnerDisplayName(playerNum) {
    if (mode === "cpu") {
      return playerNum === humanPlayer ? "You" : "The computer";
    }
    return playerNum === 1 ? "Player 1" : "Player 2";
  }

  function fillMatchPopup(winnerPlayer, won) {
    var name = winnerDisplayName(winnerPlayer);
    var kicker = document.getElementById("snapMatchKicker");
    var title = document.getElementById("snapMatchTitle");
    var sub = document.getElementById("snapMatchSub");
    var count = document.getElementById("snapMatchCount");
    if (kicker) {
      kicker.textContent = "SNAP!";
    }
    if (title) {
      if (name === "You") {
        title.textContent = "You got there first!";
      } else if (name === "The computer") {
        title.textContent = "The computer snapped first!";
      } else {
        title.textContent = name + " got there first!";
      }
    }
    if (sub) {
      if (name === "You") {
        sub.textContent = "You picked up " + won + " " + (won === 1 ? "card" : "cards") + " from the table!";
      } else if (name === "The computer") {
        sub.textContent = "The computer won " + won + " " + (won === 1 ? "card" : "cards") + " this time!";
      } else {
        sub.textContent = name + " won " + won + " " + (won === 1 ? "card" : "cards") + " this time!";
      }
    }
    if (count) {
      count.textContent = String(won);
    }
    if (snapMatchPopup) {
      snapMatchPopup.classList.remove("snap-popup--p1-win", "snap-popup--p2-win", "snap-popup--cpu-win");
      if (mode === "cpu" && winnerPlayer !== humanPlayer) {
        snapMatchPopup.classList.add("snap-popup--cpu-win");
      } else if (winnerPlayer === 1) {
        snapMatchPopup.classList.add("snap-popup--p1-win");
      } else {
        snapMatchPopup.classList.add("snap-popup--p2-win");
      }
    }
  }

  function showMatchPopup(winnerPlayer, won, onClosed) {
    if (!snapMatchPopup) {
      if (onClosed) {
        onClosed();
      }
      return;
    }
    matchPopupOpen = true;
    matchPopupContinue = onClosed;
    fillMatchPopup(winnerPlayer, won);
    snapMatchPopup.classList.remove("is-hidden");
    snapMatchPopup.hidden = false;
    if (document.getElementById("app")) {
      document.getElementById("app").setAttribute("aria-hidden", "true");
    }
    if (typeof KidsCore !== "undefined" && KidsCore.confetti) {
      KidsCore.confetti(document.body);
      window.setTimeout(function () {
        var layers = document.querySelectorAll(".kids-confetti-layer");
        if (layers.length) {
          layers[layers.length - 1].style.zIndex = "10000";
        }
      }, 0);
    }
    window.setTimeout(function () {
      if (snapMatchOk) {
        snapMatchOk.focus();
      }
    }, 100);
  }

  function closeMatchPopup() {
    if (!snapMatchPopup) {
      return;
    }
    snapMatchPopup.classList.add("is-hidden");
    snapMatchPopup.hidden = true;
    if (document.getElementById("app")) {
      document.getElementById("app").removeAttribute("aria-hidden");
    }
    matchPopupOpen = false;
    if (matchPopupContinue) {
      var cb = matchPopupContinue;
      matchPopupContinue = null;
      cb();
    }
  }

  function setPlayUi() {
    var cpu = mode === "cpu";
    var h = humanPlayer;
    if (modeLine) {
      if (cpu) {
        modeLine.textContent =
          h === 1
            ? "You vs computer — your Snap! is on the left"
            : "You vs computer — your Snap! is on the right";
      } else {
        modeLine.textContent =
          h === 1
            ? "Two players — you use the left (Player 1)"
            : "Two players — you use the right (Player 2)";
      }
    }
    if (labelP1) {
      if (cpu) {
        labelP1.textContent = h === 1 ? "You" : "Computer";
      } else {
        labelP1.textContent = "Player 1";
      }
    }
    if (labelP2) {
      if (cpu) {
        labelP2.textContent = h === 2 ? "You" : "Computer";
      } else {
        labelP2.textContent = "Player 2";
      }
    }
    if (hintP1) {
      if (cpu) {
        hintP1.textContent = h === 1 ? "Your snap" : "Computer";
      } else {
        hintP1.textContent = "Player 1";
      }
    }
    if (hintP2) {
      if (cpu) {
        hintP2.textContent = h === 2 ? "Your snap" : "Computer";
      } else {
        hintP2.textContent = "Player 2";
      }
    }
    if (btnSnap1) {
      var d1 = cpu && h !== 1;
      btnSnap1.disabled = d1;
      btnSnap1.setAttribute("aria-disabled", d1 ? "true" : "false");
      btnSnap1.setAttribute(
        "aria-label",
        cpu ? (h === 1 ? "Your snap — Player 1" : "Computer snap — Player 1") : "Player 1 snap"
      );
    }
    if (btnSnap2) {
      var d2 = cpu && h !== 2;
      btnSnap2.disabled = d2;
      btnSnap2.setAttribute("aria-disabled", d2 ? "true" : "false");
      btnSnap2.setAttribute(
        "aria-label",
        cpu ? (h === 2 ? "Your snap — Player 2" : "Computer snap — Player 2") : "Player 2 snap"
      );
    }
    if (countdownLock) {
      if (btnFlip) {
        btnFlip.disabled = true;
      }
      if (btnSnap1) {
        btnSnap1.disabled = true;
        btnSnap1.setAttribute("aria-disabled", "true");
      }
      if (btnSnap2) {
        btnSnap2.disabled = true;
        btnSnap2.setAttribute("aria-disabled", "true");
      }
      if (btnAgain) {
        btnAgain.disabled = true;
      }
      if (btnMenu) {
        btnMenu.disabled = true;
      }
    } else {
      if (btnAgain) {
        btnAgain.disabled = false;
      }
      if (btnMenu) {
        btnMenu.disabled = false;
      }
    }
    var goalEl = document.getElementById("snapGoalLine");
    if (goalEl) {
      goalEl.textContent = "First to " + WIN_SCORE + " cards wins the game.";
    }
    renderScoreMascot(document.getElementById("mascotP1"), charP1);
    renderScoreMascot(document.getElementById("mascotP2"), charP2);
  }

  function createCardEl(tile) {
    var el = document.createElement("div");
    el.className = "snap-face snap-pal-" + tile.pal;
    el.setAttribute("aria-hidden", "true");
    var em = document.createElement("span");
    em.className = "snap-face__emoji";
    em.textContent = tile.emoji;
    var lab = document.createElement("span");
    lab.className = "snap-face__label";
    lab.textContent = tile.label;
    el.appendChild(em);
    el.appendChild(lab);
    return el;
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /**
   * New tile: face-down then flips to reveal (or instant if reduced motion).
   */
  function createFlipDeal(tile, runFlip) {
    var wrap = document.createElement("div");
    wrap.className = "snap-flip";
    var inner = document.createElement("div");
    inner.className = "snap-flip__inner";
    var back = document.createElement("div");
    back.className = "snap-flip__back";
    back.setAttribute("aria-hidden", "true");
    back.textContent = "?";
    var front = createCardEl(tile);
    front.classList.add("snap-flip__front");
    inner.appendChild(back);
    inner.appendChild(front);
    wrap.appendChild(inner);
    var instant = !runFlip || prefersReducedMotion();
    if (instant) {
      wrap.classList.add("is-flipped");
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          wrap.classList.add("is-flipped");
        });
      });
    }
    return wrap;
  }

  /** Move the face that was on the right into the left slot (same node — no re-draw flash). */
  function promoteCurrentToPrevious() {
    var curr = slotCurr.firstElementChild;
    if (!curr) {
      return;
    }
    slotPrev.innerHTML = "";
    if (curr.classList.contains("snap-flip")) {
      var face = curr.querySelector(".snap-face.snap-flip__front");
      if (face) {
        face.classList.remove("snap-flip__front");
        slotPrev.appendChild(face);
      }
    } else if (curr.classList.contains("snap-face")) {
      slotPrev.appendChild(curr);
    }
  }

  function applyCompareBannerAndClasses() {
    if (center.length < 2) {
      showcase.classList.remove("is-match", "is-near-match");
      return;
    }
    if (canSnap()) {
      showcase.classList.add("is-match");
      showcase.classList.remove("is-near-match");
      if (compareBanner) {
        compareBanner.textContent = "Same animal! First Snap wins the pile!";
      }
    } else {
      showcase.classList.remove("is-match");
      showcase.classList.add("is-near-match");
      if (compareBanner) {
        compareBanner.textContent = "Different animals — flip again or wait…";
      }
    }
  }

  function fillSlotPlaceholder(slot, lines) {
    slot.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "snap-dummy";
    if (typeof lines === "string") {
      wrap.textContent = lines;
    } else {
      lines.forEach(function (line, i) {
        var span = document.createElement("span");
        span.className = "snap-dummy__line";
        span.textContent = line;
        wrap.appendChild(span);
      });
    }
    slot.appendChild(wrap);
  }

  function renderPile() {
    var grew = center.length > lastRenderedCenterLen;

    if (center.length === 0) {
      lastRenderedCenterLen = 0;
      slotPrev.innerHTML = "";
      slotCurr.innerHTML = "";
      fillSlotPlaceholder(slotPrev, ["Flip the", "next one!"]);
      fillSlotPlaceholder(slotCurr, ["Waiting…"]);
      if (compareBanner) {
        compareBanner.textContent = "Flip to start — two animals will show here.";
      }
      showcase.classList.remove("is-match", "is-near-match");
      return;
    }

    if (center.length === 1) {
      lastRenderedCenterLen = 1;
      slotPrev.innerHTML = "";
      slotCurr.innerHTML = "";
      fillSlotPlaceholder(slotPrev, ["Not yet —", "flip again"]);
      slotCurr.appendChild(createFlipDeal(center[0], true));
      if (compareBanner) {
        compareBanner.textContent = "One more flip — then compare both boxes!";
      }
      showcase.classList.remove("is-match", "is-near-match");
      return;
    }

    if (grew) {
      promoteCurrentToPrevious();
      if (!slotPrev.querySelector(".snap-face")) {
        slotPrev.innerHTML = "";
        slotPrev.appendChild(createCardEl(center[center.length - 2]));
      }
      slotCurr.innerHTML = "";
      slotCurr.appendChild(createFlipDeal(center[center.length - 1], true));
    }

    lastRenderedCenterLen = center.length;
    applyCompareBannerAndClasses();
  }

  function flashSide(btn) {
    if (!btn) {
      return;
    }
    btn.classList.add("is-press");
    window.setTimeout(function () {
      btn.classList.remove("is-press");
    }, 280);
  }

  function resolveSnap(player) {
    if (gameOver || matchPopupOpen || countdownLock) {
      return;
    }
    clearCpuSnapTimer();
    var valid = canSnap();
    if (valid) {
      var won = center.length;
      if (player === 1) {
        score1 += won;
      } else {
        score2 += won;
      }
      if (statusLine) {
        statusLine.textContent = "Great snap! Tap OK on the pop-up to continue.";
      }
      center = [];
      updateScoresUi();
      renderPile();
      flashSide(player === 1 ? btnSnap1 : btnSnap2);
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("ok");
      }
      showMatchPopup(player, won, function () {
        if (checkForGameWinner()) {
          return;
        }
        checkEndAfterAction();
        maybeStartAutoFlip();
      });
      return;
    }
    var other = player === 1 ? 2 : 1;
    if (other === 1) {
      score1 += PENALTY_BONUS;
    } else {
      score2 += PENALTY_BONUS;
    }
    if (statusLine) {
      if (mode === "cpu") {
        statusLine.textContent =
          "Not the same animal — " +
          (other === humanPlayer
            ? "you get +" + PENALTY_BONUS + " bonus tiles."
            : "the computer gets +" + PENALTY_BONUS + " bonus.");
      } else {
        statusLine.textContent =
          "Not the same animal — " +
          (other === 1 ? "Player 1" : "Player 2") +
          " gets +" +
          PENALTY_BONUS +
          " bonus.";
      }
    }
    if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
      KidsCore.playSound("no");
    }
    updateScoresUi();
    renderPile();
    flashSide(player === 1 ? btnSnap1 : btnSnap2);
    if (checkForGameWinner()) {
      return;
    }
    checkEndAfterAction();
  }

  function checkForGameWinner() {
    if (gameOver) {
      return true;
    }
    if (score1 >= WIN_SCORE || score2 >= WIN_SCORE) {
      endGameWin();
      return true;
    }
    return false;
  }

  function endGameWin() {
    gameOver = true;
    var p1Wins = score1 >= WIN_SCORE;
    if (snapScorecard) {
      snapScorecard.update(function (s) {
        if (mode === "friend") {
          if (p1Wins) {
            s.friend.p1++;
          } else {
            s.friend.p2++;
          }
        } else {
          var humanIsP1 = humanPlayer === 1;
          var youWin =
            (p1Wins && humanIsP1) || (!p1Wins && !humanIsP1);
          if (youWin) {
            s.cpu.you++;
          } else {
            s.cpu.cpu++;
          }
        }
      });
    }
    clearCpuSnapTimer();
    clearAutoFlipTimer();
    if (btnFlip) {
      btnFlip.disabled = true;
    }
    if (btnSnap1) {
      btnSnap1.disabled = true;
    }
    if (btnSnap2) {
      btnSnap2.disabled = true;
    }
    var name = p1Wins ? winnerDisplayName(1) : winnerDisplayName(2);
    var s1 = score1;
    var s2 = score2;
    if (statusLine) {
      statusLine.textContent = name + " won the game with " + (p1Wins ? s1 : s2) + " cards! (" + s1 + " – " + s2 + ")";
    }
    if (compareBanner) {
      if (name === "You") {
        compareBanner.textContent = "You made it to " + WIN_SCORE + " first! Tap New game to play again.";
      } else {
        compareBanner.textContent = name + " made it to " + WIN_SCORE + " first! Tap New game to play again.";
      }
    }
    if (showcase) {
      showcase.classList.remove("is-match", "is-near-match");
    }
    if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
      KidsCore.playSound("ok");
    }
  }

  function newShuffledPack() {
    center = [];
    lastRenderedCenterLen = -1;
    stock = shuffle(buildDeck());
    if (btnFlip) {
      btnFlip.disabled = false;
    }
    updateScoresUi();
    renderPile();
    if (statusLine) {
      statusLine.textContent = "New shuffled pack! First to " + WIN_SCORE + " cards — keep going!";
    }
  }

  function recycleCenterIntoNewPack() {
    var carry = center.slice();
    center = [];
    lastRenderedCenterLen = -1;
    stock = shuffle(buildDeck().concat(carry));
    if (btnFlip) {
      btnFlip.disabled = false;
    }
    updateScoresUi();
    renderPile();
    if (statusLine) {
      statusLine.textContent = "The pile is shuffled in again! Flip the next card.";
    }
  }

  function checkEndAfterAction() {
    if (checkForGameWinner()) {
      return;
    }
    if (stock.length > 0) {
      return;
    }
    if (center.length === 0) {
      newShuffledPack();
      return;
    }
    if (center.length >= 2 && canSnap()) {
      if (statusLine) {
        statusLine.textContent =
          "No cards left to flip — first to snap wins this pile! (" +
          (mode === "cpu" ? "You vs computer" : "two players") +
          ")";
      }
      scheduleCpuSnap();
      return;
    }
    recycleCenterIntoNewPack();
  }

  function flipCard() {
    if (gameOver || stock.length === 0 || matchPopupOpen || countdownLock) {
      return;
    }
    clearCpuSnapTimer();
    center.push(stock.pop());
    updateScoresUi();
    renderPile();
    if (statusLine) {
      if (canSnap()) {
        statusLine.textContent =
          mode === "cpu"
            ? "Same animal! Tap your Snap! or the computer might beat you…"
            : "Same animal! First to snap wins the pile!";
      } else {
        statusLine.textContent =
          stock.length === 0
            ? "Last animal on the table."
            : "Keep flipping, or snap when both animals match.";
      }
    }
    if (typeof KidsCore !== "undefined" && KidsCore.haptic) {
      KidsCore.haptic("light");
    }
    if (stock.length === 0 && btnFlip) {
      btnFlip.disabled = true;
    }
    scheduleCpuSnap();
    checkEndAfterAction();
  }

  function runSnapCountdownThen(onDone) {
    var kicker = document.getElementById("snapCountdownKicker");
    var numEl = document.getElementById("snapCountdownNum");
    var layer = document.getElementById("snapCountdown");
    if (!layer || !numEl) {
      if (onDone) {
        onDone();
      }
      return;
    }
    if (kicker) {
      kicker.textContent = "Get ready";
    }
    layer.classList.remove("is-hidden");
    layer.hidden = false;
    var n = 5;
    function showStep() {
      if (kicker) {
        kicker.textContent = "Get ready";
      }
      numEl.textContent = String(n);
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("tap");
      }
    }
    function afterOne() {
      if (n > 1) {
        n -= 1;
        showStep();
        window.setTimeout(afterOne, 720);
        return;
      }
      if (kicker) {
        kicker.textContent = "Go!";
      }
      numEl.textContent = "Go!";
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("ok");
      }
      window.setTimeout(function () {
        layer.classList.add("is-hidden");
        layer.hidden = true;
        if (onDone) {
          onDone();
        }
      }, 600);
    }
    showStep();
    window.setTimeout(afterOne, 720);
  }

  function resetNewGameState() {
    matchPopupContinue = null;
    if (snapMatchPopup && !snapMatchPopup.classList.contains("is-hidden")) {
      snapMatchPopup.classList.add("is-hidden");
      snapMatchPopup.hidden = true;
      var appEl = document.getElementById("app");
      if (appEl) {
        appEl.removeAttribute("aria-hidden");
      }
      matchPopupOpen = false;
    }
    clearCpuSnapTimer();
    clearAutoFlipTimer();
    gameOver = false;
    lastRenderedCenterLen = -1;
    stock = shuffle(buildDeck());
    center = [];
    score1 = 0;
    score2 = 0;
    if (btnFlip) {
      btnFlip.disabled = false;
    }
    updateScoresUi();
    renderPile();
    if (statusLine) {
      statusLine.textContent = "Get ready — 5, 4, 3, 2, 1… then the cards will flip for you.";
    }
  }

  function startRoundWithCountdown() {
    if (countdownInProgress) {
      return;
    }
    countdownInProgress = true;
    resetNewGameState();
    countdownLock = true;
    setPlayUi();
    if (statusLine) {
      statusLine.textContent = "Get ready for the countdown!";
    }

    function afterCount() {
      countdownInProgress = false;
      countdownLock = false;
      if (statusLine) {
        statusLine.textContent = "Flipping! Tap Snap! when the last two match.";
      }
      setPlayUi();
      if (chkAuto) {
        chkAuto.checked = true;
      }
      maybeStartAutoFlip();
    }

    if (prefersReducedMotion() || !document.getElementById("snapCountdown")) {
      countdownInProgress = false;
      countdownLock = false;
      setPlayUi();
      if (chkAuto) {
        chkAuto.checked = true;
      }
      if (statusLine) {
        statusLine.textContent = "Flipping! Tap Snap! when the last two match.";
      }
      maybeStartAutoFlip();
      return;
    }
    runSnapCountdownThen(afterCount);
  }

  function newGame() {
    startRoundWithCountdown();
  }

  function showSetup() {
    matchPopupContinue = null;
    if (snapMatchPopup && !snapMatchPopup.classList.contains("is-hidden")) {
      snapMatchPopup.classList.add("is-hidden");
      snapMatchPopup.hidden = true;
      var appA = document.getElementById("app");
      if (appA) {
        appA.removeAttribute("aria-hidden");
      }
      matchPopupOpen = false;
    }
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(false);
    }
    clearCpuSnapTimer();
    clearAutoFlipTimer();
    screenPlay.classList.add("is-hidden");
    screenPlay.hidden = true;
    screenSetup.classList.remove("is-hidden");
    screenSetup.hidden = false;
    syncSnapCharHeadings();
    if (snapScorecard) {
      snapScorecard.render();
    }
  }

  function showPlay() {
    var radios = document.querySelectorAll('input[name="snapMode"]');
    var v = "friend";
    radios.forEach(function (r) {
      if (r.checked) {
        v = r.value;
      }
    });
    mode = v === "cpu" ? "cpu" : "friend";
    var seatRadios = document.querySelectorAll('input[name="snapSeat"]');
    humanPlayer = 1;
    seatRadios.forEach(function (r) {
      if (r.checked) {
        var n = parseInt(r.value, 10);
        if (n === 1 || n === 2) {
          humanPlayer = n;
        }
      }
    });
    screenSetup.classList.add("is-hidden");
    screenSetup.hidden = true;
    screenPlay.classList.remove("is-hidden");
    screenPlay.hidden = false;
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(true);
    }
    newGame();
  }

  if (btnStart) {
    btnStart.addEventListener("click", function () {
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("tap");
      }
      showPlay();
    });
  }

  if (btnFlip) {
    btnFlip.addEventListener("click", function () {
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("tap");
      }
      flipCard();
    });
  }

  if (btnSnap1) {
    btnSnap1.addEventListener("click", function () {
      if (gameOver) {
        return;
      }
      resolveSnap(1);
      if (typeof KidsCore !== "undefined" && KidsCore.haptic) {
        KidsCore.haptic("medium");
      }
    });
  }

  if (btnSnap2) {
    btnSnap2.addEventListener("click", function () {
      if (gameOver) {
        return;
      }
      resolveSnap(2);
      if (typeof KidsCore !== "undefined" && KidsCore.haptic) {
        KidsCore.haptic("medium");
      }
    });
  }

  if (btnAgain) {
    btnAgain.addEventListener("click", function () {
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("tap");
      }
      newGame();
    });
  }

  if (btnMenu) {
    btnMenu.addEventListener("click", function () {
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("tap");
      }
      showSetup();
    });
  }

  if (chkAuto) {
    chkAuto.addEventListener("change", function () {
      maybeStartAutoFlip();
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("tap");
      }
    });
  }

  if (snapMatchOk) {
    snapMatchOk.addEventListener("click", function () {
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("tap");
      }
      closeMatchPopup();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !matchPopupOpen) {
      return;
    }
    e.preventDefault();
    closeMatchPopup();
  });

  initCharPickers();

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    if (document.getElementById("app")) {
      KidsCore.bindTapSound(document.getElementById("app"));
    }
  }
})();
