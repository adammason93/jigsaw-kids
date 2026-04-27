/**
 * Snakes & Ladders — 5×10 serpentine board, 1–50, exact finish, bust if roll too high, emoji tokens
 */
(function () {
  "use strict";

  const BOARD_PRESETS = {
    full: {
      finish: 50,
      cols: 10,
      rows: 5,
      ladders: [
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
      ],
      snakes: [
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
      ],
    },
    quick: {
      finish: 25,
      cols: 5,
      rows: 5,
      ladders: [
        [1, 8],
        [2, 12],
        [3, 15],
        [4, 20],
        [5, 10],
        [6, 18],
        [9, 22],
        [11, 24],
      ],
      snakes: [
        [24, 4],
        [22, 2],
        [20, 1],
        [18, 5],
        [16, 3],
        [14, 6],
        [19, 1],
        [13, 2],
        [10, 1],
        [7, 1],
      ],
    },
  };

  var board;
  var JUMPS = new Map();

  function setBoardPreset(name) {
    const p = BOARD_PRESETS[name] || BOARD_PRESETS.full;
    board = {
      finish: p.finish,
      cols: p.cols,
      rows: p.rows,
      ladders: new Map(p.ladders),
      snakes: new Map(p.snakes),
    };
    JUMPS = new Map();
    board.ladders.forEach(function (to, from) {
      JUMPS.set(from, to);
    });
    board.snakes.forEach(function (to, from) {
      JUMPS.set(from, to);
    });
  }

  setBoardPreset("full");

  const PLAYER_RING = ["#e11d48", "#2563eb", "#16a34a", "#ca8a04", "#db2777"];

  /** Image tokens use value prefix + path under games/ (HTML is in games/) */
  const IMG_PREFIX = "__img:";
  const CHARACTER_OPTIONS = [
    {
      v: IMG_PREFIX + "images/character-babyca.png",
      label: "Baby",
    },
    { v: "🐶", label: "Dog" },
    {
      v: IMG_PREFIX + "images/character-baby-coolegg.png",
      label: "Isaac",
    },
    {
      v: IMG_PREFIX + "images/character-girl-blonde.png",
      label: "Sofia",
    },
    {
      v: IMG_PREFIX + "images/character-kelly.png",
      label: "Kelly (Mummy)",
    },
  ];

  function characterLabelForValue(v) {
    const opt = CHARACTER_OPTIONS.find(function (o) {
      return o.v === v;
    });
    return opt ? opt.label : "";
  }

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
  const winSub = document.getElementById("winSub");
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
  const welcomePopup = document.getElementById("welcomePopup");
  const btnWelcomeOk = document.getElementById("btnWelcomeOk");
  const welcomeBackdrop = welcomePopup
    ? welcomePopup.querySelector(".welcome-popup__backdrop")
    : null;
  const treasurePopup = document.getElementById("treasurePopup");
  const treasurePopupLead = document.getElementById("treasurePopupLead");
  const treasurePopupPrize = document.getElementById("treasurePopupPrize");
  const btnTreasureOk = document.getElementById("btnTreasureOk");
  const treasurePopupBackdrop = treasurePopup
    ? treasurePopup.querySelector(".treasure-popup__backdrop")
    : null;
  const WELCOME_SESSION_KEY = "jigsawKidsSnakesWelcome";

  const TREASURE_PRIZES = [
    "5 minutes extra to stay up at bedtime",
    "A sweet from Mama’s cupboard",
    "A strawberry from Dada",
  ];

  function pickBonusSquares() {
    const candidates = [];
    for (let s = 2; s < board.finish; s++) {
      if (JUMPS.has(s)) {
        continue;
      }
      candidates.push(s);
    }
    const want = board.finish > 30 ? 5 : 3;
    const shuffled = shuffle(candidates);
    const out = new Set();
    for (let i = 0; i < Math.min(want, shuffled.length); i++) {
      out.add(shuffled[i]);
    }
    return out;
  }

  let jumpTimeoutId = 0;
  /** True while the board path-walk (zoom + steps) is playing */
  let walkAnimActive = false;
  let walkAnimPlayerIndex = 0;

  function dismissWelcomePopup() {
    if (!welcomePopup) {
      return;
    }
    welcomePopup.classList.add("welcome-popup--hidden");
    welcomePopup.setAttribute("aria-hidden", "true");
    try {
      sessionStorage.setItem(WELCOME_SESSION_KEY, "1");
    } catch (e) {
      /* private mode */
    }
    const back = document.querySelector(".back-link");
    if (back) {
      back.focus();
    }
  }

  function showWelcomePopupIfFirstVisit() {
    if (!welcomePopup) {
      return;
    }
    try {
      if (sessionStorage.getItem(WELCOME_SESSION_KEY)) {
        return;
      }
    } catch (e) {
      /* show once */
    }
    welcomePopup.classList.remove("welcome-popup--hidden");
    welcomePopup.setAttribute("aria-hidden", "false");
    if (btnWelcomeOk) {
      setTimeout(function () {
        btnWelcomeOk.focus();
      }, 100);
    }
  }

  function onWelcomeKey(e) {
    if (!welcomePopup || welcomePopup.classList.contains("welcome-popup--hidden")) {
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      dismissWelcomePopup();
    }
  }
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
    jumpPopupAvatar.className = "jump-popup__avatar";
    if (isImageIcon(p.icon)) {
      jumpPopupAvatar.classList.add("jump-popup__avatar--full");
    } else {
      jumpPopupAvatar.classList.add("jump-popup__avatar--emoji");
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
    /* Match CSS animation length + short beat so motion finishes before close */
    jumpTimeoutId = setTimeout(done, 2500);
  }

  function showTreasurePopup(opts, onDone) {
    if (!treasurePopup) {
      onDone();
      return;
    }
    const prize = opts.prize;
    const playerName = opts.playerName || "You";

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
    setTimeout(function () {
      if (btnTreasureOk) {
        btnTreasureOk.focus();
      }
    }, 50);
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
    const bottomRow = board.rows - 1 - visualRow;
    if (bottomRow % 2 === 0) {
      return 1 + bottomRow * board.cols + col;
    }
    return 1 + bottomRow * board.cols + (board.cols - 1 - col);
  }

  function applyBounce(pos, roll) {
    if (pos === 0) return Math.min(roll, board.finish);
    let n = pos + roll;
    if (n > board.finish) n = board.finish - (n - board.finish);
    return n;
  }

  /**
   * Die value (1–6) that would land exactly on board.finish, or null if not reachable in one roll.
   */
  function dieNeededToFinish(pos) {
    if (pos < 1 || pos >= board.finish) {
      return null;
    }
    const d = board.finish - pos;
    if (d >= 1 && d <= 6) {
      return d;
    }
    return null;
  }

  function openTurnModalFinishCopy(turnPopupSub, turnDiceHint, pos) {
    const need = dieNeededToFinish(pos);
    if (turnPopupSub) {
      if (need !== null) {
        let detail =
          "To win, land exactly on square " +
          board.finish +
          ". You’re on " +
          pos +
          ", so you need to roll a " +
          need +
          ".";
        if (need < 6) {
          detail +=
            " If you roll a " +
            (need + 1) +
            " or more, that’s a bust — you don’t move this turn.";
        } else {
          detail +=
            " Only a 6 gets you to " +
            board.finish +
            " from here in one roll. Anything less, you move forward but don’t win yet.";
        }
        turnPopupSub.textContent = detail;
      } else if (pos >= 1 && pos < board.finish) {
        const dist = board.finish - pos;
        if (dist > 6) {
          turnPopupSub.textContent =
            "Roll the die, then move. You’re " +
            dist +
            " squares from " +
            board.finish +
            " — get within 6 of " +
            board.finish +
            " to have a one-roll shot at winning. You must land exactly on " +
            board.finish +
            " to win.";
        } else {
          turnPopupSub.textContent =
            "Roll the 3D die, then use the button to move along the path.";
        }
      } else {
        turnPopupSub.textContent =
          "Roll the 3D die, then use the button to move along the path.";
      }
    }
    if (turnDiceHint) {
      if (need !== null) {
        turnDiceHint.textContent =
          "Aim for a " + need + " to land on " + board.finish + "!";
      } else {
        turnDiceHint.textContent = "Ready to roll!";
      }
    }
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
   * One square per pip: from 0, walk 1..min(roll, board.finish); on board, walk with bounce past finish
   * (bust turns are handled before this — no path).
   * @returns {number[]}
   */
  function computeStepPath(from, roll) {
    if (roll <= 0) {
      return [];
    }
    if (from === 0) {
      const end = Math.min(roll, board.finish);
      return Array.from({ length: end }, function (_, i) {
        return i + 1;
      });
    }
    const out = [];
    let pos = from;
    for (let s = 0; s < roll; s++) {
      pos = pos + 1;
      if (pos > board.finish) {
        pos = board.finish - (pos - board.finish);
      }
      out.push(pos);
    }
    return out;
  }

  function setBoardZoomToSquare(n) {
    if (!boardWrap || n < 1 || n > board.finish) {
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
    boardWrap.classList.remove("board-wrap--zoomed", "board-wrap--walk-active");
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
    openTurnModalFinishCopy(turnPopupSub, turnDiceHint, cur.pos);
    if (turnPlayerAvatar) {
      setPlayerIconOn(turnPlayerAvatar, cur.icon, PLAYER_RING[idx % PLAYER_RING.length]);
    }
    setDiceFace(1);
    if (dice) {
      dice.classList.remove("dice--rolling", "dice--spin");
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
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const n = cellNumber(r, c);
        const cell = document.createElement("div");
        const tone = (r + c) % 5;
        cell.className = "board-cell board-cell--t" + tone;
        cell.dataset.n = String(n);
        if (n === 1) {
          cell.classList.add("board-cell--start");
        }
        if (n === board.finish) {
          cell.classList.add("board-cell--finish");
        }
        if (board.ladders.has(n) && n > 1 && n !== board.finish) {
          cell.classList.add("board-cell--ladder");
        }
        if (board.snakes.has(n) && n !== board.finish) {
          cell.classList.add("board-cell--snake");
        }
        const num = document.createElement("span");
        num.className = "board-cell__n";
        num.textContent = n;
        cell.appendChild(num);
        if (board.ladders.has(n) || board.snakes.has(n)) {
          cell.classList.add("board-cell--has-jump");
          const row = document.createElement("div");
          row.className = "board-cell__row";
          if (board.ladders.has(n)) {
            const dest = board.ladders.get(n);
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
            const dest = board.snakes.get(n);
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
        if (state.bonusSquares && state.bonusSquares.has(n)) {
          cell.classList.add("board-cell--bonus");
          const bm = document.createElement("span");
          bm.className = "board-cell__bonus-mark";
          bm.setAttribute("aria-hidden", "true");
          bm.textContent = "🎁";
          cell.appendChild(bm);
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
    boardGrid.style.gridTemplateColumns = "repeat(" + board.cols + ", 1fr)";
    boardGrid.style.gridTemplateRows = "repeat(" + board.rows + ", 1fr)";
    tokenLayer.style.gridTemplateColumns = "repeat(" + board.cols + ", 1fr)";
    tokenLayer.style.gridTemplateRows = "repeat(" + board.rows + ", 1fr)";
    const boardFace = document.getElementById("boardFace");
    if (boardFace) {
      boardFace.style.setProperty("--board-aspect", String(board.cols / board.rows));
    }
    scheduleDrawConnections();
  }

  function renderTokens() {
    if (!tokenLayer || !startStrip) return;
    tokenLayer.querySelectorAll(".token").forEach(function (e) {
      e.remove();
    });
    tokenLayer.querySelectorAll(".token-slot--walker").forEach(function (s) {
      s.classList.remove("token-slot--walker");
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
      const showWalk =
        walkAnimActive && i === walkAnimPlayerIndex && p.pos >= 1;
      if (showWalk) {
        t.classList.add("token--walking");
        if (isImageIcon(p.icon)) {
          t.classList.add("token--walking--pic");
        } else {
          t.classList.add("token--walking--emoji");
        }
        cell.classList.add("token-slot--walker");
      }
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
      else if (p.pos === board.finish) posText = board.finish + " — you did it!";
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
        let ready =
          cur.name +
          " — take a look at the board, then tap the button when you’re ready to roll in the pop-up.";
        const needB = dieNeededToFinish(cur.pos);
        if (needB !== null) {
          if (needB < 6) {
            ready +=
              " To win, land on " +
              board.finish +
              " exactly — you need a " +
              needB +
              ". Roll a " +
              (needB + 1) +
              " or more and it’s a bust (no move).";
          } else {
            ready +=
              " To win, land on " +
              board.finish +
              " exactly — only a 6 from this square gets you there in one roll.";
          }
        }
        turnReadyHint.textContent = ready;
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
    if (document.body) {
      document.body.classList.toggle("sn-setup-visible", which === screenSetup);
      document.body.classList.toggle("sn-game-visible", which === screenGame);
    }
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(which === screenGame);
    }
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
      input.placeholder = "Optional";
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
      input.value = characterLabelForValue(defaultV);
      pick.addEventListener("change", function () {
        const sel = document.querySelector(
          'input[name="icon-' + i + '"]:checked'
        );
        if (sel) input.value = characterLabelForValue(sel.value);
      });
      block.appendChild(pick);
      nameFields.appendChild(block);
    }
  }

  function startGame() {
    const sz = document.querySelector('input[name="boardSize"]:checked');
    setBoardPreset(sz && sz.value === "quick" ? "quick" : "full");
    const n = parseInt(
      document.querySelector('input[name="numPlayers"]:checked').value,
      10
    );
    const players = [];
    for (let i = 0; i < n; i++) {
      const inp = document.getElementById("name" + i);
      const iconRadio = document.querySelector("input[name=\"icon-" + i + "\"]:checked");
      const icon = (iconRadio && iconRadio.value) || CHARACTER_OPTIONS[i % CHARACTER_OPTIONS.length].v;
      const fromChar = characterLabelForValue(icon);
      const raw =
        (inp && inp.value.trim()) ||
        fromChar ||
        "Player " + (i + 1);
      players.push({ name: raw, pos: 0, icon: icon });
    }
    state = {
      numPlayers: n,
      players: players,
      current: 0,
      rolling: false,
      won: false,
      bonusSquares: pickBonusSquares(),
    };
    turnModalPhase = "closed";
    pendingRoll = 0;
    closeTurnModal();
    if (dice) {
      dice.classList.remove("dice--rolling", "dice--spin");
    }
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
    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("roll");
      KidsCore.haptic("light");
    }
    btnRoll.disabled = true;
    if (btnTurnRoll) {
      btnTurnRoll.disabled = true;
    }
    const dieEl = turnPopupDice || dice;
    const final = randomInt(1, 6);
    const rollDurationMs = 500;
    dieEl.classList.add("dice--rolling");
    setTimeout(function () {
      const pRoll = state.players[state.current];
      const needR = dieNeededToFinish(pRoll.pos);
      dieEl.classList.remove("dice--rolling");
      setDiceFace(final);
      dieEl.classList.add("dice--spin");
      if (turnDiceHint) {
        let line = "You rolled a " + final + "!";
        if (needR !== null) {
          if (final > needR) {
            line =
              "You rolled a " +
              final +
              " — bust! You need a " +
              needR +
              " to land on " +
              board.finish +
              " from square " +
              pRoll.pos +
              ". You won’t move. Tap the button to end your turn.";
          } else if (final === needR) {
            line =
              "You rolled a " +
              final +
              " — that’s the exact number to land on " +
              board.finish +
              "! Tap “Move” to finish the steps.";
          } else {
            line =
              "You rolled a " +
              final +
              ". You need a " +
              needR +
              " to win this turn, so you’ll get closer. Tap “Move” to go.";
          }
        }
        turnDiceHint.textContent = line;
      }
      diceHint.textContent =
        needR !== null && final > needR
          ? "Bust! You needed a " + needR + " to land on " + board.finish + "."
          : "Rolled a " + final + "!";
      setTimeout(function () {
        dieEl.classList.remove("dice--spin");
        pendingRoll = final;
        turnModalPhase = "move";
        if (btnTurnRoll) {
          btnTurnRoll.hidden = true;
        }
        if (btnTurnMove) {
          btnTurnMove.hidden = false;
          const busted = needR !== null && final > needR;
          btnTurnMove.textContent = busted
            ? "Bust — end turn (no move)"
            : "Move " + final + (final === 1 ? " space" : " spaces");
          btnTurnMove.disabled = false;
          btnTurnMove.focus();
        }
      }, 460);
    }, rollDurationMs);
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

      if (p.pos === board.finish) {
        state.won = true;
        messageEl.textContent = p.name + " wins! Landed on " + board.finish + "!";
        if (winSub) {
          winSub.textContent = "You did it — first to the top!";
        }
        if (typeof KidsCore !== "undefined") {
          KidsCore.recordGame("snakes");
          KidsCore.confetti(screenWin || document.body);
          KidsCore.playSound("win");
          KidsCore.haptic("success");
        }
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

      function maybeTreasureThen(done) {
        if (!state.bonusSquares || !state.bonusSquares.has(finalPos)) {
          done();
          return;
        }
        const prize = TREASURE_PRIZES[randomInt(0, TREASURE_PRIZES.length - 1)];
        showTreasurePopup(
          {
            prize: prize,
            playerName: p.name,
          },
          done
        );
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
          function () {
            maybeTreasureThen(finishTurn);
          }
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
          function () {
            maybeTreasureThen(finishTurn);
          }
        );
      } else {
        maybeTreasureThen(finishTurn);
      }
    }

    if (board.snakes.has(afterBounce)) {
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
    const needWin = dieNeededToFinish(before);
    if (needWin !== null && roll > needWin) {
      pendingRoll = 0;
      turnModalPhase = "closed";
      closeTurnModal();
      const idxNext = (state.current + 1) % state.numPlayers;
      const whoNext = state.players[idxNext].name;
      const nextIcon = iconForMessage(state.players[idxNext].icon);
      messageEl.textContent =
        p.name +
        " — bust! You needed a " +
        needWin +
        " to land on " +
        board.finish +
        ", not a " +
        roll +
        ". No move. " +
        nextIcon +
        " " +
        whoNext +
        " is next — tap “Open your turn” when you’re ready to roll.";
      state.current = idxNext;
      state.rolling = false;
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("no");
        KidsCore.haptic("light");
      }
      updateHud();
      return;
    }
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

    walkAnimActive = true;
    walkAnimPlayerIndex = state.current;
    if (boardWrap) {
      boardWrap.classList.add("board-wrap--walk-active");
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
          walkAnimActive = false;
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
  if (screenSetup && !screenSetup.classList.contains("screen--hidden")) {
    document.body.classList.add("sn-setup-visible");
  }
  if (screenGame && !screenGame.classList.contains("screen--hidden")) {
    document.body.classList.add("sn-game-visible");
  }

  if (btnWelcomeOk) {
    btnWelcomeOk.addEventListener("click", dismissWelcomePopup);
  }
  if (welcomeBackdrop) {
    welcomeBackdrop.addEventListener("click", dismissWelcomePopup);
  }
  document.addEventListener("keydown", onWelcomeKey);
  showWelcomePopupIfFirstVisit();

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

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
