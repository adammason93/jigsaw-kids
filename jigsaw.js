const pieceSlider = document.getElementById("pieceSlider");
const pieceOut = document.getElementById("pieceOut");
const startBtn = document.getElementById("startBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const statusEl = document.getElementById("status");
const playArea = document.getElementById("playArea");
const board = document.getElementById("board");
const boardGrid = document.getElementById("boardGrid");
const boardGuideImg = document.getElementById("boardGuideImg");
const guideToggle = document.getElementById("guideToggle");
const tray = document.getElementById("tray");

const GUIDE_STORAGE_KEY = "jigsawPictureGuide";

function getGuideOn() {
  if (!guideToggle) {
    return true;
  }
  return guideToggle.checked;
}

function applyBoardGuideClass() {
  if (!board) {
    return;
  }
  board.classList.toggle("board--no-guide", !getGuideOn());
}

/** @type {string | null} */
let objectUrl = null;
/** @type {string | null} */
let dataUrl = null;
let grid = 3;
const placed = new Map(); // index -> correct index

/** @type {boolean[][] | null} row runs 0..n-2, col 0..n-1 */
let jigsawSeamsH = null;
/** @type {boolean[][] | null} row 0..n-1, col 0..n-2 */
let jigsawSeamsV = null;

/**
 * Every internal seam is a real tab / socket pair (no “flat” inner edges, which
 * read as a plain square grid in the UI).
 * Border edges stay flat by construction in jigsawPathD (row/col at bounds).
 */
function buildSeamGrids(n) {
  jigsawSeamsH = Array.from({ length: Math.max(0, n - 1) }, () => Array(n).fill(true));
  jigsawSeamsV = Array.from({ length: n }, () => Array(Math.max(0, n - 1)).fill(true));
}

/**
 * Jigsaw outline in 0..100 only (viewBox 0 0 100, clipPath objectBoundingBox + scale(0.01)).
 * Tabs/sockets are drawn *inside* the cell (coords stay in 0..100) so WebKit
 * does not clamp the clip to a rectangle. Paired edge: right tab = inward bump on
 * x=100, left socket = bulge from x=0, etc.
 * @param {number} row
 * @param {number} col
 * @param {number} n
 * @returns {string}
 */
function jigsawPathD(row, col, n) {
  const h = jigsawSeamsH;
  const v = jigsawSeamsV;
  if (!h || !v) {
    return "M0,0L100,0L100,100L0,100Z";
  }

  const m = 20;
  const topSocket = row > 0 && h[row - 1][col];
  const rightTab = col < n - 1 && v[row][col];
  const bottomTab = row < n - 1 && h[row][col];
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
 * @param {number} n
 */
function rebuildClipDefs(n) {
  const defs = document.getElementById("jigsaw-clip-defs");
  if (!defs) {
    return;
  }
  defs.replaceChildren();
  for (let i = 0; i < n * n; i++) {
    const row = Math.floor(i / n);
    const col = i % n;
    const d = jigsawPathD(row, col, n);
    const cp = document.createElementNS(SVG_NS, "clipPath");
    cp.setAttribute("id", "jigsaw-clip-" + i);
    cp.setAttribute("clipPathUnits", "objectBoundingBox");
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("transform", "scale(0.01, 0.01)");
    cp.appendChild(p);
    defs.appendChild(cp);
  }
}

function updateSliderLabel() {
  const n = Number(pieceSlider.value);
  const total = n * n;
  pieceOut.textContent = `${n} × ${n} = ${total} pieces`;
}

function releaseObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function clearPresetSelection() {
  document.querySelectorAll(".jigsaw-preset").forEach(function (b) {
    b.classList.remove("is-selected");
    b.setAttribute("aria-pressed", "false");
  });
}

/**
 * @param {string} src - URL to image (path or blob:)
 * @param {string} label - Shown next to controls
 * @param {HTMLElement | null} [presetButton] - The preset tile that was tapped
 */
function setImageFromPreset(src, label, presetButton) {
  releaseObjectUrl();
  dataUrl = src;
  startBtn.disabled = false;
  clearPresetSelection();
  if (presetButton) {
    presetButton.classList.add("is-selected");
    presetButton.setAttribute("aria-pressed", "true");
  }
}

document.querySelectorAll(".jigsaw-preset").forEach(function (btn) {
  btn.setAttribute("aria-pressed", "false");
  btn.addEventListener("click", function () {
    const src = btn.getAttribute("data-src");
    const label = btn.getAttribute("data-label") || "Picture";
    if (src) {
      setImageFromPreset(src, label, btn);
    }
  });
});

pieceSlider.addEventListener("input", () => {
  updateSliderLabel();
});

function clearBoard() {
  if (boardGrid) {
    boardGrid.replaceChildren();
  } else if (board) {
    board.replaceChildren();
  }
  tray.replaceChildren();
  placed.clear();
}

function loadGuideToggleFromStorage() {
  if (!guideToggle) {
    return;
  }
  try {
    const v = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (v === "0" || v === "1") {
      guideToggle.checked = v === "1";
    }
  } catch (e) {
    /* ignore */
  }
  applyBoardGuideClass();
}

/**
 * @param {string} msg
 * @param {"neutral" | "win" | "oops"} [tone]
 */
function setStatus(msg, tone = "neutral") {
  statusEl.textContent = msg;
  statusEl.classList.remove("status--win", "status--oops");
  if (msg && tone === "win") statusEl.classList.add("status--win");
  if (msg && tone === "oops") statusEl.classList.add("status--oops");
}

const WRONG_SPOT_HINTS = [
  "Not that spot! This piece belongs somewhere else. You’ve got this!",
  "Oops! That is not the right home for this piece. Try a different square!",
  "Almost! This bit fits in another place. Keep going!",
  "Nice try! That piece goes in a different empty square.",
];

const SPOT_FULL_HINTS = [
  "That space is full! Find an empty square for this piece.",
  "Oops! Something is already in that spot. Try another one!",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function showWrongSpotHint() {
  setStatus(pickRandom(WRONG_SPOT_HINTS), "oops");
}

function showSpotFullHint() {
  setStatus(pickRandom(SPOT_FULL_HINTS), "oops");
}

/**
 * Resolve relative preset paths against the page URL (fixes broken backgrounds on some iPad / WebKit builds).
 * @param {string} url
 * @returns {string}
 */
function resolveImageUrl(url) {
  try {
    return new URL(url, window.location.href).href;
  } catch (e) {
    return url;
  }
}

function makePiece(correctIndex, n, imageUrl) {
  const col = correctIndex % n;
  const row = Math.floor(correctIndex / n);
  const el = document.createElement("div");
  el.className = "piece in-tray";
  el.setAttribute("draggable", "true");
  el.dataset.correct = String(correctIndex);
  const resolved = resolveImageUrl(String(imageUrl));
  el.style.setProperty("--img", "url(" + JSON.stringify(resolved) + ")");
  el.style.setProperty("--cols", String(n));
  el.style.setProperty("--rows", String(n));
  el.style.setProperty("--col", String(col));
  el.style.setProperty("--row", String(row));
  const face = document.createElement("div");
  face.className = "piece__face";
  face.setAttribute("aria-hidden", "true");
  el.appendChild(face);
  const d = jigsawPathD(row, col, n);
  const clipRef = "url(#jigsaw-clip-" + correctIndex + ")";
  el.style.setProperty("clip-path", clipRef);
  el.style.setProperty("-webkit-clip-path", clipRef);
  return el;
}

function makeSlot(index, n) {
  const row = Math.floor(index / n);
  const col = index % n;
  const d = jigsawPathD(row, col, n);
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.dataset.index = String(index);
  slot.style.gridColumn = "span 1";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "slot__shape");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", "slot__outline");
  path.setAttribute("d", d);
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
  });

  piece.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    piece.style.left = `${elStartLeft + dx}px`;
    piece.style.top = `${elStartTop + dy}px`;
  });

  piece.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    piece.releasePointerCapture(e.pointerId);

    const r = piece.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const correct = Number(piece.dataset.correct);
    const slots = (boardGrid || board).querySelectorAll(".slot");
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
      if (occupied) {
        showSpotFullHint();
        resetPieceToTray(piece);
        return;
      }
      showWrongSpotHint();
      resetPieceToTray(piece);
      return;
    }

    resetPieceToTray(piece);
  });

  piece.addEventListener("pointercancel", () => {
    if (!dragging) return;
    dragging = false;
    resetPieceToTray(piece);
  });
}

function placePieceInSlot(piece, slot) {
  piece.style.position = "";
  piece.style.left = "";
  piece.style.top = "";
  piece.style.zIndex = "";
  piece.style.width = "";
  piece.style.height = "";
  piece.setAttribute("draggable", "false");
  slot.appendChild(piece);
  piece.classList.remove("in-tray");
  slot.classList.add("filled");
  placed.set(Number(piece.dataset.correct), true);
  piece.style.pointerEvents = "none";
}

function resetPieceToTray(piece) {
  piece.style.position = "";
  piece.style.left = "";
  piece.style.top = "";
  piece.style.zIndex = "";
  piece.style.width = "";
  piece.style.height = "";
  piece.classList.add("in-tray");
  tray.appendChild(piece);
}

/** @type {{ update: function(Function): void }|null} */
let jigsawScorecard = null;

function checkWin() {
  const n = grid;
  const need = n * n;
  if (placed.size === need) {
    setStatus("You did it! Great job!", "win");
    if (jigsawScorecard) {
      jigsawScorecard.update(function (s) {
        s.completed++;
      });
    }
    if (typeof KidsCore !== "undefined") {
      KidsCore.recordGame("jigsaw");
      KidsCore.confetti(document.querySelector(".play-area") || document.body);
      KidsCore.playSound("win");
      KidsCore.haptic("success");
    } else {
      confettiLight();
    }
  }
}

function confettiLight() {
  for (let i = 0; i < 30; i++) {
    const d = document.createElement("div");
    d.style.cssText = [
      "position:fixed",
      "width:8px",
      "height:8px",
      "border-radius:2px",
      "pointer-events:none",
      "z-index:2000",
      `left:${50 + (Math.random() - 0.5) * 40}vw`,
      "top:-10px",
      `background:${["#f5a623", "#2d9cdb", "#3cb371", "#e85d75"][i % 4]}`,
      `animation: fall ${1.2 + Math.random() * 0.8}s linear forwards`,
    ].join(";");
    if (!document.getElementById("confetti-style")) {
      const s = document.createElement("style");
      s.id = "confetti-style";
      s.textContent = `
        @keyframes fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0.3; }
        }
      `;
      document.head.appendChild(s);
    }
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  }
}

function startPuzzle() {
  if (!dataUrl) return;
  if (!boardGrid) {
    return;
  }
  grid = Number(pieceSlider.value);
  const n = grid;
  clearBoard();
  buildSeamGrids(n);
  rebuildClipDefs(n);
  setStatus("");
  playArea.hidden = false;
  /* Do not use KidsCore.setPlayMode(true): it locks page scroll (kids-core.css) and on
     phones the board + tray are taller than the viewport — the player must be able
     to scroll to the drop zone and pieces. */

  const resolved = resolveImageUrl(String(dataUrl));
  if (boardGuideImg) {
    boardGuideImg.src = resolved;
  }
  applyBoardGuideClass();

  boardGrid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  boardGrid.style.gridTemplateRows = `repeat(${n}, 1fr)`;

  const indices = Array.from({ length: n * n }, (_, i) => i);
  shuffleInPlace(indices);

  for (let i = 0; i < n * n; i++) {
    boardGrid.appendChild(makeSlot(i, n));
  }

  for (const idx of indices) {
    const p = makePiece(idx, n, dataUrl);
    attachPointerDrag(p);
    tray.appendChild(p);
  }

  shuffleBtn.disabled = false;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

startBtn.addEventListener("click", startPuzzle);

shuffleBtn.addEventListener("click", () => {
  if (!dataUrl) return;
  const pieces = Array.from(tray.querySelectorAll(".piece"));
  if (pieces.length === 0) {
    startPuzzle();
    return;
  }
  const order = pieces.map((_, i) => i);
  shuffleInPlace(order);
  tray.replaceChildren();
  for (const i of order) {
    tray.appendChild(pieces[i]);
  }
  setStatus("");
});

updateSliderLabel();

loadGuideToggleFromStorage();
if (guideToggle) {
  guideToggle.addEventListener("change", function () {
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, guideToggle.checked ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
    applyBoardGuideClass();
  });
}

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
  KidsCore.init();
  KidsCore.bindTapSound(document.getElementById("app"));
}
