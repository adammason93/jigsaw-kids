/**
 * Noughts and crosses: two players on one device, or vs a simple computer (O).
 * Character icons match Snakes & Ladders / Number path (images + Tilly).
 */
(function () {
  const LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const IMG_PREFIX = "__img:";
  const CHARACTER_OPTIONS = [
    { v: IMG_PREFIX + "images/character-babyca.png", label: "Baby" },
    { v: IMG_PREFIX + "images/tilly-mascot.png", label: "Tilly" },
    { v: IMG_PREFIX + "images/character-baby-coolegg.png", label: "Isaac" },
    { v: IMG_PREFIX + "images/character-girl-blonde.png", label: "Sofia" },
    { v: IMG_PREFIX + "images/character-kelly.png", label: "Kelly" },
    { v: IMG_PREFIX + "images/character-freya.png", label: "Freya" },
  ];

  const K_CHAR_PICK = "tttCharPickV1";
  const DEFAULT_X = 3;
  const DEFAULT_O = 0;

  const screenSetup = document.getElementById("screenSetup");
  const screenPlay = document.getElementById("screenPlay");
  const boardEl = document.getElementById("board");
  const statusLine = document.getElementById("statusLine");
  const modeLine = document.getElementById("modeLine");
  const charLede = document.getElementById("charLede");
  const headingCharX = document.getElementById("headingCharX");
  const headingCharO = document.getElementById("headingCharO");
  const charBlockO = document.getElementById("charBlockO");
  const btnStart = document.getElementById("btnStart");
  const btnAgain = document.getElementById("btnAgain");
  const btnMenu = document.getElementById("btnMenu");
  const boardShell = document.getElementById("boardShell");
  const appEl = document.getElementById("app");
  const tttWinOverlay = document.getElementById("tttWinOverlay");
  const tttWinTitle = document.getElementById("tttWinTitle");
  const tttWinMsg = document.getElementById("tttWinMsg");
  const tttWinClose = document.getElementById("tttWinClose");
  const tttWinFx = document.getElementById("tttWinFx");
  const tttWinHero = document.getElementById("tttWinHero");

  /** @type {'friend'|'cpu'} */
  var mode = "friend";
  /** @type {(null|'X'|'O')[]} */
  var board = Array(9).fill(null);
  /** @type {'X'|'O'} */
  var current = "X";
  var gameOver = false;
  var cpuThinking = false;
  /** @type {string} token value: __img:path or emoji */
  var charX = CHARACTER_OPTIONS[DEFAULT_X].v;
  /** @type {string} */
  var charO = CHARACTER_OPTIONS[DEFAULT_O].v;
  var winLineRaf = 0;
  /** CPU difficulty for the current round (set in startGame). @type {'easy'|'hard'} */
  var gameCpuSkill = "easy";

  /** @type {{ update: function(Function): void, render: function(): void }|null} */
  var tttScorecard = null;

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isImageIcon(icon) {
    return typeof icon === "string" && icon.indexOf(IMG_PREFIX) === 0;
  }

  function imageIconSrc(icon) {
    return icon.slice(IMG_PREFIX.length);
  }

  function labelForValue(v) {
    const o = CHARACTER_OPTIONS.find(function (x) {
      return x.v === v;
    });
    return o ? o.label : "Player";
  }

  /**
   * @param {HTMLElement | null} host
   * @param {string} tokenV
   */
  function renderAvatarInto(host, tokenV) {
    if (!host) {
      return;
    }
    host.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "ttt-side__token";
    if (isImageIcon(tokenV)) {
      const im = document.createElement("img");
      im.className = "ttt-side__token-img";
      im.src = imageIconSrc(tokenV);
      im.alt = "";
      im.decoding = "async";
      wrap.appendChild(im);
    } else {
      const em = document.createElement("span");
      em.className = "ttt-side__token-emoji";
      em.textContent = tokenV;
      em.setAttribute("aria-hidden", "true");
      wrap.appendChild(em);
    }
    host.appendChild(wrap);
  }

  function playSidebarTotals() {
    if (!tttScorecard) {
      return { leftW: 0, rightW: 0, draws: 0 };
    }
    const s = tttScorecard.load();
    if (mode === "friend") {
      return {
        leftW: s.friend.x,
        rightW: s.friend.o,
        draws: s.friend.draw,
      };
    }
    const b = gameCpuSkill === "hard" ? s.cpuHard : s.cpuEasy;
    return { leftW: b.you, rightW: b.cpu, draws: b.draw };
  }

  function syncPlaySidebars() {
    const nx = document.getElementById("tttPlayNameX");
    const nO = document.getElementById("tttPlayNameO");
    const wx = document.getElementById("tttPlayWinsX");
    const wO = document.getElementById("tttPlayWinsO");
    const dx = document.getElementById("tttPlayDrawsX");
    const dO = document.getElementById("tttPlayDrawsO");
    const ax = document.getElementById("tttAvatarX");
    const aO = document.getElementById("tttAvatarO");
    if (nx) {
      nx.textContent = labelForValue(charX);
    }
    if (nO) {
      nO.textContent = labelForValue(charO);
    }
    const t = playSidebarTotals();
    if (wx) {
      wx.textContent = String(t.leftW);
    }
    if (wO) {
      wO.textContent = String(t.rightW);
    }
    if (dx) {
      dx.textContent = String(t.draws);
    }
    if (dO) {
      dO.textContent = String(t.draws);
    }
    renderAvatarInto(ax, charX);
    renderAvatarInto(aO, charO);
    syncPlaySidebarTurn();
  }

  function syncPlaySidebarTurn() {
    const sx = document.getElementById("tttSideX");
    const so = document.getElementById("tttSideO");
    if (!sx || !so) {
      return;
    }
    const activeX = !gameOver && current === "X";
    const activeO = !gameOver && current === "O";
    sx.classList.toggle("ttt-side--active", activeX);
    so.classList.toggle("ttt-side--active", activeO);
  }

  function isValidToken(v) {
    return (
      v &&
      CHARACTER_OPTIONS.some(function (opt) {
        return opt.v === v;
      })
    );
  }

  const LEGACY_DOG_EMOJI = "🐶";

  function loadCharPicks() {
    try {
      const raw = localStorage.getItem(K_CHAR_PICK);
      if (!raw) {
        return;
      }
      const o = JSON.parse(raw);
      const tillyV = IMG_PREFIX + "images/tilly-mascot.png";
      if (o && o.x === LEGACY_DOG_EMOJI) {
        o.x = tillyV;
      }
      if (o && o.o === LEGACY_DOG_EMOJI) {
        o.o = tillyV;
      }
      if (o && isValidToken(o.x)) {
        charX = o.x;
      }
      if (o && isValidToken(o.o)) {
        charO = o.o;
      }
    } catch (e) {}
  }

  function saveCharPicks() {
    try {
      localStorage.setItem(
        K_CHAR_PICK,
        JSON.stringify({ x: charX, o: charO })
      );
    } catch (e) {}
  }

  function recordGameResult(w) {
    if (!tttScorecard) {
      return;
    }
    tttScorecard.update(function (scores) {
      if (mode === "friend") {
        if (!w) {
          scores.friend.draw++;
        } else if (w.player === "X") {
          scores.friend.x++;
        } else {
          scores.friend.o++;
        }
      } else {
        const bucket = gameCpuSkill === "hard" ? scores.cpuHard : scores.cpuEasy;
        if (!w) {
          bucket.draw++;
        } else if (w.player === "X") {
          bucket.you++;
        } else {
          bucket.cpu++;
        }
      }
    });
  }

  function syncModeLabels() {
    const cpu = selectedMode() === "cpu";
    if (charLede) {
      charLede.innerHTML = cpu
        ? "Choose <strong>your</strong> character (you go first) and a character for the <strong>computer</strong>."
        : "Tap a face or icon for each side. <strong>Crosses</strong> always take the first turn.";
    }
    if (headingCharX) {
      headingCharX.textContent = cpu ? "You (first turn)" : "Crosses (first turn)";
    }
    if (headingCharO) {
      headingCharO.textContent = cpu ? "Computer" : "Noughts";
    }
    if (charBlockO) {
      charBlockO.hidden = false;
    }
    syncCpuSkillBlock();
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

  function buildCharRow(rowEl, which) {
    if (!rowEl) {
      return;
    }
    clearElement(rowEl);
    for (let i = 0; i < CHARACTER_OPTIONS.length; i++) {
      const opt = CHARACTER_OPTIONS[i];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ttt-char-opt";
      b.setAttribute("data-which", which);
      b.setAttribute("data-value", opt.v);
      b.setAttribute("title", opt.label);
      b.setAttribute("aria-label", opt.label);
      if (isImageIcon(opt.v)) {
        b.classList.add("ttt-char-opt--pic");
        const im = document.createElement("img");
        im.className = "ttt-char-opt__pic";
        im.src = imageIconSrc(opt.v);
        im.alt = "";
        im.width = 96;
        im.height = 96;
        im.decoding = "async";
        b.appendChild(im);
      } else {
        b.classList.add("ttt-char-opt--emoji");
        b.appendChild(document.createTextNode(opt.v));
      }
      b.addEventListener("click", function () {
        if (which === "x") {
          charX = opt.v;
        } else {
          charO = opt.v;
        }
        saveCharPicks();
        rowEl.querySelectorAll(".ttt-char-opt").forEach(function (el) {
          el.setAttribute("aria-pressed", el.getAttribute("data-value") === opt.v ? "true" : "false");
        });
      });
      rowEl.appendChild(b);
    }
  }

  function setRowSelection(rowEl, value) {
    if (!rowEl) {
      return;
    }
    rowEl.querySelectorAll(".ttt-char-opt").forEach(function (el) {
      el.setAttribute("aria-pressed", el.getAttribute("data-value") === value ? "true" : "false");
    });
  }

  function initCharPickers() {
    var rowX = document.getElementById("charRowX");
    var rowO = document.getElementById("charRowO");
    loadCharPicks();
    buildCharRow(rowX, "x");
    buildCharRow(rowO, "o");
    setRowSelection(rowX, charX);
    setRowSelection(rowO, charO);
    syncModeLabels();
  }

  /**
   * @param {HTMLButtonElement} host
   * @param {string} tokenV
   */
  function renderTokenInCell(host, tokenV) {
    host.textContent = "";
    const wrap = document.createElement("span");
    wrap.className = "ttt-token";
    if (isImageIcon(tokenV)) {
      const im = document.createElement("img");
      im.className = "ttt-token__img";
      im.src = imageIconSrc(tokenV);
      im.alt = "";
      im.decoding = "async";
      wrap.appendChild(im);
    } else {
      const em = document.createElement("span");
      em.className = "ttt-token--emoji";
      em.textContent = tokenV;
      em.setAttribute("aria-hidden", "true");
      wrap.appendChild(em);
    }
    host.appendChild(wrap);
  }

  function showScreen(which) {
    const onPlay = which === "play";
    if (!onPlay) {
      closeWinModal();
      clearWinLineSvg();
    }
    screenSetup.classList.toggle("is-hidden", onPlay);
    screenSetup.hidden = onPlay;
    screenPlay.classList.toggle("is-hidden", !onPlay);
    screenPlay.hidden = !onPlay;
    if (appEl) {
      appEl.classList.toggle("ttt-app--play", onPlay);
    }
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(onPlay);
    }
    if (!onPlay) {
      initCharPickers();
      if (tttScorecard) {
        tttScorecard.render();
      }
    }
  }

  function selectedMode() {
    const r = document.querySelector('input[name="tttMode"]:checked');
    return r && r.value === "cpu" ? "cpu" : "friend";
  }

  function selectedCpuSkill() {
    const r = document.querySelector('input[name="tttCpuSkill"]:checked');
    return r && r.value === "hard" ? "hard" : "easy";
  }

  function syncCpuSkillBlock() {
    const block = document.getElementById("cpuSkillBlock");
    if (!block) {
      return;
    }
    const show = selectedMode() === "cpu";
    block.hidden = !show;
    block.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function winner(b) {
    for (let i = 0; i < LINES.length; i++) {
      const [a, c, d] = LINES[i];
      if (b[a] && b[a] === b[c] && b[a] === b[d]) {
        return { player: b[a], line: LINES[i] };
      }
    }
    return null;
  }

  function isDraw(b) {
    return b.every(function (x) {
      return x !== null;
    });
  }

  function emptyIndices(b) {
    const out = [];
    for (let i = 0; i < 9; i++) {
      if (b[i] === null) {
        out.push(i);
      }
    }
    return out;
  }

  /** Strong play: win if possible, block X, centre, corner, edge. */
  function pickCpuMoveOptimal(b) {
    const empties = emptyIndices(b);
    if (empties.length === 0) {
      return -1;
    }
    function wouldWin(player, idx) {
      const t = b.slice();
      t[idx] = player;
      const w = winner(t);
      return w && w.player === player;
    }
    for (let i = 0; i < empties.length; i++) {
      const idx = empties[i];
      if (wouldWin("O", idx)) {
        return idx;
      }
    }
    for (let i = 0; i < empties.length; i++) {
      const idx = empties[i];
      if (wouldWin("X", idx)) {
        return idx;
      }
    }
    if (b[4] === null) {
      return 4;
    }
    const corners = [0, 2, 6, 8].filter(function (i) {
      return b[i] === null;
    });
    if (corners.length) {
      return corners[Math.floor(Math.random() * corners.length)];
    }
    return empties[Math.floor(Math.random() * empties.length)];
  }

  /**
   * Easy: often picks a weaker square so the human can win sometimes.
   * Hard: same as pickCpuMoveOptimal.
   */
  function pickCpuMove(b) {
    const optimal = pickCpuMoveOptimal(b);
    if (selectedCpuSkill() === "hard") {
      return optimal;
    }
    const empties = emptyIndices(b);
    if (empties.length <= 1) {
      return optimal;
    }
    /* ~40% of turns: play a random non-best move when one exists */
    if (Math.random() < 0.4) {
      const mistakes = empties.filter(function (i) {
        return i !== optimal;
      });
      if (mistakes.length > 0) {
        return mistakes[Math.floor(Math.random() * mistakes.length)];
      }
    }
    return optimal;
  }

  function clearWinLineSvg() {
    if (winLineRaf) {
      cancelAnimationFrame(winLineRaf);
      winLineRaf = 0;
    }
    const prev = document.getElementById("tttWinLineSvg");
    if (prev && prev.parentNode) {
      prev.parentNode.removeChild(prev);
    }
  }

  function clearWinHighlight() {
    boardEl.querySelectorAll(".ttt-winline").forEach(function (el) {
      el.classList.remove("ttt-winline");
    });
  }

  function applyWinHighlight(line) {
    if (!line) {
      return;
    }
    line.forEach(function (idx) {
      const c = boardEl.querySelector('.ttt-cell[data-index="' + idx + '"]');
      if (c) {
        c.classList.add("ttt-winline");
      }
    });
  }

  function clearBodyModalLock() {
    document.body.classList.remove("ttt-win-open");
  }

  function clearWinHero() {
    if (!tttWinHero) {
      return;
    }
    tttWinHero.replaceChildren();
    tttWinHero.classList.add("is-hidden");
    tttWinHero.hidden = true;
    tttWinHero.setAttribute("aria-hidden", "true");
  }

  /**
   * Renders the winning character (emoji or portrait) in the popup, with a dance wrapper.
   * @param {string} tokenV
   */
  function fillWinHero(tokenV) {
    if (!tttWinHero) {
      return;
    }
    tttWinHero.replaceChildren();
    if (!tokenV) {
      clearWinHero();
      return;
    }
    const dance = document.createElement("div");
    dance.className = "ttt-win-dance";
    if (isImageIcon(tokenV)) {
      const im = document.createElement("img");
      im.className = "ttt-win-dialog__img";
      im.src = imageIconSrc(tokenV);
      im.alt = "";
      im.width = 120;
      im.height = 120;
      im.decoding = "async";
      dance.appendChild(im);
    } else {
      const em = document.createElement("span");
      em.className = "ttt-win-dialog__emoji";
      em.textContent = tokenV;
      em.setAttribute("aria-hidden", "true");
      dance.appendChild(em);
    }
    tttWinHero.appendChild(dance);
    tttWinHero.classList.remove("is-hidden");
    tttWinHero.hidden = false;
    tttWinHero.setAttribute("aria-hidden", "true");
  }

  function closeWinModal() {
    if (!tttWinOverlay) {
      return;
    }
    tttWinOverlay.classList.add("is-hidden");
    tttWinOverlay.hidden = true;
    tttWinOverlay.setAttribute("aria-hidden", "true");
    clearBodyModalLock();
    clearWinHero();
    if (tttWinFx) {
      tttWinFx.replaceChildren();
    }
  }

  function buildFireworks() {
    if (!tttWinFx || prefersReducedMotion()) {
      return;
    }
    tttWinFx.replaceChildren();
    const colors = [
      "#f472b6",
      "#a78bfa",
      "#fbbf24",
      "#34d399",
      "#60a5fa",
      "#fb923c",
      "#f9a8d4",
      "#4ade80",
    ];
    const n = 36;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "ttt-fwk-burst";
      s.style.setProperty(
        "left",
        8 + Math.random() * 84 + "%"
      );
      s.style.setProperty("top", 10 + Math.random() * 80 + "%");
      s.style.setProperty(
        "--ttt-rot",
        Math.floor(Math.random() * 360) + "deg"
      );
      s.style.setProperty(
        "--ttt-tx",
        (Math.random() * 2 - 1) * 55 + "px"
      );
      s.style.setProperty(
        "--ttt-ty",
        (Math.random() * 2 - 1) * 60 + "px"
      );
      s.style.setProperty("animation-delay", Math.random() * 1.2 + "s");
      s.style.setProperty("background", colors[i % colors.length]);
      tttWinFx.appendChild(s);
    }
  }

  function showWinModal(opts) {
    if (!tttWinOverlay || !tttWinTitle || !tttWinMsg) {
      return;
    }
    tttWinTitle.textContent = opts.title || "Hooray!";
    tttWinMsg.textContent = opts.message || "";
    if (opts.winnerToken) {
      fillWinHero(opts.winnerToken);
    } else {
      clearWinHero();
    }
    tttWinOverlay.classList.remove("is-hidden");
    tttWinOverlay.hidden = false;
    tttWinOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("ttt-win-open");
    if (opts.showFireworks) {
      buildFireworks();
    } else if (tttWinFx) {
      tttWinFx.replaceChildren();
    }
    window.setTimeout(function () {
      if (tttWinClose) {
        tttWinClose.focus();
      }
    }, 100);
  }

  /**
   * Draws an SVG line across the three winning cells (after layout).
   * @param {number[]} line
   */
  function placeWinLine(line) {
    if (!line || line.length !== 3) {
      return;
    }
    const el0 = boardEl.querySelector('.ttt-cell[data-index="' + line[0] + '"]');
    const el2 = boardEl.querySelector('.ttt-cell[data-index="' + line[2] + '"]');
    if (!el0 || !el2) {
      return;
    }
    const br = boardEl.getBoundingClientRect();
    const r0 = el0.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();
    const x1 = r0.left + r0.width / 2 - br.left;
    const y1 = r0.top + r0.height / 2 - br.top;
    const x2 = r2.left + r2.width / 2 - br.left;
    const y2 = r2.top + r2.height / 2 - br.top;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const pad = Math.min(10, len * 0.08);
    const ux = dx / len;
    const uy = dy / len;
    const x1a = x1 - ux * pad;
    const y1a = y1 - uy * pad;
    const x2a = x2 + ux * pad;
    const y2a = y2 + uy * pad;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.id = "tttWinLineSvg";
    svg.setAttribute("class", "ttt-win-line-svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 " + br.width + " " + br.height);
    const lineEl = document.createElementNS(ns, "line");
    const segLen = Math.hypot(x2a - x1a, y2a - y1a);
    lineEl.setAttribute("x1", String(x1a));
    lineEl.setAttribute("y1", String(y1a));
    lineEl.setAttribute("x2", String(x2a));
    lineEl.setAttribute("y2", String(y2a));
    lineEl.setAttribute("class", "ttt-win-line-core");
    if (!prefersReducedMotion() && segLen > 0) {
      lineEl.setAttribute("stroke-dasharray", String(segLen));
      lineEl.setAttribute("stroke-dashoffset", String(segLen));
    }
    svg.appendChild(lineEl);
    boardEl.appendChild(svg);
  }

  function scheduleWinLineDraw(line) {
    clearWinLineSvg();
    winLineRaf = requestAnimationFrame(function () {
      winLineRaf = requestAnimationFrame(function () {
        placeWinLine(line);
        winLineRaf = 0;
      });
    });
  }

  function winModalCopy(w) {
    const winLabel =
      w.player === "X" ? labelForValue(charX) : labelForValue(charO);
    const msg = winLabel + " wins!";
    if (mode === "cpu" && w.player === "X") {
      return { title: "You did it!", message: msg };
    }
    if (mode === "cpu" && w.player === "O") {
      return { title: "The computer won!", message: msg };
    }
    return { title: "We have a winner!", message: msg };
  }

  function renderBoard() {
    boardEl.replaceChildren();
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ttt-cell";
      btn.setAttribute("role", "gridcell");
      btn.dataset.index = String(i);
      const v = board[i];
      if (v === "X") {
        btn.classList.add("ttt-cell--x");
        renderTokenInCell(btn, charX);
        btn.setAttribute("aria-label", labelForValue(charX) + " in cell " + (i + 1));
      } else if (v === "O") {
        btn.classList.add("ttt-cell--o");
        renderTokenInCell(btn, charO);
        btn.setAttribute("aria-label", labelForValue(charO) + " in cell " + (i + 1));
      } else {
        btn.setAttribute("aria-label", "Empty cell " + (i + 1));
      }
      const disabled = gameOver || v !== null || cpuThinking || (mode === "cpu" && current === "O");
      btn.disabled = disabled;
      if (disabled && v === null && !gameOver) {
        btn.setAttribute("aria-disabled", "true");
      }
      btn.addEventListener("click", function () {
        onCellClick(i);
      });
      boardEl.appendChild(btn);
    }
    boardEl.classList.toggle("ttt-board--over", gameOver);
    syncPlaySidebarTurn();
  }

  function setStatus(msg) {
    statusLine.textContent = msg;
  }

  function syncModeLine() {
    if (mode === "cpu") {
      modeLine.textContent =
        selectedCpuSkill() === "hard"
          ? "You vs computer (hard)"
          : "You vs computer (easy)";
    } else {
      modeLine.textContent = "Two players";
    }
  }

  function currentPlayerLabel() {
    return current === "X" ? labelForValue(charX) : labelForValue(charO);
  }

  function updateTurnMessage() {
    if (gameOver) {
      return;
    }
    if (mode === "cpu" && current === "O") {
      setStatus(labelForValue(charO) + "’s turn (computer)…");
      return;
    }
    if (mode === "cpu") {
      setStatus("Your turn — " + labelForValue(charX));
      return;
    }
    setStatus(currentPlayerLabel() + " to play");
  }

  function endGame(w) {
    gameOver = true;
    recordGameResult(w);
    clearWinHighlight();
    if (w) {
      const winLabel =
        w.player === "X" ? labelForValue(charX) : labelForValue(charO);
      setStatus(winLabel + " wins!");
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("win");
        KidsCore.haptic("success");
        if (mode === "friend" || (mode === "cpu" && w.player === "X")) {
          KidsCore.confetti(document.getElementById("board") || document.body);
        }
        KidsCore.recordGame("ttt");
      }
    } else {
      setStatus("It’s a draw!");
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("ok");
        KidsCore.haptic("light");
        KidsCore.recordGame("ttt");
      }
    }
    renderBoard();
    if (w) {
      applyWinHighlight(w.line);
      scheduleWinLineDraw(w.line);
      const copy = winModalCopy(w);
      showWinModal({
        title: copy.title,
        message: copy.message,
        winnerToken: w.player === "X" ? charX : charO,
        showFireworks: !prefersReducedMotion(),
      });
    } else {
      showWinModal({
        title: "Well played!",
        message: "It’s a draw! Nobody won this time.",
        winnerToken: null,
        showFireworks: false,
      });
    }
  }

  function onCellClick(index) {
    if (gameOver || board[index] !== null || cpuThinking) {
      return;
    }
    if (mode === "cpu" && current === "O") {
      return;
    }
    board[index] = current;
    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("ok");
      KidsCore.haptic("light");
    }
    const w = winner(board);
    if (w) {
      endGame(w);
      return;
    }
    if (isDraw(board)) {
      endGame(null);
      return;
    }
    current = current === "X" ? "O" : "X";
    if (mode === "cpu" && current === "O") {
      updateTurnMessage();
      cpuThinking = true;
      renderBoard();
      window.setTimeout(function () {
        const move = pickCpuMove(board);
        if (move >= 0) {
          board[move] = "O";
          if (typeof KidsCore !== "undefined") {
            KidsCore.playSound("tap");
            KidsCore.haptic("light");
          }
        }
        cpuThinking = false;
        const w2 = winner(board);
        if (w2) {
          endGame(w2);
          return;
        }
        if (isDraw(board)) {
          endGame(null);
          return;
        }
        current = "X";
        updateTurnMessage();
        renderBoard();
      }, 450);
      return;
    }
    updateTurnMessage();
    renderBoard();
  }

  function startGame() {
    closeWinModal();
    clearWinLineSvg();
    mode = selectedMode();
    gameCpuSkill = selectedCpuSkill();
    saveCharPicks();
    board = Array(9).fill(null);
    current = "X";
    gameOver = false;
    cpuThinking = false;
    clearWinHighlight();
    syncModeLine();
    updateTurnMessage();
    showScreen("play");
    renderBoard();
    syncPlaySidebars();
  }

  function resetRound() {
    closeWinModal();
    clearWinLineSvg();
    board = Array(9).fill(null);
    current = "X";
    gameOver = false;
    cpuThinking = false;
    clearWinHighlight();
    updateTurnMessage();
    renderBoard();
    syncPlaySidebars();
  }

  function runBoot() {
    initCharPickers();
    document.querySelectorAll('input[name="tttMode"]').forEach(function (r) {
      r.addEventListener("change", syncModeLabels);
    });
    btnStart.addEventListener("click", startGame);
    btnAgain.addEventListener("click", resetRound);
    btnMenu.addEventListener("click", function () {
      showScreen("setup");
    });
    if (tttWinClose) {
      tttWinClose.addEventListener("click", closeWinModal);
    }
    if (tttWinOverlay) {
      tttWinOverlay.addEventListener("click", function (e) {
        if (e.target === tttWinOverlay) {
          closeWinModal();
        }
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && tttWinOverlay && !tttWinOverlay.hidden) {
        closeWinModal();
      }
    });
    if (typeof GameScorecard !== "undefined") {
      tttScorecard = GameScorecard.wire({
        storageKey: "tttScorecardV1",
        defaults: {
          friend: { x: 0, o: 0, draw: 0 },
          cpuEasy: { you: 0, cpu: 0, draw: 0 },
          cpuHard: { you: 0, cpu: 0, draw: 0 },
        },
        display: {
          scoreFriendX: function (s) {
            return s.friend.x;
          },
          scoreFriendO: function (s) {
            return s.friend.o;
          },
          scoreFriendDraw: function (s) {
            return s.friend.draw;
          },
          scoreCpuEasyYou: function (s) {
            return s.cpuEasy.you;
          },
          scoreCpuEasyCpu: function (s) {
            return s.cpuEasy.cpu;
          },
          scoreCpuEasyDraw: function (s) {
            return s.cpuEasy.draw;
          },
          scoreCpuHardYou: function (s) {
            return s.cpuHard.you;
          },
          scoreCpuHardCpu: function (s) {
            return s.cpuHard.cpu;
          },
          scoreCpuHardDraw: function (s) {
            return s.cpuHard.draw;
          },
        },
        hintId: "tttscHint",
        btnCopyId: "tttscCopy",
        btnPasteId: "tttscPaste",
        btnResetId: "tttscReset",
        onRender: function () {
          syncPlaySidebars();
        },
      });
      tttScorecard.render();
    }

    if (typeof KidsCore !== "undefined") {
      KidsCore.init();
      KidsCore.bindTapSound(document.getElementById("app"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runBoot);
  } else {
    runBoot();
  }
})();
