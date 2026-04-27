/**
 * Word search: drag across letters (touch or mouse) to find words.
 */
(function () {
  "use strict";

  /** Short, easy words for young children; grid stays small and words run only across or down */
  const WORDS = ["SOFIA", "TILLY", "CAT", "SUN", "RED", "BALL"];
  const ROWS = 8;
  const COLS = 8;
  const DIRS = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  const boardEl = document.getElementById("wordSearchBoard");
  const wordListEl = document.getElementById("wordSearchList");
  const statusEl = document.getElementById("wordSearchStatus");
  const btnNew = document.getElementById("btnWordSearchNew");
  const treasurePopup = document.getElementById("treasurePopup");
  const treasureChest = document.getElementById("treasureChest");
  const treasurePopupLead = document.getElementById("treasurePopupLead");
  const treasurePopupPrize = document.getElementById("treasurePopupPrize");
  const btnTreasureOk = document.getElementById("btnTreasureOk");
  const treasurePopupBackdrop = treasurePopup
    ? treasurePopup.querySelector(".treasure-popup__backdrop")
    : null;
  const kellyToast = document.getElementById("kellyWellDone");

  const TREASURE_PRIZES = [
    "5 minutes extra to stay up at bedtime",
    "A sweet from Mama’s cupboard",
    "A strawberry from Dada",
  ];

  /** @type {string[][]} */
  let grid = [];
  /** @type {Set<string>} */
  let found = new Set();
  let startCell = null;
  let lastPath = [];
  let pointerId = null;
  /** @type {number|null} */
  let kellyHideTimer = null;
  let kellyDoneTimer = null;

  const KELLY_SHOW_MS = 2200;
  const KELLY_EXIT_MS = 400;

  /**
   * Kelly (Mummy) toast, then callback (e.g. open treasure on last word).
   * @param {() => void} [onHidden]
   */
  function showKellyWellDone(onHidden) {
    onHidden = onHidden || function () {};
    if (!kellyToast) {
      onHidden();
      return;
    }
    if (kellyHideTimer) {
      clearTimeout(kellyHideTimer);
      kellyHideTimer = null;
    }
    if (kellyDoneTimer) {
      clearTimeout(kellyDoneTimer);
      kellyDoneTimer = null;
    }
    kellyToast.removeAttribute("hidden");
    kellyToast.setAttribute("aria-hidden", "false");
    kellyToast.classList.add("word-search__kelly-toast--on");
    kellyHideTimer = window.setTimeout(function () {
      kellyHideTimer = null;
      kellyToast.classList.remove("word-search__kelly-toast--on");
      kellyDoneTimer = window.setTimeout(function () {
        kellyDoneTimer = null;
        kellyToast.setAttribute("hidden", "");
        kellyToast.setAttribute("aria-hidden", "true");
        onHidden();
      }, KELLY_EXIT_MS);
    }, KELLY_SHOW_MS);
  }

  function randLetter() {
    const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return L[Math.floor(Math.random() * L.length)];
  }

  function tryPlaceAll() {
    /** @type {(string|null)[][]} */
    const g = [];
    for (let r = 0; r < ROWS; r++) {
      g[r] = [];
      for (let c = 0; c < COLS; c++) {
        g[r][c] = null;
      }
    }
    const shuffled = WORDS.slice().sort(function () {
      return Math.random() - 0.5;
    });
    for (let wi = 0; wi < shuffled.length; wi++) {
      const word = shuffled[wi];
      let placed = false;
      for (let attempt = 0; attempt < 400 && !placed; attempt++) {
        const [dr, dc] = DIRS[Math.floor(Math.random() * DIRS.length)];
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        const endR = r + (word.length - 1) * dr;
        const endC = c + (word.length - 1) * dc;
        if (endR < 0 || endR >= ROWS || endC < 0 || endC >= COLS) {
          continue;
        }
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const rr = r + i * dr;
          const cc = c + i * dc;
          const ch = g[rr][cc];
          if (ch !== null && ch !== word[i]) {
            ok = false;
            break;
          }
        }
        if (!ok) {
          continue;
        }
        for (let i = 0; i < word.length; i++) {
          const rr = r + i * dr;
          const cc = c + i * dc;
          g[rr][cc] = word[i];
        }
        placed = true;
      }
      if (!placed) {
        return null;
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === null) {
          g[r][c] = randLetter();
        }
      }
    }
    return g;
  }

  /** Guaranteed layout if random placement fails (one horizontal word per row). */
  function fallbackPlace() {
    const g = [];
    for (let r = 0; r < ROWS; r++) {
      g[r] = [];
      for (let c = 0; c < COLS; c++) {
        g[r][c] = null;
      }
    }
    for (let wi = 0; wi < WORDS.length; wi++) {
      const word = WORDS[wi];
      const row = wi < ROWS ? wi : wi % ROWS;
      const c0 = Math.max(0, Math.floor((COLS - word.length) / 2));
      for (let i = 0; i < word.length; i++) {
        g[row][c0 + i] = word[i];
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] === null) {
          g[r][c] = randLetter();
        }
      }
    }
    return g;
  }

  function buildGrid() {
    for (let t = 0; t < 100; t++) {
      const g = tryPlaceAll();
      if (g) {
        return g;
      }
    }
    return fallbackPlace();
  }

  /**
   * Straight line horizontally or vertically only (no diagonals), inclusive.
   * @returns {{r:number,c:number}[]|null}
   */
  function linePath(r0, c0, r1, c1) {
    const dr = r1 - r0;
    const dc = c1 - c0;
    if (dr === 0 && dc === 0) {
      return null;
    }
    let sr = 0;
    let sc = 0;
    if (dr === 0 && dc !== 0) {
      sc = dc > 0 ? 1 : -1;
    } else if (dc === 0 && dr !== 0) {
      sr = dr > 0 ? 1 : -1;
    } else {
      return null;
    }
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (r0 + sr * steps !== r1 || c0 + sc * steps !== c1) {
      return null;
    }
    const path = [];
    for (let i = 0; i <= steps; i++) {
      path.push({ r: r0 + sr * i, c: c0 + sc * i });
    }
    return path;
  }

  function pathToString(path) {
    if (!path || !path.length) {
      return "";
    }
    return path
      .map(function (p) {
        return grid[p.r][p.c];
      })
      .join("");
  }

  function matchWord(letters) {
    const u = letters.toUpperCase();
    for (let i = 0; i < WORDS.length; i++) {
      const w = WORDS[i];
      const rev = w
        .split("")
        .reverse()
        .join("");
      if (u === w || u === rev) {
        return w;
      }
    }
    return null;
  }

  function cellEl(r, c) {
    if (!boardEl) {
      return null;
    }
    return boardEl.querySelector('.ws-cell[data-r="' + r + '"][data-c="' + c + '"]');
  }

  function clearDragClasses() {
    if (!boardEl) {
      return;
    }
    boardEl.querySelectorAll(".ws-cell--drag").forEach(function (el) {
      el.classList.remove("ws-cell--drag");
    });
  }

  function applyDragPath(path) {
    clearDragClasses();
    if (!path) {
      return;
    }
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      const el = cellEl(p.r, p.c);
      if (el && !el.classList.contains("ws-cell--found")) {
        el.classList.add("ws-cell--drag");
      }
    }
  }

  function setStatus(msg) {
    if (statusEl) {
      statusEl.textContent = msg;
    }
  }

  function renderWordList() {
    if (!wordListEl) {
      return;
    }
    wordListEl.innerHTML = "";
    for (let i = 0; i < WORDS.length; i++) {
      const w = WORDS[i];
      const li = document.createElement("li");
      li.className = "word-search__word";
      li.setAttribute("data-word", w);
      if (found.has(w)) {
        li.classList.add("word-search__word--found");
      }
      li.textContent = w.charAt(0) + w.slice(1).toLowerCase();
      wordListEl.appendChild(li);
    }
  }

  function renderBoard() {
    if (!boardEl) {
      return;
    }
    boardEl.innerHTML = "";
    boardEl.style.setProperty("--ws-cols", String(COLS));
    boardEl.style.setProperty("--ws-rows", String(ROWS));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "ws-cell";
        cell.setAttribute("data-r", String(r));
        cell.setAttribute("data-c", String(c));
        cell.setAttribute("role", "gridcell");
        const letter = document.createElement("span");
        letter.className = "ws-cell__letter";
        letter.textContent = grid[r][c];
        cell.appendChild(letter);
        boardEl.appendChild(cell);
      }
    }
  }

  function allFound() {
    return found.size >= WORDS.length;
  }

  function randomInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function showTreasurePopup(opts, onDone) {
    onDone = onDone || function () {};
    if (!treasurePopup) {
      onDone();
      return;
    }
    const prize = opts.prize;
    const playerName = opts.playerName || "Sofia";

    let finished = false;
    function done() {
      if (finished) {
        return;
      }
      finished = true;
      document.removeEventListener("keydown", onKey);
      if (treasurePopupBackdrop) {
        treasurePopupBackdrop.removeEventListener("click", onBackdrop);
      }
      if (btnTreasureOk) {
        btnTreasureOk.removeEventListener("click", onOk);
      }
      treasurePopup.classList.remove("treasure-popup--reveal");
      if (treasureChest) {
        treasureChest.classList.remove("treasure-chest--reveal");
        void treasureChest.offsetWidth;
      }
      treasurePopup.classList.add("treasure-popup--hidden");
      treasurePopup.setAttribute("aria-hidden", "true");
      onDone();
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        done();
      }
    }
    function onBackdrop() {
      done();
    }
    function onOk() {
      done();
    }

    if (treasurePopupLead) {
      treasurePopupLead.textContent = playerName + " — you’ve won a prize!";
    }
    if (treasurePopupPrize) {
      treasurePopupPrize.textContent = prize;
    }

    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("ok");
      KidsCore.haptic("light");
    }

    document.addEventListener("keydown", onKey);
    if (treasurePopupBackdrop) {
      treasurePopupBackdrop.addEventListener("click", onBackdrop);
    }
    if (btnTreasureOk) {
      btnTreasureOk.addEventListener("click", onOk);
    }
    treasurePopup.classList.remove("treasure-popup--hidden");
    treasurePopup.setAttribute("aria-hidden", "false");
    if (treasureChest) {
      treasureChest.classList.remove("treasure-chest--reveal");
      void treasureChest.offsetWidth;
      treasureChest.classList.add("treasure-chest--reveal");
    }
    treasurePopup.classList.add("treasure-popup--reveal");
    setTimeout(function () {
      if (btnTreasureOk) {
        btnTreasureOk.focus();
      }
    }, 50);
  }

  function markPathFound(path) {
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      const el = cellEl(p.r, p.c);
      if (el) {
        el.classList.add("ws-cell--found");
        el.classList.remove("ws-cell--drag");
      }
    }
  }

  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }
    const t = e.target;
    if (!t || !boardEl || !boardEl.contains(t)) {
      return;
    }
    const cell = t.closest(".ws-cell");
    if (!cell) {
      return;
    }
    e.preventDefault();
    const r = parseInt(cell.getAttribute("data-r") || "0", 10);
    const c = parseInt(cell.getAttribute("data-c") || "0", 10);
    startCell = { r: r, c: c };
    lastPath = [{ r: r, c: c }];
    applyDragPath(lastPath);
    pointerId = e.pointerId;
    try {
      boardEl.setPointerCapture(pointerId);
    } catch (err) { /* */ }
  }

  function getCellAtPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el || !boardEl) {
      return null;
    }
    const cell = el.closest(".ws-cell");
    if (!cell || !boardEl.contains(cell)) {
      return null;
    }
    const r = parseInt(cell.getAttribute("data-r") || "0", 10);
    const c = parseInt(cell.getAttribute("data-c") || "0", 10);
    return { r: r, c: c, el: cell };
  }

  function onPointerMove(e) {
    if (pointerId == null || e.pointerId !== pointerId) {
      return;
    }
    if (!startCell) {
      return;
    }
    const hit = getCellAtPoint(e.clientX, e.clientY);
    if (!hit) {
      return;
    }
    const path = linePath(startCell.r, startCell.c, hit.r, hit.c);
    if (path) {
      lastPath = path;
      applyDragPath(path);
    }
  }

  function onPointerUp(e) {
    if (pointerId == null || e.pointerId !== pointerId) {
      return;
    }
    if (boardEl) {
      try {
        boardEl.releasePointerCapture(e.pointerId);
      } catch (err) { /* */ }
    }
    pointerId = null;
    if (!startCell) {
      return;
    }
    const path = lastPath;
    const str = pathToString(path);
    const matched = str.length >= 3 ? matchWord(str) : null;
    const tooShort = str.length > 0 && str.length < 3;
    clearDragClasses();
    startCell = null;
    lastPath = [];
    if (matched) {
      if (found.has(matched)) {
        setStatus("You already found " + titleCase(matched) + "!");
        if (typeof KidsCore !== "undefined") {
          KidsCore.playSound("tap");
        }
        return;
      }
      found.add(matched);
      markPathFound(path);
      renderWordList();
      if (allFound()) {
        setStatus("You found every word!");
        const prize = TREASURE_PRIZES[randomInt(0, TREASURE_PRIZES.length - 1)];
        showKellyWellDone(function () {
          showTreasurePopup(
            { prize: prize, playerName: "Sofia" },
            function () {
              if (typeof KidsCore !== "undefined") {
                KidsCore.playSound("win");
                KidsCore.haptic("success");
                var ap = document.getElementById("app");
                if (KidsCore.confetti) {
                  KidsCore.confetti(ap || document.body);
                }
              }
            }
          );
        });
      } else {
        setStatus("Nice! You found " + titleCase(matched) + "!");
        if (typeof KidsCore !== "undefined") {
          KidsCore.playSound("ok");
          KidsCore.haptic("light");
        }
        showKellyWellDone();
      }
    } else if (str.length > 0) {
      if (tooShort) {
        setStatus("Drag a bit longer to spell a full word.");
      } else {
        setStatus("Keep trying — drag in a straight row across or up-and-down.");
      }
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("no");
      }
    } else {
      setStatus("");
    }
  }

  function titleCase(w) {
    if (!w.length) {
      return w;
    }
    return w.charAt(0) + w.slice(1).toLowerCase();
  }

  function onPointerCancel(e) {
    if (pointerId == null || e.pointerId !== pointerId) {
      return;
    }
    if (boardEl) {
      try {
        boardEl.releasePointerCapture(e.pointerId);
      } catch (err) { /* */ }
    }
    pointerId = null;
    clearDragClasses();
    startCell = null;
    lastPath = [];
  }

  function newGame() {
    if (kellyHideTimer) {
      clearTimeout(kellyHideTimer);
      kellyHideTimer = null;
    }
    if (kellyDoneTimer) {
      clearTimeout(kellyDoneTimer);
      kellyDoneTimer = null;
    }
    if (kellyToast) {
      kellyToast.classList.remove("word-search__kelly-toast--on");
      kellyToast.setAttribute("hidden", "");
      kellyToast.setAttribute("aria-hidden", "true");
    }
    found = new Set();
    grid = buildGrid();
    renderBoard();
    renderWordList();
    setStatus("Drag across or up-and-down in a straight line, then let go.");
  }

  function init() {
    if (!boardEl) {
      return;
    }
    newGame();
    boardEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    if (btnNew) {
      btnNew.addEventListener("click", function () {
        newGame();
        if (typeof KidsCore !== "undefined") {
          KidsCore.playSound("tap");
        }
      });
    }
  }

  init();

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    var app = document.getElementById("app");
    if (app) {
      KidsCore.bindTapSound(app);
    }
    if (typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(true);
    }
  }

})();
