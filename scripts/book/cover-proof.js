"use strict";

/* One Book E cover. Does not redraw interior spreads. */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var Guard = require("../source-grounded/spend-guard.js");
var Cast = require("../../js/character-bible.js");
var BookCast = require("../../js/book-cast.js");
var Visual = require("../../js/book-visual.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs", "agent", "book-v2", "visual-proof", "e");
var LEDGER = path.join(ROOT, "docs", "agent", "book-v2", "visual-proof", "spend-ledger.jsonl");
var BOOK = path.join(ROOT, "docs", "agent", "book-v2", "text-validation-depth", "e", "book.json");
var MODEL = "gpt-image-2.5-sunburst";
var SIZE = "1024x1536";
var QUALITY = "medium";
var VISION = "gpt-4o-mini";

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

function sha(file) {
  return crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");
}

loadEnv(path.join(ROOT, ".env"));
var key = process.env.OPENAI_API_KEY || "";
var estimateOnly = process.argv.indexOf("--estimate-only") >= 0;
if (!estimateOnly && !key) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

var maya = Cast.getCharacter("maya");
var book = JSON.parse(fs.readFileSync(BOOK, "utf8"));
var specs = JSON.parse(fs.readFileSync(path.join(OUT, "story-entities.json"), "utf8"));
var cover = Visual.planCover(book.bible, book.pages, { bookId: "E", storyEntities: specs });
var cast = BookCast.compileBookCast(book.bible, book.pages);
var prompt = Visual.coverPrompt(book.bible, Object.assign({}, cover, { anchorCount: 1 }), cast.members);
if (prompt.indexOf(book.bible.title) >= 0) {
  console.error("cover prompt contains the finished title");
  process.exit(1);
}
if (/face:\s*none|folds shut|climbs onto|open palms/i.test(prompt)) {
  console.error("cover prompt contains a blocked phrase");
  process.exit(1);
}

var imageDir = path.join(OUT, "images");
fs.mkdirSync(imageDir, { recursive: true });
fs.writeFileSync(path.join(OUT, "cover-plan.json"), JSON.stringify(cover, null, 2));
fs.writeFileSync(path.join(imageDir, "cover.prompt.txt"), prompt);

var locks = {
  "images/p1.jpg": sha(path.join(imageDir, "p1.jpg")),
  "images/p2.jpg": sha(path.join(imageDir, "p2.jpg")),
  "images/p3.jpg": sha(path.join(imageDir, "p3.jpg")),
  "images/p4.jpg": sha(path.join(imageDir, "p4.jpg")),
  "images/p5.jpg": sha(path.join(imageDir, "p5.jpg")),
  "images/p6.jpg": sha(path.join(imageDir, "p6.jpg")),
  "images/p7.jpg": sha(path.join(imageDir, "p7.jpg")),
  "images/p8.jpg": sha(path.join(imageDir, "p8.jpg")),
  "images/p9.jpg": sha(path.join(imageDir, "p9.jpg")),
  "images/p10.jpg": sha(path.join(imageDir, "p10.jpg")),
  "images/p11.jpg": sha(path.join(imageDir, "p11.jpg")),
  "maya-v1.jpg": sha(path.join(ROOT, "games/images/characters/maya-v1.jpg"))
};

var guard = Guard.createGuard({
  capUsd: 4,
  ledgerPath: LEDGER,
  margin: 2,
  redact: key,
  labelFor: function (href, body) { return "book-visual:" + String(body && body.__purpose || "cover"); }
});
var imageEstimate = guard.estimate("https://api.openai.com/v1/images/edits", {
  model: MODEL, prompt: prompt, quality: QUALITY, n: 1, references: 2
});
var visionBody = { model: VISION, max_tokens: 700, messages: [{ content: [{ type: "text", text: "cover check " + prompt.slice(0, 1800) }, { type: "image_url", image_url: { url: "x" } }] }] };
var visionEstimate = guard.estimate("https://api.openai.com/v1/chat/completions", visionBody);
var gate = {
  plannedImageCalls: 1,
  repairAllowance: 1,
  model: MODEL,
  size: SIZE,
  quality: QUALITY,
  references: ["games/images/characters/maya-v1.jpg", "docs/agent/book-v2/visual-proof/e/images/p5.jpg"],
  listedUsdOneImage: Number(imageEstimate.listedUsd.toFixed(6)),
  maxListedUsdWithOneRepair: Number((imageEstimate.listedUsd * 2).toFixed(6)),
  maxGuardUsdWithOneRepair: Number((imageEstimate.listedUsd * 2 * 2).toFixed(6)),
  visionListedUsd: Number(visionEstimate.listedUsd.toFixed(6)),
  visionGuardUsd: Number((visionEstimate.listedUsd * 2).toFixed(6))
};
console.log("COST_GATE " + JSON.stringify(gate));
if (estimateOnly) process.exit(0);

function rawFetch(url, init) {
  var body = init.body;
  if (typeof body === "string") {
    var parsed = JSON.parse(body);
    delete parsed.__purpose;
    body = JSON.stringify(parsed);
  }
  return fetch(url, Object.assign({}, init, { body: body }));
}
var guarded = guard.wrap(rawFetch);
var mayaFile = path.join(ROOT, Cast.resolveReference("maya").file);
var mayaBuf = fs.readFileSync(mayaFile);
var anchorBuf = fs.readFileSync(path.join(imageDir, "p5.jpg"));

function editImage(text, purpose) {
  var form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", text);
  form.append("image[]", new Blob([mayaBuf], { type: "image/jpeg" }), "maya-v1.jpg");
  form.append("image[]", new Blob([anchorBuf], { type: "image/jpeg" }), "paint-anchor.jpg");
  form.append("size", SIZE);
  form.append("quality", QUALITY);
  form.append("output_format", "jpeg");
  form.append("output_compression", "80");
  form.append("n", "1");
  return guarded("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: "Bearer " + key },
    body: form
  }).then(function (res) { return res.json().then(function (payload) { return { ok: res.ok, status: res.status, payload: payload }; }); });
}

function visionCheck(b64) {
  var question = [
    "You are checking one children's picture-book cover. Return JSON only.",
    "The child must match this reference identity: " + maya.hair + "; " + maya.skinTone + " skin; " + maya.face + "; " + maya.defaultClothing + "; " + maya.footwear + "; " + (maya.visualIdentifiers || []).join(", ") + ".",
    "The star must be one simple five-point warm gold-white glow. entityHasFace is true only if that star has eyes or a mouth.",
    "textDetected is true if any letters, words, title, or fake writing appear.",
    "spoilerShown is true only if the story is already over, with the star gone into a crowd of answering lights and the child left behind.",
    "readsAsInteriorSpread is true if this looks like a random story page rather than a designed cover.",
    "qualityNotes is a short list of cover-quality observations. Do not treat them as failures.",
    "The upper area should be open enough for a title. textSafeUsable is true when that area is calm and the child and star are not hidden there.",
    "Return {\"observations\":\"\",\"qualityNotes\":[],\"characters\":[{\"characterId\":\"maya\",\"identityMatch\":true,\"outfitMatch\":true,\"count\":1}],\"entities\":[{\"entityId\":\"hidden-star\",\"status\":\"confirmed\",\"seen\":\"\"}],\"locationMatch\":true,\"prematureResult\":false,\"textDetected\":false,\"anatomyOk\":true,\"textSafeUsable\":true,\"duplicateCharacter\":false,\"momentMatch\":true,\"montageShown\":false,\"entityHasFace\":false,\"spoilerShown\":false,\"readsAsInteriorSpread\":false,\"style\":{\"rendering\":\"painted\",\"proportions\":\"picture-book\",\"finish\":\"picture-book\"}}."
  ].join(" ");
  return guarded("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [
        { type: "text", text: question },
        { type: "image_url", image_url: { url: "data:image/jpeg;base64," + b64, detail: "low" } }
      ] }],
      __purpose: "vision-cover"
    })
  }).then(function (res) {
    return res.json().then(function (payload) {
      var content = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
      var parsed = null;
      try { parsed = JSON.parse(content || ""); } catch (e) { parsed = null; }
      return { vision: parsed, verdict: Visual.acceptCover(parsed, cover), quality: Visual.coverQualityNotes(parsed) };
    });
  });
}

function saveJpg(file, payload) {
  var b64 = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
  if (!b64) throw new Error("cover image missing");
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  return b64;
}

function locksHeld() {
  return Object.keys(locks).every(function (name) {
    var file = name === "maya-v1.jpg" ? path.join(ROOT, "games/images/characters/maya-v1.jpg") : path.join(OUT, name);
    return sha(file) === locks[name];
  });
}

editImage(prompt, "cover").then(function (drawn) {
  if (!drawn.ok) {
    var err = drawn.payload && drawn.payload.error || {};
    console.log(JSON.stringify({ status: "SAFETY_REJECTED", http: drawn.status, message: String(err.message || "").slice(0, 240), requestId: err.request_id || "", retry: false }));
    process.exit(2);
  }
  var b64 = saveJpg(path.join(imageDir, "cover.jpg"), drawn.payload);
  return visionCheck(b64).then(function (check) {
    fs.writeFileSync(path.join(imageDir, "cover.vision.json"), JSON.stringify(check.vision || {}, null, 2));
    if (check.verdict.ok) return { check: check, repairs: 0, b64: b64 };
    var repairText = Visual.coverRepairPrompt(book.bible, Object.assign({}, cover, { anchorCount: 1 }), cast.members);
    fs.writeFileSync(path.join(imageDir, "cover-repair.prompt.txt"), repairText);
    fs.copyFileSync(path.join(imageDir, "cover.jpg"), path.join(imageDir, "cover-rejected.jpg"));
    return editImage(repairText, "cover-repair").then(function (again) {
      if (!again.ok) {
        return { check: check, repairs: 0, b64: b64, repairRejected: true, repairError: again.payload && again.payload.error || {} };
      }
      var next = saveJpg(path.join(imageDir, "cover.jpg"), again.payload);
      return visionCheck(next).then(function (second) {
        fs.writeFileSync(path.join(imageDir, "cover.vision.json"), JSON.stringify(second.vision || {}, null, 2));
        return { check: second, repairs: 1, b64: next, firstProblems: check.verdict.problems };
      });
    });
  });
}).then(function (result) {
  var layout = Visual.coverTitleLayout(book.bible.title, cover);
  var preview = Visual.coverPreviewDocument(cover, layout, "images/cover.jpg");
  fs.writeFileSync(path.join(OUT, "cover-preview.html"), preview);
  var row = {
    status: result.check.verdict.ok ? "COVER_REVIEWABLE" : "COVER_NOT_REVIEWABLE",
    contract: result.check.verdict,
    quality: result.check.quality,
    repairs: result.repairs,
    repairRejected: !!result.repairRejected,
    firstProblems: result.firstProblems || [],
    locksHeld: locksHeld(),
    cleanArt: "docs/agent/book-v2/visual-proof/e/images/cover.jpg",
    preview: "docs/agent/book-v2/visual-proof/e/cover-preview.html",
    finished: false
  };
  fs.writeFileSync(path.join(OUT, "cover-validation.json"), JSON.stringify(row, null, 2));
  console.log(JSON.stringify(row));
  if (!result.check.verdict.ok) process.exit(3);
}).catch(function (error) {
  console.error(guard.redact(String(error && error.message || error)).slice(0, 300));
  process.exit(1);
});
