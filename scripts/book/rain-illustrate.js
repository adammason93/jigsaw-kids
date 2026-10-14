"use strict";

/* Illustration run for the confirmed Rain That Rose plans.
   Refuses to start unless called with --approved.
   Writes only images inside the-rain-that-rose-candidate/images.
   Does not change the story, earlier books, character files, or the reader. */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var Page = require("./castle-page-test.js");
var Identity = require("../../js/book-v2-identity.js");
var Visual = require("../../js/book-visual.js");

var ROOT = path.join(__dirname, "..", "..");
var BOOK = path.join(ROOT, "docs/agent/book-v2/the-rain-that-rose-candidate");
var IMAGES = path.join(BOOK, "images");
var PROMPTS = path.join(BOOK, "plans-confirmed");
var KEY_FILES = [path.join(ROOT, ".env"), "/Users/adammason/jigsaw-kids/.env"];
var IMAGE_CAP = 24;
var VISION_CAP = 24;
var USD_CAP = 0.938;
var GBP = 0.754;
var IDENTITY = " Maya is the first reference image: keep her face, hair, green clip, yellow cardigan, blue skirt, white socks and navy shoes. Leo is the second reference image: keep his face, curly hair, freckles, clothes and proportions. Do not give Leo a different outfit.";

var GUARDS = [
  path.join(BOOK, "story.txt"),
  path.join(BOOK, "book.json"),
  path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall/book.json"),
  path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall-revised/book.json"),
  path.join(ROOT, "docs/agent/book-v2/castle-lost-lanterns/book.json"),
  path.join(ROOT, "games/images/characters/maya-v1.jpg"),
  path.join(ROOT, "games/images/characters/crew/wondii-leo.jpg"),
  path.join(ROOT, "games/book-prototype/book.js")
];

var counts = { text: 0, image: 0, vision: 0 };
var ledger = [];
var hashes = {};

function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\n/).forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") return;
    var eq = trimmed.indexOf("=");
    if (eq < 1) return;
    var name = trimmed.slice(0, eq).trim();
    var value = trimmed.slice(eq + 1).trim();
    if (value.length >= 2 && (value.charAt(0) === '"' || value.charAt(0) === "'") && value.charAt(value.length - 1) === value.charAt(0)) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  });
}

function redact(text) {
  return String(text || "").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").replace(/Bearer\s+\S+/g, "Bearer [redacted]");
}

function round6(value) {
  return Math.round(value * 1000000) / 1000000;
}

function chargeVision(usage) {
  if (!usage || usage.prompt_tokens == null || usage.completion_tokens == null) return null;
  return round6((usage.prompt_tokens * 0.15 + usage.completion_tokens * 0.6) / 1e6);
}

function spent() {
  return round6(ledger.reduce(function (sum, item) { return sum + (item.usd || 0); }, 0));
}

function note(kind, row) {
  ledger.push(Object.assign({ kind: kind }, row));
  console.log(JSON.stringify({ event: kind, calls: counts, usd: spent(), label: row.label || "" }));
}

function roomForAnotherCall() {
  return spent() + 0.05 <= USD_CAP;
}

function guard() {
  GUARDS.forEach(function (file) {
    if (sha(file) !== hashes[file]) throw new Error("A protected file changed: " + path.basename(file));
  });
  var resolved = path.resolve(IMAGES);
  if (resolved.indexOf(path.resolve(BOOK) + path.sep) !== 0) throw new Error("Image folder escaped the candidate book");
}

function referencesFor(book) {
  var scene = Identity.prepareScene(book.bible.identityRegistry, ["wondii-maya", "wondii-leo"]);
  var rows = (scene.passes && scene.passes[0]) || [];
  if (rows.length !== 2) throw new Error("Character references were not both usable");
  rows.forEach(function (row) {
    if (row.characterId === "wondii-maya" && row.file !== "games/images/characters/maya-v1.jpg") {
      throw new Error("Maya's reference drifted");
    }
    if (row.characterId === "wondii-leo" && row.file !== "games/images/characters/crew/wondii-leo.jpg") {
      throw new Error("Leo's portrait drifted");
    }
  });
  return rows.map(function (row) {
    return { characterId: row.characterId, file: row.file };
  });
}

function editImage(key, prompt, files) {
  if (counts.text !== 0) return Promise.reject(new Error("A text call was counted"));
  if (counts.image >= IMAGE_CAP) return Promise.reject(new Error("Stopped at 24 image calls"));
  if (!roomForAnotherCall()) return Promise.reject(new Error("Stopped before exceeding $0.938"));
  counts.image += 1;
  var form = new FormData();
  form.append("model", Page.REQUEST.model);
  form.append("prompt", prompt);
  files.forEach(function (row) {
    var abs = path.join(ROOT, row.file);
    form.append("image[]", new Blob([fs.readFileSync(abs)], { type: "image/jpeg" }), path.basename(abs));
  });
  form.append("size", Page.REQUEST.size);
  form.append("quality", Page.REQUEST.quality);
  form.append("output_format", "jpeg");
  form.append("output_compression", "80");
  form.append("n", "1");
  return fetch(Page.REQUEST.endpoint, {
    method: "POST",
    headers: { Authorization: "Bearer " + key },
    body: form
  }).then(function (res) {
    return res.json().then(function (payload) {
      var usage = Page.readUsage(payload);
      var usd = Page.chargeUsd(usage);
      if (usd == null) usd = 0.037646;
      note("image", { label: files.map(function (row) { return row.characterId; }).join("+"), http: res.status, usd: usd, usage: usage });
      return { ok: res.ok, payload: payload };
    });
  });
}

function visionCheck(key, spread, prompt, b64, files) {
  if (counts.vision >= VISION_CAP) return Promise.reject(new Error("Stopped at 24 vision calls"));
  if (!roomForAnotherCall()) return Promise.reject(new Error("Stopped before exceeding $0.938"));
  counts.vision += 1;
  var pageId = spread.spreadId || spread.pageId;
  var question = [
    "You are checking one children's book illustration against a plan. Return JSON only.",
    "The first image is the page. Each later image is that character's own reference, in the order named. Do not swap their clothes or faces.",
    "Maya (wondii-maya) must match maya-v1: her face, hair, green clip, yellow cardigan, blue skirt, white socks and navy shoes.",
    "Leo (wondii-leo) must match his own portrait: his face, curly hair, freckles, clothes and proportions. Do not accept a different outfit.",
    "Selected instant only: " + (spread.illustrationMoment || spread.storyEvent || ""),
    "momentMatch is true only when the picture shows that one instant.",
    spread.continuityLine ? "locationMatch is true only when the place matches this continuity: " + spread.continuityLine : "",
    spread.sceneLeave ? "These objects must stay out of the picture: " + spread.sceneLeave + ". If one of them appears, locationMatch is false." : "",
    "The leaf boat, when this page includes it, is one green bowl leaf with one central pool and one long stem.",
    "Water rises in sunlight and falls in shade.",
    "style.rendering must be painted, proportions picture-book, finish picture-book.",
    "Return one characters entry for every listed child, using that child's characterId.",
    "Return {\"observations\":\"\",\"characters\":[{\"characterId\":\"id\",\"identityMatch\":true,\"outfitMatch\":true,\"count\":1}],\"locationMatch\":true,\"prematureResult\":false,\"textDetected\":false,\"anatomyOk\":true,\"textSafeUsable\":true,\"duplicateCharacter\":false,\"momentMatch\":true,\"montageShown\":false,\"style\":{\"rendering\":\"painted\",\"proportions\":\"picture-book\",\"finish\":\"picture-book\"}}."
  ].filter(Boolean).join(" ");
  var content = [
    { type: "text", text: question + "\n\nFinal directions:\n" + prompt.slice(prompt.indexOf("Final picture directions")) },
    { type: "image_url", image_url: { url: "data:image/jpeg;base64," + b64, detail: "low" } }
  ];
  files.forEach(function (row) {
    var ref = fs.readFileSync(path.join(ROOT, row.file)).toString("base64");
    content.push({ type: "text", text: "Reference for " + row.characterId + "." });
    content.push({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + ref, detail: "low" } });
  });
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: content }]
    })
  }).then(function (res) {
    return res.json().then(function (payload) {
      var usd = chargeVision(payload && payload.usage);
      if (usd == null) usd = 0.001425;
      note("vision", { label: pageId, http: res.status, usd: usd, usage: payload && payload.usage || null });
      var raw = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
      var parsed = null;
      try { parsed = JSON.parse(raw || ""); } catch (e) { parsed = null; }
      var verdict = Visual.acceptIllustration(parsed, spread);
      return { ok: verdict.ok, problems: verdict.problems, vision: parsed };
    });
  });
}

function saveJpeg(pageId, payload) {
  guard();
  var b64 = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
  if (!b64) return null;
  var file = path.join(IMAGES, pageId + ".jpg");
  if (path.resolve(file).indexOf(path.resolve(IMAGES) + path.sep) !== 0) throw new Error("Refusing to write outside the image folder");
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  guard();
  return { file: file, b64: b64 };
}

function drawPage(key, spread, prompt, files) {
  var pageId = spread.spreadId;
  var full = prompt + IDENTITY;
  var correction = full.slice(full.indexOf("Final picture directions"));
  return editImage(key, full, files).then(function (drawn) {
    if (!drawn.ok) return { ok: false, repairs: 0, reason: "image-rejected", problems: ["image-rejected"] };
    var saved = saveJpeg(pageId, drawn.payload);
    if (!saved) return { ok: false, repairs: 0, reason: "image-missing", problems: ["image-missing"] };
    return visionCheck(key, spread, full, saved.b64, files).then(function (check) {
      if (check.ok) return { ok: true, repairs: 0, file: saved.file, vision: check.vision, problems: [] };
      fs.writeFileSync(path.join(IMAGES, pageId + "-rejected.jpg"), Buffer.from(saved.b64, "base64"));
      var retry = full + " Repair this one picture. Keep the same children, place, and locked wondii-picture-book style. " + correction;
      return editImage(key, retry, files).then(function (again) {
        if (!again.ok) return { ok: false, repairs: 1, file: saved.file, reason: "repair-rejected", problems: check.problems, vision: check.vision, needsReview: true };
        var replaced = saveJpeg(pageId, again.payload);
        if (!replaced) return { ok: false, repairs: 1, reason: "repair-missing", problems: check.problems, needsReview: true };
        return visionCheck(key, spread, full, replaced.b64, files).then(function (next) {
          return {
            ok: next.ok,
            repairs: 1,
            file: replaced.file,
            vision: next.vision,
            problems: next.problems,
            reason: next.ok ? "repaired" : "repair-failed",
            needsReview: !next.ok
          };
        });
      });
    });
  });
}

function writeReport(pages, stage) {
  var usd = spent();
  var report = {
    stage: stage,
    pictures: "generated",
    published: false,
    textCalls: counts.text,
    calls: counts,
    listedUsd: usd,
    listedGbp: round6(usd * GBP),
    capUsd: USD_CAP,
    pages: pages.map(function (page) {
      return {
        pageId: page.pageId,
        ok: page.ok,
        repairs: page.repairs || 0,
        reason: page.reason || "",
        problems: page.problems || [],
        needsReview: page.needsReview === true,
        file: page.file ? path.basename(page.file) : ""
      };
    }),
    ledger: ledger
  };
  fs.writeFileSync(path.join(BOOK, "illustration-result.json"), JSON.stringify(report, null, 2));
  return report;
}

function run() {
  if (process.argv.indexOf("--approved") < 0) {
    console.log(JSON.stringify({ started: false, reason: "Waiting for approval. No image call was made." }));
    return Promise.resolve();
  }
  GUARDS.forEach(function (file) { hashes[file] = sha(file); });
  var book = JSON.parse(fs.readFileSync(path.join(BOOK, "book.json"), "utf8"));
  if ((book.pages || []).length !== 12) throw new Error("The story is not 12 pages");
  var files = referencesFor(book);
  var contracts = Visual.contractsFor(book.bible, book.pages, {});
  KEY_FILES.forEach(loadEnv);
  var key = process.env.OPENAI_API_KEY || "";
  if (!key) throw new Error("OPENAI_API_KEY is missing");
  fs.mkdirSync(IMAGES, { recursive: true });
  var pages = [];
  var chain = Promise.resolve();
  for (var n = 0; n < 12; n += 1) {
    (function (index) {
      chain = chain.then(function () {
        guard();
        var spread = contracts.spreads[index];
        var pageId = spread.spreadId;
        var prompt = fs.readFileSync(path.join(PROMPTS, pageId + ".prompt.txt"), "utf8");
        if (prompt.indexOf("wondii-picture-book") < 0) throw new Error(pageId + " is missing the locked style");
        return drawPage(key, spread, prompt, files).then(function (result) {
          pages.push(Object.assign({ pageId: pageId }, result));
          writeReport(pages, "illustrations-in-progress");
          guard();
        });
      });
    })(n);
  }
  return chain.then(function () {
    guard();
    var report = writeReport(pages, "illustrations");
    guard();
    console.log(JSON.stringify({ done: true, usd: report.listedUsd, gbp: report.listedGbp, calls: counts, review: report.pages.filter(function (page) { return page.needsReview; }).map(function (page) { return page.pageId; }) }));
  });
}

if (require.main === module) {
  run().catch(function (error) {
    console.error(redact(error && error.message || error));
    process.exit(1);
  });
}
