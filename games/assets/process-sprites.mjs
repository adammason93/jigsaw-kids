/**
 * One-time: chroma-key dark background to transparent, write character-sprites-rgba.png
 * Run: node games/assets/process-sprites.mjs
 */
import fs from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Pure Node: parse PNG with sharp if available, else skip
const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("Install sharp: npm i sharp, or use the prebuilt rgba PNG");
  process.exit(1);
}

const src = join(__dirname, "character-sprites.png");
const out = join(__dirname, "character-sprites-rgba.png");

const raw = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data, info } = raw;
const w = info.width;
const h = info.height;
const c = 4; // rgba

function key(r, g, b) {
  if (b < 55 && r < 50 && g < 55) return true;
  if (r + g + b < 100) return true;
  return false;
}

for (let i = 0; i < w * h; i++) {
  const o = i * c;
  const r = data[o];
  const g = data[o + 1];
  const b = data[o + 2];
  if (key(r, g, b)) {
    data[o + 3] = 0;
  }
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .png()
  .toFile(out);
console.log("Wrote", out, w, h);
