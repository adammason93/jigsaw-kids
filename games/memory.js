/**
 * Memory — match pairs using the same animal set as Snap and character portraits as other games.
 */
(function () {
  "use strict";

  /** Mirrors games/snap.js SPECIES — emoji + label. */
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

  /** Same faces as noughts-crosses (paths relative to games/). */
  var CHARACTERS = [
    { id: "babyca", label: "Baby", src: "images/character-babyca.png" },
    { id: "tilly", label: "Tilly", src: "images/tilly-mascot.png" },
    { id: "coolegg", label: "Isaac", src: "images/character-baby-coolegg.png" },
    { id: "sofia", label: "Sofia", src: "images/character-girl-blonde.png" },
    { id: "mummy", label: "Mummy", src: "images/character-kelly.png" },
    { id: "freya", label: "Freya", src: "images/character-freya.png" },
  ];

  var SIZES = {
    quick: { pairs: 8, animals: 4, people: 4 },
    normal: { pairs: 12, animals: 6, people: 6 },
    big: { pairs: 15, animals: 9, people: 6 },
  };

  var MISMATCH_MS = 750;
  /** Time to show match celebration before locking cards as matched */
  var MATCH_CELEBRATE_MS = 560;

  var screenSetup = document.getElementById("screenSetup");
  var screenPlay = document.getElementById("screenPlay");
  var btnStart = document.getElementById("btnStart");
  var btnAgainMenu = document.getElementById("btnAgainMenu");
  var btnPlayAgain = document.getElementById("btnPlayAgain");
  var boardWrap = document.getElementById("memoryBoardWrap");
  var boardEl = document.getElementById("memoryBoard");
  var pairsLine = document.getElementById("pairsLine");
  var movesEl = document.getElementById("memoryMoves");
  var winEl = document.getElementById("memoryWin");

  var app = document.getElementById("app");

  if (!screenSetup || !screenPlay || !boardWrap || !boardEl || !btnStart) {
    return;
  }

  /** @type {{ pairId: string, kind: "animal"|"character", species?: object, character?: object }[]} */
  var deck = [];
  var pairCount = 0;
  var moves = 0;
  var matchedPairs = 0;
  var firstIndex = -1;
  var secondIndex = -1;
  var lockInput = false;
  var tileButtons = [];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function drawSample(source, n) {
    return shuffle(source).slice(0, n);
  }

  function buildDeck(sizeKey) {
    var cfg = SIZES[sizeKey] || SIZES.normal;
    pairCount = cfg.pairs;
    var animalPick = drawSample(SPECIES, cfg.animals);
    var peoplePick = drawSample(CHARACTERS, cfg.people);
    var cards = [];

    animalPick.forEach(function (s) {
      var pid = "a:" + s.id;
      cards.push({ pairId: pid, kind: "animal", species: s });
      cards.push({ pairId: pid, kind: "animal", species: s });
    });
    peoplePick.forEach(function (c) {
      var pid = "p:" + c.id;
      cards.push({ pairId: pid, kind: "character", character: c });
      cards.push({ pairId: pid, kind: "character", character: c });
    });

    return shuffle(cards);
  }

  function faceLabel(card) {
    if (card.kind === "animal" && card.species) {
      return card.species.label + " " + card.species.emoji;
    }
    if (card.kind === "character" && card.character) {
      return card.character.label;
    }
    return "card";
  }

  function getBoardGapPx() {
    if (!boardEl) return 10;
    var g = window.getComputedStyle(boardEl).gap;
    var v = parseFloat(g);
    return isNaN(v) ? 10 : v;
  }

  /**
   * Pick column count so tiles are as large as possible in the board area; prefer fewer
   * empty grid slots on the last row when sizes are similar.
   */
  function layoutMemoryBoard() {
    if (!boardWrap || !boardEl || !deck.length) return;
    if (!boardEl.childElementCount) return;
    var n = deck.length;
    var W = boardWrap.clientWidth;
    var H = boardWrap.clientHeight;
    if (W < 16 || H < 16) return;
    var gap = getBoardGapPx();
    var bestCols = Math.max(3, Math.min(12, Math.round(Math.sqrt(n))));
    var bestSize = -1;
    var bestWaste = 999;
    var minC = 3;
    var maxC = Math.min(12, n);
    /* Portrait “playing card” fit: width : height = 5 : 7 within each cell */
    var cardRatio = 5 / 7;
    for (var cols = minC; cols <= maxC; cols++) {
      var rows = Math.ceil(n / cols);
      var cw = (W - gap * (cols - 1)) / cols;
      var ch = (H - gap * (rows - 1)) / rows;
      var cardW = Math.min(cw, ch * cardRatio);
      var waste = cols * rows - n;
      if (cardW > bestSize + 0.5) {
        bestSize = cardW;
        bestCols = cols;
        bestWaste = waste;
      } else if (Math.abs(cardW - bestSize) <= 0.5 && waste < bestWaste) {
        bestCols = cols;
        bestWaste = waste;
      }
    }
    var rowsUsed = Math.ceil(n / bestCols);
    boardEl.style.setProperty("--memory-cols", String(bestCols));
    boardEl.style.setProperty("--memory-rows", String(rowsUsed));
  }

  function scheduleBoardLayout() {
    requestAnimationFrame(function () {
      requestAnimationFrame(layoutMemoryBoard);
    });
  }

  function renderBoard() {
    boardEl.innerHTML = "";
    tileButtons = [];
    deck.forEach(function (card, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "memory-tile memory-tile--" +
        (card.kind === "animal" ? "animal" : "character");
      btn.setAttribute("data-index", String(index));
      btn.setAttribute("aria-label", "Hidden card");
      btn.setAttribute("aria-pressed", "false");

      var inner = document.createElement("span");
      inner.className = "memory-tile__inner";

      var back = document.createElement("span");
      back.className = "memory-tile__face memory-tile__face--back";
      back.setAttribute("aria-hidden", "true");
      back.textContent = "?";

      var front = document.createElement("span");
      front.className = "memory-tile__face memory-tile__face--front";

      if (card.kind === "animal" && card.species) {
        var em = document.createElement("span");
        em.className = "memory-tile__emoji";
        em.setAttribute("aria-hidden", "true");
        em.textContent = card.species.emoji;
        var lab = document.createElement("span");
        lab.className = "memory-tile__label";
        lab.textContent = card.species.label;
        front.appendChild(em);
        front.appendChild(lab);
      } else if (card.kind === "character" && card.character) {
        var img = document.createElement("img");
        img.className = "memory-tile__pic";
        img.src = card.character.src;
        img.alt = "";
        img.width = 120;
        img.height = 120;
        img.decoding = "async";
        img.loading = "lazy";
        var cl = document.createElement("span");
        cl.className = "memory-tile__label";
        cl.textContent = card.character.label;
        front.appendChild(img);
        front.appendChild(cl);
      }

      inner.appendChild(back);
      inner.appendChild(front);
      btn.appendChild(inner);
      btn.addEventListener("click", function () {
        onTileTap(index);
      });
      var cell = document.createElement("div");
      cell.className = "memory-tile-cell";
      cell.appendChild(btn);
      boardEl.appendChild(cell);
      tileButtons.push(btn);
    });
    scheduleBoardLayout();
  }

  function updateProgress() {
    if (pairsLine) {
      pairsLine.textContent =
        "Pairs left: " + (pairCount - matchedPairs) + " of " + pairCount;
    }
    if (movesEl) {
      movesEl.textContent = "Moves: " + moves;
    }
  }

  function setAriaFlipped(btn, on) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    var i = parseInt(btn.getAttribute("data-index") || "-1", 10);
    if (i >= 0 && deck[i]) {
      btn.setAttribute(
        "aria-label",
        on ? faceLabel(deck[i]) + " — face up" : "Hidden card"
      );
    }
  }

  function flipVisual(i, on) {
    var btn = tileButtons[i];
    if (!btn) return;
    btn.classList.toggle("is-flipped", on);
    setAriaFlipped(btn, on);
  }

  function onTileTap(index) {
    if (lockInput) return;
    if (index === firstIndex || index === secondIndex) return;
    var card = deck[index];
    if (!card) return;
    var btn = tileButtons[index];
    if (!btn || btn.disabled) return;
    if (btn.classList.contains("is-matched")) return;

    if (firstIndex < 0) {
      firstIndex = index;
      flipVisual(index, true);
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("tap");
        KidsCore.haptic("light");
      }
      return;
    }

    if (secondIndex >= 0) return;

    secondIndex = index;
    flipVisual(index, true);
    moves += 1;
    updateProgress();

    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("tap");
      KidsCore.haptic("light");
    }

    var c1 = deck[firstIndex];
    var c2 = deck[secondIndex];

    if (c1.pairId === c2.pairId) {
      lockInput = true;
      matchedPairs += 1;
      var winA = firstIndex;
      var winB = secondIndex;
      var tb1 = tileButtons[winA];
      var tb2 = tileButtons[winB];
      if (tb1) tb1.classList.add("is-match-burst");
      if (tb2) tb2.classList.add("is-match-burst");
      window.setTimeout(function () {
        var b1 = tileButtons[winA];
        var b2 = tileButtons[winB];
        if (b1) {
          b1.classList.remove("is-match-burst");
          b1.classList.add("is-matched");
          b1.disabled = true;
        }
        if (b2) {
          b2.classList.remove("is-match-burst");
          b2.classList.add("is-matched");
          b2.disabled = true;
        }
        firstIndex = -1;
        secondIndex = -1;
        lockInput = false;
        updateProgress();
        if (typeof KidsCore !== "undefined") {
          KidsCore.playSound("ok");
          KidsCore.haptic("success");
        }
        if (matchedPairs >= pairCount) {
          finishWin();
        }
      }, MATCH_CELEBRATE_MS);
      return;
    }

    lockInput = true;
    var loseA = firstIndex;
    var loseB = secondIndex;
    var lb1 = tileButtons[loseA];
    var lb2 = tileButtons[loseB];
    if (lb1) lb1.classList.add("is-mismatch-wiggle");
    if (lb2) lb2.classList.add("is-mismatch-wiggle");
    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("no");
    }
    window.setTimeout(function () {
      if (lb1) lb1.classList.remove("is-mismatch-wiggle");
      if (lb2) lb2.classList.remove("is-mismatch-wiggle");
      flipVisual(loseA, false);
      flipVisual(loseB, false);
      firstIndex = -1;
      secondIndex = -1;
      lockInput = false;
    }, MISMATCH_MS);
  }

  function finishWin() {
    if (winEl) {
      winEl.textContent =
        "You matched them all — great job! Moves: " +
        moves +
        ". Tap play again!";
    }
    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("win");
      KidsCore.haptic("success");
      if (KidsCore.confetti && app) {
        KidsCore.confetti(app);
      }
    }
  }

  function resetPlayState() {
    moves = 0;
    matchedPairs = 0;
    firstIndex = -1;
    secondIndex = -1;
    lockInput = false;
    if (winEl) winEl.textContent = "";
  }

  function startGame() {
    var sizeInput = document.querySelector('input[name="memorySize"]:checked');
    var sizeKey = sizeInput ? sizeInput.value : "normal";
    deck = buildDeck(sizeKey);
    resetPlayState();

    screenSetup.classList.add("is-hidden");
    screenSetup.hidden = true;
    screenPlay.classList.remove("is-hidden");
    screenPlay.hidden = false;

    if (typeof KidsCore !== "undefined" && KidsCore.setPlayMode) {
      KidsCore.setPlayMode(true);
    }

    document.body.classList.add("memory-playing");

    renderBoard();
    updateProgress();
  }

  function goSetup() {
    screenPlay.classList.add("is-hidden");
    screenPlay.hidden = true;
    screenSetup.classList.remove("is-hidden");
    screenSetup.hidden = false;
    deck = [];
    tileButtons = [];
    boardEl.innerHTML = "";
    if (winEl) winEl.textContent = "";
    if (typeof KidsCore !== "undefined" && KidsCore.setPlayMode) {
      KidsCore.setPlayMode(false);
    }

    document.body.classList.remove("memory-playing");
  }

  function playAgainSameSize() {
    var sizeInput = document.querySelector('input[name="memorySize"]:checked');
    var sizeKey = sizeInput ? sizeInput.value : "normal";
    deck = buildDeck(sizeKey);
    resetPlayState();
    renderBoard();
    updateProgress();
  }

  btnStart.addEventListener("click", startGame);
  if (btnAgainMenu) {
    btnAgainMenu.addEventListener("click", goSetup);
  }
  if (btnPlayAgain) {
    btnPlayAgain.addEventListener("click", playAgainSameSize);
  }

  if (typeof ResizeObserver !== "undefined" && boardWrap) {
    var ro = new ResizeObserver(function () {
      layoutMemoryBoard();
    });
    ro.observe(boardWrap);
  }

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    if (app) {
      KidsCore.bindTapSound(app);
    }
  }
})();
