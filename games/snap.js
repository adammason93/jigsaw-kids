/**
 * Snap — flip a deck into the middle; same rank on top two = valid snap.
 */
(function () {
  "use strict";

  var SUITS = [
    { id: "s", sym: "\u2660", red: false },
    { id: "h", sym: "\u2665", red: true },
    { id: "d", sym: "\u2666", red: true },
    { id: "c", sym: "\u2663", red: false },
  ];
  var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
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
  var pile = document.getElementById("pile");
  var pilePlaceholder = document.getElementById("pilePlaceholder");

  if (!screenSetup || !screenPlay || !pile) {
    return;
  }

  /** @type {"friend"|"cpu"} */
  var mode = "friend";
  /** @type {{ rank: string, rankIdx: number, suit: string, suitSym: string, red: boolean }[]} */
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
    var si;
    var ri;
    for (si = 0; si < SUITS.length; si++) {
      for (ri = 0; ri < RANKS.length; ri++) {
        d.push({
          rank: RANKS[ri],
          rankIdx: ri,
          suit: SUITS[si].id,
          suitSym: SUITS[si].sym,
          red: SUITS[si].red,
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
    return a.rankIdx === b.rankIdx;
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

  function createCardEl(card, layer) {
    var el = document.createElement("div");
    el.className =
      "snap-playing-card snap-playing-card--" +
      layer +
      " " +
      (card.red ? "snap-playing-card--red" : "snap-playing-card--black");
    el.setAttribute("aria-hidden", "true");
    var rank = document.createElement("span");
    rank.className = "snap-playing-card__rank";
    rank.textContent = card.rank;
    var suit = document.createElement("span");
    suit.className = "snap-playing-card__suit";
    suit.textContent = card.suitSym;
    el.appendChild(rank);
    el.appendChild(suit);
    return el;
  }

  function renderPile() {
    pile.querySelectorAll(".snap-playing-card").forEach(function (n) {
      n.remove();
    });
    if (!pilePlaceholder) {
      return;
    }
    if (center.length === 0) {
      pilePlaceholder.classList.remove("is-hidden");
      pile.classList.remove("is-match");
      return;
    }
    pilePlaceholder.classList.add("is-hidden");
    var n = center.length;
    if (n >= 2) {
      pile.appendChild(createCardEl(center[n - 2], "under"));
    }
    pile.appendChild(createCardEl(center[n - 1], "top"));
    if (canSnap()) {
      pile.classList.add("is-match");
    } else {
      pile.classList.remove("is-match");
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
              ? "Snap! You win " + won + " cards."
              : "Player 1 snaps first — wins " + won + " cards.";
        }
      } else {
        score2 += won;
        if (statusLine) {
          statusLine.textContent =
            mode === "cpu"
              ? "The computer snapped first — it wins " + won + " cards."
              : "Player 2 snaps first — wins " + won + " cards.";
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
          "No match — " +
          (other === 1
            ? mode === "cpu"
              ? "you get +" + PENALTY_BONUS + " bonus cards."
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
          "Deck empty — first to snap wins the last pile! (" +
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
          ? "Deck finished — you win with " + score1 + " cards! Computer has " + score2 + "."
          : "Deck finished — Player 1 wins with " + score1 + " cards!";
    } else if (score2 > score1) {
      msg =
        mode === "cpu"
          ? "Deck finished — the computer wins with " + score2 + " cards. You have " + score1 + "."
          : "Deck finished — Player 2 wins with " + score2 + " cards!";
    } else {
      msg = "Deck finished — a tie at " + score1 + " cards each!";
    }
    if (statusLine) {
      statusLine.textContent = msg;
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
            ? "Match! Tap Snap! or wait for the computer…"
            : "Match! First to snap wins the pile!";
      } else {
        statusLine.textContent =
          stock.length === 0 ? "Last card on the table." : "Keep flipping, or snap when two match.";
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
      statusLine.textContent = "Flip a card to begin.";
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
