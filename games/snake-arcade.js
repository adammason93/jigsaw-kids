/**
 * Simple grid snake — arrow buttons + keyboard; score, difficulty, best.
 */
(function () {
  var GRID = 20;
  var STORAGE = "snakeArcadeHighV1";
  var TICK = { easy: 220, normal: 155, hard: 100 };

  var canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById("snakeCanvas"));
  var scoreEl = document.getElementById("snakeScore");
  var highEl = document.getElementById("snakeHigh");
  var diffWrap = document.getElementById("snakeDiff");
  var overlay = document.getElementById("snakeOverlay");
  var overTitle = document.getElementById("snakeOverTitle");
  var overMsg = document.getElementById("snakeOverMsg");
  var btnRestart = document.getElementById("snakeRestart");
  var btnResume = document.getElementById("snakeResume");
  var btnPause = document.getElementById("snakePause");
  var hintEl = document.getElementById("snakeHint");

  if (!canvas) return;

  var ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
  /** @type {{x:number,y:number}[]} */
  var snake = [];
  /** @type {{x:number,y:number}} */
  var dir = { x: 1, y: 0 };
  /** @type {{x:number,y:number}|null} */
  var pending = null;
  /** @type {{x:number,y:number}|null} */
  var food = null;
  var score = 0;
  /** @type {'easy'|'normal'|'hard'} */
  var difficulty = "easy";
  /** @type {number|null} */
  var tickId = null;
  var gameOn = false;
  var paused = false;
  /** @type {{easy:number,normal:number,hard:number}} */
  var high = { easy: 0, normal: 0, hard: 0 };

  var cellPx = 20;
  var logicalSize = 400;
  /** Max playfield edge in CSS px (ultra-wide desktops); tablet size comes from flex + ResizeObserver. */
  var BOARD_MAX_PX = 720;

  function loadHigh() {
    try {
      var raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o && typeof o === "object") {
        if (typeof o.easy === "number") high.easy = Math.max(0, o.easy);
        if (typeof o.normal === "number") high.normal = Math.max(0, o.normal);
        if (typeof o.hard === "number") high.hard = Math.max(0, o.hard);
      }
    } catch (e) {}
  }

  function saveHigh() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(high));
    } catch (e) {}
  }

  function syncHighDisplay() {
    if (highEl) highEl.textContent = String(high[difficulty]);
  }

  function resizeCanvas() {
    var wrap = canvas.parentElement;
    if (!wrap) return;
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    var side = Math.min(w, h);
    if (side < 48) return;
    logicalSize = Math.max(200, Math.min(Math.floor(side), BOARD_MAX_PX));
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = logicalSize + "px";
    canvas.style.height = logicalSize + "px";
    canvas.width = Math.floor(logicalSize * dpr);
    canvas.height = Math.floor(logicalSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cellPx = logicalSize / GRID;
    draw();
  }

  function placeFood() {
    var taken = {};
    var i;
    for (i = 0; i < snake.length; i++) {
      taken[snake[i].x + "," + snake[i].y] = true;
    }
    var x;
    var y;
    var guard = 0;
    do {
      x = Math.floor(Math.random() * GRID);
      y = Math.floor(Math.random() * GRID);
      guard++;
    } while (taken[x + "," + y] && guard < 999);
    food = { x: x, y: y };
  }

  function resetSnake() {
    var mid = Math.floor(GRID / 2);
    snake = [
      { x: mid + 1, y: mid },
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
    ];
    dir = { x: 1, y: 0 };
  }

  function syncPauseButton() {
    if (!btnPause) return;
    if (!gameOn) {
      btnPause.disabled = true;
      btnPause.textContent = "Pause";
      btnPause.setAttribute("aria-label", "Pause game");
      return;
    }
    btnPause.disabled = false;
    if (paused) {
      btnPause.textContent = "Resume";
      btnPause.setAttribute("aria-label", "Resume game");
    } else {
      btnPause.textContent = "Pause";
      btnPause.setAttribute("aria-label", "Pause game");
    }
  }

  function stopLoop() {
    if (tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
    gameOn = false;
    paused = false;
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(false);
    }
    syncPauseButton();
  }

  function pauseGame() {
    if (!gameOn || paused) return;
    paused = true;
    if (tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
    if (overTitle) overTitle.textContent = "Paused";
    if (overMsg) overMsg.textContent = "Tap Resume or Pause when you’re ready to continue.";
    if (btnRestart) btnRestart.classList.add("is-hidden");
    if (btnResume) btnResume.classList.remove("is-hidden");
    overlay.classList.remove("is-hidden");
    overlay.hidden = false;
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(false);
    }
    syncPauseButton();
  }

  function resumeGame() {
    if (!gameOn || !paused) return;
    paused = false;
    overlay.classList.add("is-hidden");
    overlay.hidden = true;
    if (btnRestart) btnRestart.classList.remove("is-hidden");
    if (btnResume) btnResume.classList.add("is-hidden");
    tickId = window.setInterval(tick, TICK[difficulty]);
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(true);
    }
    draw();
    syncPauseButton();
  }

  function setDiffButtonsDisabled(dis) {
    if (!diffWrap) return;
    diffWrap.querySelectorAll(".snake-diff__btn").forEach(function (b) {
      b.disabled = !!dis;
    });
  }

  function startGame() {
    stopLoop();
    paused = false;
    score = 0;
    if (scoreEl) scoreEl.textContent = "0";
    var bootDir = pending;
    pending = null;
    resetSnake();
    if (bootDir && !(bootDir.x === -dir.x && bootDir.y === -dir.y)) {
      dir = bootDir;
    }
    placeFood();
    gameOn = true;
    overlay.classList.add("is-hidden");
    overlay.hidden = true;
    if (hintEl) hintEl.textContent = "Arrows to turn — Pause or P to take a break. Eat the red snacks!";
    setDiffButtonsDisabled(true);
    tickId = window.setInterval(tick, TICK[difficulty]);
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(true);
    }
    if (btnResume) btnResume.classList.add("is-hidden");
    if (btnRestart) btnRestart.classList.remove("is-hidden");
    syncPauseButton();
    draw();
  }

  function endGame() {
    stopLoop();
    if (score > high[difficulty]) {
      high[difficulty] = score;
      saveHigh();
      syncHighDisplay();
    }
    overlay.classList.remove("is-hidden");
    overlay.hidden = false;
    if (overTitle) overTitle.textContent = "Game over";
    if (overMsg) {
      overMsg.textContent = "Score " + score + ". Tap Play again or an arrow to try again.";
    }
    if (btnResume) btnResume.classList.add("is-hidden");
    if (btnRestart) btnRestart.classList.remove("is-hidden");
    setDiffButtonsDisabled(false);
    syncPauseButton();
    if (typeof KidsCore !== "undefined") {
      KidsCore.playSound("no");
      KidsCore.haptic("light");
      KidsCore.recordGame("snake");
    }
    draw();
  }

  function applyPending() {
    if (!pending) return;
    if (!(pending.x === -dir.x && pending.y === -dir.y)) {
      dir = pending;
    }
    pending = null;
  }

  function tick() {
    applyPending();
    var head = snake[0];
    var nx = head.x + dir.x;
    var ny = head.y + dir.y;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
      endGame();
      return;
    }
    var eat = food && food.x === nx && food.y === ny;
    var bodyCheck = eat ? snake : snake.slice(0, -1);
    var j;
    for (j = 0; j < bodyCheck.length; j++) {
      if (bodyCheck[j].x === nx && bodyCheck[j].y === ny) {
        endGame();
        return;
      }
    }
    snake.unshift({ x: nx, y: ny });
    if (eat) {
      score += 1;
      if (scoreEl) scoreEl.textContent = String(score);
      placeFood();
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("tap");
        KidsCore.haptic("light");
      }
    } else {
      snake.pop();
    }
    draw();
  }

  /**
   * @param {string} name
   */
  function queueDir(name) {
    var d =
      name === "left"
        ? { x: -1, y: 0 }
        : name === "right"
          ? { x: 1, y: 0 }
          : name === "up"
            ? { x: 0, y: -1 }
            : { x: 0, y: 1 };
    if (!gameOn) {
      pending = d;
      startGame();
      return;
    }
    pending = d;
  }

  function drawCell(x, y, fill, radius) {
    var r = radius != null ? radius : cellPx * 0.38;
    var px = x * cellPx;
    var py = y * cellPx;
    var s = cellPx - 1;
    ctx.beginPath();
    ctx.roundRect(px + 0.5, py + 0.5, s, s, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawEyes(cx, cy) {
    var off = cellPx * 0.18;
    var eye = cellPx * 0.09;
    ctx.fillStyle = "#0f172a";
    if (dir.x === 1) {
      ctx.beginPath();
      ctx.arc(cx + off, cy - off * 0.4, eye, 0, Math.PI * 2);
      ctx.arc(cx + off, cy + off * 0.4, eye, 0, Math.PI * 2);
      ctx.fill();
    } else if (dir.x === -1) {
      ctx.beginPath();
      ctx.arc(cx - off, cy - off * 0.4, eye, 0, Math.PI * 2);
      ctx.arc(cx - off, cy + off * 0.4, eye, 0, Math.PI * 2);
      ctx.fill();
    } else if (dir.y === -1) {
      ctx.beginPath();
      ctx.arc(cx - off * 0.4, cy - off, eye, 0, Math.PI * 2);
      ctx.arc(cx + off * 0.4, cy - off, eye, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx - off * 0.4, cy + off, eye, 0, Math.PI * 2);
      ctx.arc(cx + off * 0.4, cy + off, eye, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, logicalSize, logicalSize);
    var gx;
    var gy;
    ctx.strokeStyle = "rgba(51, 65, 85, 0.35)";
    ctx.lineWidth = 1;
    for (gx = 0; gx <= GRID; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * cellPx, 0);
      ctx.lineTo(gx * cellPx, logicalSize);
      ctx.stroke();
    }
    for (gy = 0; gy <= GRID; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * cellPx);
      ctx.lineTo(logicalSize, gy * cellPx);
      ctx.stroke();
    }
    if (food) {
      var fx = food.x * cellPx + cellPx / 2;
      var fy = food.y * cellPx + cellPx / 2;
      var fr = cellPx * 0.32;
      var g = ctx.createRadialGradient(fx - fr * 0.3, fy - fr * 0.3, 0, fx, fy, fr * 1.2);
      g.addColorStop(0, "#fca5a5");
      g.addColorStop(1, "#dc2626");
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
    var i;
    for (i = snake.length - 1; i >= 0; i--) {
      var seg = snake[i];
      var hue = i === 0 ? "#38bdf8" : i === 1 ? "#0ea5e9" : "#0369a1";
      drawCell(seg.x, seg.y, hue, cellPx * 0.36);
    }
    if (snake.length) {
      var h = snake[0];
      drawEyes(h.x * cellPx + cellPx / 2, h.y * cellPx + cellPx / 2);
    }
  }

  document.querySelectorAll(".snake-ctrl").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var d = btn.getAttribute("data-dir");
      if (d) queueDir(d);
    });
  });

  if (btnRestart) {
    btnRestart.addEventListener("click", function () {
      startGame();
    });
  }

  if (btnResume) {
    btnResume.addEventListener("click", function () {
      resumeGame();
    });
  }

  if (btnPause) {
    btnPause.addEventListener("click", function () {
      if (!gameOn) return;
      if (paused) resumeGame();
      else pauseGame();
    });
  }

  if (diffWrap) {
    diffWrap.querySelectorAll(".snake-diff__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (gameOn) return;
        var d = btn.getAttribute("data-diff");
        if (d !== "easy" && d !== "normal" && d !== "hard") return;
        difficulty = d;
        diffWrap.querySelectorAll(".snake-diff__btn").forEach(function (b) {
          var act = b.getAttribute("data-diff") === d;
          b.classList.toggle("is-active", act);
          b.setAttribute("aria-pressed", act ? "true" : "false");
        });
        syncHighDisplay();
      });
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      if (!gameOn) return;
      e.preventDefault();
      if (paused) resumeGame();
      else pauseGame();
      return;
    }
    var m =
      e.key === "ArrowLeft"
        ? "left"
        : e.key === "ArrowRight"
          ? "right"
          : e.key === "ArrowUp"
            ? "up"
            : e.key === "ArrowDown"
              ? "down"
              : null;
    if (!m) return;
    e.preventDefault();
    queueDir(m);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && gameOn && !paused) pauseGame();
  });

  window.addEventListener("resize", resizeCanvas);

  var boardWrap = canvas.parentElement;
  if (boardWrap && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(function () {
      resizeCanvas();
    }).observe(boardWrap);
  }

  if (typeof CanvasRenderingContext2D !== "undefined" && !ctx.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      var rr = Math.min(r, w / 2, h / 2);
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr);
      this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr);
      this.arcTo(x, y, x + w, y, rr);
      this.closePath();
    };
  }

  loadHigh();
  syncHighDisplay();
  resizeCanvas();

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
