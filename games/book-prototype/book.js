import * as THREE from "./vendor/three.module.js";
import { choosePageLayouts, coverCanvasSize, coverLayout, imageCrop, pageComposition, pageImageBand, spineCanvasSize } from "./page-layout.js?v=2";

const PAGE_W = 1.22;
const PAGE_H = 1.83;
const COVER_W = 1.32;
const COVER_H = 1.96;
const BOARD = 0.072;
const SHEET_T = 0.013;
const SHEETS = 16;
const BLOCK = SHEET_T * SHEETS;
const SPINE = 0.1;
const SPINE_DEPTH = BLOCK + BOARD * 2;
const SPINE_Z = -BLOCK / 2;
const OPEN_COVER = -Math.PI;
const CLOSED_X = -0.16;
const CLOSED_Y = 0.2;
const READ_X = 0;
const READ_Y = 0;
const CLOSED_SHIFT = -0.52;
const OPEN_MS = 1200;
const TURN_MS = 880;

const sample = window.WondiiBookSample;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stage = document.getElementById("stage");
const canvas = document.getElementById("view");
const leafHtml = document.getElementById("leafHtml");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const progress = document.getElementById("progress");
const notes = document.getElementById("artNotes");

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
const rig = new THREE.Group();
const coverPivot = new THREE.Group();
scene.add(rig);

let curlMesh = null;
let curlMat = null;
let leftMesh = null;
let rightMesh = null;
let endPaper = null;
let rightPaper = null;
let rightRim = null;
let frontBoard = null;
let spineFront = null;
let spreads = [];
let spreadIndex = 0;
let mode = "closed";
let busy = false;
let closeAfter = false;
let anim = null;
let viewX = CLOSED_X;
let viewY = CLOSED_Y;
let viewShift = CLOSED_SHIFT;
let spinY = 0;
let spinV = 0;
let dragSpin = null;
let lastTick = 0;
const hover = { x: 0, y: 0, tx: 0, ty: 0 };

function cloth(color) {
  return new THREE.MeshStandardMaterial({ color: color, roughness: 0.78, metalness: 0.04 });
}

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    const image = new Image();
    image.onload = function () { resolve(image); };
    image.onerror = reject;
    image.src = src;
  });
}

function loadOptional(src) {
  if (!src) return Promise.resolve(null);
  return loadImage(src).catch(function () { return null; });
}

function canvasTexture(source) {
  const tex = new THREE.CanvasTexture(source);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function pageCanvas() {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = Math.round(1200 * (PAGE_H / PAGE_W));
  return c;
}

function contain(g, image, x, y, w, h) {
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  g.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrap(g, text, x, y, max, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  words.forEach(function (word) {
    const trial = line ? line + " " + word : word;
    if (g.measureText(trial).width > max && line) {
      g.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = trial;
    }
  });
  if (line) {
    g.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function wrapLines(g, text, max, size, weight, family) {
  g.font = weight + " " + size + "px " + family;
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach(function (word) {
    const trial = line ? line + " " + word : word;
    if (g.measureText(trial).width > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawCover(image, titleText, kickerText) {
  const size = coverCanvasSize(COVER_W - 0.045, COVER_H - 0.045, 1600);
  const c = document.createElement("canvas");
  c.width = size.width;
  c.height = size.height;
  const g = c.getContext("2d");
  const layout = coverLayout(c.width, c.height, image.width || c.width, image.height || c.height);
  const src = layout.source;
  g.fillStyle = "#3a2158";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(image, src.sx, src.sy, src.sw, src.sh, layout.art.x, layout.art.y, layout.art.w, layout.art.h);
  g.fillStyle = "#3a2158";
  g.fillRect(0, layout.title.y, c.width, layout.title.h);
  g.fillStyle = "#e8c878";
  g.fillRect(layout.title.x, layout.title.y + Math.round(c.height * 0.018), layout.title.w, Math.max(2, Math.round(c.width * 0.0025)));
  const title = titleText || "Untitled story";
  const kicker = kickerText || "";
  let titleSize = Math.round(c.width * 0.084);
  const minTitle = Math.round(c.width * 0.044);
  let lines = wrapLines(g, title, layout.title.w, titleSize, "650", "Fraunces, Georgia, serif");
  while ((lines.length > 3 || lines.some(function (line) { return g.measureText(line).width > layout.title.w; })) && titleSize > minTitle) {
    titleSize -= 2;
    lines = wrapLines(g, title, layout.title.w, titleSize, "650", "Fraunces, Georgia, serif");
  }
  const titleLead = Math.round(titleSize * 1.16);
  const kickerSize = Math.round(c.width * 0.026);
  const block = lines.length * titleLead + (kicker ? Math.round(kickerSize * 2.2) : 0);
  let y = layout.title.y + Math.max(Math.round(layout.title.h * 0.12), (layout.title.h - block) / 2);
  g.textAlign = "center";
  g.textBaseline = "top";
  g.fillStyle = "#fffaf2";
  g.font = "650 " + titleSize + "px Fraunces, Georgia, serif";
  lines.forEach(function (line) {
    g.fillText(line, c.width / 2, y);
    y += titleLead;
  });
  if (kicker) {
    g.font = "600 " + kickerSize + "px Fredoka, Nunito, sans-serif";
    g.fillStyle = "#f3e6cf";
    g.fillText(kicker, c.width / 2, y + Math.round(kickerSize * 0.7));
  }
  return c;
}

let paperPattern = null;

function paperPatternFill() {
  if (paperPattern) return paperPattern;
  const grain = document.createElement("canvas");
  grain.width = 360;
  grain.height = 360;
  const g = grain.getContext("2d");
  g.fillStyle = "#f6f0e4";
  g.fillRect(0, 0, 360, 360);
  g.strokeStyle = "rgba(126, 96, 58, 0.055)";
  g.lineWidth = 1;
  for (let y = 6; y < 360; y += 6) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(360, y);
    g.stroke();
  }
  for (let i = 0; i < 220; i += 1) {
    const x = Math.random() * 360;
    const y = Math.random() * 360;
    const len = 12 + Math.random() * 42;
    const ang = (Math.random() - 0.5) * 0.8;
    g.strokeStyle = Math.random() > 0.45 ? "rgba(255, 250, 242, 0.45)" : "rgba(112, 78, 40, 0.16)";
    g.lineWidth = 0.7 + Math.random() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }
  paperPattern = g.createPattern(grain, "repeat");
  return paperPattern;
}

function fillPaper(g, tone) {
  const c = g.canvas;
  g.shadowBlur = 0;
  g.fillStyle = tone || "#f6f0e4";
  g.fillRect(0, 0, c.width, c.height);
  g.save();
  g.globalAlpha = 0.9;
  g.fillStyle = paperPatternFill();
  g.fillRect(0, 0, c.width, c.height);
  g.restore();
}

function gutterShade(g, side) {
  const c = g.canvas;
  const grad = g.createLinearGradient(0, 0, c.width, 0);
  if (side === "left") {
    grad.addColorStop(0, "rgba(70, 46, 22, 0)");
    grad.addColorStop(0.84, "rgba(70, 46, 22, 0)");
    grad.addColorStop(0.94, "rgba(62, 40, 18, 0.07)");
    grad.addColorStop(1, "rgba(48, 30, 14, 0.26)");
  } else {
    grad.addColorStop(0, "rgba(48, 30, 14, 0.26)");
    grad.addColorStop(0.06, "rgba(62, 40, 18, 0.07)");
    grad.addColorStop(0.16, "rgba(70, 46, 22, 0)");
    grad.addColorStop(1, "rgba(70, 46, 22, 0)");
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
}

function drawEndpaper() {
  const c = pageCanvas();
  const g = c.getContext("2d");
  g.fillStyle = "#1a0e2e";
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function drawBookNamePage(titleText) {
  const c = pageCanvas();
  const g = c.getContext("2d");
  fillPaper(g, "#fbf6ea");
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  const title = titleText || sample.title || "The Secret of the Golden Key";
  const kicker = "A Wondii story";
  g.fillStyle = "#8a7360";
  g.font = "700 " + Math.round(c.width * 0.028) + "px Nunito, sans-serif";
  g.fillText(kicker.toUpperCase(), c.width / 2, c.height * 0.34);
  const rule = Math.round(c.width * 0.16);
  g.strokeStyle = "rgba(92, 70, 54, 0.35)";
  g.lineWidth = Math.max(1, c.width * 0.0016);
  g.beginPath();
  g.moveTo((c.width - rule) / 2, c.height * 0.37);
  g.lineTo((c.width + rule) / 2, c.height * 0.37);
  g.stroke();
  let titleSize = Math.round(c.width * 0.078);
  const minTitle = Math.round(c.width * 0.046);
  const maxW = c.width * 0.76;
  g.fillStyle = "#2a241c";
  let lines = wrapLines(g, title, maxW, titleSize, "650", "Fraunces, Georgia, serif");
  while (lines.length > 3 && titleSize > minTitle) {
    titleSize -= 2;
    lines = wrapLines(g, title, maxW, titleSize, "650", "Fraunces, Georgia, serif");
  }
  const lead = Math.round(titleSize * 1.18);
  let y = c.height * 0.46;
  g.font = "650 " + titleSize + "px Fraunces, Georgia, serif";
  lines.forEach(function (line) {
    g.fillText(line, c.width / 2, y);
    y += lead;
  });
  gutterShade(g, "left");
  return c;
}

function drawBlankLeaf() {
  const c = pageCanvas();
  const g = c.getContext("2d");
  g.fillStyle = "#f3eee4";
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function drawClosingLeaf() {
  const c = pageCanvas();
  const g = c.getContext("2d");
  g.fillStyle = "#fffaf6";
  g.fillRect(0, 0, c.width, c.height);
  const cx = c.width * 0.62;
  const cy = c.height * 0.42;
  const arm = Math.round(c.width * 0.085);
  g.strokeStyle = "rgba(92, 70, 54, 0.32)";
  g.lineWidth = Math.max(1, c.width * 0.0014);
  g.beginPath();
  g.moveTo(cx - arm, cy);
  g.lineTo(cx + arm, cy);
  g.stroke();
  g.fillStyle = "rgba(92, 70, 54, 0.62)";
  g.beginPath();
  g.arc(cx, cy, Math.max(4, c.width * 0.009), 0, Math.PI * 2);
  g.fill();
  gutterShade(g, "left");
  return c;
}

function drawClosingPage() {
  const c = pageCanvas();
  const g = c.getContext("2d");
  g.fillStyle = "#fffaf6";
  g.fillRect(0, 0, c.width, c.height);
  const title = "The End";
  const lines = [
    "We hope you loved this little adventure.",
    "Until the next story..."
  ];
  const titleSize = Math.round(c.width * 0.118);
  const lineSize = Math.round(c.width * 0.042);
  const lineLead = Math.round(lineSize * 1.85);
  const afterTitle = Math.round(titleSize * 0.55);
  const afterRule = Math.round(lineSize * 1.7);
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.font = "560 " + titleSize + "px Fraunces, Georgia, serif";
  const titleWidth = g.measureText(title).width;
  let y = Math.round(c.height * 0.42);
  g.fillStyle = "#5c4636";
  g.fillText(title, c.width / 2, y);
  y += afterTitle;
  const rule = Math.min(Math.round(c.width * 0.28), Math.round(titleWidth * 0.62));
  g.strokeStyle = "rgba(92, 70, 54, 0.4)";
  g.lineWidth = Math.max(1, c.width * 0.0016);
  g.beginPath();
  g.moveTo((c.width - rule) / 2, y);
  g.lineTo((c.width + rule) / 2, y);
  g.stroke();
  y += afterRule + Math.round(lineSize * 0.35);
  g.fillStyle = "#6e5846";
  g.font = "italic 560 " + lineSize + "px Fraunces, Georgia, serif";
  lines.forEach(function (line) {
    g.fillText(line, c.width / 2, y);
    y += lineLead;
  });
  gutterShade(g, "right");
  return c;
}

function closingSpread() {
  return {
    label: "The End",
    left: drawClosingLeaf(),
    right: drawClosingPage(),
    text: "The End. We hope you loved this little adventure. Until the next story..."
  };
}

function drawAuthorPage(authorName) {
  const c = pageCanvas();
  const g = c.getContext("2d");
  fillPaper(g, "#fbf6ea");
  const author = authorName || sample.author || "Wondii";
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#8a7360";
  g.font = "700 " + Math.round(c.width * 0.028) + "px Nunito, sans-serif";
  g.fillText("WRITTEN BY", c.width / 2, c.height * 0.4);
  const rule = Math.round(c.width * 0.12);
  g.strokeStyle = "rgba(92, 70, 54, 0.35)";
  g.lineWidth = Math.max(1, c.width * 0.0016);
  g.beginPath();
  g.moveTo((c.width - rule) / 2, c.height * 0.44);
  g.lineTo((c.width + rule) / 2, c.height * 0.44);
  g.stroke();
  let size = Math.round(c.width * 0.07);
  const minSize = Math.round(c.width * 0.04);
  const maxW = c.width * 0.76;
  g.fillStyle = "#2a241c";
  while (size > minSize) {
    g.font = "650 " + size + "px Fraunces, Georgia, serif";
    if (g.measureText(author).width <= maxW) break;
    size -= 2;
  }
  g.font = "650 " + size + "px Fraunces, Georgia, serif";
  const lines = wrapLines(g, author, maxW, size, "650", "Fraunces, Georgia, serif");
  const lead = Math.round(size * 1.2);
  let y = c.height * 0.52;
  lines.forEach(function (line) {
    g.fillText(line, c.width / 2, y);
    y += lead;
  });
  gutterShade(g, "right");
  return c;
}

function drawTitlePage(image) {
  const c = pageCanvas();
  const g = c.getContext("2d");
  fillPaper(g, "#fbf6ea");
  contain(g, image, 28, 28, c.width - 56, c.height - 56);
  g.textAlign = "center";
  g.shadowColor = "rgba(6, 12, 32, 0.78)";
  g.shadowBlur = 18;
  g.shadowOffsetY = 3;
  g.fillStyle = "#fffaf2";
  g.font = "650 72px Fraunces, Georgia, serif";
  wrap(g, "The Secret of the Golden Key", c.width / 2, 120, c.width - 150, 78);
  g.font = "600 28px Fredoka, Nunito, sans-serif";
  g.fillText("Starring Maya", c.width / 2, 300);
  return c;
}

function coverDraw(g, image, dx, dy, dw, dh, ax, ay) {
  const scale = Math.max(dw / image.width, dh / image.height);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = Math.max(0, Math.min(image.width - sw, (image.width - sw) * ax));
  const sy = Math.max(0, Math.min(image.height - sh, (image.height - sh) * ay));
  g.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

function emphasisWord(word) {
  const bare = word.replace(/^[“"'‘]+|[”"'’.,!?;:]+$/g, "");
  return /^(blink|blinks|blinked|blinking|oh)$/i.test(bare);
}

function markKind(line, wordStart, treatments) {
  let kind = "";
  (treatments || []).forEach(function (mark) {
    if (!mark || !mark.text) return;
    const at = line.indexOf(mark.text);
    if (at < 0) return;
    if (wordStart >= at && wordStart < at + mark.text.length) kind = mark.kind;
  });
  return kind;
}

function lineKind(line, treatments) {
  let kind = "";
  (treatments || []).forEach(function (mark) {
    if (mark && mark.text && line.trim() === String(mark.text).trim()) kind = mark.kind;
  });
  return kind;
}

function styleFor(kind, size, quote, word) {
  if (kind === "impact") return { font: "650 " + Math.round(size * 1.55) + "px Fredoka, Nunito, sans-serif", emphasis: true };
  if (kind === "spoken") return { font: "650 " + Math.round(size * 1.7) + "px Fredoka, Nunito, sans-serif", emphasis: true };
  if (kind === "motion") return { font: "italic 650 " + Math.round(size * 1.85) + "px Fraunces, Georgia, serif", emphasis: true };
  if (kind === "dialogue") return { font: "italic 650 " + Math.round(size * 1.38) + "px Fraunces, Georgia, serif", emphasis: true };
  if (kind === "magic") return { font: "italic 650 " + Math.round(size * 1.42) + "px Fraunces, Georgia, serif", emphasis: true };
  if (kind === "whisper" || kind === "quiet") return { font: "italic 560 " + size + "px Fraunces, Georgia, serif", soft: true };
  if (emphasisWord(word)) return { font: "600 " + Math.round(size * 1.28) + "px Fredoka, Nunito, sans-serif", emphasis: true };
  if (quote) return { font: "italic 560 " + size + "px Fraunces, Georgia, serif" };
  return { font: "560 " + size + "px Fraunces, Georgia, serif" };
}

function richParagraphs(g, lines, max, size, treatments) {
  const spaceFont = "560 " + size + "px Fraunces, Georgia, serif";
  return lines.map(function (line) {
    const quote = /^[“"]/.test(line);
    const words = line.split(" ");
    const rows = [];
    let row = [];
    let width = 0;
    let searchFrom = 0;
    words.forEach(function (word) {
      const wordStart = line.indexOf(word, searchFrom);
      const at = wordStart < 0 ? searchFrom : wordStart;
      const kind = markKind(line, at, treatments);
      const style = styleFor(kind, size, quote, word);
      g.font = style.font;
      const wordWidth = g.measureText(word).width;
      g.font = spaceFont;
      const gap = row.length ? g.measureText(" ").width : 0;
      const part = { text: word, font: style.font, emphasis: !!style.emphasis, soft: !!style.soft, width: wordWidth };
      if (row.length && width + gap + wordWidth > max) {
        rows.push(row);
        row = [part];
        width = wordWidth;
      } else {
        row.push(part);
        width += gap + wordWidth;
      }
      searchFrom = at + word.length;
    });
    if (row.length) rows.push(row);
    if (rows.length > 1 && rows[rows.length - 1].length === 1 && rows[rows.length - 2].length > 2) {
      rows[rows.length - 1].unshift(rows[rows.length - 2].pop());
    }
    rows.kind = lineKind(line, treatments);
    return rows;
  });
}

function paragraphGap(rows, leading, index) {
  let gap = index ? Math.round(leading * 0.55) : 0;
  if (rows && (rows.kind === "pause" || rows.kind === "motion" || rows.kind === "spoken")) gap += Math.round(leading * 0.95);
  else if (rows && (rows.kind === "whisper" || rows.kind === "quiet" || rows.kind === "magic" || rows.kind === "dialogue")) gap += Math.round(leading * 0.45);
  return gap;
}

function lineBox(rows, size) {
  const kind = rows && rows.kind;
  const scale = kind === "motion" ? 1.85 : (kind === "spoken" ? 1.7 : (kind === "magic" ? 1.42 : (kind === "dialogue" ? 1.38 : (kind === "impact" ? 1.55 : 1))));
  return Math.round(size * 1.45 * scale);
}

function blockHeight(paragraphs, size) {
  const body = Math.round(size * 1.45);
  return paragraphs.reduce(function (sum, rows, index) {
    return sum + rows.length * lineBox(rows, size) + paragraphGap(rows, body, index);
  }, 0);
}

function paintUnfitted(g, zone) {
  g.save();
  g.beginPath();
  g.rect(zone.x, zone.y, Math.max(1, zone.w), Math.max(1, zone.h));
  g.clip();
  g.shadowBlur = 0;
  g.fillStyle = "#6b3a2a";
  g.font = "560 " + Math.max(22, Math.round((zone.size || 32) * 0.72)) + "px Fraunces, Georgia, serif";
  g.textAlign = "left";
  g.fillText("These words do not fit on this page.", zone.x, zone.y + Math.max(28, Math.round(zone.h * 0.45)));
  g.restore();
}

function layoutCopy(g, lines, zone) {
  const spaceFont = function (size) {
    return "560 " + size + "px Fraunces, Georgia, serif";
  };
  let size = zone.size || zone.maxSize;
  let paragraphs = richParagraphs(g, lines, zone.w, size, zone.marks);
  let leading = Math.round(size * 1.45);
  let height = blockHeight(paragraphs, size);
  while (height > zone.h && size > zone.minSize) {
    size -= 2;
    leading = Math.round(size * 1.45);
    paragraphs = richParagraphs(g, lines, zone.w, size, zone.marks);
    height = blockHeight(paragraphs, size);
  }
  if (height > zone.h + 1) {
    paintUnfitted(g, zone);
    return { height: height, size: size, clipped: true };
  }
  const textRows = paragraphs.reduce(function (sum, rows) { return sum + rows.length; }, 0);
  const sparse = zone.anchor !== "start" && !zone.align && textRows <= 4 && height < zone.h * 0.62;
  const align = zone.align || (sparse ? "center" : "left");
  const middle = zone.valign === "middle" || sparse;
  const firstBox = paragraphs.length ? lineBox(paragraphs[0], size) : leading;
  let y = (middle ? zone.y + Math.max(0, (zone.h - height) / 2) : zone.y) + firstBox * 0.78;
  const ink = zone.color || "#2a241c";
  const accent = zone.accent || (ink === "#fffaf2" ? "#ffe7a8" : "#6d28d9");
  g.save();
  g.beginPath();
  g.rect(zone.x, zone.y, zone.w, zone.h);
  g.clip();
  g.shadowBlur = zone.color ? g.shadowBlur : 0;
  g.textAlign = "left";
  paragraphs.forEach(function (rows, index) {
    y += paragraphGap(rows, leading, index);
    const rowLeading = lineBox(rows, size);
    rows.forEach(function (row) {
      let width = 0;
      row.forEach(function (part, i) {
        g.font = spaceFont(size);
        width += part.width + (i ? g.measureText(" ").width : 0);
      });
      let x = align === "center" ? zone.x + Math.max(0, (zone.w - width) / 2) : zone.x;
      row.forEach(function (part, i) {
        g.font = spaceFont(size);
        if (i) x += g.measureText(" ").width;
        g.font = part.font;
        g.fillStyle = part.soft ? "#3d342c" : (part.emphasis ? accent : ink);
        g.fillText(part.text, x, y);
        x += part.width;
      });
      y += rowLeading;
    });
  });
  g.restore();
  return { height: height, size: size, clipped: false };
}

function roundedPath(g, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + radius, y);
  g.arcTo(x + w, y, x + w, y + h, radius);
  g.arcTo(x + w, y + h, x, y + h, radius);
  g.arcTo(x, y + h, x, y, radius);
  g.arcTo(x, y, x + w, y, radius);
  g.closePath();
}

function paintFolio(g, folio, side, ink) {
  const c = g.canvas;
  g.shadowBlur = 0;
  g.fillStyle = ink || "#7a6a56";
  g.font = "560 " + Math.max(22, Math.round(c.width * 0.031)) + "px Fraunces, Georgia, serif";
  g.textAlign = side === "left" ? "left" : "right";
  const inset = Math.round(c.width * 0.051);
  g.fillText(String(folio), side === "left" ? inset : c.width - inset, c.height - Math.round(c.height * 0.031));
}

function paperPage() {
  const c = pageCanvas();
  fillPaper(c.getContext("2d"));
  return c;
}

function measureCopy(g, lines, width, size, treatments) {
  const paragraphs = richParagraphs(g, lines, width, size, treatments);
  return { height: blockHeight(paragraphs, size), size: size };
}

function fitTypeSize(g, pages, layouts, specs) {
  const samplePage = pageCanvas();
  const pageW = samplePage.width;
  const pageH = samplePage.height;
  const chain = specs || (window.WondiiArtDirection && window.WondiiArtDirection.adaptChain
    ? window.WondiiArtDirection.adaptChain(pages)
    : []);
  const directedBook = chain.some(function (spec) { return spec && spec.layout; });
  let size = Math.round(pageW * (directedBook ? 0.06 : 0.046));
  const minSize = Math.round(pageW * 0.03);
  (pages || []).forEach(function (page, index) {
    const lines = storyLines(page.text);
    const layout = layouts ? layouts[index] : "above";
    const side = index % 2 ? "right" : "left";
    let trial = size;
    if (page.image) {
      const spec = chain[index];
      const directed = spec && spec.layout && window.WondiiArtDirection;
      const linesForFit = directed ? displayLines(page.text, spec.treatments) : lines;
      const probe = directed
        ? window.WondiiArtDirection.compose(spec, pageW, pageH, page.image.width, page.image.height, side, 0)
        : pageComposition(layout, pageW, pageH, page.image.width, page.image.height, side, 0);
      while (trial > minSize) {
        const measured = measureCopy(g, linesForFit, probe.text.w, trial, directed ? spec.treatments : null);
        const placed = directed
          ? window.WondiiArtDirection.compose(spec, pageW, pageH, page.image.width, page.image.height, side, measured.height)
          : pageComposition(layout, pageW, pageH, page.image.width, page.image.height, side, measured.height);
        if (measured.height <= placed.text.h && placed.text.y + measured.height <= pageH - placed.folio) break;
        const next = trial - 2;
        if (next < minSize) {
          trial = minSize;
          break;
        }
        trial = next;
      }
    } else {
      const textW = pageW - Math.round(pageW * 0.15);
      const zoneH = pageH - Math.round(pageH * 0.14);
      while (trial > minSize && measureCopy(g, lines, textW, trial).height > zoneH) {
        const next = trial - 2;
        if (next < minSize) {
          trial = minSize;
          break;
        }
        trial = next;
      }
    }
    if (trial < size) size = trial;
  });
  return size;
}

function drawFramedPage(image, lines, folio, side, typeSize, layout) {
  const c = paperPage();
  const g = c.getContext("2d");
  const size = typeSize || Math.round(c.width * 0.046);
  const probe = pageComposition(layout, c.width, c.height, image.width, image.height, side, 0);
  const measured = measureCopy(g, lines, probe.text.w, size);
  const placed = pageComposition(layout, c.width, c.height, image.width, image.height, side, measured.height);
  g.drawImage(image, 0, 0, image.width, image.height, placed.image.x, placed.image.y, placed.image.w, placed.image.h);
  layoutCopy(g, lines, {
    x: placed.text.x,
    y: placed.text.y,
    w: placed.text.w,
    h: placed.text.h,
    maxSize: size,
    minSize: Math.round(c.width * 0.028),
    size: size,
    anchor: "start",
    align: placed.align,
    valign: placed.valign
  });
  paintFolio(g, folio, side);
  gutterShade(g, side);
  return c;
}

function drawProsePage(lines, folio, side, typeSize) {
  const c = paperPage();
  const g = c.getContext("2d");
  const inset = Math.round(c.width * 0.09);
  const size = typeSize || Math.round(c.width * 0.051);
  layoutCopy(g, lines, {
    x: inset,
    y: Math.round(c.height * 0.067),
    w: c.width - inset * 2,
    h: c.height - Math.round(c.height * 0.14),
    maxSize: size,
    minSize: Math.round(c.width * 0.03),
    size: typeSize || 0,
    anchor: typeSize ? "start" : ""
  });
  paintFolio(g, folio, side);
  gutterShade(g, side);
  return c;
}

function drawAbovePage(image, lines, folio, side, typeSize) {
  const c = paperPage();
  const g = c.getContext("2d");
  const inset = Math.round(c.width * 0.075);
  const textW = c.width - inset * 2;
  const size = typeSize || Math.round(c.width * 0.046);
  const measured = measureCopy(g, lines, textW, size);
  const placed = pageImageBand(c.width, c.height, image.width, image.height, measured.height);
  const crop = imageCrop(c.width, placed.band, image.width, image.height, 0.5, 0.4);
  g.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, c.width, placed.band);
  layoutCopy(g, lines, {
    x: inset,
    y: placed.band + placed.gap,
    w: textW,
    h: Math.max(placed.folio, c.height - placed.band - placed.gap - placed.folio),
    maxSize: size,
    minSize: Math.round(c.width * 0.028),
    size: size,
    anchor: "start"
  });
  paintFolio(g, folio, side);
  gutterShade(g, side);
  return c;
}

function drawPortraitPlate(image, folio) {
  const c = pageCanvas();
  const g = c.getContext("2d");
  coverDraw(g, image, 0, 0, c.width, c.height, 0.9, 0.5);
  paintFolio(g, folio, "right", "rgba(62, 42, 28, 0.72)");
  gutterShade(g, "right");
  return c;
}

function drawBleedPage(image, line, folio) {
  const c = pageCanvas();
  const g = c.getContext("2d");
  coverDraw(g, image, 0, 0, c.width, c.height, 0.16, 0.5);
  const fade = g.createLinearGradient(0, c.height * 0.74, 0, c.height);
  fade.addColorStop(0, "rgba(10, 18, 14, 0)");
  fade.addColorStop(1, "rgba(10, 18, 14, 0.78)");
  g.fillStyle = fade;
  g.fillRect(0, c.height * 0.68, c.width, c.height * 0.32);
  g.shadowColor = "rgba(0, 0, 0, 0.35)";
  g.shadowBlur = 8;
  layoutCopy(g, [line], {
    x: 64,
    y: c.height * 0.76,
    w: c.width - 150,
    h: c.height * 0.16,
    maxSize: 34,
    minSize: 24,
    color: "#fffaf2",
    align: "left"
  });
  g.shadowBlur = 0;
  paintFolio(g, folio, "right", "rgba(255,250,242,0.88)");
  gutterShade(g, "right");
  return c;
}

function splitWide(wide) {
  const left = document.createElement("canvas");
  const right = document.createElement("canvas");
  left.width = right.width = wide.width / 2;
  left.height = right.height = wide.height;
  left.getContext("2d").drawImage(wide, 0, 0);
  right.getContext("2d").drawImage(wide, -wide.width / 2, 0);
  return [left, right];
}

function drawPanorama(image, line) {
  const c = document.createElement("canvas");
  c.width = 1800;
  c.height = Math.round(900 * (PAGE_H / PAGE_W));
  const g = c.getContext("2d");
  coverDraw(g, image, 0, 0, c.width, c.height, 0.08, 0.42);
  g.shadowColor = "rgba(16, 18, 40, 0.45)";
  g.shadowBlur = 10;
  layoutCopy(g, [line], {
    x: c.width / 2 + 72,
    y: 78,
    w: c.width / 2 - 150,
    h: c.height * 0.28,
    maxSize: 34,
    minSize: 24,
    color: "#fffaf2"
  });
  g.shadowBlur = 0;
  g.font = "560 28px Fraunces, Georgia, serif";
  g.fillStyle = "rgba(255,250,242,0.9)";
  g.fillText("7", 46, c.height - 42);
  g.textAlign = "right";
  g.fillText("8", c.width - 46, c.height - 42);
  return splitWide(c);
}

function makeSpreads(art) {
  const pan = drawPanorama(art.p8, "Maya carried the key into the open garden. The wall stayed behind them.");
  return [
    {
      label: "Title",
      left: drawBookNamePage(),
      right: drawAuthorPage(),
      text: (sample.title || "The Secret of the Golden Key") + ". Written by " + (sample.author || "Wondii") + "."
    },
    {
      label: "Picture above the words",
      left: drawAbovePage(art.p1, [
        "Maya knelt by the old clay pot. A small gold light blinked under the rim, then hid when she looked up."
      ], "1", "left"),
      right: drawAbovePage(art.p2, [
        "She held out one open hand.",
        "“I will not grab,” she whispered. “You can come out if you want to.”"
      ], "2", "right"),
      text: "Maya knelt by the old clay pot. She held out one open hand."
    },
    {
      label: "Words beside the picture",
      left: drawProsePage([
        "“Where do you belong?” she asked.",
        "The key blinked twice. The garden wall hid almost all of the sky."
      ], "4", "left"),
      right: drawPortraitPlate(art.p5, "5"),
      text: "Where do you belong? she asked."
    },
    {
      label: "Across both pages",
      full: true,
      left: pan[0],
      right: pan[1],
      text: "Maya carried the key into the open garden."
    },
    {
      label: "A full-page picture",
      left: drawProsePage([
        "Far above the trees, two stars blinked back."
      ], "10", "left"),
      right: drawBleedPage(art.p10, "Maya opened her hands. The golden key rose, leaving a thin trail of light.", "11"),
      text: "Maya opened her hands. The golden key rose."
    },
    closingSpread()
  ];
}

function bendMaterial(front, back) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL1,
    uniforms: {
      progress: { value: 0 },
      lead: { value: 0.62 },
      bow: { value: 0.012 },
      pageWidth: { value: PAGE_W },
      frontMap: { value: front },
      backMap: { value: back }
    },
    vertexShader: [
      "uniform float progress;",
      "uniform float lead;",
      "uniform float bow;",
      "uniform float pageWidth;",
      "varying vec2 vUv;",
      "varying float vBack;",
      "varying float vShade;",
      "void main() {",
      "  vUv = uv;",
      "  float p = clamp(progress, 0.0, 1.0);",
      "  float t = clamp(position.x / pageWidth, 0.0, 1.0);",
      "  float angle = p * 3.14159265;",
      "  float lift = sin(angle);",
      "  float extra = lift * lead * (1.0 - smoothstep(0.55, 0.86, p));",
      "  float a = angle + extra * t;",
      "  float settle = smoothstep(0.9, 1.0, p);",
      "  float arc = sin(t * 3.14159265) * bow * (1.0 - lift) * (1.0 - settle);",
      "  vec3 pos = vec3(cos(a) * position.x, position.y, sin(a) * position.x + arc);",
      "  vBack = a > 1.5707963 ? 1.0 : 0.0;",
      "  float light = 0.58 + 0.42 * abs(cos(a));",
      "  vShade = light * (0.8 + 0.2 * smoothstep(0.0, 0.2, t));",
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform sampler2D frontMap;",
      "uniform sampler2D backMap;",
      "varying vec2 vUv;",
      "varying float vBack;",
      "varying float vShade;",
      "void main() {",
      "  vec4 tex = vBack > 0.5",
      "    ? texture2D(backMap, vec2(1.0 - vUv.x, vUv.y))",
      "    : texture2D(frontMap, vUv);",
      "  gl_FragColor = vec4(tex.rgb * vShade, 1.0);",
      "}"
    ].join("\n"),
    side: THREE.DoubleSide
  });
}

function bentMesh(material) {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, 48, 12);
  geo.translate(PAGE_W / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(0, 0, 0.015);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function sideMesh(side) {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);
  geo.translate(side === "left" ? -PAGE_W / 2 : PAGE_W / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: side === "left" ? 1 : -1,
    polygonOffsetUnits: side === "left" ? 1 : -1
  }));
  mesh.position.z = 0.015;
  mesh.visible = false;
  return mesh;
}

function drawSpineTitle(titleText) {
  const title = titleText || sample.title || "The Secret of the Golden Key";
  const spineSize = spineCanvasSize(SPINE_DEPTH - 0.1, COVER_H - 0.42, 1800);
  const c = document.createElement("canvas");
  c.width = spineSize.width;
  c.height = spineSize.height;
  const g = c.getContext("2d");
  g.fillStyle = "#241433";
  g.fillRect(0, 0, c.width, c.height);
  g.save();
  g.translate(c.width / 2, c.height / 2);
  g.rotate(-Math.PI / 2);
  let size = 92;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "650 " + size + "px Fraunces, Georgia, serif";
  while (g.measureText(title).width > c.height * 0.72 && size > 48) {
    size -= 2;
    g.font = "650 " + size + "px Fraunces, Georgia, serif";
  }
  g.fillStyle = "#f3e6cf";
  g.fillText(title, 0, size * 0.04);
  g.restore();
  return c;
}

function drawBackStamp(logo) {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = Math.round(800 * COVER_H / COVER_W);
  const g = c.getContext("2d");
  g.fillStyle = "#3a2158";
  g.fillRect(0, 0, c.width, c.height);
  const lw = logo.naturalWidth || logo.width || 3030;
  const lh = logo.naturalHeight || logo.height || 880;
  const markW = Math.round(c.width * 0.72);
  const markH = Math.round(markW * (lh / lw));
  const stamp = document.createElement("canvas");
  stamp.width = markW;
  stamp.height = markH;
  const sg = stamp.getContext("2d");
  sg.drawImage(logo, 0, 0, markW, markH);
  const data = sg.getImageData(0, 0, markW, markH);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const gc = px[i + 1];
    const b = px[i + 2];
    const a = px[i + 3];
    const max = Math.max(r, gc, b);
    if (a > 16 && b > r + 12 && b > gc && r < 100 && gc < 110 && max < 170) {
      px[i] = 255;
      px[i + 1] = 255;
      px[i + 2] = 255;
      px[i + 3] = Math.round(255 * 0.55 * (a / 255));
    }
  }
  sg.putImageData(data, 0, 0);
  g.drawImage(stamp, (c.width - markW) / 2, (c.height - markH) / 2);
  return c;
}

function useMap(mesh, texture) {
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;
}

function storyLines(text) {
  const parts = String(text || "").split(/\n+/).map(function (line) {
    return line.trim();
  }).filter(Boolean);
  return parts.length ? parts : [" "];
}

function displayLines(text, treatments) {
  const lines = storyLines(text);
  const marks = (treatments || []).filter(function (mark) {
    return mark && mark.text && (mark.kind === "pause" || mark.kind === "motion" || mark.kind === "spoken" || mark.kind === "whisper" || mark.kind === "quiet" || mark.kind === "impact" || mark.kind === "magic" || mark.kind === "dialogue");
  });
  if (!marks.length) return lines;
  return lines.reduce(function (out, line) {
    let pieces = [line];
    marks.forEach(function (mark) {
      const next = [];
      pieces.forEach(function (piece) {
        const at = piece.indexOf(mark.text);
        if (at < 0) {
          next.push(piece);
          return;
        }
        const before = piece.slice(0, at).trim();
        const after = piece.slice(at + mark.text.length).trim();
        if (before) next.push(before);
        next.push(mark.text);
        if (after) next.push(after);
      });
      pieces = next;
    });
    pieces.forEach(function (piece) {
      if (piece.trim()) out.push(piece.trim());
    });
    return out;
  }, []);
}

function fadePlate(g, box, amount) {
  g.save();
  g.globalCompositeOperation = "destination-out";
  const bands = [
    [box.x, box.y, box.x + amount, box.y, box.x, box.y, amount, box.h],
    [box.x + box.w, box.y, box.x + box.w - amount, box.y, box.x + box.w - amount, box.y, amount, box.h],
    [box.x, box.y, box.x, box.y + amount, box.x, box.y, box.w, amount],
    [box.x, box.y + box.h, box.x, box.y + box.h - amount, box.x, box.y + box.h - amount, box.w, amount]
  ];
  bands.forEach(function (band) {
    const grad = g.createLinearGradient(band[0], band[1], band[2], band[3]);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.55)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = grad;
    g.fillRect(band[4], band[5], band[6], band[7]);
  });
  g.restore();
}

function drawDirectedImage(g, image, placed) {
  const box = placed.image;
  g.save();
  if (placed.radius) {
    roundedPath(g, box.x, box.y, box.w, box.h, placed.radius);
    g.clip();
  }
  g.drawImage(image, box.sx, box.sy, box.sw, box.sh, box.x, box.y, box.w, box.h);
  if (placed.feather) fadePlate(g, box, Math.max(12, Math.round(Math.min(box.w, box.h) * 0.045)));
  g.restore();
}

function drawDirectedPage(image, lines, folio, side, typeSize, direction, sharedCopy) {
  const c = paperPage();
  const g = c.getContext("2d");
  const art = window.WondiiArtDirection;
  const size = typeSize || Math.round(c.width * 0.046);
  const probe = art.compose(direction, c.width, c.height, image.width, image.height, side, 0);
  const measured = measureCopy(g, lines, probe.text.w, size, direction.treatments);
  const copyH = Math.max(measured.height, sharedCopy || 0);
  const placed = art.compose(direction, c.width, c.height, image.width, image.height, side, copyH);
  drawDirectedImage(g, image, placed);
  layoutCopy(g, lines, {
    x: placed.text.x,
    y: placed.text.y,
    w: placed.text.w,
    h: placed.text.h,
    maxSize: size,
    minSize: Math.round(c.width * 0.03),
    size: size,
    anchor: "start",
    align: placed.align,
    marks: direction.treatments || [],
    accent: direction.accent || "#143d4f"
  });
  paintFolio(g, folio, side);
  gutterShade(g, side);
  return c;
}

function continuousSpread(left, right, leftSpec, rightSpec) {
  return !!(left && right && left.image && right.image &&
    left.imageSrc && left.imageSrc === right.imageSrc &&
    leftSpec && rightSpec &&
    leftSpec.layout === "spread" && rightSpec.layout === "spread" &&
    leftSpec.continuous && rightSpec.continuous);
}

function directedCopyHeight(page, side, typeSize, spec) {
  const c = pageCanvas();
  const g = c.getContext("2d");
  const size = typeSize || Math.round(c.width * 0.046);
  const lines = displayLines(page.text, spec.treatments);
  const probe = window.WondiiArtDirection.compose(spec, c.width, c.height, page.image.width, page.image.height, side, 0);
  return measureCopy(g, lines, probe.text.w, size, spec.treatments).height;
}

function paintPage(page, side, typeSize, layout, spec, sharedCopy) {
  const directed = spec && spec.layout && window.WondiiArtDirection;
  const lines = directed ? displayLines(page.text, spec.treatments) : storyLines(page.text);
  if (page.image && directed) return drawDirectedPage(page.image, lines, String(page.number), side, typeSize, spec, sharedCopy);
  if (page.image) return drawFramedPage(page.image, lines, String(page.number), side, typeSize, layout || "above");
  if (page.missingArt) lines.push("The picture for this page is not on this book yet.");
  return drawProsePage(lines, String(page.number), side, typeSize);
}

function compositionFace(kind, size) {
  const px = Math.round(size);
  if (kind === "sound") return { font: "650 " + Math.round(size * 1.16) + "px Fredoka, Nunito, sans-serif", color: "#9a3412" };
  if (kind === "sound-subtle") return { font: "600 " + px + "px Fredoka, Nunito, sans-serif", color: "#9a3412" };
  if (kind === "whisper" || kind === "discovery" || kind === "surprise") {
    return { font: "italic 560 " + px + "px Fraunces, Georgia, serif", color: "#1c4d66" };
  }
  return { font: "560 " + px + "px Fraunces, Georgia, serif", color: "#2a241c" };
}

function compositionKindAt(marks, index) {
  for (let i = 0; i < marks.length; i += 1) {
    if (index >= marks[i].start && index < marks[i].end) return marks[i].kind;
  }
  return "";
}

function compositionLayout(g, text, maxW, size, lead, marks) {
  const source = String(text || "");
  g.font = compositionFace("", size).font;
  const gap = g.measureText(" ").width;
  const paragraphs = source.split(/\n\n/);
  let cursor = 0;
  const blocks = [];
  paragraphs.forEach(function (paragraph, paragraphIndex) {
    if (paragraphIndex) cursor += 2;
    const origin = Math.max(0, source.indexOf(paragraph, cursor));
    const parts = [];
    const wordRe = /\S+/g;
    let match;
    while ((match = wordRe.exec(paragraph))) {
      const face = compositionFace(compositionKindAt(marks, origin + match.index), size);
      g.font = face.font;
      parts.push({ word: match[0], font: face.font, color: face.color, w: g.measureText(match[0]).width });
    }
    cursor = origin + paragraph.length;
    const lines = [];
    let line = [];
    let width = 0;
    parts.forEach(function (part) {
      const next = width + (line.length ? gap : 0) + part.w;
      if (line.length && next > maxW) {
        lines.push(line);
        line = [part];
        width = part.w;
      } else {
        line.push(part);
        width = next;
      }
    });
    if (line.length) lines.push(line);
    blocks.push(lines);
  });
  const lineH = Math.round(size * lead);
  const paraGap = Math.round(size * 0.7);
  let height = 0;
  blocks.forEach(function (lines, index) {
    height += lines.length * lineH;
    if (index) height += paraGap;
  });
  return { blocks: blocks, lineH: lineH, paraGap: paraGap, height: height, gap: gap };
}

function paintCompositionText(g, layout, x, y, align) {
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  layout.blocks.forEach(function (lines, blockIndex) {
    if (blockIndex) y += layout.paraGap;
    lines.forEach(function (row) {
      let rowW = 0;
      row.forEach(function (part, i) { rowW += part.w + (i ? layout.gap : 0); });
      let pen = align === "center" ? x - rowW / 2 : x;
      row.forEach(function (part, i) {
        if (i) pen += layout.gap;
        g.font = part.font;
        g.fillStyle = part.color;
        g.fillText(part.word, pen, y);
        pen += part.w;
      });
      y += layout.lineH;
    });
  });
  return y;
}

function compositionCopy(g, text, column, age, mood, top, bottom, discoveries) {
  const comp = window.WondiiComposition;
  const marks = comp.chooseMarks(text, { age: age, mood: mood, discoveries: discoveries || [] });
  let size = comp.typeSize(age, g.canvas.width);
  const floor = Math.round(g.canvas.width * 0.024);
  const room = Math.max(1, bottom - top);
  let layout = compositionLayout(g, text, column.w, size, comp.leading(age), marks);
  let guard = 0;
  while (layout.height > room && size > floor && guard < 14) {
    size = Math.max(floor, Math.round(size * 0.9));
    layout = compositionLayout(g, text, column.w, size, comp.leading(age), marks);
    guard += 1;
  }
  if (layout.height > room + 1) {
    paintUnfitted(g, { x: column.x, y: top, w: column.w, h: room, size: size });
    return;
  }
  const descent = Math.round(size * 0.22);
  let baseline = top + Math.round(size * 0.82);
  const spare = room - layout.height;
  if (spare > 0) baseline += spare / 2;
  const last = baseline + Math.max(0, layout.height - layout.lineH);
  if (last + descent > bottom) baseline -= last + descent - bottom;
  if (baseline < top + Math.round(size * 0.7)) baseline = top + Math.round(size * 0.7);
  paintCompositionText(g, layout, column.x, baseline, "left");
}

function layoutWidth(layout) {
  let widest = 0;
  (layout.blocks || []).forEach(function (lines) {
    lines.forEach(function (row) {
      let rowW = 0;
      row.forEach(function (part, index) { rowW += part.w + (index ? layout.gap : 0); });
      if (rowW > widest) widest = rowW;
    });
  });
  return widest;
}

function paintSoftBacking(g, x, y, w, h) {
  const padX = Math.max(28, Math.round(w * 0.12));
  const padY = Math.max(22, Math.round(h * 0.45));
  const left = Math.max(0, x - padX);
  const top = Math.max(0, y - padY);
  const width = Math.min(g.canvas.width - left, w + padX * 2);
  const height = Math.min(g.canvas.height - top, h + padY * 2);
  g.save();
  g.filter = "blur(18px)";
  g.fillStyle = "rgba(251, 246, 234, 0.78)";
  g.beginPath();
  g.ellipse(left + width / 2, top + height / 2, Math.max(1, width / 2), Math.max(1, height / 2), 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function paintOverArt(g, text, side, age, mood, discoveries, where) {
  if (!text || !window.WondiiComposition) return;
  const comp = window.WondiiComposition;
  const c = g.canvas;
  const safe = comp.safeRead(c.width, c.height);
  const column = comp.textColumn(side, c.width);
  const marks = comp.chooseMarks(text, { age: age, mood: mood, discoveries: discoveries || [] });
  let size = Math.min(comp.typeSize(age || "7-9", c.width), Math.round(c.width * 0.042));
  const floor = Math.round(c.width * 0.024);
  const lower = comp.integratedBand(c.width, c.height);
  let layout = compositionLayout(g, text, column.w, size, comp.leading(age || "7-9"), marks);
  let guard = 0;
  const limit = where === "upper" ? c.height * 0.34 : Math.min(lower.h, safe.bottom - lower.y);
  while (layout.height > limit && size > floor && guard < 14) {
    size = Math.max(floor, Math.round(size * 0.9));
    layout = compositionLayout(g, text, column.w, size, comp.leading(age || "7-9"), marks);
    guard += 1;
  }
  let top = where === "upper" ? safe.top : lower.y;
  if (layout.height > limit + 1) {
    paintUnfitted(g, { x: column.x, y: top, w: column.w, h: Math.max(1, Math.min(limit, safe.bottom - top)), size: size });
    return;
  }
  if (top + layout.height > safe.bottom) top = Math.max(safe.top, safe.bottom - layout.height);
  const washW = Math.min(column.w, Math.max(layoutWidth(layout), size * 4));
  paintSoftBacking(g, column.x, top, washW, Math.min(layout.height, safe.bottom - top));
  const descent = Math.round(size * 0.22);
  let baseline = top + Math.round(size * 0.82);
  const last = baseline + Math.max(0, layout.height - layout.lineH);
  if (last + descent > safe.bottom) baseline -= last + descent - safe.bottom;
  paintCompositionText(g, layout, column.x, baseline, "left");
}

function featherPlate(g, image) {
  const c = g.canvas;
  fillPaper(g, "#f6f0e4");
  if (!image) return;
  const scale = Math.min((c.width * 0.9) / image.width, (c.height * 0.68) / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  const x = (c.width - dw) / 2;
  const y = c.height * 0.08;
  g.drawImage(image, x, y, dw, dh);
  const fade = Math.round(Math.min(dw, dh) * 0.22);
  const edge = "rgba(246, 240, 228, 1)";
  const clear = "rgba(246, 240, 228, 0)";
  function wash(rect, x1, y1, x2, y2) {
    const grad = g.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, edge);
    grad.addColorStop(1, clear);
    g.fillStyle = grad;
    g.fillRect(rect[0], rect[1], rect[2], rect[3]);
  }
  wash([x, y, dw, fade], x, y, x, y + fade);
  wash([x, y + dh - fade, dw, fade], x, y + dh, x, y + dh - fade);
  wash([x, y, fade, dh], x, y, x + fade, y);
  wash([x + dw - fade, y, fade, dh], x + dw, y, x + dw - fade, y);
}

function spreadQuietWhere(leaf) {
  const region = String(leaf && leaf.quietRegion || "");
  if (region === "upper" || region === "upper-left" || region === "upper-right") return "upper";
  if (region === "lower") return "lower";
  return "";
}

function measureSpreadQuiet(g, text, side, age, mood, discoveries, where) {
  const comp = window.WondiiComposition;
  const c = g.canvas;
  const floor = Math.round(c.width * 0.03);
  let size = Math.max(floor, Math.min(comp.typeSize(age || "7-9", c.width), Math.round(c.width * 0.042)));
  const column = comp.textColumn(side, c.width);
  const marks = comp.chooseMarks(text, { age: age, mood: mood, discoveries: discoveries || [] });
  const lower = comp.integratedBand(c.width, c.height);
  const safe = comp.safeRead(c.width, c.height);
  const limit = where === "upper" ? c.height * 0.34 : Math.min(lower.h, safe.bottom - lower.y);
  let layout = compositionLayout(g, text, column.w, size, comp.leading(age || "7-9"), marks);
  while (layout.height > limit && size > floor) {
    const next = size - 2;
    if (next < floor) break;
    size = next;
    layout = compositionLayout(g, text, column.w, size, comp.leading(age || "7-9"), marks);
  }
  const top = where === "upper" ? safe.top : lower.y;
  if (layout.height > limit + 1 || top + layout.height > safe.bottom + 1 || size < floor) return { ok: false };
  const folioTop = c.height - Math.round(c.height * 0.058);
  return { ok: true, layout: layout, column: column, size: size, top: top, folio: top + layout.height < folioTop };
}

function paintSpreadQuiet(g, measured) {
  const washW = Math.min(measured.column.w, Math.max(layoutWidth(measured.layout), measured.size * 4));
  paintSoftBacking(g, measured.column.x, measured.top, washW, measured.layout.height);
  const baseline = measured.top + Math.round(measured.size * 0.82);
  paintCompositionText(g, measured.layout, measured.column.x, baseline, "left");
}

function spreadDirection(side) {
  return {
    layout: "spread",
    continuous: true,
    half: side,
    crop: { maxSide: 0.16 },
    textAlign: "left",
    edge: "bleed",
    treatments: []
  };
}

function directedContinuousSpread(left, right) {
  const specL = spreadDirection("left");
  const specR = spreadDirection("right");
  const measurer = pageCanvas().getContext("2d");
  const typeSize = fitTypeSize(measurer, [left, right], ["above", "above"], [specL, specR]);
  const shared = Math.max(
    directedCopyHeight(left, "left", typeSize, specL),
    directedCopyHeight(right, "right", typeSize, specR)
  );
  return {
    label: "spread",
    left: paintPage(left, "left", typeSize, "above", specL, shared),
    right: paintPage(right, "right", typeSize, "above", specR, shared),
    text: [left && left.text, right && right.text].filter(Boolean).join(" ")
  };
}

function paintSpreadHalf(g, image, side) {
  const c = g.canvas;
  const slice = window.WondiiComposition && window.WondiiComposition.spreadSlice
    ? window.WondiiComposition.spreadSlice(image.width, image.height, c.width, c.height, side)
    : null;
  if (!slice || !(slice.sw > 0) || !(slice.sh > 0)) return false;
  g.drawImage(image, slice.sx, slice.sy, slice.sw, slice.sh, 0, 0, c.width, c.height);
  return true;
}

function paintCompositionLeaf(page, side) {
  const c = pageCanvas();
  const g = c.getContext("2d");
  const leaf = page && page.leaf || {};
  const comp = window.WondiiComposition;
  const kind = leaf.composition || "";
  const role = leaf.role || "blank";
  const text = page && page.text ? String(page.text) : "";
  const image = page && page.image;
  const fit = image && comp ? comp.assetFit(kind, image.width, image.height) : "missing";
  const useSoft = !image || fit === "soft-fallback" || fit === "missing" || role === "soft";
  if (role === "blank") {
    fillPaper(g);
    gutterShade(g, side);
    return c;
  }
  if (role === "text") {
    fillPaper(g);
    const column = comp.textColumn(side, c.width);
    const safe = comp.safeRead(c.width, c.height);
    compositionCopy(g, text, column, leaf.age || "7-9", leaf.mood || "story", safe.top, safe.bottom, leaf.discoveries);
    gutterShade(g, side);
    return c;
  }
  if (role === "spread-left" || role === "spread-right") {
    if (image && fit !== "planned") {
      coverDraw(g, image, 0, 0, c.width, c.height, 0.5, 0.45);
      if (text) paintOverArt(g, text, side, leaf.age, leaf.mood, leaf.discoveries, "lower");
      gutterShade(g, side);
      return c;
    }
    if (image && fit === "planned") {
      const where = spreadQuietWhere(leaf);
      const quiet = where && text ? measureSpreadQuiet(g, text, side, leaf.age, leaf.mood, leaf.discoveries, where) : null;
      if (quiet && quiet.ok && paintSpreadHalf(g, image, side)) {
        paintSpreadQuiet(g, quiet);
        if (quiet.folio && page.number) paintFolio(g, String(page.number), side);
        gutterShade(g, side);
        return c;
      }
    }
  }
  if (!useSoft && image && (role === "bleed" || role === "integrated")) {
    coverDraw(g, image, 0, 0, c.width, c.height, 0.5, 0.45);
    if (text && (role === "integrated" || kind === "full-page")) {
      paintOverArt(g, text, side, leaf.age, leaf.mood, leaf.discoveries, "lower");
    }
    gutterShade(g, side);
    return c;
  }
  featherPlate(g, image);
  if (text) {
    const column = comp.textColumn(side, c.width);
    const safe = comp.safeRead(c.width, c.height);
    compositionCopy(g, text, column, leaf.age || "7-9", leaf.mood || "quiet", c.height * 0.62, safe.bottom, leaf.discoveries);
  }
  gutterShade(g, side);
  return c;
}

function leafView(page) {
  const leaf = page && page.leaf || {};
  const image = page && page.image;
  return {
    role: leaf.role || "",
    unitId: leaf.unitId || "",
    imageWidth: image && image.width ? image.width : 0,
    imageHeight: image && image.height ? image.height : 0
  };
}

function paintCompositionBook(plan) {
  const pages = plan.pages || [];
  const painted = [{
    label: "Title",
    left: drawBookNamePage(plan.title),
    right: drawAuthorPage(plan.author),
    text: plan.title + ". Written by " + plan.author + "."
  }];
  for (let i = 0; i < pages.length; i += 2) {
    const left = pages[i];
    const right = pages[i + 1];
    const kind = left && left.leaf && left.leaf.composition;
    const placement = window.WondiiComposition.picturePlacement(leafView(left), leafView(right));
    if (placement.continuous && left && right && left.image && right.image && window.WondiiArtDirection) {
      const where = spreadQuietWhere(left.leaf) && spreadQuietWhere(left.leaf) === spreadQuietWhere(right.leaf)
        ? spreadQuietWhere(left.leaf)
        : "";
      const probe = pageCanvas().getContext("2d");
      const leftQuiet = where ? measureSpreadQuiet(probe, left.text, "left", left.leaf.age, left.leaf.mood, left.leaf.discoveries, where) : null;
      const rightQuiet = where ? measureSpreadQuiet(probe, right.text, "right", right.leaf.age, right.leaf.mood, right.leaf.discoveries, where) : null;
      if (!(leftQuiet && leftQuiet.ok && rightQuiet && rightQuiet.ok)) {
        painted.push(directedContinuousSpread(left, right));
        continue;
      }
    }
    let leftPage = left;
    let rightPage = right;
    if (!placement.continuous && placement.left === "once" && placement.right === "text" && left && left.leaf && left.leaf.role === "spread-left") {
      leftPage = Object.assign({}, left, { text: "" });
      rightPage = Object.assign({}, right || {}, {
        text: (left && left.text) || (right && right.text) || "",
        image: null,
        leaf: Object.assign({}, (right && right.leaf) || {}, { role: "text", composition: "facing" })
      });
    }
    painted.push({
      label: kind || "Story",
      left: paintCompositionLeaf(leftPage, "left"),
      right: rightPage ? paintCompositionLeaf(rightPage, "right") : drawBlankLeaf(),
      text: [left && left.text, right && right.text].filter(Boolean).join(" ")
    });
  }
  painted.push(closingSpread());
  return painted;
}

function paintSavedSpreads(plan) {
  if (plan && plan.composition && plan.composition.schema === "wondii-composition/1" && window.WondiiComposition) {
    return paintCompositionBook(plan);
  }
  const pages = plan.pages || [];
  const layouts = choosePageLayouts(pages);
  const directed = pages.some(function (page) { return page.direction && page.direction.layout; });
  const savedDirection = pages.map(function (page) {
    return page && page.direction && page.direction.layout ? page.direction : null;
  });
  const specs = window.WondiiArtDirection && window.WondiiArtDirection.adaptChain
    ? window.WondiiArtDirection.adaptChain(pages)
    : savedDirection;
  const measurer = pageCanvas().getContext("2d");
  const typeSize = fitTypeSize(measurer, pages, layouts, specs);
  const painted = [{
    label: "Title",
    left: drawBookNamePage(plan.title),
    right: drawAuthorPage(plan.author),
    text: plan.title + ". Written by " + plan.author + "."
  }];
  for (let i = 0; i < pages.length; i += 2) {
    const left = pages[i];
    const right = pages[i + 1];
    const shared = right && continuousSpread(left, right, specs[i], specs[i + 1])
      ? Math.max(
        directedCopyHeight(left, "left", typeSize, specs[i]),
        directedCopyHeight(right, "right", typeSize, specs[i + 1])
      )
      : 0;
    painted.push({
      label: !directed && layouts[i] === "spread" ? "Aligned spread" : "Story",
      left: paintPage(left, "left", typeSize, layouts[i], specs[i], shared),
      right: right ? paintPage(right, "right", typeSize, layouts[i + 1], specs[i + 1], shared) : drawBlankLeaf(),
      text: [left.text, right && right.text].filter(Boolean).join(" ")
    });
  }
  painted.push(closingSpread());
  return painted;
}

function buildBook(art, saved) {
  scene.add(new THREE.AmbientLight(0xfff6ec, 0.7));
  const key = new THREE.DirectionalLight(0xfff3e4, 1.45);
  key.position.set(-3.4, 5.2, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 16;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0006;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd5e2ff, 0.28);
  fill.position.set(2.4, 1.2, 2);
  scene.add(fill);

  for (let i = 0; i < SHEETS; i += 1) {
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(PAGE_W, PAGE_H - 0.02, SHEET_T * 0.86),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf6efe2 : 0xdccdb8, roughness: 1 })
    );
    sheet.position.set(PAGE_W / 2, 0, -SHEET_T * (i + 0.5));
    sheet.castShadow = true;
    sheet.receiveShadow = true;
    rig.add(sheet);
  }

  const bodyDepth = BLOCK + BOARD;
  const bodyZ = -bodyDepth / 2;
  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(SPINE, COVER_H, bodyDepth),
    cloth(0x241433)
  );
  spine.position.set(-SPINE / 2, 0, bodyZ);
  spine.castShadow = true;
  rig.add(spine);

  spineFront = new THREE.Mesh(
    new THREE.BoxGeometry(SPINE, COVER_H, BOARD),
    cloth(0x241433)
  );
  spineFront.position.set(-SPINE / 2, 0, BOARD / 2);
  rig.add(spineFront);

  const spineTitle = new THREE.Mesh(
    new THREE.PlaneGeometry(SPINE_DEPTH - 0.1, COVER_H - 0.42),
    new THREE.MeshStandardMaterial({
      map: canvasTexture(drawSpineTitle(saved && saved.title)),
      roughness: 0.62,
      metalness: 0.08
    })
  );
  spineTitle.position.set(-SPINE - 0.004, 0, SPINE_Z);
  spineTitle.rotation.y = -Math.PI / 2;
  rig.add(spineTitle);

  const bandMat = new THREE.MeshStandardMaterial({ color: 0xe8c878, roughness: 0.4, metalness: 0.25 });
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(SPINE + 0.006, 0.026, bodyDepth - 0.012),
    bandMat
  );
  band.position.set(-SPINE / 2 - 0.003, COVER_H / 2 - 0.07, bodyZ);
  rig.add(band);
  const bandLow = band.clone();
  bandLow.position.y = -COVER_H / 2 + 0.07;
  rig.add(bandLow);
  const bandCap = new THREE.Mesh(
    new THREE.BoxGeometry(SPINE + 0.006, 0.026, BOARD),
    bandMat
  );
  bandCap.position.set(-0.003, COVER_H / 2 - 0.07, 0);
  spineFront.add(bandCap);
  const bandCapLow = bandCap.clone();
  bandCapLow.position.y = -COVER_H / 2 + 0.07;
  spineFront.add(bandCapLow);

  const backBoard = new THREE.Mesh(
    new THREE.BoxGeometry(COVER_W, COVER_H, BOARD),
    cloth(0x3a2158)
  );
  backBoard.position.set(COVER_W / 2, 0, -BLOCK - BOARD / 2);
  backBoard.castShadow = true;
  rig.add(backBoard);

  const backMark = new THREE.Mesh(
    new THREE.PlaneGeometry(COVER_W - 0.06, COVER_H - 0.06),
    new THREE.MeshStandardMaterial({ map: canvasTexture(drawBackStamp(art.logo)), roughness: 0.94 })
  );
  backMark.position.set(COVER_W / 2, 0, -BLOCK - BOARD - 0.004);
  backMark.rotation.y = Math.PI;
  rig.add(backMark);

  rightRim = new THREE.Mesh(
    new THREE.BoxGeometry(COVER_W, COVER_H, 0.02),
    cloth(0x3a2158)
  );
  rightRim.position.set(COVER_W / 2, 0, -0.012);
  rightRim.visible = false;
  rig.add(rightRim);

  coverPivot.position.set(0, 0, 0);
  rig.add(coverPivot);

  frontBoard = new THREE.Mesh(
    new THREE.BoxGeometry(COVER_W, COVER_H, BOARD),
    cloth(0x3a2158)
  );
  frontBoard.position.set(COVER_W / 2, 0, BOARD / 2);
  frontBoard.castShadow = true;
  coverPivot.add(frontBoard);

  const coverTex = canvasTexture(drawCover(art.cover, saved && saved.title, saved && saved.kicker));
  const coverArt = new THREE.Mesh(
    new THREE.PlaneGeometry(COVER_W - 0.045, COVER_H - 0.045),
    new THREE.MeshBasicMaterial({ map: coverTex })
  );
  coverArt.position.set(COVER_W / 2, 0, BOARD + 0.004);
  coverPivot.add(coverArt);

  const paperMat = new THREE.MeshBasicMaterial({ map: canvasTexture(drawEndpaper()) });
  const sheetW = PAGE_W + 0.05;
  const sheetH = PAGE_H + 0.06;
  function hingedPaper(flip, z) {
    const geo = new THREE.PlaneGeometry(sheetW, sheetH);
    geo.translate(sheetW / 2, 0, 0);
    const mesh = new THREE.Mesh(geo, paperMat);
    if (flip) {
      mesh.rotation.y = Math.PI;
      mesh.position.set(sheetW, 0, z);
    } else {
      mesh.position.set(0, 0, z);
    }
    return mesh;
  }
  endPaper = hingedPaper(true, -0.012);
  coverPivot.add(endPaper);
  rightPaper = hingedPaper(false, 0.012);
  rightPaper.visible = false;
  rig.add(rightPaper);

  spreads = saved && saved.pages ? paintSavedSpreads(saved) : makeSpreads(art);
  spreads.forEach(function (spread) {
    spread.leftTex = spread.left ? canvasTexture(spread.left) : null;
    spread.rightTex = canvasTexture(spread.right);
  });
  curlMat = bendMaterial(spreads[0].rightTex, spreads[1].leftTex);
  curlMesh = bentMesh(curlMat);
  curlMesh.visible = false;
  rig.add(curlMesh);
  leftMesh = sideMesh("left");
  rightMesh = sideMesh("right");
  useMap(rightMesh, spreads[0].rightTex);
  rig.add(leftMesh);
  rig.add(rightMesh);
}

function frameCamera() {
  const w = Math.max(stage.clientWidth, 1);
  const h = Math.max(stage.clientHeight, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < 760 ? 34 : 30;
  camera.updateProjectionMatrix();
  const fov = camera.fov * Math.PI / 180;
  const span = (COVER_W + PAGE_W) * 0.92;
  const tall = COVER_H * 1.05;
  const distH = (tall / 2) / Math.tan(fov / 2);
  const distW = (span / 2) / (Math.tan(fov / 2) * camera.aspect);
  camera.position.set(0, 0.12, Math.max(distH, distW) * 1.24);
  camera.lookAt(0.08, -0.02, 0);
}

function poseView(u) {
  viewX = CLOSED_X + (READ_X - CLOSED_X) * u;
  viewY = CLOSED_Y + (READ_Y - CLOSED_Y) * u;
  viewShift = CLOSED_SHIFT * (1 - u);
}

function fitSpineCap() {
  if (!spineFront) return;
  const open = Math.min(1, Math.abs(coverPivot.rotation.y) / Math.PI);
  const scale = 1 - open;
  spineFront.visible = scale > 0.02;
  spineFront.scale.z = Math.max(scale, 0.001);
  spineFront.position.z = (BOARD / 2) * scale;
}

function applyRig() {
  fitSpineCap();
  const yaw = viewY + hover.y + spinY;
  rig.rotation.x = viewX + hover.x;
  rig.rotation.y = yaw;
  const center = COVER_W / 2;
  rig.position.x = viewShift + center * (Math.cos(viewY) - Math.cos(yaw));
  rig.position.z = center * (Math.sin(yaw) - Math.sin(viewY));
}

function setButtons(prevLabel, nextLabel, label) {
  const nextLabelEl = document.getElementById("nextLabel");
  const nextArrow = document.getElementById("nextArrow");
  const reading = nextLabel && nextLabel !== "Read book";
  prevBtn.hidden = !prevLabel;
  prevBtn.setAttribute("aria-label", prevLabel || "Previous page");
  nextBtn.hidden = !nextLabel;
  nextBtn.setAttribute("aria-label", nextLabel || "Next page");
  nextBtn.classList.toggle("pill--arrow", !!reading);
  nextBtn.classList.toggle("pill--read", nextLabel === "Read book");
  nextLabelEl.hidden = !!reading;
  nextArrow.hidden = !reading;
  if (!reading) nextLabelEl.textContent = nextLabel || "";
  progress.textContent = label;
}

function fitPages() {
  if (leftMesh) leftMesh.scale.set(1, 1, 1);
  if (rightMesh) rightMesh.scale.set(1, 1, 1);
}

function seatLeftPage(onCover) {
  if (!leftMesh) return;
  if (onCover) {
    coverPivot.add(leftMesh);
    leftMesh.rotation.y = Math.PI;
    leftMesh.position.z = -0.015;
  } else {
    rig.add(leftMesh);
    leftMesh.rotation.y = 0;
    leftMesh.position.z = 0.015;
  }
}

let closedCoverTitle = "The Secret of the Golden Key";

function setClosedPose() {
  mode = "closed";
  spreadIndex = 0;
  poseView(0);
  coverPivot.rotation.y = 0;
  if (curlMat) curlMat.uniforms.progress.value = 0;
  if (curlMesh) curlMesh.visible = false;
  seatLeftPage(false);
  if (leftMesh) leftMesh.visible = false;
  if (rightMesh) rightMesh.visible = false;
  if (endPaper) endPaper.visible = true;
  if (rightPaper) rightPaper.visible = false;
  if (rightRim) rightRim.visible = false;
  leafHtml.textContent = "Closed cover. Drag to turn the book all the way around. " + closedCoverTitle + ".";
  if (leftMesh) leftMesh.rotation.y = 0;
  fitPages();
  spinY = 0;
  spinV = 0;
  stage.classList.add("is-closed");
  stage.classList.remove("is-turning");
  setButtons("", "Read book", "Drag to look around");
  document.getElementById("closeBtn").hidden = true;
}

function showSpread(index) {
  spreadIndex = index;
  const spread = spreads[index];
  mode = index === 0 ? "open" : "spread";
  poseView(1);
  spinY = 0;
  stage.classList.remove("is-closed");
  stage.classList.remove("is-turning");
  coverPivot.rotation.y = OPEN_COVER;
  curlMesh.visible = false;
  curlMat.uniforms.progress.value = 0;
  seatLeftPage(false);
  fitPages();
  if (spread.leftTex) {
    useMap(leftMesh, spread.leftTex);
    leftMesh.visible = true;
  } else {
    leftMesh.visible = false;
  }
  useMap(rightMesh, spread.rightTex);
  rightMesh.visible = true;
  endPaper.visible = true;
  if (rightPaper) rightPaper.visible = true;
  if (rightRim) rightRim.visible = true;
  leafHtml.textContent = spread.text;
  setButtons(
    index === 0 ? "Close the book" : "Previous page",
    index < spreads.length - 1 ? "Turn the page" : "",
    spread.label
  );
  document.getElementById("closeBtn").hidden = false;
}

function run(duration, apply, done) {
  if (reduced || duration === 0) {
    apply(1);
    done();
    return;
  }
  busy = true;
  prevBtn.disabled = true;
  nextBtn.disabled = true;
  anim = { t0: performance.now(), duration: duration, apply: apply, done: done };
}

function finish() {
  busy = false;
  prevBtn.disabled = false;
  nextBtn.disabled = false;
  if (closeAfter && mode !== "closed") {
    closeAfter = false;
    closeBook();
  } else {
    closeAfter = false;
  }
}

function openBook() {
  if (busy || mode !== "closed") return;
  dragSpin = null;
  spinV = 0;
  const startSpin = spinY;
  const startPitch = viewX;
  useMap(leftMesh, spreads[0].leftTex);
  useMap(rightMesh, spreads[0].rightTex);
  seatLeftPage(true);
  leftMesh.visible = true;
  if (rightPaper) rightPaper.visible = true;
  if (rightRim) rightRim.visible = true;
  run(OPEN_MS, function (u) {
    coverPivot.rotation.y = OPEN_COVER * u;
    poseView(u);
    viewX = startPitch + (READ_X - startPitch) * u;
    spinY = startSpin * (1 - u);
    rightMesh.visible = u > 0.16;
  }, function () {
    finish();
    showSpread(0);
  });
}

function closeBook() {
  if (mode === "closed") return;
  if (busy) {
    closeAfter = true;
    return;
  }
  closeAfter = false;
  if (curlMesh) curlMesh.visible = false;
  const hadLeft = leftMesh && leftMesh.visible;
  run(1320, function (u) {
    const fold = Math.min(1, u / 0.46);
    const foldE = fold * fold * (3 - 2 * fold);
    if (hadLeft) leftMesh.rotation.y = foldE * Math.PI;
    const shut = Math.max(0, (u - 0.3) / 0.7);
    const shutE = shut * shut * (3 - 2 * shut);
    coverPivot.rotation.y = OPEN_COVER * (1 - shutE);
    poseView(1 - shutE);
    if (u > 0.58 && leftMesh) leftMesh.visible = false;
    if (u > 0.8) {
      if (rightMesh) rightMesh.visible = false;
      if (rightPaper) rightPaper.visible = false;
      if (rightRim) rightRim.visible = false;
    }
  }, function () {
    setClosedPose();
    finish();
  });
}

function turnForward() {
  if (busy || mode === "closed" || spreadIndex >= spreads.length - 1) return;
  const next = spreads[spreadIndex + 1];
  curlMat.uniforms.frontMap.value = spreads[spreadIndex].rightTex;
  curlMat.uniforms.backMap.value = next.leftTex;
  curlMat.uniforms.progress.value = 0;
  curlMesh.visible = true;
  useMap(rightMesh, next.rightTex);
  rightMesh.visible = true;
  run(TURN_MS, function (u) {
    curlMat.uniforms.progress.value = u;
  }, function () {
    finish();
    showSpread(spreadIndex + 1);
  });
}

function turnBack() {
  if (busy || spreadIndex === 0) return;
  const current = spreads[spreadIndex];
  const prev = spreads[spreadIndex - 1];
  curlMat.uniforms.frontMap.value = prev.rightTex;
  curlMat.uniforms.backMap.value = current.leftTex;
  curlMat.uniforms.progress.value = 1;
  curlMesh.visible = true;
  leftMesh.visible = false;
  if (prev.leftTex) {
    useMap(leftMesh, prev.leftTex);
    leftMesh.visible = true;
  }
  run(TURN_MS, function (u) {
    curlMat.uniforms.progress.value = 1 - u;
  }, function () {
    finish();
    showSpread(spreadIndex - 1);
  });
}

function onNext() {
  if (busy) return;
  if (mode === "closed") openBook();
  else turnForward();
}

function onPrev() {
  if (busy) return;
  if (spreadIndex === 0) closeBook();
  else turnBack();
}

function seek(name, t) {
  const raw = t == null ? 1 : t;
  const u = Math.max(0, Math.min(1, raw));
  anim = null;
  finish();
  if (name === "closed") setClosedPose();
  if (name === "opening") {
    setClosedPose();
    coverPivot.rotation.y = OPEN_COVER * u;
    poseView(u);
    useMap(leftMesh, spreads[0].leftTex);
    useMap(rightMesh, spreads[0].rightTex);
    seatLeftPage(true);
    leftMesh.visible = true;
    rightMesh.visible = u > 0.16;
    if (rightPaper) rightPaper.visible = true;
    if (rightRim) rightRim.visible = true;
    mode = "opening";
    progress.textContent = "Opening";
  }
  if (name === "open") showSpread(0);
  if (name === "page") showSpread(Math.max(0, Math.min(spreads.length - 1, Math.round(raw))));
  if (name === "turn") {
    showSpread(0);
    const next = spreads[1];
    curlMat.uniforms.frontMap.value = spreads[0].rightTex;
    curlMat.uniforms.backMap.value = next.leftTex;
    useMap(rightMesh, next.rightTex);
    curlMat.uniforms.progress.value = u;
    curlMesh.visible = true;
    mode = "turning";
    progress.textContent = "Turning";
  }
  if (name === "spread") showSpread(1);
}

function tick(now) {
  requestAnimationFrame(tick);
  if (anim) {
    let u = (now - anim.t0) / anim.duration;
    if (u >= 1) {
      const done = anim.done;
      anim.apply(1);
      anim = null;
      done();
    } else {
      const s = u * u * (3 - 2 * u);
      anim.apply(s);
    }
  }
  hover.x += (hover.tx - hover.x) * 0.08;
  hover.y += (hover.ty - hover.y) * 0.08;
  if (mode === "closed" && !busy && !dragSpin && !reduced) {
    const dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 0.016;
    if (Math.abs(spinV) > 0.0004) {
      spinY += spinV;
      spinV *= 0.965;
    } else {
      spinV = 0;
      spinY += 0.22 * dt;
    }
  }
  lastTick = now;
  applyRig();
  placeSideButtons();
  renderer.render(scene, camera);
}

const sidePoint = new THREE.Vector3();
const coverBounds = new THREE.Box3();

function placeSideButtons() {
  const open = mode !== "closed";
  if (!open || !frontBoard || !rightRim) {
    prevBtn.style.left = "";
    prevBtn.style.top = "";
    nextBtn.style.left = "";
    nextBtn.style.top = "";
    return;
  }
  rig.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const room = stage.parentElement.getBoundingClientRect();
  const roomStyle = getComputedStyle(stage.parentElement);
  const padL = parseFloat(roomStyle.paddingLeft) || 0;
  const padT = parseFloat(roomStyle.paddingTop) || 0;
  const box = stage.getBoundingClientRect();
  function pin(mesh, side) {
    coverBounds.setFromObject(mesh);
    const x = side === "left" ? coverBounds.min.x : coverBounds.max.x;
    const y = (coverBounds.min.y + coverBounds.max.y) / 2;
    const z = (coverBounds.min.z + coverBounds.max.z) / 2;
    sidePoint.set(x, y, z);
    sidePoint.project(camera);
    return {
      x: (sidePoint.x * 0.5 + 0.5) * box.width + box.left,
      y: (-sidePoint.y * 0.5 + 0.5) * box.height + box.top
    };
  }
  const leftEdge = pin(frontBoard, "left");
  const rightEdge = pin(rightRim, "right");
  const gap = 16;
  const size = 48;
  const minX = 8;
  const maxX = window.innerWidth - size - 8;
  const leftX = Math.max(minX, leftEdge.x - gap - size);
  const rightX = Math.min(maxX, rightEdge.x + gap);
  const midY = (leftEdge.y + rightEdge.y) / 2;
  const y = Math.max(box.top + 28, Math.min(box.bottom - 28, midY));
  prevBtn.style.left = (leftX - room.left - padL) + "px";
  prevBtn.style.top = (y - room.top - padT) + "px";
  nextBtn.style.left = (rightX - room.left - padL) + "px";
  nextBtn.style.top = (y - room.top - padT) + "px";
}

stage.addEventListener("pointerdown", function (event) {
  if (mode !== "closed" || busy || event.button > 0) return;
  if (event.target.closest && event.target.closest("button")) return;
  dragSpin = { x: event.clientX, y: event.clientY, spin: spinY, pitch: viewX, lx: event.clientX, t: performance.now() };
  spinV = 0;
  hover.tx = 0;
  hover.ty = 0;
  stage.classList.add("is-turning");
  try { stage.setPointerCapture(event.pointerId); } catch (error) { /* synthetic drags have no capture */ }
});
stage.addEventListener("pointermove", function (event) {
  if (dragSpin) {
    const dx = event.clientX - dragSpin.x;
    const dy = event.clientY - dragSpin.y;
    spinY = dragSpin.spin - dx * 0.0075;
    viewX = Math.max(-0.7, Math.min(0.45, dragSpin.pitch + dy * 0.0022));
    const now = performance.now();
    const dt = Math.max(8, now - dragSpin.t);
    spinV = -((event.clientX - dragSpin.lx) / dt) * 0.12;
    dragSpin.lx = event.clientX;
    dragSpin.t = now;
    return;
  }
  if (reduced || mode === "closed") return;
  const rect = stage.getBoundingClientRect();
  const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  hover.ty = nx * 0.014;
  hover.tx = ny * 0.009;
});
stage.addEventListener("pointerup", function () {
  dragSpin = null;
  stage.classList.remove("is-turning");
});
stage.addEventListener("pointerleave", function () {
  hover.tx = 0;
  hover.ty = 0;
});

let touchX = null;
stage.addEventListener("touchstart", function (event) {
  touchX = event.changedTouches[0].clientX;
}, { passive: true });
stage.addEventListener("touchend", function (event) {
  if (touchX == null || mode === "closed") {
    touchX = null;
    return;
  }
  const delta = event.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(delta) < 48) return;
  if (delta < 0) onNext();
  else onPrev();
});

nextBtn.addEventListener("click", onNext);
prevBtn.addEventListener("click", onPrev);
document.getElementById("closeBtn").addEventListener("click", closeBook);
window.addEventListener("keydown", function (event) {
  if (event.key === "ArrowRight") { event.preventDefault(); onNext(); }
  if (event.key === "ArrowLeft") { event.preventDefault(); onPrev(); }
});
window.addEventListener("resize", frameCamera);

document.getElementById("notesBtn").addEventListener("click", function () {
  const list = document.getElementById("limitList");
  if (!list.childElementCount && sample) {
    sample.limits.forEach(function (line) {
      const item = document.createElement("li");
      item.textContent = line;
      list.appendChild(item);
    });
    list.insertAdjacentHTML("beforeend", "<li>The four page types use the approved Maya plates. Wide pictures stay whole above the words. The standing portrait is cropped from empty wall, not from Maya. The garden scene stays one picture across both pages, with Maya on the left of the gutter.</li>");
  }
  if (notes.showModal) notes.showModal();
});
document.getElementById("notesClose").addEventListener("click", function () {
  if (notes.close) notes.close();
});

function armReader() {
  frameCamera();
  setClosedPose();
  requestAnimationFrame(tick);
  window.WondiiBook = {
    seek: seek,
    mode: function () { return mode; },
    open: openBook,
    turn: turnForward,
    close: closeBook
  };
}

function holdClosed(message) {
  progress.textContent = message;
  const mark = document.querySelector(".brand span");
  if (mark) mark.textContent = "Book unavailable";
  ["prevBtn", "nextBtn", "closeBtn", "notesBtn"].forEach(function (id) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = true;
  });
}

function readyFonts() {
  return Promise.all([
    document.fonts.load("650 72px Fraunces"),
    document.fonts.load("560 42px Fraunces"),
    document.fonts.load("italic 560 42px Fraunces"),
    document.fonts.load("600 48px Fredoka"),
    document.fonts.load("650 48px Fredoka")
  ]);
}

function plainCoverCanvas() {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = Math.round(900 * COVER_H / COVER_W);
  const g = c.getContext("2d");
  g.fillStyle = "#3a2158";
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function sampleAssets() {
  return Promise.all([
    readyFonts(),
    loadImage("/docs/agent/book-v2/visual-proof/e/images/cover.jpg"),
    loadImage("/docs/agent/book-v2/visual-proof/e/images/p1.jpg"),
    loadImage("/docs/agent/book-v2/visual-proof/e/images/p2.jpg"),
    loadImage("/docs/agent/book-v2/visual-proof/e/images/p5.jpg"),
    loadImage("/docs/agent/book-v2/visual-proof/e/images/p8.jpg"),
    loadImage("/docs/agent/book-v2/visual-proof/e/images/p10.jpg"),
    loadImage("/games/images/brand/wondi-wordmark.svg")
  ]).then(function (assets) {
    buildBook({
      cover: assets[1],
      p1: assets[2],
      p2: assets[3],
      p5: assets[4],
      p8: assets[5],
      p10: assets[6],
      logo: assets[7]
    });
    armReader();
  });
}

function savedAssets(plan) {
  return Promise.all([
    readyFonts(),
    loadOptional(plan.coverSrc),
    loadImage("/games/images/brand/wondi-wordmark.svg"),
    Promise.all((plan.pages || []).map(function (page) {
      return loadOptional(page.imageSrc).then(function (image) {
        page.image = image;
        if (page.imageSrc && !image) page.missingArt = true;
        return page;
      });
    }))
  ]).then(function (assets) {
    buildBook({ cover: assets[1] || plainCoverCanvas(), logo: assets[2] }, plan);
    const mark = document.querySelector(".brand span");
    if (mark) mark.textContent = plan.title;
    document.title = plan.title + " — Wondii";
    const notes = document.getElementById("notesBtn");
    if (notes) notes.hidden = true;
    closedCoverTitle = String(plan.title || "Untitled story").trim() || "Untitled story";
    armReader();
  });
}

const bookData = window.WondiiBookData;
const showcaseRequest = bookData && bookData.showcaseRequest ? bookData.showcaseRequest() : "";
if (showcaseRequest) progress.textContent = "Opening this book…";

const opening = !bookData || !showcaseRequest
  ? sampleAssets()
  : bookData.load().then(function (result) {
    if (!result || !result.ok || !result.plan) {
      var reason = result && result.reason;
      if (reason) console.warn("book-load", reason);
      holdClosed(bookData.message(reason));
      return;
    }
    return savedAssets(result.plan);
  });

opening.catch(function () {
  console.warn("book-load", "pictures");
  holdClosed(bookData && bookData.message ? bookData.message("pictures") : "This book could not be opened.");
});
