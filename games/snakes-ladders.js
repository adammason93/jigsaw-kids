/**
 * Snakes & Ladders — 5×10 serpentine board, 1–50, bounce at 50, emoji tokens
 */
(function () {
  "use strict";

  const FINISH = 50;
  const COLS = 10;
  const ROWS = 5;

  const LADDERS = new Map([
    [1, 19],
    [2, 12],
    [4, 18],
    [6, 20],
    [9, 26],
    [11, 32],
    [15, 30],
    [22, 40],
    [28, 45],
    [35, 48],
  ]);
  const SNAKES = new Map([
    [47, 20],
    [42, 8],
    [38, 5],
    [33, 7],
    [29, 2],
    [24, 1],
    [21, 2],
    [44, 15],
    [36, 9],
    [49, 28],
  ]);

  const JUMPS = new Map();
  LADDERS.forEach((to, from) => JUMPS.set(from, to));
  SNAKES.forEach((to, from) => JUMPS.set(from, to));

  const PLAYER_RING = ["#e11d48", "#2563eb", "#16a34a", "#ca8a04"];

  /** Image tokens use value prefix + path under games/ (HTML is in games/) */
  const IMG_PREFIX = "__img:";
  const CHARACTER_OPTIONS = [
    {
      v: IMG_PREFIX + "images/character-babyca.png",
      label: "Dolly (ragdoll girl)",
    },
    { v: "🐶", label: "Dog" },
    {
      v: IMG_PREFIX + "images/character-baby-coolegg.png",
      label: "Cool Egg baby",
    },
    {
      v: IMG_PREFIX + "images/character-girl-blonde.png",
      label: "Sofia (blonde girl)",
    },
  ];

  function isImageIcon(icon) {
    return typeof icon === "string" && icon.indexOf(IMG_PREFIX) === 0;
  }

  function imageIconSrc(icon) {
    return icon.slice(IMG_PREFIX.length);
  }

  /** In turn messages, image characters use a small emoji so text stays short */
  function iconForMessage(icon) {
    return isImageIcon(icon) ? "🎀" : icon;
  }

  /**
   * @param {HTMLElement} el - host (span.token, .swatch, etc.)
   * @param {string} icon - emoji or __img:path
   * @param {string} [ringBg] - background color for ring behind emoji/photo
   */
  function setPlayerIconOn(el, icon, ringBg) {
    el.textContent = "";
    if (ringBg) el.style.background = ringBg;
    if (isImageIcon(icon)) {
      const im = document.createElement("img");
      im.className = "player-icon-img";
      im.src = imageIconSrc(icon);
      im.alt = "";
      im.decoding = "async";
      el.appendChild(im);
    } else {
      el.textContent = icon;
    }
  }

  const screenSetup = document.getElementById("screenSetup");
  const screenGame = document.getElementById("screenGame");
  const screenWin = document.getElementById("screenWin");
  const nameFields = document.getElementById("nameFields");
  const boardEl = document.getElementById("board");
  const boardGrid = document.getElementById("boardGrid");
  const boardConn = document.getElementById("boardConn");
  const tokenLayer = document.getElementById("tokenLayer");
  const startStrip = document.getElementById("startStrip");
  const startHint = document.getElementById("startHint");
  const turnLabel = document.getElementById("turnLabel");
  const playerList = document.getElementById("playerList");
  const btnRoll = document.getElementById("btnRoll");
  const messageEl = document.getElementById("message");
  const turnReadyHint = document.getElementById("turnReadyHint");
  const dice = document.getElementById("dice");
  const diceHint = document.getElementById("diceHint");
  const winName = document.getElementById("winName");
  const boardWrap = document.getElementById("boardWrap");
  const turnPopup = document.getElementById("turnPopup");
  const turnPopupTitle = document.getElementById("turnPopupTitle");
  const turnPopupSub = document.getElementById("turnPopupSub");
  const turnPlayerAvatar = document.getElementById("turnPlayerAvatar");
  const turnPopupDice = document.getElementById("turnPopupDice");
  const turnDiceHint = document.getElementById("turnDiceHint");
  const btnTurnRoll = document.getElementById("btnTurnRoll");
  const btnTurnMove = document.getElementById("btnTurnMove");
  const jumpPopup = document.getElementById("jumpPopup");
  const jumpPopupTitle = document.getElementById("jumpPopupTitle");
  const jumpPopupDecor = document.getElementById("jumpPopupDecor");
  const jumpPopupMeta = document.getElementById("jumpPopupMeta");
  const jumpPopupMover = document.getElementById("jumpPopupMover");
  const jumpPopupAvatar = document.getElementById("jumpPopupAvatar");
  const jumpPopupBackdrop = jumpPopup
    ? jumpPopup.querySelector(".jump-popup__backdrop")
    : null;
  const snakeQuiz = document.getElementById("snakeQuiz");
  const snakeQuizText = document.getElementById("snakeQuizText");
  const snakeQuizOptions = document.getElementById("snakeQuizOptions");
  const snakeQuizBackdrop = snakeQuiz
    ? snakeQuiz.querySelector(".snake-quiz__backdrop")
    : null;

  let jumpTimeoutId = 0;
  function showJumpPopup(opts, onDone) {
    if (!jumpPopup || !jumpPopupMover || !jumpPopupAvatar) {
      onDone();
      return;
    }
    const type = opts.type;
    const p = opts.p;
    const from = opts.from;
    const to = opts.to;
    const playerIndex = opts.playerIndex;

    if (jumpTimeoutId) {
      clearTimeout(jumpTimeoutId);
      jumpTimeoutId = 0;
    }

    let finished = false;
    function done() {
      if (finished) return;
      finished = true;
      if (jumpTimeoutId) {
        clearTimeout(jumpTimeoutId);
        jumpTimeoutId = 0;
      }
      document.removeEventListener("keydown", onKey);
      if (jumpPopupBackdrop) {
        jumpPopupBackdrop.removeEventListener("click", onSkip);
      }
      jumpPopup.classList.add("jump-popup--hidden");
      jumpPopup.setAttribute("aria-hidden", "true");
      jumpPopup.classList.remove("jump-popup--ladder", "jump-popup--snake");
      onDone();
    }

    function onKey(e) {
      if (e.key === "Escape") done();
    }
    function onSkip() {
      done();
    }

    jumpPopup.classList.remove("jump-popup--hidden");
    jumpPopup.classList.remove("jump-popup--ladder", "jump-popup--snake");
    jumpPopup.classList.add(type === "ladder" ? "jump-popup--ladder" : "jump-popup--snake");
    jumpPopup.setAttribute("aria-hidden", "false");
    if (jumpPopupTitle) {
      jumpPopupTitle.textContent = type === "ladder" ? "Up the ladder!" : "Sssnake slide!";
    }
    if (jumpPopupDecor) {
      jumpPopupDecor.textContent = type === "ladder" ? "🪜" : "🐍";
    }
    if (jumpPopupMeta) {
      jumpPopupMeta.textContent = p.name + " — square " + from + " to " + to + ".";
    }
    setPlayerIconOn(
      jumpPopupAvatar,
      p.icon,
      PLAYER_RING[playerIndex % PLAYER_RING.length]
    );
    jumpPopupMover.style.animation = "none";
    void jumpPopupMover.offsetWidth;
    jumpPopupMover.style.animation = "";

    document.addEventListener("keydown", onKey);
    if (jumpPopupBackdrop) {
      jumpPopupBackdrop.addEventListener("click", onSkip);
    }
    jumpTimeoutId = setTimeout(done, 1600);
  }

  let state = {
    numPlayers: 2,
    players: [],
    current: 0,
    rolling: false,
    won: false,
  };

  /** "roll" = waiting to roll, "move" = rolled, waiting to confirm, "closed" = modal away */
  var turnModalPhase = "closed";
  var pendingRoll = 0;

  function cellNumber(visualRow, col) {
    const bottomRow = ROWS - 1 - visualRow;
    if (bottomRow % 2 === 0) {
      return 1 + bottomRow * COLS + col;
    }
    return 1 + bottomRow * COLS + (COLS - 1 - col);
  }

  function applyBounce(pos, roll) {
    if (pos === 0) return Math.min(roll, FINISH);
    let n = pos + roll;
    if (n > FINISH) n = FINISH - (n - FINISH);
    return n;
  }

  function applyJumps(n) {
    let x = n;
    for (let i = 0; i < 20; i++) {
      const to = JUMPS.get(x);
      if (to === undefined) break;
      x = to;
    }
    return x;
  }

  /**
   * One square per pip: from 0, walk 1..min(roll, FINISH); on board, add with bounce.
   * @returns {number[]}
   */
  function computeStepPath(from, roll) {
    if (roll <= 0) {
      return [];
    }
    if (from === 0) {
      const end = Math.min(roll, FINISH);
      return Array.from({ length: end }, function (_, i) {
        return i + 1;
      });
    }
    const out = [];
    let pos = from;
    for (let s = 0; s < roll; s++) {
      pos = pos + 1;
      if (pos > FINISH) {
        pos = FINISH - (pos - FINISH);
      }
      out.push(pos);
    }
    return out;
  }

  function setBoardZoomToSquare(n) {
    if (!boardWrap || n < 1 || n > FINISH) {
      return;
    }
    const cell = boardGrid && boardGrid.querySelector('.board-cell[data-n="' + n + '"]');
    if (!cell) {
      return;
    }
    const br = boardWrap.getBoundingClientRect();
    const cr = cell.getBoundingClientRect();
    const ox = cr.left - br.left + cr.width / 2;
    const oy = cr.top - br.top + cr.height / 2;
    boardWrap.style.setProperty("transform-origin", ox + "px " + oy + "px");
    boardWrap.classList.add("board-wrap--zoomed");
  }

  function clearBoardZoom() {
    if (!boardWrap) {
      return;
    }
    boardWrap.classList.remove("board-wrap--zoomed");
    boardWrap.style.removeProperty("transform-origin");
  }

  function openTurnModal() {
    if (!turnPopup || state.won || state.rolling) {
      return;
    }
    const cur = state.players[state.current];
    const idx = state.current;
    turnModalPhase = "roll";
    pendingRoll = 0;
    if (turnPopupTitle) {
      turnPopupTitle.textContent = cur.name + "’s go!";
    }
    if (turnPopupSub) {
      turnPopupSub.textContent =
        "Roll the 3D die, then use the button to move along the path.";
    }
    if (turnPlayerAvatar) {
      setPlayerIconOn(turnPlayerAvatar, cur.icon, PLAYER_RING[idx % PLAYER_RING.length]);
    }
    setDiceFace(1);
    if (turnDiceHint) {
      turnDiceHint.textContent = "Ready to roll!";
    }
    if (turnPopupDice) {
      turnPopupDice.classList.remove("dice--rolling", "dice--spin");
    }
    if (btnTurnRoll) {
      btnTurnRoll.hidden = false;
      btnTurnRoll.disabled = false;
    }
    if (btnTurnMove) {
      btnTurnMove.hidden = true;
      btnTurnMove.disabled = true;
    }
    turnPopup.classList.remove("turn-popup--hidden");
    turnPopup.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      if (btnTurnRoll) {
        btnTurnRoll.focus();
      }
    }, 50);
  }

  function closeTurnModal() {
    if (!turnPopup) {
      return;
    }
    turnPopup.classList.add("turn-popup--hidden");
    turnPopup.setAttribute("aria-hidden", "true");
  }

  function markCell() {
    if (boardGrid) {
      boardGrid.querySelectorAll(".board-cell--current").forEach(function (c) {
        c.classList.remove("board-cell--current");
      });
    }
    const pos = state.players[state.current].pos;
    if (pos < 1) return;
    const cell = boardGrid && boardGrid.querySelector('.board-cell[data-n="' + pos + '"]');
    if (cell) cell.classList.add("board-cell--current");
  }

  function drawBoardConnections() {
    if (boardConn) {
      boardConn.textContent = "";
    }
  }

  let _drawRaf;
  function scheduleDrawConnections() {
    if (_drawRaf) cancelAnimationFrame(_drawRaf);
    _drawRaf = requestAnimationFrame(function () {
      _drawRaf = 0;
      drawBoardConnections();
    });
  }

  function updateStartLineVisibility() {
    if (!startStrip || !startHint) return;
    const any = state.players.some(function (p) {
      return p.pos < 1;
    });
    startStrip.classList.toggle("start-strip--off", !any);
    startHint.classList.toggle("start-strip--off", !any);
  }

  function renderBoard() {
    if (!boardGrid || !tokenLayer) return;
    boardGrid.textContent = "";
    tokenLayer.textContent = "";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const n = cellNumber(r, c);
        const cell = document.createElement("div");
        const tone = (r + c) % 5;
        cell.className = "board-cell board-cell--t" + tone;
        cell.dataset.n = String(n);
        if (n === 1) {
          cell.classList.add("board-cell--start");
        }
        if (n === FINISH) {
          cell.classList.add("board-cell--finish");
        }
        if (LADDERS.has(n) && n > 1 && n !== FINISH) {
          cell.classList.add("board-cell--ladder");
        }
        if (SNAKES.has(n) && n !== FINISH) {
          cell.classList.add("board-cell--snake");
        }
        const num = document.createElement("span");
        num.className = "board-cell__n";
        num.textContent = n;
        cell.appendChild(num);
        if (LADDERS.has(n) || SNAKES.has(n)) {
          cell.classList.add("board-cell--has-jump");
          const row = document.createElement("div");
          row.className = "board-cell__row";
          if (LADDERS.has(n)) {
            const dest = LADDERS.get(n);
            const m = document.createElement("span");
            m.className = "board-cell__mark";
            m.textContent = "🪜";
            m.title = "Ladder up to " + dest;
            const to = document.createElement("span");
            to.className = "board-cell__to";
            to.textContent = "→" + dest;
            to.setAttribute("title", "Climb to square " + dest);
            to.setAttribute("aria-label", "Ladder to square " + dest);
            row.appendChild(m);
            row.appendChild(to);
          } else {
            const dest = SNAKES.get(n);
            const m = document.createElement("span");
            m.className = "board-cell__mark";
            m.textContent = "🐍";
            m.title = "Snake down to " + dest;
            const to = document.createElement("span");
            to.className = "board-cell__to";
            to.textContent = "↓" + dest;
            to.setAttribute("title", "Slide to square " + dest);
            to.setAttribute("aria-label", "Snake to square " + dest);
            row.appendChild(m);
            row.appendChild(to);
          }
          cell.appendChild(row);
        }
        cell.style.gridRow = String(r + 1);
        cell.style.gridColumn = String(c + 1);
        boardGrid.appendChild(cell);
        const slot = document.createElement("div");
        slot.className = "token-slot";
        slot.dataset.n = String(n);
        slot.style.gridRow = String(r + 1);
        slot.style.gridColumn = String(c + 1);
        tokenLayer.appendChild(slot);
      }
    }
    scheduleDrawConnections();
  }

  function renderTokens() {
    if (!tokenLayer || !startStrip) return;
    tokenLayer.querySelectorAll(".token").forEach(function (e) {
      e.remove();
    });
    startStrip.textContent = "";
    state.players.forEach(function (p, i) {
      if (p.pos < 1) {
        const wrap = document.createElement("div");
        wrap.className = "start-token";
        const em = document.createElement("span");
        em.className = "start-token__emoji";
        em.title = p.name;
        setPlayerIconOn(em, p.icon, PLAYER_RING[i % PLAYER_RING.length]);
        const lab = document.createElement("span");
        lab.className = "start-token__name";
        lab.textContent = p.name;
        wrap.appendChild(em);
        wrap.appendChild(lab);
        startStrip.appendChild(wrap);
        return;
      }
      const cell = tokenLayer.querySelector('.token-slot[data-n="' + p.pos + '"]');
      if (!cell) return;
      const t = document.createElement("span");
      t.className = "token";
      if (isImageIcon(p.icon)) t.classList.add("token--photo");
      t.title = p.name;
      setPlayerIconOn(t, p.icon, PLAYER_RING[i % PLAYER_RING.length]);
      cell.appendChild(t);
    });
    updateStartLineVisibility();
  }

  function updateHud() {
    const cur = state.players[state.current];
    turnLabel.textContent = state.won ? "Hooray!" : cur.name + "’s turn";
    playerList.textContent = "";
    state.players.forEach((p, i) => {
      const li = document.createElement("li");
      const sw = document.createElement("span");
      sw.className = "swatch";
      setPlayerIconOn(sw, p.icon, PLAYER_RING[i % PLAYER_RING.length]);
      sw.setAttribute("aria-hidden", "true");
      li.appendChild(sw);
      const label = document.createElement("span");
      if (i === state.current && !state.won) label.className = "on-turn";
      let posText;
      if (p.pos < 1) posText = "At the start line";
      else if (p.pos === FINISH) posText = FINISH + " — you did it!";
      else posText = "Square " + p.pos;
      label.textContent = p.name + " — " + posText;
      li.appendChild(label);
      playerList.appendChild(li);
    });
    btnRoll.disabled = state.rolling || state.won;
    if (btnRoll) {
      if (state.won) {
        btnRoll.textContent = "Open your turn";
      } else if (state.rolling) {
        btnRoll.textContent = "Wait…";
      } else if (turnPopup && !turnPopup.classList.contains("turn-popup--hidden") && turnModalPhase === "roll") {
        btnRoll.textContent = "Roll the dice";
      } else {
        btnRoll.textContent = "Open your turn";
      }
    }
    if (turnReadyHint) {
      if (state.won) {
        turnReadyHint.hidden = true;
        turnReadyHint.textContent = "";
      } else if (state.rolling) {
        turnReadyHint.hidden = true;
      } else if (
        turnPopup &&
        turnPopup.classList.contains("turn-popup--hidden") &&
        turnModalPhase === "closed"
      ) {
        turnReadyHint.hidden = false;
        turnReadyHint.textContent =
          cur.name +
          " — take a look at the board, then tap the button when you’re ready to roll in the pop-up.";
      } else {
        turnReadyHint.hidden = true;
      }
    }
    markCell();
  }

  function setDiceFaceOn(el, n) {
    if (!el) {
      return;
    }
    el.dataset.face = String(n);
    el.setAttribute("aria-label", "Die shows " + n);
  }

  function setDiceFace(n) {
    setDiceFaceOn(dice, n);
    setDiceFaceOn(turnPopupDice, n);
  }

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function makeSnakeQuizQuestion() {
    const a = randomInt(2, 10);
    const b = randomInt(2, 10);
    let qText;
    let correct;
    if (Math.random() < 0.55) {
      correct = a + b;
      qText = a + " + " + b + " = ?";
    } else {
      const m = a + b;
      const s = randomInt(1, Math.max(1, m - 1));
      correct = m - s;
      qText = m + " − " + s + " = ?";
    }
    const opts = new Set();
    opts.add(correct);
    let guard = 0;
    while (opts.size < 4 && guard++ < 40) {
      const delta = randomInt(1, 6);
      const w = correct + (Math.random() < 0.5 ? delta : -delta);
      if (w >= 0 && w <= 24) {
        opts.add(w);
      }
    }
    let pad = 1;
    while (opts.size < 4) {
      opts.add(correct + pad);
      pad += 1;
    }
    return { qText: qText, correct: correct, options: shuffle(Array.from(opts)) };
  }

  function showSnakeQuiz(onResult) {
    if (!snakeQuiz || !snakeQuizText || !snakeQuizOptions) {
      onResult(false);
      return;
    }
    const q = makeSnakeQuizQuestion();
    snakeQuizText.textContent = q.qText;
    snakeQuizOptions.textContent = "";
    let answered = false;
    function finish(passed) {
      if (answered) return;
      answered = true;
      document.removeEventListener("keydown", onEsc);
      if (snakeQuizBackdrop) {
        snakeQuizBackdrop.removeEventListener("click", onFail);
      }
      snakeQuiz.classList.add("snake-quiz--hidden");
      snakeQuiz.setAttribute("aria-hidden", "true");
      onResult(!!passed);
    }
    function onFail() {
      finish(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") onFail();
    }
    q.options.forEach(function (val) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "snake-quiz__btn";
      btn.textContent = String(val);
      btn.addEventListener("click", function () {
        finish(val === q.correct);
      });
      snakeQuizOptions.appendChild(btn);
    });
    document.addEventListener("keydown", onEsc);
    if (snakeQuizBackdrop) {
      snakeQuizBackdrop.addEventListener("click", onFail);
    }
    snakeQuiz.classList.remove("snake-quiz--hidden");
    snakeQuiz.setAttribute("aria-hidden", "false");
    if (snakeQuizOptions.firstChild) {
      snakeQuizOptions.firstChild.focus();
    }
  }

  function showScreen(which) {
    [screenSetup, screenGame, screenWin].forEach((el) => {
      if (!el) return;
      el.hidden = el !== which;
      if (el !== which) el.classList.add("screen--hidden");
      else el.classList.remove("screen--hidden");
    });
  }

  function buildNameFields() {
    const n = parseInt(
      document.querySelector('input[name="numPlayers"]:checked').value,
      10
    );
    nameFields.textContent = "";
    for (let i = 0; i < n; i++) {
      const block = document.createElement("div");
      block.className = "player-setup";
      const lbl = document.createElement("span");
      lbl.className = "player-setup__label";
      lbl.id = "lblPlayer" + i;
      lbl.textContent = "Player " + (i + 1);
      block.appendChild(lbl);
      const input = document.createElement("input");
      input.id = "name" + i;
      input.className = "player-setup__name";
      input.type = "text";
      input.placeholder = "Name (or leave blank)";
      input.maxLength = 24;
      input.autocomplete = "off";
      input.setAttribute("aria-labelledby", "lblPlayer" + i);
      block.appendChild(input);
      const pick = document.createElement("div");
      pick.className = "icon-pick";
      pick.setAttribute("role", "radiogroup");
      pick.setAttribute("aria-label", "Character for player " + (i + 1));
      const defaultV = CHARACTER_OPTIONS[i % CHARACTER_OPTIONS.length].v;
      CHARACTER_OPTIONS.forEach(function (opt) {
        const lab = document.createElement("label");
        lab.className = "icon-pick__opt";
        if (isImageIcon(opt.v)) lab.classList.add("icon-pick__opt--photo");
        const r = document.createElement("input");
        r.type = "radio";
        r.name = "icon-" + i;
        r.value = opt.v;
        if (opt.v === defaultV) r.checked = true;
        r.setAttribute("aria-label", opt.label);
        const span = document.createElement("span");
        if (isImageIcon(opt.v)) {
          const im = document.createElement("img");
          im.src = imageIconSrc(opt.v);
          im.alt = opt.label;
          im.className = "icon-pick__photo";
          span.appendChild(im);
        } else {
          span.textContent = opt.v;
        }
        lab.appendChild(r);
        lab.appendChild(span);
        pick.appendChild(lab);
      });
      block.appendChild(pick);
      nameFields.appendChild(block);
    }
  }

  function startGame() {
    const n = parseInt(
      document.querySelector('input[name="numPlayers"]:checked').value,
      10
    );
    const players = [];
    for (let i = 0; i < n; i++) {
      const inp = document.getElementById("name" + i);
      const raw = (inp && inp.value.trim()) || "Player " + (i + 1);
      const iconRadio = document.querySelector("input[name=\"icon-" + i + "\"]:checked");
      const icon = (iconRadio && iconRadio.value) || CHARACTER_OPTIONS[i % CHARACTER_OPTIONS.length].v;
      players.push({ name: raw, pos: 0, icon: icon });
    }
    state = {
      numPlayers: n,
      players: players,
      current: 0,
      rolling: false,
      won: false,
    };
    turnModalPhase = "closed";
    pendingRoll = 0;
    closeTurnModal();
    if (turnPopupDice) {
      turnPopupDice.classList.remove("dice--rolling", "dice--spin");
    }
    messageEl.textContent = "";
    diceHint.textContent = "Roll the die!";
    setDiceFace(1);
    renderBoard();
    renderTokens();
    const first = players[0] && players[0].name;
    if (messageEl && first) {
      messageEl.textContent =
        "Game on! " + first + " is first. Have a look at the board, then tap “Open your turn” when you’re ready.";
    }
    updateHud();
    showScreen(screenGame);
    requestAnimationFrame(function () {
      requestAnimationFrame(scheduleDrawConnections);
    });
  }

  function doRoll() {
    if (state.rolling || state.won) {
      return;
    }
    if (turnModalPhase !== "roll") {
      return;
    }
    state.rolling = true;
    btnRoll.disabled = true;
    if (btnTurnRoll) {
      btnTurnRoll.disabled = true;
    }
    const dieEl = turnPopupDice || dice;
    dieEl.classList.add("dice--rolling");
    const final = randomInt(1, 6);
    let t = 0;
    const tick = 45;
    const id = setInterval(function () {
      t += tick;
      setDiceFace(randomInt(1, 6));
      if (t >= 420) {
        clearInterval(id);
        dieEl.classList.remove("dice--rolling");
        dieEl.classList.add("dice--spin");
        setDiceFace(final);
        if (turnDiceHint) {
          turnDiceHint.textContent = "You rolled a " + final + "!";
        }
        diceHint.textContent = "Rolled a " + final + "!";
        setTimeout(function () {
          dieEl.classList.remove("dice--spin");
          pendingRoll = final;
          turnModalPhase = "move";
          if (btnTurnRoll) {
            btnTurnRoll.hidden = true;
          }
          if (btnTurnMove) {
            btnTurnMove.hidden = false;
            btnTurnMove.textContent = "Move " + final + (final === 1 ? " space" : " spaces");
            btnTurnMove.disabled = false;
            btnTurnMove.focus();
          }
        }, 200);
      }
    }, tick);
  }

  function tryRoll() {
    if (state.rolling || state.won) {
      return;
    }
    if (turnPopup && turnPopup.classList.contains("turn-popup--hidden")) {
      openTurnModal();
      return;
    }
    if (turnModalPhase !== "roll") {
      return;
    }
    doRoll();
  }

  /**
   * Run after the token has walked to the die result square (afterBounce).
   * @param {number} roll
   * @param {number} before - position before this turn’s move
   * @param {number} afterBounce - square from the die (before snake/ladder chains)
   */
  function afterTokenLanded(roll, before, afterBounce) {
    const p = state.players[state.current];

    function resolveAndContinue(finalPos, snakeSaved) {
      p.pos = finalPos;

      if (p.pos === FINISH) {
        state.won = true;
        messageEl.textContent = p.name + " wins! Landed on " + FINISH + "!";
        winName.textContent = "";
        if (isImageIcon(p.icon)) {
          const ic = document.createElement("span");
          ic.className = "win-name__icon";
          setPlayerIconOn(ic, p.icon, null);
          winName.appendChild(ic);
          winName.appendChild(document.createTextNode(" " + p.name));
        } else {
          winName.textContent = p.icon + " " + p.name;
        }
        state.rolling = false;
        turnModalPhase = "closed";
        closeTurnModal();
        showScreen(screenWin);
        updateHud();
        return;
      }

      let msg;
      if (snakeSaved) {
        msg =
          p.name +
          " got the sum right and held on to square " +
          afterBounce +
          " — the snake can’t get you!";
      } else if (finalPos !== afterBounce) {
        if (finalPos > afterBounce) {
          msg = p.name + " climbed a ladder to " + finalPos + " — zoom!";
        } else {
          msg = p.name + " slipped on a snake to " + finalPos + " — oops!";
        }
      } else if (before === 0) {
        msg = p.name + " hops onto square " + finalPos + " — let’s go!";
      } else if (before < FINISH && before + roll > FINISH) {
        msg =
          p.name +
          " almost passed " +
          FINISH +
          ", bounced, and stopped on " +
          finalPos +
          ".";
      } else {
        msg = p.name + " moves to " + finalPos + ".";
      }

      const moverIndex = state.current;

      function finishTurn() {
        state.current = (state.current + 1) % state.numPlayers;
        const whoNext = state.players[state.current].name;
        const nextIcon = iconForMessage(state.players[state.current].icon);
        messageEl.textContent =
          msg +
          " " +
          nextIcon +
          " " +
          whoNext +
          " is next — check where everyone is on the board, then tap “Open your turn” when you’re ready to roll.";
        renderTokens();
        state.rolling = false;
        updateHud();
      }

      const moved = finalPos !== afterBounce;
      const isLadder = moved && finalPos > afterBounce;
      const isSnakeSlide = moved && finalPos < afterBounce;

      if (moved && isLadder) {
        renderTokens();
        updateHud();
        showJumpPopup(
          {
            type: "ladder",
            p: p,
            from: afterBounce,
            to: finalPos,
            playerIndex: moverIndex,
          },
          finishTurn
        );
      } else if (moved && isSnakeSlide) {
        renderTokens();
        updateHud();
        showJumpPopup(
          {
            type: "snake",
            p: p,
            from: afterBounce,
            to: finalPos,
            playerIndex: moverIndex,
          },
          finishTurn
        );
      } else {
        finishTurn();
      }
    }

    if (SNAKES.has(afterBounce)) {
      showSnakeQuiz(function (passed) {
        if (passed) {
          resolveAndContinue(afterBounce, true);
        } else {
          resolveAndContinue(applyJumps(afterBounce), false);
        }
      });
    } else {
      resolveAndContinue(applyJumps(afterBounce), false);
    }
  }

  function onConfirmMove() {
    if (turnModalPhase !== "move" || !pendingRoll || state.won) {
      return;
    }
    const roll = pendingRoll;
    const p = state.players[state.current];
    const before = p.pos;
    const afterBounce = applyBounce(before, roll);
    const path = computeStepPath(before, roll);
    pendingRoll = 0;
    turnModalPhase = "closed";
    closeTurnModal();

    if (path.length === 0) {
      p.pos = afterBounce;
      renderTokens();
      markCell();
      updateStartLineVisibility();
      afterTokenLanded(roll, before, afterBounce);
      return;
    }

    let stepIndex = 0;
    function walkStep() {
      p.pos = path[stepIndex];
      const sq = path[stepIndex];
      setBoardZoomToSquare(sq);
      const cell = boardGrid && boardGrid.querySelector('.board-cell[data-n="' + sq + '"]');
      if (cell) {
        cell.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      renderTokens();
      markCell();
      updateStartLineVisibility();
      stepIndex += 1;
      if (stepIndex >= path.length) {
        setTimeout(function () {
          clearBoardZoom();
          p.pos = afterBounce;
          renderTokens();
          markCell();
          updateStartLineVisibility();
          afterTokenLanded(roll, before, afterBounce);
        }, 420);
      } else {
        setTimeout(walkStep, 420);
      }
    }
    setTimeout(walkStep, 160);
  }

  document.getElementById("btnStart").addEventListener("click", startGame);
  document.getElementById("btnPlayAgain").addEventListener("click", function () {
    showScreen(screenSetup);
  });
  btnRoll.addEventListener("click", tryRoll);
  if (btnTurnRoll) {
    btnTurnRoll.addEventListener("click", doRoll);
  }
  if (btnTurnMove) {
    btnTurnMove.addEventListener("click", onConfirmMove);
  }

  document.querySelectorAll('input[name="numPlayers"]').forEach(function (r) {
    r.addEventListener("change", buildNameFields);
  });

  buildNameFields();
  setDiceFace(1);

  let _resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(scheduleDrawConnections, 120);
  });
  if (typeof ResizeObserver !== "undefined" && boardEl) {
    const ro = new ResizeObserver(function () {
      scheduleDrawConnections();
    });
    ro.observe(boardEl);
  }
})();
