const imageInput = document.getElementById("imageInput");
const fileName = document.getElementById("fileName");
const pieceSlider = document.getElementById("pieceSlider");
const pieceOut = document.getElementById("pieceOut");
const startBtn = document.getElementById("startBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const statusEl = document.getElementById("status");
const playArea = document.getElementById("playArea");
const board = document.getElementById("board");
const tray = document.getElementById("tray");

/** @type {string | null} */
let objectUrl = null;
/** @type {string | null} */
let dataUrl = null;
let grid = 3;
const placed = new Map(); // index -> correct index

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

function setImageFromFile(file) {
  releaseObjectUrl();
  dataUrl = null;
  if (!file || !file.type.startsWith("image/")) {
    fileName.textContent = "No file chosen";
    startBtn.disabled = true;
    return;
  }
  objectUrl = URL.createObjectURL(file);
  dataUrl = objectUrl;
  fileName.textContent = file.name;
  startBtn.disabled = false;
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  setImageFromFile(file ?? null);
});

pieceSlider.addEventListener("input", () => {
  updateSliderLabel();
});

function clearBoard() {
  board.replaceChildren();
  tray.replaceChildren();
  placed.clear();
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

function makePiece(correctIndex, n, imageUrl) {
  const col = correctIndex % n;
  const row = Math.floor(correctIndex / n);
  const el = document.createElement("div");
  el.className = "piece in-tray";
  el.setAttribute("draggable", "true");
  el.dataset.correct = String(correctIndex);
  el.style.setProperty("--img", `url(${JSON.stringify(imageUrl)})`);
  el.style.setProperty("--cols", String(n));
  el.style.setProperty("--rows", String(n));
  el.style.setProperty("--col", String(col));
  el.style.setProperty("--row", String(row));
  return el;
}

function makeSlot(index, n) {
  const slot = document.createElement("div");
  slot.className = "slot";
  slot.dataset.index = String(index);
  slot.style.gridColumn = "span 1";
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
    const slots = board.querySelectorAll(".slot");
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

function checkWin() {
  const n = grid;
  const need = n * n;
  if (placed.size === need) {
    setStatus("You did it! Great job!", "win");
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
  grid = Number(pieceSlider.value);
  const n = grid;
  clearBoard();
  setStatus("");
  playArea.hidden = false;

  board.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${n}, 1fr)`;

  const indices = Array.from({ length: n * n }, (_, i) => i);
  shuffleInPlace(indices);

  for (let i = 0; i < n * n; i++) {
    board.appendChild(makeSlot(i, n));
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

if (typeof KidsCore !== "undefined") {
  KidsCore.init();
  KidsCore.bindTapSound(document.getElementById("app"));
}
