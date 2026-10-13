import * as THREE from "./vendor/three.module.js";

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
  c.width = 900;
  c.height = Math.round(900 * (PAGE_H / PAGE_W));
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

function drawCover(image, titleText, kickerText) {
  const c = document.createElement("canvas");
  c.width = image.width;
  c.height = image.height;
  const g = c.getContext("2d");
  g.drawImage(image, 0, 0, c.width, c.height);
  g.textAlign = "center";
  g.shadowColor = "rgba(6, 12, 32, 0.78)";
  g.shadowBlur = 22;
  g.shadowOffsetY = 4;
  g.fillStyle = "#fffaf2";
  g.font = "650 " + Math.round(c.width * 0.09) + "px Fraunces, Georgia, serif";
  wrap(g, titleText || "The Secret of the Golden Key", c.width / 2, c.height * 0.1, c.width * 0.78, c.width * 0.1);
  g.font = "600 " + Math.round(c.width * 0.038) + "px Fredoka, Nunito, sans-serif";
  g.fillText(kickerText || "A Wondii Adventure", c.width / 2, c.height * 0.34);
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
  g.fillStyle = "#2a241c";
  g.font = "650 76px Fraunces, Georgia, serif";
  const title = titleText || sample.title || "The Secret of the Golden Key";
  wrap(g, title, c.width / 2, c.height * 0.42, c.width - 170, 88);
  gutterShade(g, "left");
  return c;
}

function drawAuthorPage(authorName) {
  const c = pageCanvas();
  const g = c.getContext("2d");
  fillPaper(g, "#fbf6ea");
  const author = authorName || sample.author || "Wondii";
  g.textAlign = "center";
  g.fillStyle = "#6a5b4a";
  g.font = "700 28px Nunito, sans-serif";
  g.fillText("WRITTEN BY", c.width / 2, c.height * 0.46);
  g.fillStyle = "#2a241c";
  g.font = "650 72px Fraunces, Georgia, serif";
  g.fillText(author, c.width / 2, c.height * 0.54);
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

function richParagraphs(g, lines, max, size) {
  const spaceFont = "560 " + size + "px Fraunces, Georgia, serif";
  return lines.map(function (line) {
    const quote = /^[“"]/.test(line);
    const words = line.split(" ");
    const rows = [];
    let row = [];
    let width = 0;
    words.forEach(function (word) {
      const emphasis = emphasisWord(word);
      const font = emphasis
        ? "600 " + Math.round(size * 1.28) + "px Fredoka, Nunito, sans-serif"
        : (quote ? "italic " : "") + "560 " + size + "px Fraunces, Georgia, serif";
      g.font = font;
      const wordWidth = g.measureText(word).width;
      g.font = spaceFont;
      const gap = row.length ? g.measureText(" ").width : 0;
      if (row.length && width + gap + wordWidth > max) {
        rows.push(row);
        row = [{ text: word, font: font, emphasis: emphasis, width: wordWidth }];
        width = wordWidth;
      } else {
        row.push({ text: word, font: font, emphasis: emphasis, width: wordWidth });
        width += gap + wordWidth;
      }
    });
    if (row.length) rows.push(row);
    return rows;
  });
}

function blockHeight(paragraphs, leading) {
  return paragraphs.reduce(function (sum, rows, index) {
    return sum + rows.length * leading + (index ? Math.round(leading * 0.55) : 0);
  }, 0);
}

function layoutCopy(g, lines, zone) {
  const spaceFont = function (size) {
    return "560 " + size + "px Fraunces, Georgia, serif";
  };
  let size = zone.maxSize;
  let paragraphs = richParagraphs(g, lines, zone.w, size);
  let leading = Math.round(size * 1.45);
  let height = blockHeight(paragraphs, leading);
  while (height > zone.h && size > zone.minSize) {
    size -= 2;
    leading = Math.round(size * 1.45);
    paragraphs = richParagraphs(g, lines, zone.w, size);
    height = blockHeight(paragraphs, leading);
  }
  const textRows = paragraphs.reduce(function (sum, rows) { return sum + rows.length; }, 0);
  const sparse = !zone.align && textRows <= 4 && height < zone.h * 0.62;
  const align = zone.align || (sparse ? "center" : "left");
  let y = (sparse ? zone.y + (zone.h - height) / 2 : zone.y) + leading * 0.82;
  const ink = zone.color || "#2a241c";
  const accent = zone.accent || (ink === "#fffaf2" ? "#ffe7a8" : "#6d28d9");
  g.shadowBlur = zone.color ? g.shadowBlur : 0;
  g.textAlign = "left";
  paragraphs.forEach(function (rows, index) {
    if (index) y += Math.round(leading * 0.55);
    rows.forEach(function (row) {
      let width = 0;
      row.forEach(function (part, i) {
        g.font = spaceFont(size);
        width += part.width + (i ? g.measureText(" ").width : 0);
      });
      let x = align === "center" ? zone.x + (zone.w - width) / 2 : zone.x;
      row.forEach(function (part, i) {
        g.font = spaceFont(size);
        if (i) x += g.measureText(" ").width;
        g.font = part.font;
        g.fillStyle = part.emphasis ? accent : ink;
        g.fillText(part.text, x, y);
        x += part.width;
      });
      y += leading;
    });
  });
}

function paintFolio(g, folio, side, ink) {
  const c = g.canvas;
  g.shadowBlur = 0;
  g.fillStyle = ink || "#7a6a56";
  g.font = "560 28px Fraunces, Georgia, serif";
  g.textAlign = side === "left" ? "left" : "right";
  g.fillText(String(folio), side === "left" ? 46 : c.width - 46, c.height - 42);
}

function paperPage() {
  const c = pageCanvas();
  fillPaper(c.getContext("2d"));
  return c;
}

function drawProsePage(lines, folio, side) {
  const c = paperPage();
  const g = c.getContext("2d");
  layoutCopy(g, lines, {
    x: 84,
    y: 90,
    w: c.width - 168,
    h: c.height - 190,
    maxSize: 46,
    minSize: 28
  });
  paintFolio(g, folio, side);
  gutterShade(g, side);
  return c;
}

function drawAbovePage(image, lines, folio, side) {
  const c = paperPage();
  const g = c.getContext("2d");
  const band = Math.round(c.width * (image.height / image.width));
  g.drawImage(image, 0, 0, c.width, band);
  layoutCopy(g, lines, {
    x: 72,
    y: band + 28,
    w: c.width - 144,
    h: c.height - band - 108,
    maxSize: 40,
    minSize: 26
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
    }
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
  const c = document.createElement("canvas");
  c.width = 420;
  c.height = 1600;
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

function paintPage(page, side) {
  const lines = storyLines(page.text);
  if (page.image) return drawAbovePage(page.image, lines, String(page.number), side);
  if (page.missingArt) lines.push("The picture for this page is not on this book yet.");
  return drawProsePage(lines, String(page.number), side);
}

function paintSavedSpreads(plan) {
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
    painted.push({
      label: "Story",
      left: paintPage(left, "left"),
      right: right ? paintPage(right, "right") : drawProsePage(["The end."], String(pages.length + 1), "right"),
      text: [left.text, right && right.text].filter(Boolean).join(" ")
    });
  }
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
  leafHtml.textContent = "Closed cover. Drag to turn the book all the way around. The Secret of the Golden Key.";
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
    document.fonts.load("600 48px Fredoka")
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
    armReader();
  });
}

const bookData = window.WondiiBookData;
const requestedBook = bookData && bookData.requestedId ? bookData.requestedId() : null;
if (requestedBook !== null) progress.textContent = "Opening this book…";

const opening = !bookData || requestedBook === null
  ? sampleAssets()
  : bookData.load().then(function (result) {
    if (!result || !result.ok || !result.plan) {
      holdClosed(bookData.message(result && result.reason));
      return;
    }
    return savedAssets(result.plan);
  });

opening.catch(function (error) {
  holdClosed("This book could not be opened.");
  console.error(error);
});
