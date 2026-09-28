const startBtn = document.getElementById("startBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const statusEl = document.getElementById("status");
const board = document.getElementById("board");
const boardGrid = document.getElementById("boardGrid");
const boardGuideImg = document.getElementById("boardGuideImg");
const boardIntro = document.getElementById("boardIntro");
const guideToggle = document.getElementById("guideToggle");
const tray = document.getElementById("tray");
const previewImg = document.getElementById("jzPreviewImg");
const timerEl = document.getElementById("jzTimer");
const placedEl = document.getElementById("jzPlaced");
const totalEl = document.getElementById("jzTotal");
const progressBar = document.getElementById("jzProgressBar");
const progressFill = document.getElementById("jzProgressFill");
const photoInput = document.getElementById("jzPhotoInput");
const photoPick = document.getElementById("jzPhotoPick");
const photoGrid = document.getElementById("jzPhotoGrid");

const GUIDE_STORAGE_KEY = "jigsawPictureGuide";
const LEVEL_STORAGE_KEY = "jigsawPieces";

/** Grid shapes per piece count, for a landscape picture (swapped for portrait). */
const LAYOUTS = {
  6: [3, 2],
  12: [4, 3],
  24: [6, 4],
};

/** @type {string | null} */
let dataUrl = null;
/** Picture width / height, clamped so very tall or wide photos still make usable pieces. */
let imageAspect = 1;
let pieceCount = 6;
let cols = 3;
let rows = 2;
let puzzleActive = false;
const placed = new Map();

let timerStart = 0;
let timerId = 0;
let statusTimer = 0;

/** @type {boolean[][] | null} row runs 0..rows-2, col 0..cols-1 */
let jigsawSeamsH = null;
/** @type {boolean[][] | null} row 0..rows-1, col 0..cols-2 */
let jigsawSeamsV = null;

/* ---------- Picture guide ---------- */

function getGuideOn() {
  return !guideToggle || guideToggle.getAttribute("aria-pressed") !== "false";
}

function setGuideOn(on) {
  if (guideToggle) guideToggle.setAttribute("aria-pressed", on ? "true" : "false");
  if (board) board.classList.toggle("board--no-guide", !on);
}

function loadGuideFromStorage() {
  let on = true;
  try {
    on = localStorage.getItem(GUIDE_STORAGE_KEY) !== "0";
  } catch (e) {
    /* ignore */
  }
  setGuideOn(on);
}

/* ---------- Piece shapes ---------- */

/**
 * Every internal seam is a real tab / socket pair (no “flat” inner edges, which
 * read as a plain square grid in the UI).
 */
function buildSeamGrids(r, c) {
  jigsawSeamsH = Array.from({ length: Math.max(0, r - 1) }, () => Array(c).fill(true));
  jigsawSeamsV = Array.from({ length: r }, () => Array(Math.max(0, c - 1)).fill(true));
}

/**
 * Jigsaw outline in 0..100 only (viewBox 0 0 100, clipPath objectBoundingBox + scale(0.01)).
 * Tabs/sockets are drawn *inside* the cell (coords stay in 0..100) so WebKit
 * does not clamp the clip to a rectangle.
 */
function jigsawPathD(row, col, r, c) {
  const h = jigsawSeamsH;
  const v = jigsawSeamsV;
  if (!h || !v) {
    return "M0,0L100,0L100,100L0,100Z";
  }

  const m = 20;
  const topSocket = row > 0 && h[row - 1][col];
  const rightTab = col < c - 1 && v[row][col];
  const bottomTab = row < r - 1 && h[row][col];
  const leftSocket = col > 0 && v[row][col - 1];

  let s = "M0,0";
  if (topSocket) {
    s += `L${m},0Q50,12,${100 - m},0L100,0`;
  } else {
    s += "L100,0";
  }
  if (rightTab) {
    s += `L100,${m}C98,22,90,35,88,50C90,65,98,75,100,${100 - m}L100,100`;
  } else {
    s += "L100,100";
  }
  if (bottomTab) {
    s += `L${100 - m},100Q50,88,${m},100L0,100`;
  } else {
    s += "L0,100";
  }
  if (leftSocket) {
    s += `Q12,50,0,${m}L0,0`;
  } else {
    s += "L0,0";
  }
  s += "Z";
  return s;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * (Re)build &lt;clipPath&gt; elements so clip-path: url(#id) works in Safari
 * (data-URL mask-image often shows grey pieces with no photo).
 */
function rebuildClipDefs(r, c) {
  const defs = document.getElementById("jigsaw-clip-defs");
  if (!defs) {
    return;
  }
  defs.replaceChildren();
  for (let i = 0; i < r * c; i++) {
    const row = Math.floor(i / c);
    const col = i % c;
    const cp = document.createElementNS(SVG_NS, "clipPath");
    cp.setAttribute("id", "jigsaw-clip-" + i);
    cp.setAttribute("clipPathUnits", "objectBoundingBox");
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", jigsawPathD(row, col, r, c));
    p.setAttribute("transform", "scale(0.01, 0.01)");
    cp.appendChild(p);
    defs.appendChild(cp);
  }
}

/* ---------- Picture choice ---------- */

/**
 * Resolve relative preset paths against the page URL (fixes broken backgrounds on some iPad / WebKit builds).
 */
function resolveImageUrl(url) {
  try {
    return new URL(url, window.location.href).href;
  } catch (e) {
    return url;
  }
}

function clearPictureSelection() {
  document.querySelectorAll(".jigsaw-preset").forEach(function (b) {
    b.classList.remove("is-selected");
    b.setAttribute("aria-pressed", "false");
  });
}

function layoutForCount() {
  const pair = LAYOUTS[pieceCount] || LAYOUTS[6];
  if (imageAspect >= 1) {
    cols = pair[0];
    rows = pair[1];
  } else {
    cols = pair[1];
    rows = pair[0];
  }
}

function applyBoardAspect() {
  if (!board) return;
  board.style.setProperty("--ar", String(imageAspect));
  board.style.setProperty("--cols", String(cols));
  board.style.setProperty("--rows", String(rows));
  tray.style.setProperty("--cell-ar", String((imageAspect * rows) / cols));
}

function updateProgress() {
  const total = cols * rows;
  const n = placed.size;
  if (placedEl) placedEl.textContent = String(n);
  if (totalEl) totalEl.textContent = String(total);
  if (progressBar) {
    progressBar.setAttribute("aria-valuemax", String(total));
    progressBar.setAttribute("aria-valuenow", String(n));
  }
  if (progressFill) progressFill.style.width = (total ? (n / total) * 100 : 0) + "%";
}

/**
 * @param {string} src - URL to image (path or blob:)
 * @param {HTMLElement | null} [button] - The picture tile that was tapped
 */
function selectPicture(src, button) {
  dataUrl = src;
  clearPictureSelection();
  if (button) {
    button.classList.add("is-selected");
    button.setAttribute("aria-pressed", "true");
  }
  const resolved = resolveImageUrl(src);
  if (previewImg) previewImg.src = resolved;
  if (boardGuideImg) boardGuideImg.src = resolved;
  startBtn.disabled = true;
  const probe = new Image();
  probe.onload = function () {
    if (dataUrl !== src) return;
    const raw = probe.naturalWidth / probe.naturalHeight || 1;
    imageAspect = Math.max(0.6, Math.min(1.8, raw));
    startBtn.disabled = false;
    if (!puzzleActive) {
      layoutForCount();
      applyBoardAspect();
      updateProgress();
    }
  };
  probe.onerror = function () {
    if (dataUrl !== src) return;
    imageAspect = 1;
    startBtn.disabled = false;
  };
  probe.src = resolved;
}

function wirePictureButton(btn) {
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("click", function () {
    const src = btn.getAttribute("data-src");
    if (src) selectPicture(src, btn);
  });
}

document.querySelectorAll(".jigsaw-preset").forEach(wirePictureButton);

/* ---------- Tabs & your photos ---------- */

document.querySelectorAll(".jz-tab").forEach(function (tab) {
  tab.addEventListener("click", function () {
    document.querySelectorAll(".jz-tab").forEach(function (t) {
      const on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      const pane = document.getElementById(t.getAttribute("aria-controls"));
      if (pane) pane.hidden = !on;
    });
  });
});

if (photoPick && photoInput) {
  photoPick.addEventListener("click", function () {
    photoInput.click();
  });
  photoInput.addEventListener("change", function () {
    const file = photoInput.files && photoInput.files[0];
    photoInput.value = "";
    if (!file || !/^image\//.test(file.type)) return;
    const url = URL.createObjectURL(file);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jigsaw-preset";
    btn.setAttribute("data-src", url);
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Your photo";
    btn.appendChild(img);
    photoGrid.insertBefore(btn, photoPick.nextSibling);
    wirePictureButton(btn);
    selectPicture(url, btn);
  });
}

/* ---------- Difficulty ---------- */

function setPieceCount(count, save) {
  pieceCount = LAYOUTS[count] ? count : 6;
  document.querySelectorAll(".jz-level").forEach(function (b) {
    const on = Number(b.getAttribute("data-pieces")) === pieceCount;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-checked", on ? "true" : "false");
  });
  if (save) {
    try {
      localStorage.setItem(LEVEL_STORAGE_KEY, String(pieceCount));
    } catch (e) {
      /* ignore */
    }
  }
  if (!puzzleActive) {
    layoutForCount();
    applyBoardAspect();
    updateProgress();
  }
}

document.querySelectorAll(".jz-level").forEach(function (b) {
  b.addEventListener("click", function () {
    setPieceCount(Number(b.getAttribute("data-pieces")), true);
  });
});

/* ---------- Status & timer ---------- */

/**
 * @param {string} msg
 * @param {"neutral" | "win" | "oops"} [tone]
 */
function setStatus(msg, tone = "neutral") {
  clearTimeout(statusTimer);
  statusEl.textContent = msg;
  statusEl.classList.remove("status--win", "status--oops");
  if (msg && tone === "win") statusEl.classList.add("status--win");
  if (msg && tone === "oops") {
    statusEl.classList.add("status--oops");
    statusTimer = setTimeout(function () {
      setStatus("");
    }, 2800);
  }
}

const WRONG_SPOT_HINTS = [
  "Not that spot! This piece belongs somewhere else. You’ve got this!",
  "Oops! That is not the right home for this piece. Try a different spot!",
  "Almost! This bit fits in another place. Keep going!",
  "Nice try! That piece goes in a different empty spot.",
];

const SPOT_FULL_HINTS = [
  "That space is full! Find an empty spot for this piece.",
  "Oops! Something is already in that spot. Try another one!",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return String(m).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function stopTimer() {
  clearInterval(timerId);
  timerId = 0;
}

function startTimer() {
  stopTimer();
  timerStart = Date.now();
  if (timerEl) timerEl.textContent = "00:00";
  timerId = setInterval(function () {
    if (timerEl) timerEl.textContent = formatTime(Date.now() - timerStart);
  }, 500);
}

/* ---------- Board & pieces ---------- */

function sizeTrayPieces() {
  const slot = boardGrid && boardGrid.querySelector(".slot");
  if (!slot) return;
  const w = slot.getBoundingClientRect().width;
  tray.style.setProperty("--piece-w", Math.max(56, Math.min(110, w * 0.8)) + "px");
}

function makePiece(correctIndex, imageUrl) {
  const col = correctIndex % cols;
  const row = Math.floor(correctIndex / cols);
  const el = document.createElement("div");
  el.className = "piece in-tray";
  el.dataset.correct = String(correctIndex);
  const resolved = resolveImageUrl(String(imageUrl));
  el.style.setProperty("--img", "url(" + JSON.stringify(resolved) + ")");
  el.style.setProperty("--cols", String(cols));
  el.style.setProperty("--rows", String(rows));
  el.style.setProperty("--col", String(col));
  el.style.setProperty("--row", String(row));
  const face = document.createElement("div");
  face.className = "piece__face";
  face.setAttribute("aria-hidden", "true");
  el.appendChild(face);
  const clipRef = "url(#jigsaw-clip-" + correctIndex + ")";
  el.style.setProperty("clip-path", clipRef);
  el.style.setProperty("-webkit-clip-path", clipRef);
  return el;
}

function makeSlot(index) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.dataset.index = String(index);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "slot__shape");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", "slot__outline");
  path.setAttribute("d", jigsawPathD(row, col, rows, cols));
  path.setAttribute("fill", "none");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  slot.appendChild(svg);
  return slot;
}

function attachPointerDrag(piece) {
  let startX = 0;
  let startY = 0;
  let elStartLeft = 0;
  let elStartTop = 0;
  let dragging = false;

  piece.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    piece.setPointerCapture(e.pointerId);
    const r = piece.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    elStartLeft = r.left;
    elStartTop = r.top;
    piece.style.position = "fixed";
    piece.style.width = `${r.width}px`;
    piece.style.height = `${r.height}px`;
    piece.style.left = `${r.left}px`;
    piece.style.top = `${r.top}px`;
    piece.style.zIndex = "1000";
    piece.classList.remove("in-tray");
    piece.classList.add("is-dragging");
  });

  piece.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    piece.style.left = `${elStartLeft + e.clientX - startX}px`;
    piece.style.top = `${elStartTop + e.clientY - startY}px`;
  });

  piece.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    piece.releasePointerCapture(e.pointerId);
    piece.classList.remove("is-dragging");

    const cx = e.clientX;
    const cy = e.clientY;
    const correct = Number(piece.dataset.correct);
    const slots = boardGrid.querySelectorAll(".slot");
    let targetSlot = null;
    for (const s of slots) {
      const sr = s.getBoundingClientRect();
      if (cx >= sr.left && cx <= sr.right && cy >= sr.top && cy <= sr.bottom) {
        targetSlot = s;
        break;
      }
    }

    if (targetSlot) {
      const slotIndex = Number(targetSlot.dataset.index);
      const occupied = targetSlot.querySelector(".piece");
      if (slotIndex === correct && !occupied) {
        placePieceInSlot(piece, targetSlot);
        checkWin();
        return;
      }
      setStatus(pickRandom(occupied ? SPOT_FULL_HINTS : WRONG_SPOT_HINTS), "oops");
      if (typeof KidsCore !== "undefined") KidsCore.playSound("no");
    }
    resetPieceToTray(piece);
  });

  piece.addEventListener("pointercancel", () => {
    if (!dragging) return;
    dragging = false;
    piece.classList.remove("is-dragging");
    resetPieceToTray(piece);
  });
}

function clearDragStyles(piece) {
  piece.style.position = "";
  piece.style.left = "";
  piece.style.top = "";
  piece.style.zIndex = "";
  piece.style.width = "";
  piece.style.height = "";
}

function placePieceInSlot(piece, slot) {
  clearDragStyles(piece);
  slot.appendChild(piece);
  piece.classList.remove("in-tray");
  slot.classList.add("filled");
  placed.set(Number(piece.dataset.correct), true);
  piece.style.pointerEvents = "none";
  piece.classList.add("just-placed");
  updateProgress();
  if (typeof KidsCore !== "undefined") {
    KidsCore.playSound("ok");
    KidsCore.haptic("light");
  }
}

function resetPieceToTray(piece) {
  clearDragStyles(piece);
  piece.classList.add("in-tray");
  tray.appendChild(piece);
}

/** @type {{ update: function(Function): void, render: function(): void }|null} */
let jigsawScorecard = null;

function checkWin() {
  if (placed.size !== cols * rows) return;
  stopTimer();
  puzzleActive = false;
  const time = timerEl ? timerEl.textContent : "";
  setStatus("You did it! Great job! 🎉" + (time ? " Time: " + time : ""), "win");
  tray.setAttribute("data-empty", "All done! Pick another picture or tap Start again 🎉");
  board.classList.add("is-complete");
  if (jigsawScorecard) {
    jigsawScorecard.update(function (s) {
      s.completed++;
    });
  }
  if (typeof KidsCore !== "undefined") {
    KidsCore.recordGame("jigsaw");
    KidsCore.confetti(document.getElementById("jzBoardCard") || document.body);
    KidsCore.playSound("win");
    KidsCore.haptic("success");
  }
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function startPuzzle() {
  if (!dataUrl || !boardGrid) return;
  layoutForCount();
  applyBoardAspect();
  boardGrid.replaceChildren();
  tray.replaceChildren();
  placed.clear();
  buildSeamGrids(rows, cols);
  rebuildClipDefs(rows, cols);
  setStatus("");
  board.classList.remove("is-complete");
  board.classList.add("is-playing");
  if (boardIntro) boardIntro.hidden = true;
  tray.setAttribute("data-empty", "Your pieces will appear here.");
  if (boardGuideImg) boardGuideImg.src = resolveImageUrl(String(dataUrl));

  boardGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  boardGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  for (let i = 0; i < cols * rows; i++) {
    boardGrid.appendChild(makeSlot(i));
  }

  const indices = Array.from({ length: cols * rows }, (_, i) => i);
  shuffleInPlace(indices);
  for (const idx of indices) {
    const p = makePiece(idx, dataUrl);
    attachPointerDrag(p);
    tray.appendChild(p);
  }

  puzzleActive = true;
  shuffleBtn.disabled = false;
  updateProgress();
  sizeTrayPieces();
  startTimer();
  if (window.matchMedia("(max-width: 1100px)").matches) {
    document.getElementById("jzBoardCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

startBtn.addEventListener("click", startPuzzle);
shuffleBtn.addEventListener("click", startPuzzle);

if (guideToggle) {
  guideToggle.addEventListener("click", function () {
    const on = !getGuideOn();
    setGuideOn(on);
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, on ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
  });
}

const fsBtn = document.getElementById("jzFullscreen");
const fsTarget = document.querySelector(".jz-center");
if (fsBtn && fsTarget && (fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen)) {
  fsBtn.addEventListener("click", function () {
    const current = document.fullscreenElement || document.webkitFullscreenElement;
    if (current) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      (fsTarget.requestFullscreen || fsTarget.webkitRequestFullscreen).call(fsTarget);
    }
  });
  document.addEventListener("fullscreenchange", function () {
    setTimeout(sizeTrayPieces, 100);
  });
} else if (fsBtn) {
  fsBtn.hidden = true;
}

window.addEventListener("resize", sizeTrayPieces);

const gear = document.getElementById("jzSettings");
if (gear) {
  gear.addEventListener("click", function () {
    if (typeof KidsCore !== "undefined") KidsCore.openSettings();
  });
}

/* ---------- Init ---------- */

loadGuideFromStorage();
let savedCount = 6;
try {
  savedCount = Number(localStorage.getItem(LEVEL_STORAGE_KEY)) || 6;
} catch (e) {
  /* ignore */
}
setPieceCount(savedCount, false);
tray.setAttribute("data-empty", "Your pieces will appear here.");
const firstPreset = document.querySelector(".jigsaw-preset");
if (firstPreset) firstPreset.click();

if (typeof GameScorecard !== "undefined") {
  jigsawScorecard = GameScorecard.wire({
    storageKey: "jigsawScorecardV1",
    defaults: { completed: 0 },
    display: {
      jgscDone: function (s) {
        return s.completed;
      },
    },
    hintId: "jgscHint",
    btnCopyId: "jgscCopy",
    btnPasteId: "jgscPaste",
    btnResetId: "jgscReset",
  });
  jigsawScorecard.render();
}

if (typeof KidsCore !== "undefined") {
  KidsCore.init({ skipBar: true });
  KidsCore.bindTapSound(document.getElementById("app"));
}
