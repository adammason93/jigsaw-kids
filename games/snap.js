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

  if (!screenSetup || !screenPlay || !showcase || !slotPrev || !slotCurr) {
    return;
  }

  /** @type {"friend"|"cpu"} */
  var mode = "friend";
  /** @type {{ id: string, label: string, emoji: string, pal: number }[]} */
  var stock = [];
  /** @type {typeof stock} */
  var center = [];
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

  function scheduleCpuSnap() {
    clearCpuSnapTimer();
    if (mode !== "cpu" || gameOver || !canSnap()) {
      return;
    }
    var delay = CPU_SNAP_MIN_MS + Math.random() * (CPU_SNAP_MAX_MS - CPU_SNAP_MIN_MS);
    cpuSnapTimer = setTimeout(function () {
      cpuSnapTimer = null;
      if (!gameOver && canSnap()) {
        resolveSnap(2);
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

  function setPlayUi() {
    var cpu = mode === "cpu";
    if (modeLine) {
      modeLine.textContent = cpu ? "You vs computer" : "Two players";
    }
    if (labelP1) {
      labelP1.textContent = cpu ? "You" : "Player 1";
    }
    if (labelP2) {
      labelP2.textContent = cpu ? "Computer" : "Player 2";
    }
    if (hintP1) {
      hintP1.textContent = cpu ? "Your snap" : "Player 1";
    }
    if (hintP2) {
      hintP2.textContent = cpu ? "Computer" : "Player 2";
    }
    if (btnSnap2) {
      btnSnap2.disabled = cpu;
      btnSnap2.setAttribute("aria-disabled", cpu ? "true" : "false");
    }
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
    slotPrev.innerHTML = "";
    slotCurr.innerHTML = "";
    if (center.length === 0) {
      fillSlotPlaceholder(slotPrev, ["Flip the", "next one!"]);
      fillSlotPlaceholder(slotCurr, ["Waiting…"]);
      if (compareBanner) {
        compareBanner.textContent = "Flip to start — two animals will show here.";
      }
      showcase.classList.remove("is-match", "is-near-match");
      return;
    }
    if (center.length === 1) {
      fillSlotPlaceholder(slotPrev, ["Not yet —", "flip again"]);
      slotCurr.appendChild(createCardEl(center[0]));
      if (compareBanner) {
        compareBanner.textContent = "One more flip — then compare both boxes!";
      }
      showcase.classList.remove("is-match", "is-near-match");
      return;
    }
    slotPrev.appendChild(createCardEl(center[center.length - 2]));
    slotCurr.appendChild(createCardEl(center[center.length - 1]));
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
    if (gameOver) {
      return;
    }
    clearCpuSnapTimer();
    var valid = canSnap();
    if (valid) {
      var won = center.length;
      if (player === 1) {
        score1 += won;
        if (statusLine) {
          statusLine.textContent =
            mode === "cpu"
              ? "Snap! You win " + won + " tiles."
              : "Player 1 snaps first — wins " + won + " tiles.";
        }
      } else {
        score2 += won;
        if (statusLine) {
          statusLine.textContent =
            mode === "cpu"
              ? "The computer snapped first — it wins " + won + " tiles."
              : "Player 2 snaps first — wins " + won + " tiles.";
        }
      }
      center = [];
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("ok");
      }
    } else {
      var other = player === 1 ? 2 : 1;
      if (other === 1) {
        score1 += PENALTY_BONUS;
      } else {
        score2 += PENALTY_BONUS;
      }
      if (statusLine) {
        statusLine.textContent =
          "Not the same animal — " +
          (other === 1
            ? mode === "cpu"
              ? "you get +" + PENALTY_BONUS + " bonus tiles."
              : "Player 1 gets +" + PENALTY_BONUS + " bonus."
            : mode === "cpu"
              ? "the computer gets +" + PENALTY_BONUS + " bonus."
              : "Player 2 gets +" + PENALTY_BONUS + " bonus.");
      }
      if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
        KidsCore.playSound("no");
      }
    }
    updateScoresUi();
    renderPile();
    flashSide(player === 1 ? btnSnap1 : btnSnap2);
    checkEndAfterAction();
  }

  function checkEndAfterAction() {
    if (stock.length > 0) {
      return;
    }
    if (center.length === 0) {
      endRound();
      return;
    }
    if (center.length >= 2 && canSnap()) {
      if (statusLine) {
        statusLine.textContent =
          "No tiles left — first to snap wins the last pile! (" +
          (mode === "cpu" ? "You vs computer" : "two players") +
          ")";
      }
      scheduleCpuSnap();
      return;
    }
    endRound();
  }

  function endRound() {
    gameOver = true;
    clearCpuSnapTimer();
    clearAutoFlipTimer();
    if (btnFlip) {
      btnFlip.disabled = true;
    }
    var msg;
    if (score1 > score2) {
      msg =
        mode === "cpu"
          ? "All flipped — you win with " + score1 + " tiles! Computer has " + score2 + "."
          : "All flipped — Player 1 wins with " + score1 + " tiles!";
    } else if (score2 > score1) {
      msg =
        mode === "cpu"
          ? "All flipped — the computer wins with " + score2 + " tiles. You have " + score1 + "."
          : "All flipped — Player 2 wins with " + score2 + " tiles!";
    } else {
      msg = "All flipped — a tie at " + score1 + " tiles each!";
    }
    if (statusLine) {
      statusLine.textContent = msg;
    }
    if (compareBanner) {
      compareBanner.textContent = "Great game! Tap New game to play again.";
    }
    if (showcase) {
      showcase.classList.remove("is-match", "is-near-match");
    }
    if (typeof KidsCore !== "undefined" && KidsCore.playSound) {
      KidsCore.playSound(score1 === score2 ? "tap" : "ok");
    }
  }

  function flipCard() {
    if (gameOver || stock.length === 0) {
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
            ? "Same animal! Tap Snap! or wait for the computer…"
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

  function newGame() {
    clearCpuSnapTimer();
    clearAutoFlipTimer();
    gameOver = false;
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
      statusLine.textContent = "Flip to begin — cute animals ahead!";
    }
    maybeStartAutoFlip();
  }

  function showSetup() {
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(false);
    }
    clearCpuSnapTimer();
    clearAutoFlipTimer();
    screenPlay.classList.add("is-hidden");
    screenPlay.hidden = true;
    screenSetup.classList.remove("is-hidden");
    screenSetup.hidden = false;
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
    screenSetup.classList.add("is-hidden");
    screenSetup.hidden = true;
    screenPlay.classList.remove("is-hidden");
    screenPlay.hidden = false;
    setPlayUi();
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
      if (gameOver || mode === "cpu") {
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

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    if (document.getElementById("app")) {
      KidsCore.bindTapSound(document.getElementById("app"));
    }
  }
})();
