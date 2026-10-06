"use strict";

/* Story-led, source-grounded lesson run (research mode only). Provisional.
   Runs js/story-lesson.js generateStoryLesson end to end, then the pictures (one per story scene
   plus teaching pictures), a non-blocking vision check, the Wondii adventure, lesson.json and the
   review page. Every OpenAI call goes through the spend guard; page fetches go only to allowlisted
   hosts. Nothing is hand-written: the lesson is whatever the code returns.

   Usage: OPENAI_API_KEY=... node scripts/source-grounded/story.js --out DIR --cap USD
            [--total-cap 4.5 --base-guard USD --shared-ledgers a.jsonl,b.jsonl]
            [--saved-research a.json,b.json]  replay URLs found by earlier paid searches (free)
            [--no-search]                     no new paid web search
            [--stub]                          offline: stubbed model transport and saved passages
            [--no-images] [--reuse DIR]       reuse DIR's result.json (no text calls) for pictures
            [--minutes 30] [--story-effort medium] */

var fs = require("fs");
var path = require("path");
var Guard = require("./spend-guard.js");
var Research = require("../../js/source-research.js");
var Brain = require("../../js/lesson-brain.js");
var Story = require("../../js/story-lesson.js");
var Finish = require("./finish.js");
var Visuals = require("../../js/visual-adventure.js");

function arg(name, fallback) { var at = process.argv.indexOf("--" + name); return at !== -1 && process.argv[at + 1] && !/^--/.test(process.argv[at + 1]) ? process.argv[at + 1] : fallback; }
function flag(name) { return process.argv.indexOf("--" + name) !== -1; }
function clean(v, max) { var t = String(v == null ? "" : v).replace(/\s+/g, " ").trim(); return max && t.length > max ? t.slice(0, max) : t; }

var outDir = path.resolve(arg("out", "out/story"));
var stub = flag("stub");
var key = String(process.env.OPENAI_API_KEY || "").trim();
if (!stub && !key) { console.error("OPENAI_API_KEY is not set. No call was made."); process.exit(2); }
["lesson", "sources"].forEach(function (d) { fs.mkdirSync(path.join(outDir, d), { recursive: true }); });
var request = { lessonText: arg("prompt", "Teach Year 3 about dinosaurs"), yearGroup: arg("year", "Year 3"), subject: arg("subject", "Science"), topic: arg("topic", "Dinosaurs"), requestedMinutes: Number(arg("minutes", "30")) };

var guard = Guard.createGuard({
  capUsd: Number(arg("cap", stub ? "0.01" : "0")) || 0.01, ledgerPath: path.resolve(arg("ledger", path.join(outDir, "spend-ledger.jsonl"))), redact: key,
  totalCapUsd: Number(arg("total-cap", "0")), baseGuardUsd: Number(arg("base-guard", "0")), sharedLedgers: String(arg("shared-ledgers", "")).split(",").filter(Boolean).map(function (f) { return path.resolve(f); }),
  labelFor: function (href, body) {
    if (href.indexOf("/responses") !== -1) return "story:research-web-search";
    if (href.indexOf("/images/") !== -1) return "story:image";
    return "story:" + String(body && body.__purpose || "text");
  }
});
var realFetch = global.fetch;
var guarded = guard.wrap(realFetch);
var domains = Research.allowedDomains();
var outbound = [];
function allowedHost(href) { var h = ""; try { h = new URL(href).hostname.toLowerCase(); } catch (e) { return false; } return domains.some(function (d) { return h === d || h.slice(-(d.length + 1)) === "." + d; }) || /\.(gov|ac)\.uk$/.test(h); }
function harnessFetch(url, init) {
  var href = String(url);
  if (href.indexOf("https://api.openai.com/") === 0) {
    if (stub) return Promise.reject(new Error("stub mode: no paid call"));
    var body = init && init.body ? JSON.parse(init.body) : {};
    var purpose = body.__purpose; delete body.__purpose;
    outbound.push({ kind: "openai", url: href, purpose: purpose || "" });
    return guarded(url, Object.assign({}, init, { body: JSON.stringify(body) }));
  }
  if (/^https:\/\//.test(href) && allowedHost(href)) { outbound.push({ kind: "source", url: href.slice(0, 200) }); return realFetch(url, init); }
  outbound.push({ kind: "refused", url: href.slice(0, 200) });
  return Promise.reject(new Error("refused non-allowlisted fetch " + href.slice(0, 100)));
}

// Same request shape as the boot's callModel; reasoning models take an effort and a token cap.
function callModel(brief, opts) {
  var model = opts.model;
  var reasoning = /^(?:gpt-5|gpt-6|o\d)/.test(model);
  var body = Object.assign({ model: model, response_format: { type: "json_object" }, messages: [{ role: "system", content: brief.system }, { role: "user", content: brief.user }] },
    reasoning ? { reasoning_effort: opts.effort || "low", max_completion_tokens: opts.maxTokens || 16000 } : { temperature: 0.4, max_tokens: Math.min(opts.maxTokens || 8000, 16000) });
  // The guard labels the ledger row with the purpose; the field is removed before sending.
  var guardedLabel = Object.assign({ __purpose: opts.purpose }, body);
  var control = new AbortController();
  var timer = setTimeout(function () { control.abort(); }, opts.timeoutMs || 180000);
  return harnessFetch("https://api.openai.com/v1/chat/completions", { method: "POST", signal: control.signal, headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify(guardedLabel) }).then(function (res) {
    return res.text().then(function (text) {
      clearTimeout(timer);
      var payload = null; try { payload = JSON.parse(text); } catch (e) {}
      if (!res.ok || !payload) throw new Error(opts.purpose + ": HTTP " + res.status + " " + clean(payload && payload.error && payload.error.message, 200));
      var content = String(payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content || "");
      var finish = payload.choices && payload.choices[0] && payload.choices[0].finish_reason;
      try { return JSON.parse(content); } catch (e) { throw new Error(opts.purpose + ": reply was not JSON (finish " + finish + ", " + content.length + " chars)"); }
    });
  }, function (e) { clearTimeout(timer); throw e; });
}

function savedCandidates(files) {
  var out = [];
  var seen = {};
  files.forEach(function (file) {
    var record = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
    (record.discovered || []).forEach(function (row) {
      if (!/openai-web-search/.test(row.provider || "")) return;
      var k = String(row.url).replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
      if (seen[k]) return; seen[k] = 1;
      out.push({ url: row.url, title: row.title || "", provider: "saved-search-replay", via: path.basename(path.dirname(path.dirname(file))) });
    });
  });
  return out;
}

var logs = [];
function log(stage, data) { var row = Object.assign({ stage: stage, at: new Date().toISOString() }, data || {}); logs.push(row); console.log(JSON.stringify(row).slice(0, 400)); }

function write(name, value) { fs.writeFileSync(path.join(outDir, name), JSON.stringify(value, null, 2)); }

function runText() {
  if (arg("reuse", "")) {
    var saved = JSON.parse(fs.readFileSync(path.join(path.resolve(arg("reuse")), "result.json"), "utf8"));
    log("REUSED_TEXT", { from: arg("reuse"), stage: saved.stage });
    return Promise.resolve(saved);
  }
  var ports = { fetch: harnessFetch, log: log, callModel: callModel, storyEffort: arg("story-effort", "medium"), maxSources: Number(arg("max-sources", "22")) };
  var files = String(arg("saved-research", "")).split(",").filter(Boolean);
  if (files.length) ports.savedCandidates = savedCandidates(files);
  if (!flag("no-search") && !stub) ports.searchProvider = Research.openaiWebSearchProvider({ apiKey: key, focusGroups: [{ ids: ["nhm", "bitesize", "natgeo-kids", "britannica", "amnh", "smithsonian", "australian-museum", "field-museum"], focus: "Museum, BBC Bitesize, National Geographic Kids or Britannica pages for primary pupils that explain this idea and how scientists know it (the evidence and what it tells us)." }], maxToolCalls: 1 });
  ports.discoveryProvider = Research.wikipediaProvider({ hosts: ["simple.wikipedia.org"], perQuery: 1 });
  if (stub) Object.assign(ports, require("./story-stub.js").ports(request, arg("stub-record", "")));
  return Story.generateStoryLesson(request, ports);
}

function visionCheck(asset, adventure, scene) {
  var data = fs.readFileSync(asset.file).toString("base64");
  var teaching = asset.type === "teaching" ? "This is a TEACHING picture. It must clearly show: " + clean(asset.feature, 200) + (asset.view === "comparison" ? " Compared: " + clean(asset.subject, 80) + " versus " + clean(asset.compared, 80) + "." : " Subject: " + clean(asset.subject, 80) + ".") : "This is a STORY picture for the scene: " + clean(scene, 600);
  var messages = [
    { role: "system", content: "You check one picture made for a primary lesson about " + clean(adventure.topic, 60) + ". Return one JSON object. Judge only what you can see. JSON shape: { \"whatIsShown\": \"one sentence\", \"matches\": \"yes\" or \"partly\" or \"no\", \"featureVisible\": \"yes\" or \"partly\" or \"no\" or \"n/a\" (teaching pictures: is the named evidence or feature clearly visible), \"humansWithLivingDinosaurs\": true or false (any person beside a living, non-fossil prehistoric animal), \"livingAnimalKinds\": 0, \"mixedPeriods\": true or false, \"textInImage\": true or false, \"childSafety\": \"ok\" or \"concern\", \"cartoonish\": true or false (flat clip-art style), \"featureBox\": { \"left\": 0, \"top\": 0, \"width\": 0, \"height\": 0 } (percent box holding the taught feature, or the main characters for a story picture) }." },
    { role: "user", content: [{ type: "text", text: "Year group: " + adventure.yearGroup + ". " + teaching }, { type: "image_url", image_url: { url: "data:image/jpeg;base64," + data, detail: "low" } }] }
  ];
  return harnessFetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify({ __purpose: "vision", model: "gpt-4o-mini", temperature: 0, max_tokens: 500, response_format: { type: "json_object" }, messages: messages }) }).then(function (res) { return res.json(); }).then(function (p) {
    var m = JSON.parse(p.choices[0].message.content);
    var flags = [];
    if (m.matches === "no") flags.push("does not match its scene or teaching point");
    if (asset.type === "teaching" && m.featureVisible !== "yes") flags.push("feature visible: " + (m.featureVisible || "unchecked"));
    if (m.humansWithLivingDinosaurs === true) flags.push("person beside a living prehistoric animal");
    if (m.mixedPeriods === true) flags.push("animals from different periods together");
    if (m.textInImage === true) flags.push("text drawn in the image");
    if (m.childSafety && m.childSafety !== "ok") flags.push("child safety: " + m.childSafety);
    if (m.cartoonish === true) flags.push("looks flat or clip-art");
    if (m.featureBox && !Visuals.featureBoxClear(m.featureBox)) flags.push("the feature or main subject overlaps the text panel area");
    return { id: asset.id, type: asset.type, image: asset.publicUrl, whatIsShown: clean(m.whatIsShown, 300), matches: m.matches, featureVisible: m.featureVisible, humansWithLivingDinosaurs: m.humansWithLivingDinosaurs === true, mixedPeriods: m.mixedPeriods === true, textInImage: m.textInImage === true, cartoonish: m.cartoonish === true, featureBox: m.featureBox || null, flags: flags, ok: !flags.length };
  }).catch(function (e) { return { id: asset.id, image: asset.publicUrl, ok: false, flags: ["vision check failed: " + clean(e && e.message, 120)] }; });
}

var started = Date.now();
runText().then(function (result) {
  write("result.json", result);
  if (result.record) write("sources/research-record.json", result.record);
  log("TEXT_DONE", { ok: result.ok, result: result.stage, issues: (result.issues || []).slice(0, 8), warnings: (result.warnings || []).length, spend: guard.state() });
  if (!result.ok) { process.exitCode = 3; return null; }
  var plan = result.imagePlan;
  var assetsPromise = flag("no-images") || stub ? Promise.resolve(plan.assets.map(function (a) { return Object.assign({}, a, { status: "planned" }); }))
    : Finish.generateImages(harnessFetch, key, { topic: request.topic }, outDir, plan.assets.length, flag("reuse-images"), { assets: plan.assets, promptFor: function (adv, a) { return a.prompt; } }).then(function (images) {
      return images.map(function (img) { var a = plan.assets.filter(function (x) { return x.id === img.id; })[0] || {}; return Object.assign({}, a, img, { frameLabel: a.frameLabel }); });
    });
  return assetsPromise.then(function (images) {
    var adventure = Story.buildAdventure(result.story, result.knowledge, request, { assets: images, vocabulary: result.vocabulary });
    var sceneText = {};
    result.story.scenes.forEach(function (s) { sceneText["scene-" + s.id] = s.title + ": " + s.image.description; });
    sceneText["scene-resolution"] = result.story.resolution.map(function (b) { return b.text; }).join(" ");
    var ready = images.filter(function (i) { return i.status === "ready"; });
    var vision = flag("no-vision") || stub ? Promise.resolve([]) : ready.reduce(function (chain, a) { return chain.then(function (rows) { return visionCheck(a, adventure, sceneText[a.id] || "").then(function (r) { rows.push(r); return rows; }); }); }, Promise.resolve([]));
    return vision.then(function (visionRows) {
      var warnings = (result.warnings || []).slice();
      visionRows.forEach(function (r) { if (!r.ok) warnings.push({ check: "image", text: r.id + ": " + r.flags.join("; ") }); });
      images.filter(function (i) { return i.status === "failed"; }).forEach(function (i) { warnings.push({ check: "image", text: i.id + ": not generated (" + clean(i.failure, 120) + ")" }); });
      (plan.limitations || []).forEach(function (l) { warnings.push({ check: "image", text: l.id + ": " + l.limitation }); });
      var lesson = {
        label: Story.LABEL, generatedAt: new Date().toISOString(), request: request,
        policy: "Hard block only on factual support (every pupil-facing factual sentence must be supported by its cited verbatim source passage). Every other check is automated, run once, and reported as a warning.",
        ideas: result.knowledge.ideas, claims: Object.keys(result.knowledge.claims).map(function (id) { var c = result.knowledge.claims[id]; return { id: id, ideaId: c.ideaId, role: c.role, text: c.text, quote: c.sourceQuote, sourceRef: c.sourceRef, url: c.url, title: c.title, passage: c.passageText, entailment: c.entailment, linkQuote: c.linkQuote || "" }; }),
        heldClaims: result.knowledge.held, droppedClaims: (result.trace && result.trace.dropped) || [], vocabulary: result.vocabulary,
        story: result.story, adventure: adventure, images: images.map(function (i) { var c = Object.assign({}, i); delete c.file; return c; }),
        checks: { support: { label: "hard block: every pupil-facing sentence classified and checked against its cited source passages", items: result.support.rows.length, failing: result.support.failing.length, firstPassFailing: result.support.first.filter(function (r) { return !r.ok; }).length, rows: result.support.rows, firstPass: result.support.first }, quality: result.quality, vision: visionRows },
        repairs: result.repairs, fallbacks: result.fallbacks, warnings: warnings,
        sources: result.record.sources, discoverySources: result.record.discoverySources, refused: result.record.refused.slice(0, 40), searchProviders: result.record.providers,
        interaction: "Class screen: story scenes with 2 choose activities (wrong choice gives its own feedback and stays; right choice solves it). Pupil devices: the end quiz questions only (activities are class-screen only).",
        models: result.trace && result.trace.models, calls: result.trace && result.trace.calls, spend: guard.state(), elapsedMs: Date.now() - started
      };
      fs.writeFileSync(path.join(outDir, "lesson", "lesson.json"), JSON.stringify(lesson, null, 2));
      fs.writeFileSync(path.join(outDir, "trace.json"), JSON.stringify({ logs: logs, outbound: outbound, trace: result.trace, spend: guard.state() }, null, 2));
      log("LESSON_WRITTEN", { title: adventure.title, scenes: adventure.storyScenes.length, images: images.filter(function (i) { return i.status === "ready"; }).length, warnings: warnings.length, spend: guard.state() });
      return lesson;
    });
  });
}).catch(function (error) {
  fs.writeFileSync(path.join(outDir, "trace.json"), JSON.stringify({ error: guard.redact(String(error && error.stack || error)), logs: logs, outbound: outbound, spend: guard.state() }, null, 2));
  console.error(guard.redact(String(error && error.stack || error)).split("\n").slice(0, 5).join("\n"));
  process.exitCode = 1;
});
