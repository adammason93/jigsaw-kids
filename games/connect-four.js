/**
 * Connect 4 — two players or vs computer (yellow).
 * Board: row 0 = top, row 5 = bottom. R = red (first), Y = yellow.
 */
(function () {
  const ROWS = 6;
  const COLS = 7;

  const appEl = document.getElementById("app");
  const screenSetup = document.getElementById("screenSetup");
  const screenPlay = document.getElementById("screenPlay");
  const columnsEl = document.getElementById("columns");
  const statusLine = document.getElementById("statusLine");
  const modeLine = document.getElementById("modeLine");
  const playHint = document.getElementById("playHint");
  const btnStart = document.getElementById("btnStart");
  const btnAgain = document.getElementById("btnAgain");
  const btnMenu = document.getElementById("btnMenu");

  /** @type {('R'|'Y'|null)[][]} */
  var board = [];
  /** @type {'R'|'Y'} */
  var current = "R";
  var gameOver = false;
  var cpuThinking = false;
  /** @type {'friend'|'cpu'} */
  var mode = "friend";
  /** @type {Set<string> | null} */
  var winKeys = null;
  /** true while a disc is animating (blocks input) */
  var isDropping = false;

  /** @type {{ update: function(Function): void, render: function(): void }|null} */
  var scorecard = null;

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function emptyBoard() {
    return Array.from({ length: ROWS }, function () {
      return Array(COLS).fill(null);
    });
  }

  function showScreen(which) {
    const onPlay = which === "play";
    screenSetup.classList.toggle("is-hidden", onPlay);
    screenSetup.hidden = onPlay;
    screenPlay.classList.toggle("is-hidden", !onPlay);
    screenPlay.hidden = !onPlay;
    /* Fallback when :has() is missing — keeps flex fill + height chain working */
    if (appEl) {
      appEl.classList.toggle("c4-app--play", onPlay);
    }
    document.body.classList.toggle("c4-playing", onPlay);
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(onPlay);
    }
    if (!onPlay && scorecard) {
      scorecard.render();
    }
  }

  function selectedMode() {
    const r = document.querySelector('input[name="c4Mode"]:checked');
    return r && r.value === "cpu" ? "cpu" : "friend";
  }

  function cloneBoard(b) {
    return b.map(function (row) {
      return row.slice();
    });
  }

  /**
   * @param {('R'|'Y'|null)[][]} b
   * @param {number} col
   * @param {'R'|'Y'} player
   * @returns {{ r: number; c: number } | null}
   */
  function dropInPlace(b, col, player) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === null) {
        b[r][col] = player;
        return { r: r, c: col };
      }
    }
    return null;
  }

  function columnFull(b, col) {
    return b[0][col] !== null;
  }

  /**
   * Lowest empty row in this column, or -1 if full.
   * @param {('R'|'Y'|null)[][]} b
   * @param {number} col
   */
  function getLandingRow(b, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === null) {
        return r;
      }
    }
    return -1;
  }

  /**
   * @param {('R'|'Y'|null)[][]} b
   * @returns {{ player: 'R'|'Y'; cells: [number, number][] } | null}
   */
  function checkWinner(b) {
    let p;
    let r;
    let c;
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c <= COLS - 4; c++) {
        p = b[r][c];
        if (p && p === b[r][c + 1] && p === b[r][c + 2] && p === b[r][c + 3]) {
          return { player: p, cells: [
            [r, c], [r, c + 1], [r, c + 2], [r, c + 3],
          ] };
        }
      }
    }
    for (r = 0; r <= ROWS - 4; r++) {
      for (c = 0; c < COLS; c++) {
        p = b[r][c];
        if (p && p === b[r + 1][c] && p === b[r + 2][c] && p === b[r + 3][c]) {
          return { player: p, cells: [
            [r, c], [r + 1, c], [r + 2, c], [r + 3, c],
          ] };
        }
      }
    }
    for (r = 0; r <= ROWS - 4; r++) {
      for (c = 0; c <= COLS - 4; c++) {
        p = b[r][c];
        if (p && p === b[r + 1][c + 1] && p === b[r + 2][c + 2] && p === b[r + 3][c + 3]) {
          return { player: p, cells: [
            [r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3],
          ] };
        }
      }
    }
    for (r = 3; r < ROWS; r++) {
      for (c = 0; c <= COLS - 4; c++) {
        p = b[r][c];
        if (p && p === b[r - 1][c + 1] && p === b[r - 2][c + 2] && p === b[r - 3][c + 3]) {
          return { player: p, cells: [
            [r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3],
          ] };
        }
      }
    }
    return null;
  }

  function isDraw(b) {
    for (let c = 0; c < COLS; c++) {
      if (b[0][c] === null) {
        return false;
      }
    }
    return true;
  }

  function keyCell(r, c) {
    return r + "," + c;
  }

  function setWinHighlight(cells) {
    winKeys = new Set();
    for (let i = 0; i < cells.length; i++) {
      winKeys.add(keyCell(cells[i][0], cells[i][1]));
    }
  }

  function pickCpuColumn(b) {
    const order = [3, 2, 4, 1, 5, 0, 6];
    function tryPlayer(player) {
      for (let i = 0; i < COLS; i++) {
        if (columnFull(b, i)) {
          continue;
        }
        const t = cloneBoard(b);
        dropInPlace(t, i, player);
        const w = checkWinner(t);
        if (w && w.player === player) {
          return i;
        }
      }
      return -1;
    }
    let col = tryPlayer("Y");
    if (col >= 0) {
      return col;
    }
    col = tryPlayer("R");
    if (col >= 0) {
      return col;
    }
    for (let k = 0; k < order.length; k++) {
      if (!columnFull(b, order[k])) {
        return order[k];
      }
    }
    return 0;
  }

  function render() {
    columnsEl.replaceChildren();
    columnsEl.classList.toggle("c4-columns--over", gameOver);
    for (let col = 0; col < COLS; col++) {
      const colBtn = document.createElement("button");
      colBtn.type = "button";
      colBtn.className = "c4-col";
      colBtn.setAttribute("aria-label", "Column " + (col + 1) + (columnFull(board, col) ? " (full)" : ""));
      colBtn.dataset.col = String(col);
      const full = columnFull(board, col);
      const blocked =
        gameOver ||
        cpuThinking ||
        isDropping ||
        (mode === "cpu" && current === "Y") ||
        full;
      colBtn.disabled = blocked;
      if (blocked && !full) {
        colBtn.setAttribute("aria-disabled", "true");
      }
      for (let r = ROWS - 1; r >= 0; r--) {
        /* <span> keeps column controls valid (button may not contain <div> per HTML) */
        const cell = document.createElement("span");
        cell.className = "c4-cell";
        cell.dataset.row = String(r);
        cell.dataset.col = String(col);
        const v = board[r][col];
        if (v === "R") {
          cell.classList.add("c4-cell--R");
        } else if (v === "Y") {
          cell.classList.add("c4-cell--Y");
        }
        if (winKeys && winKeys.has(keyCell(r, col))) {
          cell.classList.add("c4-cell--win");
        }
        colBtn.appendChild(cell);
      }
      colBtn.addEventListener("click", function () {
        onColumnClick(col);
      });
      columnsEl.appendChild(colBtn);
    }
  }

  function setStatus(msg) {
    statusLine.textContent = msg;
  }

  function syncModeLine() {
    modeLine.textContent = mode === "cpu" ? "You vs computer" : "Two players";
  }

  function updateTurnMessage() {
    if (gameOver) {
      return;
    }
    if (mode === "cpu" && current === "Y") {
      setStatus("Computer’s turn (yellow)…");
      if (playHint) {
        playHint.setAttribute("aria-hidden", "true");
      }
      return;
    }
    if (playHint) {
      playHint.setAttribute("aria-hidden", "false");
    }
    if (mode === "cpu") {
      setStatus("Your turn — you are red");
    } else {
      setStatus(current === "R" ? "Red to play" : "Yellow to play");
    }
  }

  /**
   * @param {number} col
   * @param {number} r
   * @param {'R'|'Y'} player
   * @param {() => void} onDone
   */
  function runDropAnimation(col, r, player, onDone) {
    if (prefersReducedMotion()) {
      onDone();
      return;
    }
    const colEl = columnsEl.querySelector('.c4-col[data-col="' + col + '"]');
    const target = colEl && colEl.querySelector('.c4-cell[data-row="' + r + '"]');
    if (!colEl || !target) {
      onDone();
      return;
    }
    const disc = document.createElement("div");
    disc.className = "c4-fall-disc c4-fall-disc--" + player;
    disc.setAttribute("aria-hidden", "true");
    const size = target.getBoundingClientRect().width;
    disc.style.width = size + "px";
    disc.style.height = size + "px";
    const colRect = colEl.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const startTop = colRect.top - size * 0.4;
    const endTop = targetRect.top + (targetRect.height - size) / 2;
    const left = colRect.left + (colRect.width - size) / 2;
    const dy = endTop - startTop;
    const rollDeg = 720 + col * 18 + (r + 1) * 5;
    disc.style.left = left + "px";
    disc.style.top = startTop + "px";
    document.body.appendChild(disc);
    if (typeof disc.animate !== "function") {
      if (disc.parentNode) {
        disc.parentNode.removeChild(disc);
      }
      onDone();
      return;
    }
    const duration = 450 + r * 48;
    const yOvershoot = 14;
    const anim = disc.animate(
      [
        { transform: "translate3d(0,0,0) rotate(0deg)", offset: 0, easing: "cubic-bezier(0.2, 0.05, 0.4, 1)" },
        {
          transform:
            "translate3d(0," + (dy + yOvershoot) + "px,0) rotate(" + (rollDeg * 0.96) + "deg)",
          offset: 0.78,
          easing: "cubic-bezier(0.2, 1, 0.3, 1)",
        },
        { transform: "translate3d(0," + dy + "px,0) rotate(" + rollDeg + "deg)", offset: 1 },
      ],
      { duration: duration, fill: "forwards" }
    );
    var doneCalled = false;
    var safetyT = 0;
    function finish() {
      if (doneCalled) {
        return;
      }
      doneCalled = true;
      if (safetyT) {
        window.clearTimeout(safetyT);
      }
      try {
        if (anim && typeof anim.cancel === "function") {
          anim.cancel();
        }
      } catch (e2) {}
      try {
        if (disc.parentNode) {
          disc.parentNode.removeChild(disc);
        }
      } catch (e) {}
      onDone();
    }
    safetyT = window.setTimeout(finish, duration + 2500);
    if (typeof anim.finished === "object" && anim.finished.then) {
      anim.finished
        .then(finish)
        .catch(finish);
    } else {
      anim.onfinish = finish;
      window.setTimeout(finish, duration + 100);
    }
  }

  function recordC4Result(winnerInfo, draw) {
    if (!scorecard) {
      return;
    }
    scorecard.update(function (s) {
      if (mode === "friend") {
        if (draw) {
          s.friend.draw++;
        } else if (winnerInfo && winnerInfo.player === "R") {
          s.friend.r++;
        } else if (winnerInfo) {
          s.friend.y++;
        }
      } else {
        if (draw) {
          s.cpu.draw++;
        } else if (winnerInfo && winnerInfo.player === "R") {
          s.cpu.you++;
        } else if (winnerInfo) {
          s.cpu.cpu++;
        }
      }
    });
  }

  function endGame(winnerInfo, draw) {
    gameOver = true;
    recordC4Result(winnerInfo, draw);
    if (playHint) {
      playHint.setAttribute("aria-hidden", "true");
    }
    if (winnerInfo) {
      if (winnerInfo.cells) {
        setWinHighlight(winnerInfo.cells);
      }
      const who = winnerInfo.player === "R" ? "Red" : "Yellow";
      setStatus(who + " wins!");
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("win");
        KidsCore.haptic("success");
        if (mode === "friend" || (mode === "cpu" && winnerInfo.player === "R")) {
          KidsCore.confetti(document.getElementById("columns") || document.body);
        }
        KidsCore.recordGame("c4");
      }
    } else if (draw) {
      setStatus("Board full — it’s a draw!");
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("ok");
        KidsCore.haptic("light");
        KidsCore.recordGame("c4");
      }
    }
    render();
  }

  function applyMoveResult() {
    const w = checkWinner(board);
    if (w) {
      endGame({ player: w.player, cells: w.cells }, false);
      return;
    }
    if (isDraw(board)) {
      endGame(null, true);
      return;
    }
    current = current === "R" ? "Y" : "R";
    if (mode === "cpu" && current === "Y") {
      maybeCpuTurn();
      return;
    }
    updateTurnMessage();
    render();
  }

  function maybeCpuTurn() {
    updateTurnMessage();
    cpuThinking = true;
    render();
    const thinkingMs = 380;
    window.setTimeout(function () {
      if (gameOver) {
        cpuThinking = false;
        return;
      }
      const pick = pickCpuColumn(board);
      if (pick < 0 || columnFull(board, pick)) {
        cpuThinking = false;
        render();
        return;
      }
      const r = getLandingRow(board, pick);
      if (r < 0) {
        cpuThinking = false;
        render();
        return;
      }
      function afterCpuPlace() {
        board[r][pick] = "Y";
        isDropping = false;
        cpuThinking = false;
        if (typeof KidsCore !== "undefined") {
          KidsCore.playSound("tap");
          KidsCore.haptic("light");
        }
        const w2 = checkWinner(board);
        if (w2) {
          endGame({ player: w2.player, cells: w2.cells }, false);
          return;
        }
        if (isDraw(board)) {
          endGame(null, true);
          return;
        }
        current = "R";
        updateTurnMessage();
        render();
      }
      if (prefersReducedMotion()) {
        board[r][pick] = "Y";
        afterCpuPlace();
        return;
      }
      isDropping = true;
      render();
      window.requestAnimationFrame(function () {
        runDropAnimation(pick, r, "Y", function () {
          afterCpuPlace();
        });
      });
    }, thinkingMs);
  }

  function onColumnClick(col) {
    if (gameOver || cpuThinking || isDropping) {
      return;
    }
    if (mode === "cpu" && current === "Y") {
      return;
    }
    if (columnFull(board, col)) {
      return;
    }
    const r = getLandingRow(board, col);
    if (r < 0) {
      return;
    }
    const piece = current;
    function commitAndResolve() {
      board[r][col] = piece;
      isDropping = false;
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("ok");
        KidsCore.haptic("light");
      }
      applyMoveResult();
    }
    if (prefersReducedMotion()) {
      commitAndResolve();
      return;
    }
    isDropping = true;
    render();
    window.requestAnimationFrame(function () {
      runDropAnimation(col, r, piece, commitAndResolve);
    });
  }

  function startGame() {
    mode = selectedMode();
    board = emptyBoard();
    current = "R";
    gameOver = false;
    cpuThinking = false;
    winKeys = null;
    syncModeLine();
    updateTurnMessage();
    showScreen("play");
    render();
  }

  function resetRound() {
    board = emptyBoard();
    current = "R";
    gameOver = false;
    cpuThinking = false;
    winKeys = null;
    if (playHint) {
      playHint.setAttribute("aria-hidden", "false");
    }
    updateTurnMessage();
    render();
  }

  btnStart.addEventListener("click", startGame);
  btnAgain.addEventListener("click", resetRound);
  btnMenu.addEventListener("click", function () {
    showScreen("setup");
  });

  if (typeof GameScorecard !== "undefined") {
    scorecard = GameScorecard.wire({
      storageKey: "c4ScorecardV1",
      defaults: {
        friend: { r: 0, y: 0, draw: 0 },
        cpu: { you: 0, cpu: 0, draw: 0 },
      },
      display: {
        c4scFriendR: function (s) {
          return s.friend.r;
        },
        c4scFriendY: function (s) {
          return s.friend.y;
        },
        c4scFriendD: function (s) {
          return s.friend.draw;
        },
        c4scCpuYou: function (s) {
          return s.cpu.you;
        },
        c4scCpuCpu: function (s) {
          return s.cpu.cpu;
        },
        c4scCpuD: function (s) {
          return s.cpu.draw;
        },
      },
      hintId: "c4scHint",
      btnCopyId: "c4scCopy",
      btnPasteId: "c4scPaste",
      btnResetId: "c4scReset",
    });
    scorecard.render();
  }

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
