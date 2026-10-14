"use strict";

/* One approved page 7 candidate. Does not rewrite the story or replace p7.jpg. */

var fs = require("fs");
var path = require("path");
var Visual = require("../../js/book-visual.js");
var Identity = require("../../js/book-v2-identity.js");
var Page = require("./castle-page-test.js");

var ROOT = path.join(__dirname, "..", "..");
var OUT = path.join(ROOT, "docs", "agent", "book-v2", "castle-lost-lanterns");
var IMAGES = path.join(OUT, "images");
var KEY_FILES = [path.join(ROOT, ".env"), "/Users/adammason/jigsaw-kids/.env"];
var IMAGE_CAP = 2;
var VISION_CAP = 2;

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

var counts = { image: 0, vision: 0 };
var ledger = [];

function note(kind, row) {
  ledger.push(Object.assign({ kind: kind }, row));
  var total = ledger.reduce(function (sum, item) { return sum + (item.usd || 0); }, 0);
  console.log(JSON.stringify({ event: kind, calls: counts, usd: round6(total), http: row.http || null }));
}

function editImage(key, prompt, files) {
  if (counts.image >= IMAGE_CAP) return Promise.reject(new Error("Stopped at 2 image calls"));
  counts.image += 1;
  var form = new FormData();
  form.append("model", Page.REQUEST.model);
  form.append("prompt", prompt);
  files.forEach(function (row) {
    var abs = path.isAbsolute(row.file) ? row.file : path.join(ROOT, row.file);
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
      note("image", { http: res.status, usd: usd || 0 });
      return { ok: res.ok, status: res.status, payload: payload, usd: usd || 0 };
    });
  });
}

function saveCandidate(name, payload) {
  var b64 = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
  if (!b64) return null;
  var file = path.join(IMAGES, name);
  if (name === "p7.jpg") throw new Error("Refusing to replace the saved page");
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  return { file: file, b64: b64 };
}

function storyCheck(key, spread, cast, b64, references) {
  if (counts.vision >= VISION_CAP) return Promise.reject(new Error("Stopped at 2 vision calls"));
  counts.vision += 1;
  var people = (cast || []).filter(function (look) {
    return (spread.charactersPresent || []).indexOf(look.characterId) >= 0;
  }).map(function (look) {
    return look.name + " (" + look.characterId + ") must match " + (look.referenceFile || "their own reference") + ": " + look.hair + "; " + look.skinTone + "; " + look.face + "; " + look.defaultClothing + "; " + look.footwear + ".";
  }).join(" ");
  var question = [
    "You are checking one children's book illustration against a plan. Return JSON only.",
    "The first image is the page. Each later image is that character's own reference, in the order named. Do not swap their clothes or faces.",
    "Every listed child must be identifiable. " + people,
    "The place must be a stone ivy chamber with a window and a wooden rail, not the silver gallery.",
    "A hinged silver plate must be raised by an ivy loop. Two silver strip ends under it must be apart.",
    "The route in this room must be dark.",
    "The lantern, the lantern socket, and the castle lamps must not appear.",
    "Return {\"observations\":\"\",\"characters\":[{\"characterId\":\"id\",\"identityMatch\":true,\"outfitMatch\":true,\"count\":1}],\"locationMatch\":true,\"lanternVisible\":false,\"socketVisible\":false,\"lampsVisible\":false,\"plateRaised\":true,\"ivyLoop\":true,\"silverEndsApart\":true,\"routeDark\":true,\"prematureResult\":false,\"textDetected\":false,\"anatomyOk\":true,\"textSafeUsable\":true,\"duplicateCharacter\":false,\"momentMatch\":true,\"montageShown\":false,\"style\":{\"rendering\":\"painted\",\"proportions\":\"picture-book\",\"finish\":\"picture-book\"}}."
  ].join(" ");
  var content = [{ type: "text", text: question }, { type: "image_url", image_url: { url: "data:image/jpeg;base64," + b64, detail: "low" } }];
  references.forEach(function (row) {
    var abs = path.isAbsolute(row.file) ? row.file : path.join(ROOT, row.file);
    var ref = fs.readFileSync(abs).toString("base64");
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
      note("vision", { http: res.status, usd: usd || 0 });
      var raw = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
      var parsed = null;
      try { parsed = JSON.parse(raw || ""); } catch (e) { parsed = null; }
      var verdict = Visual.acceptIllustration(parsed, spread);
      var story = storyProblems(parsed);
      return { http: res.ok, vision: parsed, verdict: verdict, story: story, usd: usd || 0 };
    });
  });
}

function storyProblems(report) {
  var problems = [];
  var row = report || {};
  if (row.lanternVisible === true) problems.push("lantern");
  if (row.socketVisible === true) problems.push("socket");
  if (row.lampsVisible === true) problems.push("lamps");
  if (row.plateRaised === false) problems.push("plate");
  if (row.ivyLoop === false) problems.push("ivy");
  if (row.silverEndsApart === false) problems.push("silver-ends");
  if (row.routeDark === false) problems.push("route-light");
  if (row.locationMatch === false) problems.push("place");
  return problems;
}

function needsRepair(check) {
  if (!check || !check.vision) return true;
  if (!check.verdict.ok) return true;
  return check.story.length > 0;
}

function run() {
  KEY_FILES.forEach(loadEnv);
  var key = process.env.OPENAI_API_KEY || "";
  if (!key) throw new Error("OPENAI_API_KEY is missing");
  var original = fs.statSync(path.join(IMAGES, "p7.jpg"));
  var book = JSON.parse(fs.readFileSync(path.join(OUT, "book.json"), "utf8"));
  var plan = Visual.contractsFor(book.bible, book.pages);
  var spread = plan.spreads[6];
  spread.bible = book.bible;
  var prompt = fs.readFileSync(path.join(IMAGES, "p7-candidate.prompt.txt"), "utf8");
  if (prompt.indexOf("Do not draw these") < 0 || prompt.indexOf("dark route") < 0) {
    throw new Error("The saved page 7 request is not the revised one");
  }
  var scene = Identity.prepareScene(book.bible.identityRegistry, spread.charactersPresent || []);
  if (scene.blocksGeneration) throw new Error("References blocked");
  var references = (scene.passes && scene.passes[0]) || [];
  var files = references.map(function (row) { return row.file; }).join("|");
  if (files.indexOf("maya-v1") < 0 || files.indexOf("wondii-leo") < 0) {
    throw new Error("Character references are not Maya and Leo");
  }
  var cast = plan.visualBible.cast || [];
  return editImage(key, prompt, references).then(function (drawn) {
    if (!drawn.ok) {
      var retry = prompt + " Revise this one picture. Remove any lantern, socket, and castle lamp. Keep the route dark. Raise the silver plate with the ivy loop and leave the two silver ends apart.";
      return editImage(key, retry, references).then(function (again) {
        var saved = again.ok ? saveCandidate("p7-candidate.jpg", again.payload) : null;
        if (!saved) throw new Error("Image was not returned");
        return storyCheck(key, spread, cast, saved.b64, references).then(function (check) {
          return { repairs: 1, file: saved.file, check: check, reason: "first-call-failed" };
        });
      });
    }
    var first = saveCandidate("p7-candidate.jpg", drawn.payload);
    if (!first) throw new Error("Image was not returned");
    return storyCheck(key, spread, cast, first.b64, references).then(function (check) {
      if (!needsRepair(check)) return { repairs: 0, file: first.file, check: check, reason: "" };
      fs.copyFileSync(first.file, path.join(IMAGES, "p7-candidate-first.jpg"));
      var retry = prompt + " Revise this one picture. Remove any lantern, socket, and castle lamp. Keep the route dark. Raise the silver plate with the ivy loop and leave the two silver ends apart. Keep both children recognisable.";
      return editImage(key, retry, references).then(function (again) {
        if (!again.ok) return { repairs: 1, file: first.file, check: check, reason: "repair-not-accepted" };
        var replaced = saveCandidate("p7-candidate.jpg", again.payload);
        return storyCheck(key, spread, cast, replaced.b64, references).then(function (next) {
          return { repairs: 1, file: replaced.file, first: path.join(IMAGES, "p7-candidate-first.jpg"), check: next, reason: "repaired" };
        });
      });
    });
  }).then(function (result) {
    var after = fs.statSync(path.join(IMAGES, "p7.jpg"));
    if (after.size !== original.size || after.mtimeMs !== original.mtimeMs) {
      throw new Error("The original page 7 picture changed");
    }
    var usd = round6(ledger.reduce(function (sum, row) { return sum + (row.usd || 0); }, 0));
    var report = {
      stage: "page7-candidate",
      calls: counts,
      listedUsd: usd,
      listedGbp: round6(usd * 0.754),
      repairs: result.repairs,
      reason: result.reason,
      file: path.relative(ROOT, result.file),
      originalUntouched: true,
      originalBytes: original.size,
      verdict: result.check.verdict,
      story: result.check.story,
      observations: result.check.vision && result.check.vision.observations || "",
      vision: result.check.vision
    };
    fs.writeFileSync(path.join(OUT, "p7-candidate.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      stage: report.stage,
      calls: counts,
      usd: usd,
      gbp: report.listedGbp,
      repairs: result.repairs,
      story: result.check.story,
      identity: result.check.verdict.problems,
      file: report.file
    }));
  });
}

if (require.main === module) {
  run().catch(function (error) {
    console.error(redact(error && error.message || error));
    process.exit(1);
  });
}
