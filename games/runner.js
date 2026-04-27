/**
 * Personal side scroller: environment + character + name, then play.
 */
(function () {
  const setupEl = document.getElementById("setup");
  const gameSection = document.getElementById("gameSection");
  const app = document.getElementById("app");
  const beginBtn = document.getElementById("beginBtn");
  const newSetupBtn = document.getElementById("newSetupBtn");
  const playerNameIn = document.getElementById("playerName");
  const charPhoto = document.getElementById("charPhoto");
  const customPickedName = document.getElementById("customPickedName");
  const runTitle = document.getElementById("runTitle");
  const runSubtitle = document.getElementById("runSubtitle");
  const hudNameLine = document.getElementById("hudNameLine");
  const canvas = document.getElementById("game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  if (typeof ctx.imageSmoothingQuality === "string") {
    ctx.imageSmoothingQuality = "high";
  }
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const againBtn = document.getElementById("againBtn");
  const btnJump = document.getElementById("btnJump");
  const btnDuck = document.getElementById("btnDuck");

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = 900;
  const H = 400;
  const GROUND = 360;

  const LS_NAME = "runnerName";
  const LS_ENV = "runnerEnv";
  const LS_CHAR = "runnerChar";

  let gameActive = false;
  /** @type {string} */
  let currentEnv = "field";
  /** @type {"friend"|"bear"|"robot"|"bunny"|"custom"} */
  let charType = "friend";
  let playerDisplayName = "Friend";
  let customObjectUrl = null;
  const defaultSprite = new Image();
  defaultSprite.src = "assets/character-sprites-rgba.png";
  let defaultReady = false;
  defaultSprite.onload = function () {
    defaultReady = true;
  };
  const customSprite = new Image();
  let customReady = false;

  /** One horizontal row in character-sprites-rgba.png: idle, walk, run, jump, fall, land, hurt, slide. */
  const FRIEND_SHEET_X0 = 589;
  const FRIEND_SHEET_Y = 115;
  const FRIEND_SHEET_W = 355;
  const FRIEND_SHEET_H = 380;
  const FRIEND_FRAME_COUNT = 8;
  let friendRunPhase = 0;
  let friendLandT = 0;
  let friendAirPhase = 0;

  /** @type {"play"|"over"} */
  let mode = "play";

  let distance = 0;
  let scrollPxPerSec = 95;
  const SCROLL_BASE = 95;
  const SCROLL_MAX = 150;
  let best = Number(localStorage.getItem("runnerBest") || 0) || 0;
  if (bestEl) bestEl.textContent = String(Math.floor(best));

  const keys = { duck: false };
  const player = {
    x: 120,
    feetY: GROUND,
    w: 60,
    hStand: 90,
    hDuck: 45,
    vy: 0,
    onGround: true,
    /** 2 = full hop + double jump available; decrements each time you press jump in air. */
    jumpsLeft: 2,
    get h() {
      if (this.onGround && keys.duck && gameActive && mode === "play") return this.hDuck;
      return this.hStand;
    },
  };

  /** Pixels / second — frame-independent jump. Tuned for reliable single-hop over logs. */
  const GRAVITY = 1650;
  const JUMP_V = -640;
  /** Slightly weaker second hop so the double still feels snappy, not a triple-height exploit. */
  const JUMP_V_DOUBLE = -560;
  /** World scroll moves faster while airborne so you pass obstacles before you land. */
  const SCROLL_BOOST_IN_AIR = 1.58;
  let obstacles = [];
  const SPAWN_GAP = 300;
  const PUDDLE = { w: 120, h: 20, y: GROUND - 20 };
  const LOG = { w: 88, h: 48, y: GROUND - 48 };
  const BRANCH = { w: 130, h: 36, y: 240 };

  const ENV_IDS = ["field", "woods", "beach", "snow", "park", "pool"];

  /**
   * Optional 900×400 PNG per env at assets/backgrounds/{env}.png — full-canvas art.
   * If the file loads, it replaces all procedural scene drawing (obstacles & player still on top).
   * Design in Figma, Procreate, or an image model; this game can’t “gradient” its way to real illustration.
   */
  const sceneBackgrounds = Object.create(null);
  (function loadSceneBackgrounds() {
    for (const id of ENV_IDS) {
      const im = new Image();
      const eid = id;
      im.onload = function () {
        if (!im.naturalWidth) {
          sceneBackgrounds[eid] = null;
        }
      };
      im.onerror = function () {
        sceneBackgrounds[eid] = null;
      };
      sceneBackgrounds[id] = im;
      im.src = "assets/backgrounds/" + id + ".png";
    }
  })();

  function hasSceneBackgroundImage(env) {
    const im = sceneBackgrounds[env];
    return Boolean(im && im.complete && im.naturalWidth > 0);
  }

  function themeLabel(env) {
    const m = {
      field: { place: "sunny field", sub: "Jump logs & puddles in the open air." },
      woods: { place: "deep woods", sub: "Duck under branches in the green trees." },
      beach: { place: "sandy beach", sub: "Hop over puddles by the water." },
      snow: { place: "snowy day", sub: "Watch your step on the winter path." },
      park: { place: "playground", sub: "Bounce down the path past swings & climbing frames." },
      pool: { place: "pool race", sub: "Sprint the lane — duck rings, hop floats & lifebuoys." },
    };
    return m[env] || m.field;
  }

  function activeEnv() {
    const e = String(currentEnv || "").toLowerCase();
    return ENV_IDS.indexOf(e) >= 0 ? e : "field";
  }

  /** World time in seconds (smooth loops for birds, trees, etc.). */
  function animTimeSec() {
    return (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
  }

  /** Stacked, rounded “toy” pine (reference: layered scallops). */
  function drawScallopPine(x, baseY, w, id, at) {
    const cx = x + w * 0.5;
    const sway = Math.sin(at * 0.45 + id * 0.3) * 0.04;
    ctx.save();
    ctx.translate(cx, baseY);
    ctx.rotate(sway);
    ctx.translate(-cx, -baseY);
    const cols = [
      { r: 40, g: 120, b: 72 },
      { r: 52, g: 145, b: 88 },
      { r: 65, g: 165, b: 100 },
    ];
    for (let L = 3; L >= 1; L--) {
      const c = cols[L - 1];
      const rw = w * (0.22 + L * 0.16);
      const ry = 8 + L * 2.5;
      const lg = ctx.createRadialGradient(
        cx - rw * 0.25,
        baseY - 4 - L * 14,
        1,
        cx,
        baseY - 2 - L * 14,
        rw
      );
      lg.addColorStop(0, "rgb(" + (c.r + 30) + "," + (c.g + 25) + "," + (c.b + 12) + ")");
      lg.addColorStop(0.6, "rgb(" + c.r + "," + c.g + "," + c.b + ")");
      lg.addColorStop(1, "rgb(" + (c.r - 8) + "," + (c.g - 10) + "," + (c.b - 5) + ")");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 4 - L * 16, rw, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const trunk = ctx.createLinearGradient(x + w * 0.5 - 4, baseY, x + w * 0.5 + 4, baseY);
    trunk.addColorStop(0, "#5c4030");
    trunk.addColorStop(0.5, "#7a5a46");
    trunk.addColorStop(1, "#4a3228");
    ctx.fillStyle = trunk;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x + w * 0.5 - 4, baseY - 2, 8, 20, 2);
    } else {
      ctx.rect(x + w * 0.5 - 4, baseY - 2, 8, 20);
    }
    ctx.fill();
    ctx.restore();
  }

  function drawParkDistantRig(ox, baseY) {
    ctx.save();
    ctx.translate(ox, baseY);
    ctx.fillStyle = "#c62828";
    for (const xp of [-38, 28]) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(xp, -52, 10, 54, 3);
      else ctx.rect(xp, -52, 10, 54);
      ctx.fill();
    }
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-32, -56, 64, 8, 4);
    else ctx.rect(-32, -56, 64, 8);
    ctx.fill();
    ctx.fillStyle = "#ffeb3b";
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-28, -40 + r * 11, 56, 6, 2);
      else ctx.rect(-28, -40 + r * 11, 56, 6);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParkDistantSwings(ox, baseY, at) {
    ctx.save();
    ctx.translate(ox, baseY);
    ctx.fillStyle = "#b71c1c";
    for (const xp of [-50, 38]) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(xp, -62, 12, 64, 3);
      else ctx.rect(xp, -62, 12, 64);
      ctx.fill();
    }
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-48, -66, 98, 8, 3);
    else ctx.rect(-48, -66, 98, 8);
    ctx.fill();
    const swingA = Math.sin(at * 1.2) * 0.12;
    for (let s = 0; s < 2; s++) {
      const sx = -22 + s * 38;
      ctx.save();
      ctx.translate(sx, 0);
      ctx.rotate(swingA * (s % 2 ? 1 : -0.7));
      ctx.strokeStyle = "rgba(60, 100, 180, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -64);
      ctx.lineTo(0, -4);
      ctx.stroke();
      ctx.fillStyle = "#ffeb3b";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-7, 0, 14, 5, 2);
      else ctx.rect(-7, 0, 14, 5);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBirdV(x, y, wing) {
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x, y - 0.4 - Math.abs(wing) * 0.3);
    ctx.lineTo(x + 5, y);
    ctx.stroke();
  }

  function drawKite(x, y, wobble) {
    ctx.save();
    ctx.translate(x, y);
    const ang = 0.25 + wobble;
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4, 16);
    ctx.lineTo(4, 16);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 90, 80, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(60, 60, 80, 0.6)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      ctx.moveTo(0, 16);
      ctx.lineTo((k - 2) * 0.2, 22 + k * 4);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawButterfly(x, y, ph) {
    const w = 3 + Math.sin(ph * 2) * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(255, 180, 40, 0.9)";
    ctx.beginPath();
    ctx.ellipse(w, 0, 3, 2, 0.4, 0, Math.PI * 2);
    ctx.ellipse(-w, 0, 3, 2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function applyPlayfieldAtmosphere() {
    const vg = ctx.createRadialGradient(
      W * 0.52,
      GROUND * 0.38,
      40,
      W * 0.52,
      GROUND * 0.45,
      Math.max(W, H) * 0.85
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.65, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(12, 18, 32, 0.09)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    const bottom = ctx.createLinearGradient(0, GROUND - 28, 0, H);
    bottom.addColorStop(0, "rgba(0,0,0,0)");
    bottom.addColorStop(1, "rgba(0,0,0,0.04)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, GROUND - 6, W, H - GROUND + 6);
  }

  function drawEnvAmbientAnim(env, at, t, s, px) {
    if (env === "woods") {
      for (let b = 0; b < 2; b++) {
        const x = (b * 280 + at * 24 + t * 0.06) % (W + 20);
        const y = 38 + b * 10 + Math.sin(at * 0.55 + b) * 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = "rgba(32, 42, 36, 0.22)";
        ctx.lineWidth = 1.1;
        drawBirdV(0, 0, Math.sin(at * 3.2 + b));
        ctx.restore();
      }
    } else if (env === "field") {
      const x = (280 + at * 18) % 1000;
      const y = 60 + Math.sin(at * 0.45) * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = "rgba(55, 75, 58, 0.22)";
      ctx.lineWidth = 1.05;
      drawBirdV(0, 0, Math.sin(at * 2.8));
      ctx.restore();
      for (let f = 0; f < 2; f++) {
        const fx = (f * 260 + s * 6) % 1000;
        const fy = GROUND - 18 + Math.sin(f * 0.8 + at) * 1;
        drawButterfly(fx, fy, f + at * 2.2);
      }
    } else if (env === "beach") {
      for (let b = 0; b < 2; b++) {
        const x = (b * 300 + at * 28) % 1000;
        const y = 44 + b * 6;
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = "rgba(75, 88, 108, 0.28)";
        ctx.lineWidth = 1.05;
        drawBirdV(0, 0, Math.sin(at * 2.8 + b));
        ctx.restore();
      }
    } else if (env === "snow") {
      ctx.save();
      ctx.translate(400, 130);
      ctx.rotate(Math.sin(at * 0.35) * 0.1);
      ctx.strokeStyle = "rgba(210, 225, 245, 0.28)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.quadraticCurveTo(0, -4, 30, 0);
      ctx.stroke();
      ctx.restore();
      const bx = (320 + at * 18) % 1000;
      ctx.save();
      ctx.translate(bx, 48);
      ctx.strokeStyle = "rgba(50, 60, 70, 0.28)";
      drawBirdV(0, 0, Math.sin(at * 2.2));
      ctx.restore();
    } else if (env === "park") {
      for (let c = 0; c < 2; c++) {
        const cx = (c * 380 - at * 8 + 80) % 1000;
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.ellipse(cx + 50, 34 + c * 2, 55, 16, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 86, 34 + c * 2, 48, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const kx = 420 + Math.sin(at * 0.38) * 12;
      const ky = 28 + Math.cos(at * 0.3) * 3;
      drawKite(kx, ky, Math.sin(at * 0.75) * 0.04);
    }
  }

  function drawThemedSkyAndGround(t) {
    const env = activeEnv();
    const at = animTimeSec();
    const s = t * 0.022;
    const px = t * 0.14;

    if (hasSceneBackgroundImage(env)) {
      const im = sceneBackgrounds[env];
      ctx.drawImage(im, 0, 0, W, H);
      return;
    }

    if (env === "beach") {
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, "#6a9ec4");
      sky.addColorStop(0.5, "#9ec5e0");
      sky.addColorStop(0.78, "#d4c4a4");
      sky.addColorStop(1, "#c8a882");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, GROUND);
      const haze = ctx.createRadialGradient(130, 55, 4, 130, 60, 90);
      haze.addColorStop(0, "rgba(255, 248, 220, 0.4)");
      haze.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = haze;
      ctx.beginPath();
      ctx.arc(120 + Math.sin(s) * 2, 62, 88, 0, Math.PI * 2);
      ctx.fill();
      const seaY = 118;
      const gSea = ctx.createLinearGradient(0, seaY, 0, GROUND - 28);
      gSea.addColorStop(0, "#0d4558");
      gSea.addColorStop(0.4, "#156a7d");
      gSea.addColorStop(0.75, "#2a8a9a");
      gSea.addColorStop(1, "#4fb0bf");
      ctx.fillStyle = gSea;
      ctx.fillRect(0, seaY, W, GROUND - 28 - seaY);
      const ox = (px * 25) % 1000;
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < W + 32; x += 18) {
        const y = seaY + 52 + Math.sin((x + ox + t * 32) * 0.035) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      for (let b = 0; b < 3; b++) {
        const bx = (b * 280 - px * 38) % (W + 100);
        ctx.beginPath();
        ctx.ellipse(bx, seaY + 30 + b, 32, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const gSand = ctx.createLinearGradient(0, GROUND - 32, 0, H);
      gSand.addColorStop(0, "#d4b48a");
      gSand.addColorStop(0.5, "#e0c9a0");
      gSand.addColorStop(1, "#e8d6b0");
      ctx.fillStyle = gSand;
      ctx.fillRect(0, GROUND - 28, W, H - (GROUND - 28));
      ctx.fillStyle = "rgba(160, 120, 80, 0.18)";
      ctx.fillRect(0, GROUND - 3, W, 4);
      for (let i = 0; i < 2; i++) {
        const px1 = (i * 400 - px * 20) % 1000;
        const sway = Math.sin(at * 0.5 + i) * 0.07;
        const pivotX = px1 + 2.5;
        const pivotY = GROUND - 48;
        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(sway);
        ctx.translate(-pivotX, -pivotY);
        ctx.fillStyle = "#2a3d22";
        ctx.fillRect(px1, GROUND - 50, 5, 34);
        ctx.beginPath();
        ctx.arc(px1 + 2, GROUND - 56, 18, 0, Math.PI * 2);
        ctx.fillStyle = "#1a5c32";
        ctx.fill();
        ctx.beginPath();
        for (let r = 0; r < 5; r++) {
          const a = (r / 5) * Math.PI * 2;
          ctx.moveTo(px1 + 2, GROUND - 56);
          ctx.lineTo(px1 + 2 + Math.cos(a) * 28, GROUND - 56 + Math.sin(a) * 28);
        }
        ctx.fillStyle = "#226638";
        ctx.fill();
        ctx.restore();
      }
    } else if (env === "woods") {
      const g0 = ctx.createLinearGradient(0, 0, 0, GROUND);
      g0.addColorStop(0, "#15221a");
      g0.addColorStop(0.4, "#1e3226");
      g0.addColorStop(0.75, "#2a4538");
      g0.addColorStop(1, "#3a5a4a");
      ctx.fillStyle = g0;
      ctx.fillRect(0, 0, W, GROUND);
      ctx.fillStyle = "rgba(40, 90, 50, 0.15)";
      ctx.fillRect(0, 0, W, GROUND);
      for (let L = 0; L < 2; L++) {
        const gx = 120 + L * 520;
        const gy = 40;
        const grad = ctx.createLinearGradient(gx, gy, gx + 40, H);
        grad.addColorStop(0, "rgba(200, 230, 180, 0.08)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + 80, 0);
        ctx.lineTo(gx + 20, H);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 5; i++) {
        const x = (i * 180 - s * 28 - (i % 3) * 20) % 1200;
        const h0 = 55 + (i * 7) % 30;
        const yBase = GROUND - 4 - h0;
        const trW = 12 + (i % 2) * 4;
        const sway = Math.sin(at * 0.9 + i * 0.5) * 0.05;
        ctx.fillStyle = "#2a1a0a";
        ctx.fillRect(x, yBase, trW, h0);
        const rad = 36 + (i % 4) * 6;
        const cx = x + trW * 0.5;
        ctx.save();
        ctx.translate(cx, yBase);
        ctx.rotate(sway);
        ctx.translate(-cx, -yBase);
        ctx.beginPath();
        ctx.ellipse(x + 6, yBase, rad, rad * 0.9, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 ? "#0f2e18" : "#1a3d22";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 4, yBase + 6, rad * 0.5, rad * 0.45, 0.3, 0, Math.PI * 2);
        ctx.ellipse(x + 18, yBase + 4, rad * 0.4, rad * 0.38, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = "#0d2810";
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "rgba(120, 200, 90, 0.08)";
      for (let f = 0; f < 3; f++) {
        const fx = (f * 280 - s * 35) % 1000;
        const fy = GROUND - 6 - (f % 3) * 2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + 16, fy - 18);
        ctx.lineTo(fx + 32, fy);
        ctx.closePath();
        ctx.fill();
      }
      const g1 = ctx.createLinearGradient(0, GROUND - 2, 0, H);
      g1.addColorStop(0, "#2a3a2a");
      g1.addColorStop(1, "#1e2a1c");
      ctx.fillStyle = g1;
      ctx.fillRect(0, GROUND, W, H - GROUND);
      for (let m = 0; m < 3; m++) {
        const mx = (m * 280 - t * 10) % 1000;
        ctx.fillStyle = "rgba(255, 210, 120, 0.2)";
        ctx.beginPath();
        ctx.arc(mx + 40, 175 + m * 4, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (env === "snow") {
      const g0 = ctx.createLinearGradient(0, 0, 0, GROUND);
      g0.addColorStop(0, "#6a85a0");
      g0.addColorStop(0.5, "#95adcc");
      g0.addColorStop(1, "#c4d4e4");
      ctx.fillStyle = g0;
      ctx.fillRect(0, 0, W, GROUND);
      for (let m = 0; m < 3; m++) {
        const mx = 80 + m * 300;
        ctx.fillStyle = "rgba(200, 215, 230, 0.8)";
        ctx.beginPath();
        ctx.moveTo(mx, 100 + m * 4);
        ctx.lineTo(mx + 100, 95 + m * 4);
        ctx.lineTo(mx + 200, 110 + m * 4);
        ctx.lineTo(mx + 100, 125 + m * 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(100, 130, 160, 0.15)";
        ctx.beginPath();
        ctx.moveTo(mx, 100 + m * 4);
        ctx.lineTo(mx + 200, 110 + m * 4);
        ctx.lineTo(mx + 200, 130 + m * 4);
        ctx.lineTo(mx, 120 + m * 4);
        ctx.closePath();
        ctx.fill();
      }
      for (let i = 0; i < 7; i++) {
        const x = (i * 140 - s * 24) % 1200;
        const sc = 0.5 + (i % 3) * 0.2;
        const sway = Math.sin(at * 0.55 + i * 0.4) * 0.055;
        const bx = x + 25;
        const by = GROUND - 4;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(sway);
        ctx.translate(-bx, -by);
        ctx.fillStyle = "#1a2c2a";
        ctx.fillRect(x + 20, GROUND - 4 - 70 * sc, 10 * sc, 70 * sc);
        ctx.beginPath();
        ctx.moveTo(x + 25, GROUND - 4 - 70 * sc);
        ctx.lineTo(x + 25, GROUND - 4 - 110 * sc);
        ctx.lineTo(x + 5, GROUND - 4 - 80 * sc);
        ctx.closePath();
        ctx.fillStyle = "#2d4a3a";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 25, GROUND - 4 - 70 * sc);
        ctx.lineTo(x + 25, GROUND - 4 - 110 * sc);
        ctx.lineTo(x + 45, GROUND - 4 - 80 * sc);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 25, GROUND - 4 - 110 * sc);
        ctx.lineTo(x - 2, GROUND - 4 - 78 * sc);
        ctx.lineTo(x + 52, GROUND - 4 - 78 * sc);
        ctx.closePath();
        ctx.fillStyle = "#0f1f0f";
        ctx.fill();
        ctx.restore();
      }
      for (let i = 0; i < 22; i++) {
        const sx = (i * 31 + t * 10 + (i * i) % 17) % (W + 8);
        const sy = (i * 7 + t * 6) % 210;
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath();
        ctx.arc(sx, sy, 0.6 + (i % 2) * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      const g1 = ctx.createLinearGradient(0, GROUND - 1, 0, H);
      g1.addColorStop(0, "#e0eaf2");
      g1.addColorStop(1, "#c8d4e0");
      ctx.fillStyle = g1;
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.strokeStyle = "rgba(180, 200, 220, 0.28)";
      for (let r = 0; r < 3; r++) {
        const rx = (r * 240 - t * 6) % 1000;
        ctx.beginPath();
        ctx.moveTo(rx, GROUND);
        for (let u = 0; u < 4; u++) {
          ctx.lineTo(rx + u * 22, GROUND - (u % 2) * 1.5);
        }
        ctx.stroke();
      }
    } else if (env === "park") {
      const pathL = 210;
      const pathR = 690;
      const pathTop = GROUND - 84;
      const par = px * 0.08;
      const skyG = ctx.createLinearGradient(0, 0, 0, GROUND);
      skyG.addColorStop(0, "#7eb0d4");
      skyG.addColorStop(0.5, "#a8cfe8");
      skyG.addColorStop(0.92, "#d0e8f5");
      skyG.addColorStop(1, "#dceef9");
      ctx.fillStyle = skyG;
      ctx.fillRect(0, 0, W, GROUND);
      const sun = ctx.createRadialGradient(680, 52, 4, 680, 52, 95);
      sun.addColorStop(0, "rgba(255, 250, 230, 0.55)");
      sun.addColorStop(0.45, "rgba(255, 245, 210, 0.15)");
      sun.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(680 + Math.sin(s) * 1.5, 50, 72, 0, Math.PI * 2);
      ctx.fill();
      const hp = par;
      ctx.fillStyle = "rgba(95, 160, 115, 0.22)";
      ctx.beginPath();
      ctx.moveTo(-20, GROUND);
      ctx.bezierCurveTo(120 + hp, 200, 380, 190, 520 + hp * 0.3, GROUND);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(70, 145, 95, 0.28)";
      ctx.beginPath();
      ctx.moveTo(-20, GROUND);
      ctx.bezierCurveTo(200 + hp * 0.5, 168, 480, 155, W + 40, GROUND);
      ctx.closePath();
      ctx.fill();
      const rigX = 95 - (par % 60);
      const swingX = 800 - (par % 80);
      ctx.save();
      ctx.globalAlpha = 0.16;
      drawParkDistantRig(rigX, 258);
      drawParkDistantSwings(swingX, 260, at);
      ctx.restore();
      const tw = 40;
      for (const [tx, tid] of [
        [32, 1],
        [130, 2],
        [770, 3],
        [900, 4],
      ]) {
        if (tx + tw < pathL - 4 || tx > pathR + 4) {
          drawScallopPine(tx, GROUND, tw, tid, at);
        }
      }
      const grL = ctx.createLinearGradient(0, pathTop, pathL, GROUND);
      grL.addColorStop(0, "#5cb876");
      grL.addColorStop(1, "#3a9850");
      ctx.fillStyle = grL;
      ctx.beginPath();
      ctx.moveTo(0, pathTop - 2);
      ctx.lineTo(pathL, pathTop);
      ctx.lineTo(pathL, GROUND);
      ctx.lineTo(0, GROUND);
      ctx.closePath();
      ctx.fill();
      const grR = ctx.createLinearGradient(pathR, pathTop, W, GROUND);
      grR.addColorStop(0, "#5cb876");
      grR.addColorStop(1, "#3a9850");
      ctx.fillStyle = grR;
      ctx.beginPath();
      ctx.moveTo(pathR, pathTop);
      ctx.lineTo(W, pathTop - 2);
      ctx.lineTo(W, GROUND);
      ctx.lineTo(pathR, GROUND);
      ctx.closePath();
      ctx.fill();
      const pathGrad = ctx.createLinearGradient(0, pathTop, 0, GROUND);
      pathGrad.addColorStop(0, "#bdb0a0");
      pathGrad.addColorStop(0.45, "#a89888");
      pathGrad.addColorStop(1, "#8e8074");
      ctx.save();
      ctx.shadowColor = "rgba(35, 32, 28, 0.14)";
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = pathGrad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pathL, pathTop, pathR - pathL, GROUND - pathTop, 14);
      } else {
        ctx.rect(pathL, pathTop, pathR - pathL, GROUND - pathTop);
      }
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pathL + 0.5, pathTop + 0.5, pathR - pathL - 1, GROUND - pathTop - 1, 12);
      }
      ctx.stroke();
      ctx.setLineDash([22, 16]);
      ctx.strokeStyle = "rgba(255, 245, 210, 0.35)";
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      const mid = (pathL + pathR) * 0.5;
      ctx.moveTo(mid, pathTop + 12);
      ctx.lineTo(mid, GROUND - 6);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (env === "pool") {
      const waterTop = 56;
      const deckTop = GROUND - 18;
      const skyG = ctx.createLinearGradient(0, 0, 0, waterTop);
      skyG.addColorStop(0, "#b0d8e8");
      skyG.addColorStop(1, "#e2f2f8");
      ctx.fillStyle = skyG;
      ctx.fillRect(0, 0, W, waterTop);
      const waterG = ctx.createLinearGradient(0, waterTop, 0, deckTop);
      waterG.addColorStop(0, "#6ec8d4");
      waterG.addColorStop(0.5, "#4eb0c4");
      waterG.addColorStop(1, "#2d8fa0");
      ctx.fillStyle = waterG;
      ctx.fillRect(0, waterTop, W, deckTop - waterTop);
      const glint = ctx.createRadialGradient(680, 100, 8, 700, 115, 160);
      glint.addColorStop(0, "rgba(255, 255, 255, 0.2)");
      glint.addColorStop(0.55, "rgba(255, 255, 255, 0.04)");
      glint.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glint;
      ctx.fillRect(0, waterTop, W, deckTop - waterTop);
      const gridScroll = (t * 22) % 48;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.11)";
      ctx.lineWidth = 1;
      for (let gx = -48; gx < W + 48; gx += 48) {
        const x = gx - gridScroll;
        ctx.beginPath();
        ctx.moveTo(x, waterTop);
        ctx.lineTo(x, deckTop);
        ctx.stroke();
      }
      for (let gy = waterTop; gy < deckTop; gy += 36) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }
      const chScroll = (t * 38) % 90;
      ctx.fillStyle = "rgba(20, 70, 100, 0.14)";
      for (let hx = -90; hx < W + 90; hx += 90) {
        const ax = hx - chScroll;
        const ay = deckTop - 4;
        ctx.beginPath();
        ctx.moveTo(ax, ay - 7);
        ctx.lineTo(ax + 18, ay);
        ctx.lineTo(ax, ay + 3);
        ctx.closePath();
        ctx.fill();
      }
      const deckG = ctx.createLinearGradient(0, deckTop, 0, GROUND);
      deckG.addColorStop(0, "#d4894a");
      deckG.addColorStop(0.5, "#c97a3d");
      deckG.addColorStop(1, "#b86a32");
      ctx.fillStyle = deckG;
      ctx.fillRect(0, deckTop, W, GROUND - deckTop);
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(0, deckTop, W, 1);
      for (let lx = 0; lx < W; lx += 60) {
        ctx.fillStyle = "rgba(0,0,0,0.04)";
        ctx.fillRect(lx, deckTop + 3, 1, GROUND - deckTop - 3);
      }
    } else {
      const g0 = ctx.createLinearGradient(0, 0, 0, GROUND);
      g0.addColorStop(0, "#7aa8c8");
      g0.addColorStop(0.4, "#a8c8dd");
      g0.addColorStop(0.75, "#c5dcc8");
      g0.addColorStop(1, "#9bc49a");
      ctx.fillStyle = g0;
      ctx.fillRect(0, 0, W, GROUND);
      const sunC = 130 + Math.sin(s) * 2;
      const sunR = ctx.createRadialGradient(sunC, 60, 2, sunC, 64, 85);
      sunR.addColorStop(0, "rgba(255, 250, 230, 0.5)");
      sunR.addColorStop(0.4, "rgba(255, 245, 210, 0.12)");
      sunR.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = sunR;
      ctx.beginPath();
      ctx.arc(sunC, 62, 78, 0, Math.PI * 2);
      ctx.fill();
      for (let h = 0; h < 2; h++) {
        const hx = (h * 500 - t * 4) % 1000;
        const hy = 172 + h * 12;
        const hillG = ctx.createLinearGradient(hx, hy, hx + 180, GROUND);
        hillG.addColorStop(0, "rgba(120, 160, 110, 0.35)");
        hillG.addColorStop(1, "rgba(85, 128, 88, 0.45)");
        ctx.fillStyle = hillG;
        ctx.beginPath();
        ctx.moveTo(hx - 50, GROUND);
        ctx.quadraticCurveTo(hx + 90, hy - 22, hx + 300, GROUND);
        ctx.closePath();
        ctx.fill();
      }
      for (let c = 0; c < 2; c++) {
        const cx = ((c * 420 - t * 8) % 1000) - 20;
        ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
        ctx.beginPath();
        ctx.ellipse(cx, 58 + c * 4, 56, 17, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 36, 58 + c * 4, 44, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let f = 0; f < 3; f++) {
        const fx = (f * 300 - t * 9) % 1000;
        const cols = ["#d896a8", "#e8c878", "#98c4d4"];
        ctx.fillStyle = cols[f % 3];
        ctx.beginPath();
        ctx.arc(fx, GROUND - 4 - 2.5, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(50, 90, 50, 0.28)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(fx, GROUND - 2);
        ctx.lineTo(fx, GROUND - 2 - 4);
        ctx.stroke();
      }
    }

    if (env === "field") {
      const g1 = ctx.createLinearGradient(0, GROUND - 6, 0, H);
      g1.addColorStop(0, "#3d6824");
      g1.addColorStop(0.4, "#4a7a2e");
      g1.addColorStop(1, "#528632");
      ctx.fillStyle = g1;
      ctx.fillRect(0, GROUND, W, H - GROUND);
    } else if (env === "park") {
      const sand = ctx.createLinearGradient(0, GROUND, 0, H);
      sand.addColorStop(0, "#e0d0b0");
      sand.addColorStop(0.55, "#d8c6a0");
      sand.addColorStop(1, "#cbb68e");
      ctx.fillStyle = sand;
      ctx.fillRect(0, GROUND, W, H - GROUND);
    } else if (env === "pool") {
      const gGrass = ctx.createLinearGradient(0, GROUND, 0, H);
      gGrass.addColorStop(0, "#6eb84a");
      gGrass.addColorStop(0.55, "#5da83e");
      gGrass.addColorStop(1, "#4a9030");
      ctx.fillStyle = gGrass;
      ctx.fillRect(0, GROUND, W, H - GROUND);
      for (let f = 0; f < 2; f++) {
        const fx = (f * 420 - t * 10) % 1000;
        const gy = GROUND + 12;
        ctx.fillStyle = "#5d4a3a";
        ctx.fillRect(fx, gy + 5, 2, 10);
        ctx.fillStyle = "#e8b848";
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(fx + 1 + Math.cos(a) * 3.2, gy + 3 + Math.sin(a) * 3.2, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#4a3328";
        ctx.beginPath();
        ctx.arc(fx + 1, gy + 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < 4; i++) {
      if (env === "beach" || env === "field" || env === "pool") {
        const cx = (i * 240 - t * 10) % 1000;
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.ellipse(cx + 30, 36 + (i % 2) * 3, 42 + i * 2, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    applyPlayfieldAtmosphere();
    drawEnvAmbientAnim(env, at, t, s, px);
  }

  function drawMascot(pr, tilt, which) {
    const cx = pr.x + pr.w / 2;
    const b = pr.y + pr.h;
    const h = pr.h;
    const w = pr.w;
    ctx.save();
    ctx.translate(cx, b);
    if (tilt) ctx.rotate(tilt);
    ctx.translate(0, -h * 0.4);
    if (which === "bear") {
      ctx.fillStyle = "#7a4a2a";
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-w * 0.2, -w * 0.22, w * 0.12, 0, Math.PI * 2);
      ctx.arc(w * 0.2, -w * 0.22, w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3d2810";
      ctx.fillRect(-w * 0.25, 2, w * 0.5, h * 0.5);
    } else if (which === "robot") {
      ctx.fillStyle = "#a8b0b8";
      ctx.fillRect(-w * 0.28, -h * 0.35, w * 0.56, h * 0.35);
      ctx.fillStyle = "#7a8a9a";
      ctx.beginPath();
      ctx.arc(0, -h * 0.38, 3, 0, Math.PI * 2);
      ctx.moveTo(0, -h * 0.38);
      ctx.lineTo(0, -h * 0.48);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-8, -h * 0.2, 6, 5);
      ctx.fillRect(2, -h * 0.2, 6, 5);
      ctx.fillStyle = "#888";
      ctx.fillRect(-w * 0.25, 0, w * 0.5, h * 0.45);
    } else {
      ctx.fillStyle = "#f5f0e8";
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.3, w * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-w * 0.18, -h * 0.28, w * 0.1, w * 0.22, -0.3, 0, Math.PI * 2);
      ctx.ellipse(w * 0.18, -h * 0.28, w * 0.1, w * 0.22, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5a0c0";
      ctx.beginPath();
      ctx.ellipse(0, 3, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function useImageChar() {
    if (charType === "custom" && customReady && customSprite.naturalWidth) {
      return { img: customSprite, ok: true };
    }
    if (charType === "friend" && defaultReady) {
      return { img: defaultSprite, ok: true };
    }
    return { img: null, ok: false };
  }

  function friendFrameSrc(i) {
    const x0 = FRIEND_SHEET_X0;
    const t = FRIEND_SHEET_W;
    const n = FRIEND_FRAME_COUNT;
    const fi = Math.max(0, Math.min(n - 1, i | 0));
    const sx = x0 + Math.floor((fi * t) / n);
    const sx2 = x0 + Math.floor(((fi + 1) * t) / n);
    return { sx, sy: FRIEND_SHEET_Y, sw: sx2 - sx, sh: FRIEND_SHEET_H };
  }

  function friendAnimFrame() {
    if (mode === "over") return 6;
    if (friendLandT > 0) return 5;
    if (!player.onGround) {
      if (player.vy < -120) return 3;
      if (player.vy > 120) return 4;
      return 3 + (Math.floor(friendAirPhase * 0.5) % 2);
    }
    if (player.onGround && keys.duck && gameActive && mode === "play") return 7;
    return 1 + (Math.floor(friendRunPhase) % 2);
  }

  function drawPlayerEntity(pr) {
    const inAir = !player.onGround;
    const lean =
      inAir
        ? Math.max(-0.24, Math.min(0.26, player.vy * 0.00045))
        : 0;
    if (charType === "friend" && defaultReady) {
      const f = friendAnimFrame();
      const { sx, sy, sw, sh } = friendFrameSrc(f);
      ctx.save();
      const cx = pr.x + pr.w / 2;
      const b = pr.y + pr.h;
      ctx.translate(cx, b);
      if (inAir) {
        ctx.rotate(lean);
        const bob = Math.sin(friendAirPhase * 1.1) * 3;
        const squash = 1 + Math.sin(friendAirPhase * 1.6) * 0.07;
        ctx.translate(0, bob);
        ctx.scale(squash, 2 - squash);
      }
      ctx.drawImage(defaultSprite, sx, sy, sw, sh, -pr.w / 2, -pr.h, pr.w, pr.h);
      ctx.restore();
      return;
    }
    const { img, ok } = useImageChar();
    if (ok && img) {
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      ctx.save();
      ctx.translate(pr.x + pr.w / 2, pr.y + pr.h);
      if (inAir && lean) ctx.rotate(lean);
      ctx.drawImage(img, 0, 0, sw, sh, -pr.w / 2, -pr.h, pr.w, pr.h);
      ctx.restore();
    } else {
      const whichChar =
        charType === "bear" ? "bear" : charType === "robot" ? "robot" : "bunny";
      const tiltMascot = inAir
        ? (player.vy < -0.1 ? -0.14 : player.vy > 0.1 ? 0.1 : 0)
        : 0;
      drawMascot(pr, tiltMascot, whichChar);
    }
  }

  function resizeCanvas() {
    const wrap = canvas.parentElement;
    let maxW = Math.min(wrap.clientWidth, W);
    if (maxW <= 0) {
      maxW = Math.min(typeof window !== "undefined" ? window.innerWidth || W : W, W);
    }
    const scale = maxW / W;
    canvas.style.width = maxW + "px";
    canvas.style.height = H * scale + "px";
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (typeof ctx.imageSmoothingQuality === "string") {
      ctx.imageSmoothingQuality = "high";
    }
  }

  function resetRun() {
    distance = 0;
    scrollPxPerSec = SCROLL_BASE;
    player.feetY = GROUND;
    player.vy = 0;
    player.onGround = true;
    player.jumpsLeft = 2;
    friendLandT = 0;
    friendRunPhase = 0;
    friendAirPhase = 0;
    obstacles = [];
    obstacles.push({ x: player.x + 320, type: "log" });
  }

  function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function puddleSize() {
    return { w: PUDDLE.w, h: PUDDLE.h, y: PUDDLE.y };
  }
  function logSize() {
    return { w: LOG.w, h: LOG.h, y: LOG.y };
  }
  function branchSize() {
    return { w: BRANCH.w, h: BRANCH.h, y: BRANCH.y };
  }
  function boxForObs(obs) {
    if (obs.type === "puddle") {
      const b = puddleSize();
      return { x: obs.x, y: b.y, w: b.w, h: b.h };
    }
    if (obs.type === "log") {
      const b = logSize();
      return { x: obs.x, y: b.y, w: b.w, h: b.h };
    }
    const b = branchSize();
    return { x: obs.x, y: b.y, w: b.w, h: b.h };
  }
  function obsWidth(o) {
    if (o.type === "puddle") return PUDDLE.w;
    if (o.type === "log") return LOG.w;
    return BRANCH.w;
  }

  function checkCollision() {
    const h = player.h;
    const top = player.feetY - h;
    const pr = { x: player.x + 4, y: top + 2, w: player.w - 8, h: h - 4 };
    for (const obs of obstacles) {
      const b = boxForObs(obs);
      if (rectOverlap(pr.x, pr.y, pr.w, pr.h, b.x, b.y, b.w, b.h)) {
        return true;
      }
    }
    return false;
  }

  function rightmostX() {
    if (!obstacles.length) return -9999;
    return Math.max.apply(
      null,
      obstacles.map((o) => o.x + obsWidth(o))
    );
  }

  function pickType() {
    const r = Math.random();
    if (r < 0.4) return "log";
    if (r < 0.7) return "puddle";
    return "branch";
  }

  function maybeSpawn() {
    if (!obstacles.length) {
      obstacles.push({ x: W + 70, type: pickType() });
      return;
    }
    if (rightmostX() < W - SPAWN_GAP) {
      obstacles.push({ x: W + 30 + Math.random() * 50, type: pickType() });
    }
  }

  function update(dt) {
    if (!gameActive || mode !== "play") return;
    const tsec = dt / 1000;
    const airMult = player.onGround ? 1 : SCROLL_BOOST_IN_AIR;
    const move = scrollPxPerSec * tsec * airMult;
    distance += move * 0.15;
    for (const o of obstacles) o.x -= move;
    obstacles = obstacles.filter((o) => o.x > -200);
    maybeSpawn();
    const wasAirborne = !player.onGround;
    if (!player.onGround) {
      player.vy += GRAVITY * tsec;
      player.feetY += player.vy * tsec;
      if (player.feetY >= GROUND) {
        player.feetY = GROUND;
        player.vy = 0;
        player.onGround = true;
        player.jumpsLeft = 2;
      }
    }
    if (charType === "friend") {
      if (player.onGround) {
        friendAirPhase = 0;
      } else {
        friendAirPhase += tsec * 10;
      }
      if (friendLandT > 0) friendLandT = Math.max(0, friendLandT - tsec);
      if (player.onGround && wasAirborne) friendLandT = 0.18;
      if (player.onGround && friendLandT <= 0) {
        friendRunPhase += tsec * 5.5 * (scrollPxPerSec / SCROLL_BASE);
      }
    }
    if (checkCollision()) {
      mode = "over";
      const d = Math.floor(distance);
      if (d > best) {
        best = d;
        localStorage.setItem("runnerBest", String(best));
        if (bestEl) bestEl.textContent = String(best);
      }
      showOver(d);
    }
    const t = performance.now() * 0.001;
    const extra = Math.min(SCROLL_MAX - SCROLL_BASE, Math.floor(distance) * 0.08);
    scrollPxPerSec = SCROLL_BASE + extra + 0.15 * Math.sin(t * 0.1);
  }

  function showOver(d) {
    const nice = playerDisplayName.trim() || "Friend";
    overlayTitle.textContent = "Ouch, " + nice + "!";
    overlayText.textContent =
      "You reached " + d + " steps in the " + themeLabel(currentEnv).place + ". Want another go?";
    overlay.classList.remove("is-hidden");
    overlay.classList.add("is-visible");
  }

  function showGameView() {
    gameSection.classList.remove("is-hidden");
    gameSection.removeAttribute("hidden");
    setupEl.classList.add("is-hidden");
    if (app) app.classList.add("app--wider");
    // #gameSection was display:none on first load, so the initial resizeCanvas() had width 0. Size again after reveal.
    resizeCanvas();
    requestAnimationFrame(function () {
      resizeCanvas();
    });
  }

  function showSetupView() {
    gameActive = false;
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(false);
    }
    mode = "play";
    setupEl.classList.remove("is-hidden");
    gameSection.classList.add("is-hidden");
    gameSection.setAttribute("hidden", "");
    overlay.classList.add("is-hidden");
    overlay.classList.remove("is-visible");
    if (app) app.classList.remove("app--wider");
  }

  function applyPrefsToRun() {
    const raw = (playerNameIn && playerNameIn.value) || "";
    playerDisplayName = raw.trim() || "Friend";
    localStorage.setItem(LS_NAME, playerDisplayName);
    const envPressed = document.querySelector('.env-card[aria-pressed="true"]');
    const fromBtn = envPressed && envPressed.getAttribute("data-env");
    const fromLs = localStorage.getItem(LS_ENV);
    let next = fromBtn || fromLs || "field";
    if (ENV_IDS.indexOf(next) < 0) next = "field";
    currentEnv = next;
    localStorage.setItem(LS_ENV, currentEnv);
    const pressedChar = document.querySelector(
      ".char-card[aria-pressed='true'], label.char-card[aria-pressed='true']"
    );
    if (charPhoto && charPhoto.files && charPhoto.files[0]) {
      charType = "custom";
    } else {
      charType = /** @type {any} */ (pressedChar?.getAttribute("data-char") || "friend");
      if (charType === "custom" && !charPhoto?.files?.[0]) {
        charType = "friend";
      }
    }
    localStorage.setItem(LS_CHAR, charType);
    if (charType === "custom" && charPhoto && charPhoto.files[0]) {
      if (customObjectUrl) URL.revokeObjectURL(customObjectUrl);
      customObjectUrl = URL.createObjectURL(charPhoto.files[0]);
      customSprite.src = customObjectUrl;
      customReady = false;
      customSprite.onload = function () {
        customReady = true;
      };
    } else {
      if (customObjectUrl) {
        URL.revokeObjectURL(customObjectUrl);
        customObjectUrl = null;
      }
      customSprite.src = "";
      customReady = false;
    }
    const tl = themeLabel(currentEnv);
    if (runTitle) {
      runTitle.textContent = playerDisplayName + "'s " + tl.place;
    }
    if (runSubtitle) runSubtitle.textContent = tl.sub;
    if (hudNameLine) {
      hudNameLine.textContent = playerDisplayName + "'s run";
    }
  }

  function startRun() {
    applyPrefsToRun();
    if (charType === "custom" && (!charPhoto || !charPhoto.files || !charPhoto.files[0])) {
      alert("Choose a picture for “You”, or pick another character.");
      return;
    }
    showGameView();
    gameActive = true;
    if (typeof KidsCore !== "undefined" && typeof KidsCore.setPlayMode === "function") {
      KidsCore.setPlayMode(true);
    }
    mode = "play";
    resetRun();
  }

  function jump() {
    if (!gameActive) return;
    if (mode === "over") {
      mode = "play";
      resetRun();
      overlay.classList.add("is-hidden");
      overlay.classList.remove("is-visible");
      return;
    }
    if (mode === "play" && player.jumpsLeft > 0) {
      const inAir = !player.onGround;
      player.vy = inAir ? JUMP_V_DOUBLE : JUMP_V;
      player.jumpsLeft -= 1;
      player.onGround = false;
    }
  }

  function drawObstaclesLayer() {
    const envId = activeEnv();
    const parkStyle = envId === "park";
    const poolStyle = envId === "pool";
    for (const obs of obstacles) {
      const b = boxForObs(obs);
      if (obs.type === "puddle") {
        if (parkStyle) {
          ctx.fillStyle = "rgba(200, 175, 130, 0.55)";
          ctx.beginPath();
          ctx.ellipse(b.x + b.w * 0.5, b.y + b.h * 0.48, b.w * 0.5, b.h * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          const puddleGrad = ctx.createRadialGradient(
            b.x + b.w * 0.4,
            b.y + b.h * 0.4,
            1,
            b.x + b.w * 0.5,
            b.y + b.h * 0.52,
            b.w * 0.4
          );
          puddleGrad.addColorStop(0, "rgba(90, 180, 255, 0.95)");
          puddleGrad.addColorStop(1, "rgba(30, 120, 210, 0.9)");
          ctx.fillStyle = puddleGrad;
          ctx.beginPath();
          ctx.ellipse(b.x + b.w * 0.5, b.y + b.h * 0.52, b.w * 0.3, b.h * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.beginPath();
          ctx.ellipse(b.x + b.w * 0.38, b.y + b.h * 0.38, 8, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (poolStyle) {
          const cx = b.x + b.w * 0.5;
          const cy = b.y + b.h * 0.5;
          const rx = b.w * 0.48;
          const ry = b.h * 0.42;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.fillStyle = "rgba(0, 50, 80, 0.18)";
          ctx.beginPath();
          ctx.ellipse(3, 5, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 7;
          ctx.strokeStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#e53935";
          ctx.beginPath();
          ctx.ellipse(0, 0, rx * 0.78, ry * 0.8, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(0, 0, rx * 0.5, ry * 0.52, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(100, 210, 255, 0.25)";
          ctx.beginPath();
          ctx.ellipse(0, 0, rx * 0.32, ry * 0.34, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = "rgba(50, 105, 165, 0.92)";
          ctx.beginPath();
          ctx.ellipse(
            b.x + b.w / 2,
            b.y + b.h * 0.5,
            (b.w / 2) * 0.95,
            b.h * 0.9,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.strokeStyle = "rgba(20, 55, 95, 0.55)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "rgba(210, 240, 255, 0.45)";
          ctx.beginPath();
          ctx.ellipse(b.x + b.w * 0.35, b.y + 6, 16, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (obs.type === "log") {
        if (parkStyle) {
          const r = 10;
          ctx.fillStyle = "#c62828";
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(b.x, b.y, b.w, b.h, r);
          } else {
            ctx.rect(b.x, b.y, b.w, b.h);
          }
          ctx.fill();
          ctx.fillStyle = "#ffeb3b";
          for (let row = 0; row < 3; row++) {
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(b.x + 5, b.y + 8 + row * 12, b.w - 10, 7, 2);
            } else {
              ctx.rect(b.x + 5, b.y + 8 + row * 12, b.w - 10, 7);
            }
            ctx.fill();
          }
          ctx.fillStyle = "rgba(100, 20, 20, 0.35)";
          ctx.font = "800 11px Nunito, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("jump", b.x + b.w / 2, b.y + 30);
          ctx.textAlign = "left";
        } else if (poolStyle) {
          const r = 9;
          ctx.save();
          ctx.fillStyle = "rgba(0, 60, 90, 0.2)";
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(b.x + 2, b.y + 3, b.w, b.h, r);
            ctx.fill();
          } else {
            ctx.fillRect(b.x + 2, b.y + 3, b.w, b.h);
          }
          const wood = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y);
          wood.addColorStop(0, "#6d4c2e");
          wood.addColorStop(0.3, "#8b6239");
          wood.addColorStop(0.6, "#5c4028");
          wood.addColorStop(1, "#4a3018");
          ctx.fillStyle = wood;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(b.x, b.y, b.w, b.h, r);
            ctx.fill();
          } else {
            ctx.fillRect(b.x, b.y, b.w, b.h);
          }
          ctx.strokeStyle = "rgba(30, 20, 10, 0.5)";
          ctx.lineWidth = 1.5;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(b.x, b.y, b.w, b.h, r);
            ctx.stroke();
          }
          ctx.strokeStyle = "rgba(255, 220, 180, 0.35)";
          ctx.beginPath();
          ctx.moveTo(b.x + 8, b.y + 12);
          ctx.lineTo(b.x + b.w - 8, b.y + 12);
          ctx.moveTo(b.x + 6, b.y + 28);
          ctx.lineTo(b.x + b.w - 6, b.y + 28);
          ctx.stroke();
          ctx.fillStyle = "rgba(40, 25, 15, 0.4)";
          ctx.font = "800 12px Nunito, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("jump", b.x + b.w / 2, b.y + 32);
          ctx.textAlign = "left";
          ctx.restore();
        } else {
          const r = 8;
          ctx.fillStyle = "#4a2f18";
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(b.x, b.y, b.w, b.h, r);
            ctx.fill();
          } else {
            ctx.fillRect(b.x, b.y, b.w, b.h);
          }
          ctx.strokeStyle = "#2a1808";
          ctx.lineWidth = 2;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(b.x, b.y, b.w, b.h, r);
            ctx.stroke();
          }
          ctx.fillStyle = "#0f1f0a";
          ctx.font = "800 14px Nunito, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("jump", b.x + b.w / 2, b.y + 32);
          ctx.textAlign = "left";
        }
      } else {
        if (parkStyle) {
          const archY = b.y;
          ctx.beginPath();
          ctx.moveTo(b.x, archY + b.h);
          ctx.lineTo(b.x, archY + 14);
          ctx.quadraticCurveTo(b.x + b.w * 0.5, archY, b.x + b.w, archY + 14);
          ctx.lineTo(b.x + b.w, archY + b.h);
          ctx.closePath();
          ctx.fillStyle = "rgba(130, 90, 60, 0.95)";
          ctx.fill();
          ctx.strokeStyle = "rgba(80, 50, 30, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = "rgba(70, 160, 80, 0.95)";
          for (let n = 0; n < 3; n++) {
            ctx.beginPath();
            ctx.arc(b.x + 24 + n * 38, archY + 12, 12, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "rgba(40, 30, 25, 0.9)";
          ctx.font = "800 12px Nunito, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("duck", b.x + b.w / 2, archY + 28);
          ctx.textAlign = "left";
        } else if (poolStyle) {
          const archY = b.y;
          const cols = ["#ff6b9d", "#ffeb3b", "#4dd0e1", "#7e57c2"];
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(b.x, archY + b.h);
          ctx.lineTo(b.x, archY + 16);
          ctx.quadraticCurveTo(b.x + b.w * 0.5, archY, b.x + b.w, archY + 16);
          ctx.lineTo(b.x + b.w, archY + b.h);
          ctx.closePath();
          ctx.fillStyle = "rgba(0, 60, 90, 0.12)";
          ctx.fill();
          for (let n = 0; n < 4; n++) {
            const cx = b.x + 18 + n * 32;
            const cy = archY + 10;
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fillStyle = cols[n % 4];
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.fillStyle = "rgba(20, 40, 60, 0.85)";
          ctx.font = "800 12px Nunito, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("duck", b.x + b.w / 2, archY + 30);
          ctx.textAlign = "left";
          ctx.restore();
        } else {
          ctx.fillStyle = "#3d2612";
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = "#2d6a22";
          for (let n = 0; n < 3; n++) {
            ctx.beginPath();
            ctx.arc(b.x + 24 + n * 38, b.y + 9, 12, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#0a0f05";
          ctx.font = "800 12px Nunito, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("duck", b.x + b.w / 2, b.y + 23);
          ctx.textAlign = "left";
        }
      }
    }
  }

  function draw() {
    if (!gameActive) {
      return;
    }
    drawThemedSkyAndGround(distance);
    drawObstaclesLayer();
    const h = player.h;
    const top = player.feetY - h;
    const pr = { x: player.x, y: top, w: player.w, h: h };
    drawPlayerEntity(pr);
  }

  function loadSavedIntoForm() {
    const n = localStorage.getItem(LS_NAME);
    const e = localStorage.getItem(LS_ENV);
    const c = localStorage.getItem(LS_CHAR);
    if (playerNameIn && n) playerNameIn.value = n;
    if (e) {
      document.querySelectorAll(".env-card").forEach((btn) => {
        btn.setAttribute("aria-pressed", btn.getAttribute("data-env") === e ? "true" : "false");
      });
      if (ENV_IDS.indexOf(e) >= 0) currentEnv = e;
    }
    if (c && c !== "custom") {
      document.querySelectorAll(".char-card").forEach((btn) => {
        const d = btn.getAttribute("data-char");
        if (d) {
          btn.setAttribute("aria-pressed", d === c ? "true" : "false");
        }
      });
    }
  }

  function wireChoiceCards() {
    document.querySelectorAll(".env-card").forEach((btn) => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".env-card").forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
      });
    });
    document.querySelectorAll(".char-card").forEach((el) => {
      const char = el.getAttribute("data-char");
      if (!char) return;
      el.addEventListener("click", function (e) {
        if (el.classList.contains("char-card--you")) {
          if (e.target === charPhoto || (charPhoto && el.contains(/** @type {Node} */ (e.target)))) {
            return;
          }
        }
        document
          .querySelectorAll(".char-card")
          .forEach((b) => b.setAttribute("aria-pressed", "false"));
        el.setAttribute("aria-pressed", "true");
      });
    });
  }

  if (charPhoto) {
    charPhoto.addEventListener("change", function () {
      if (charPhoto.files && charPhoto.files[0]) {
        if (customPickedName) customPickedName.textContent = "Using: " + charPhoto.files[0].name;
        document.querySelectorAll(".char-card").forEach((b) => b.setAttribute("aria-pressed", "false"));
        const you = document.querySelector('.char-card[data-char="custom"]');
        if (you) you.setAttribute("aria-pressed", "true");
      }
    });
  }

  if (beginBtn) beginBtn.addEventListener("click", startRun);
  if (againBtn) {
    againBtn.addEventListener("click", function () {
      mode = "play";
      resetRun();
      overlay.classList.add("is-hidden");
      overlay.classList.remove("is-visible");
    });
  }
  if (newSetupBtn) {
    newSetupBtn.addEventListener("click", function () {
      showSetupView();
    });
  }

  let lastT = 0;
  function tick(ts) {
    const dt = lastT ? Math.min(ts - lastT, 50) : 16;
    lastT = ts;
    update(dt);
    draw();
    if (scoreEl) scoreEl.textContent = String(Math.floor(distance));
    requestAnimationFrame(tick);
  }

  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      if (gameActive) {
        e.preventDefault();
        jump();
      }
    } else if (e.code === "ArrowDown" || e.key === "s" || e.key === "S") {
      e.preventDefault();
      keys.duck = true;
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.code === "ArrowDown" || e.key === "s" || e.key === "S") {
      keys.duck = false;
    }
  });

  if (btnJump) btnJump.addEventListener("click", jump);
  if (btnDuck) {
    btnDuck.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      keys.duck = true;
    });
    btnDuck.addEventListener("pointerup", function () {
      keys.duck = false;
    });
    btnDuck.addEventListener("pointerleave", function () {
      keys.duck = false;
    });
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  loadSavedIntoForm();
  wireChoiceCards();
  requestAnimationFrame(tick);
})();
