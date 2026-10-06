"use strict";

/* Finish a source-grounded lesson in the same run that generated it.
   Input: the adventure the production boot returned (COMPLETE), the boot's logs (the
   KNOWLEDGE_PACK log carries the pack the boot used), and a fetch that is already wrapped
   by the spend guard. Nothing here writes lesson content: beats, activities and questions
   are the boot's; images use the production visual planner and prompt builder
   (js/visual-adventure.js: planVisualAssets, charactersForAdventure, buildAdventurePrompt,
   including the deep-time period guard).
   Deviation from production learn-visuals: the cheapest acceptable call is used
   (images/generations, quality low, 1536x1024, no style references or character sheet);
   production uses images/edits with style references at high quality 2560x1440.
   Every check is automated and provisional. Nothing here is human review. */

var fs = require("fs");
var path = require("path");
var Visuals = require("../../js/visual-adventure.js");

var IMAGE_MODEL = "gpt-image-2.5-sunburst";
var IMAGE_SIZE = "1536x1024";
var IMAGE_QUALITY = "low";
var CHECK_MODEL = "gpt-4o-mini";
var IMAGE_ORDER = ["hook", "teach", "apply", "check", "investigate", "resolution", "recap", "opening", "discovery"];
var LABEL = "provisional automated check; not human review";

function clean(value, max) {
  var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return max && text.length > max ? text.slice(0, max).trim() : text;
}
function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; });
}

// ---- What the lesson contains (read only from the boot's output) ----

function usedPack(logs) {
  var row = (logs || []).filter(function (l) { return l.stage === "KNOWLEDGE_PACK"; })[0] || {};
  var byId = {};
  (row.claims || []).forEach(function (c) { byId[c.claimId] = c; });
  return { log: row, byId: byId, readiness: row.packReadiness || null };
}

function learningMapOf(adventure, trace) {
  var map = adventure && adventure.lessonPlan && adventure.lessonPlan.learningMap;
  if (Array.isArray(map) && map.length) return map;
  var plans = (trace && trace.plans) || [];
  for (var i = plans.length - 1; i >= 0; i--) {
    var m = plans[i].learningMap || (plans[i].raw && plans[i].raw.learningMap);
    if (plans[i].ok && Array.isArray(m) && m.length) return m;
  }
  return [];
}

function questionsOf(adventure) {
  var out = [];
  ((adventure && adventure.activities) || []).forEach(function (activity) {
    var config = activity.config || {};
    var list = Array.isArray(config.questions) && config.questions.length ? config.questions : (config.prompt && Array.isArray(config.choices) ? [config] : []);
    list.forEach(function (q, index) {
      out.push({ id: q.id || (activity.slotId || activity.title) + ":q" + index, slotId: activity.slotId || "", prompt: clean(q.prompt, 400), choices: (q.choices || []).map(function (c) { return clean(c, 200); }), correct: clean(q.correct, 200), explain: clean(q.explain, 400), knowledgeChecked: clean(q.knowledgeChecked, 300) });
    });
  });
  return out;
}

function teachingPairs(pack) {
  var r = pack.readiness || {};
  return (r.readyPairs || []).map(function (pair) {
    var feature = pack.byId[pair.featureClaimId] || {};
    var mechanism = pack.byId[pair.mechanismClaimId] || {};
    function side(c) { return { claimId: c.claimId || "", text: c.text || "", quote: c.sourceQuote || "", url: (c.sourceUrls || [])[0] || "", entailment: c.entailment || "", support: c.sourceSupport || "" }; }
    return { feature: pair.feature, featureClaim: side(feature), explanation: side(mechanism) };
  });
}

function pupilTextItems(adventure) {
  var items = [];
  ((adventure && adventure.activities) || []).forEach(function (activity) {
    var slot = activity.slotId || activity.title || "";
    (activity.beats || []).forEach(function (beat) {
      var text = beat.pupil && (beat.pupil.text || "");
      if (text) items.push({ id: beat.id, slotId: slot, kind: "beat", text: clean(text, 400) });
      if (beat.pupil && beat.pupil.cue) items.push({ id: beat.id + ":cue", slotId: slot, kind: "cue", text: clean(beat.pupil.cue, 300) });
    });
    if (!(activity.beats || []).length) ((activity.config && activity.config.lines) || []).forEach(function (line, i) { items.push({ id: slot + ":line" + i, slotId: slot, kind: "line", text: clean(line, 400) }); });
    if (activity.applyInstruction) items.push({ id: slot + ":instruction", slotId: slot, kind: "instruction", text: clean(activity.applyInstruction, 300) });
  });
  questionsOf(adventure).forEach(function (q) {
    items.push({ id: q.id + ":prompt", slotId: q.slotId, kind: "question", text: q.prompt });
    q.choices.forEach(function (c, i) { items.push({ id: q.id + ":choice" + i, slotId: q.slotId, kind: "choice", text: c }); });
    if (q.explain) items.push({ id: q.id + ":explain", slotId: q.slotId, kind: "explain", text: q.explain });
  });
  return items;
}

// ---- Check 1 (code): every beat's knowledge refs reach a quote-verified, entailment-supported claim ----

function checkSupport(adventure, pack, trace) {
  var map = learningMapOf(adventure, trace);
  var byPoint = {};
  map.forEach(function (p) { byPoint[p.id] = p; });
  var rows = [];
  ((adventure && adventure.activities) || []).forEach(function (activity) {
    (activity.beats || []).forEach(function (beat) {
      var claims = [];
      var unresolved = [];
      (beat.knowledgeRefs || []).forEach(function (ref) {
        var point = byPoint[ref];
        if (!point) { unresolved.push(ref); return; }
        (point.claimIds || []).forEach(function (id) { if (pack.byId[id]) claims.push(pack.byId[id]); else unresolved.push(ref + "->" + id); });
      });
      var held = claims.filter(function (c) { return c.sourceHold || c.entailment !== "supported" || !c.quoteVerified; });
      rows.push({ beatId: beat.id, slotId: activity.slotId || "", move: beat.move || "", text: clean(beat.pupil && beat.pupil.text, 300), refs: beat.knowledgeRefs || [],
        claims: claims.map(function (c) { return { claimId: c.claimId, text: c.text, quote: c.sourceQuote, url: (c.sourceUrls || [])[0] || "", entailment: c.entailment }; }),
        ok: !!claims.length && !held.length && !unresolved.length, unresolved: unresolved, heldClaims: held.map(function (c) { return c.claimId; }) });
    });
  });
  return { label: LABEL, method: "code: beat knowledgeRefs -> learning map point -> claimIds -> pack claim (quote verified, entailment supported)", learningMapPoints: map.length, rows: rows, problems: rows.filter(function (r) { return !r.ok; }).length };
}

// ---- Model calls (all through the guarded fetch) ----

function chatJson(fetchFn, key, messages, maxTokens) {
  return fetchFn("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: CHECK_MODEL, temperature: 0, max_tokens: maxTokens, response_format: { type: "json_object" }, messages: messages })
  }).then(function (res) {
    return res.json().then(function (body) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      var content = body && body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
      return JSON.parse(content || "{}");
    });
  });
}

// ---- Check 2: age suitability for the year group ----

var GRAPHIC = /\b(?:blood|bloody|gore|guts|corpse|dead body|kill(?:ed|ing|s)?|murder|rip(?:ped)? apart|torn apart|terrif(?:ying|ied)|horrif(?:ying|ic)|scream(?:ed|ing)?|nightmare)\b/i;
function checkAge(fetchFn, key, adventure, year) {
  var items = pupilTextItems(adventure);
  var code = items.map(function (item) {
    var words = item.text.split(/\s+/).filter(Boolean);
    var flags = [];
    if (words.length > 25) flags.push("long sentence (" + words.length + " words)");
    var longWords = words.filter(function (w) { return w.replace(/[^a-z]/gi, "").length >= 12; });
    var notes = longWords.length ? ["long words (information only; dinosaur names are long): " + longWords.join(", ")] : [];
    if (GRAPHIC.test(item.text)) flags.push("possibly frightening word: " + item.text.match(GRAPHIC)[0]);
    return { id: item.id, flags: flags, notes: notes };
  });
  return chatJson(fetchFn, key, [
    { role: "system", content: "You review pupil-facing text from one primary lesson for age suitability. Return one JSON object. Year group: " + year + " (England; Year 3 is age 7 to 8). For each item judge: wording a child of that age can read or follow when a teacher reads it aloud, and no frightening, graphic, or unsuitable content. Do not judge facts. JSON shape: { \"items\": [{ \"id\": \"\", \"verdict\": \"ok\" or \"concern\", \"reason\": \"short\" }], \"overall\": \"ok\" or \"concern\", \"summary\": \"one sentence\" }. Give every id a verdict." },
    { role: "user", content: JSON.stringify({ items: items.map(function (i) { return { id: i.id, kind: i.kind, text: i.text }; }) }) }
  ], 3000).then(function (model) {
    var byId = {};
    ((model && model.items) || []).forEach(function (row) { byId[row.id] = row; });
    var rows = items.map(function (item, index) {
      var m = byId[item.id] || { verdict: "unchecked", reason: "no model verdict" };
      return { id: item.id, slotId: item.slotId, kind: item.kind, text: item.text, model: m.verdict, reason: clean(m.reason, 200), codeFlags: code[index].flags, codeNotes: code[index].notes };
    });
    return { label: LABEL, method: "code (sentence length, long words, frightening words) + " + CHECK_MODEL + " judgement", overall: model && model.overall || "unchecked", summary: clean(model && model.summary, 300), rows: rows, problems: rows.filter(function (r) { return r.model !== "ok" || r.codeFlags.length; }).length };
  });
}

// ---- Check 3: questions ----

function contentWords(text) {
  return String(text || "").toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length >= 4 && ["that", "this", "with", "they", "them", "their", "have", "from", "which", "what", "when", "were", "does", "into", "because"].indexOf(w) === -1; });
}
function checkQuestions(fetchFn, key, adventure, pack, trace) {
  var questions = questionsOf(adventure);
  var taught = [];
  ((adventure && adventure.activities) || []).forEach(function (a) {
    if (["check", "recap"].indexOf(a.slotId) !== -1) return;
    (a.beats || []).forEach(function (b) { if (b.pupil && b.pupil.text) taught.push(clean(b.pupil.text, 300)); });
  });
  var quotes = Object.keys(pack.byId).map(function (id) { return pack.byId[id]; }).filter(function (c) { return !c.sourceHold && c.entailment === "supported"; }).map(function (c) { return { claim: c.text, quote: c.sourceQuote, url: (c.sourceUrls || [])[0] || "" }; });
  var taughtWords = {};
  contentWords(taught.join(" ")).forEach(function (w) { taughtWords[w.slice(0, 5)] = 1; });
  var code = questions.map(function (q) {
    var flags = [];
    if (q.choices.length < 2) flags.push("fewer than two choices");
    var hits = q.choices.filter(function (c) { return c === q.correct; }).length;
    if (hits !== 1) flags.push("correct answer appears " + hits + " times among the choices");
    var seen = {};
    q.choices.forEach(function (c) { var k = c.toLowerCase(); if (seen[k]) flags.push("duplicate choice: " + c); seen[k] = 1; });
    var answerWords = contentWords(q.correct);
    var covered = answerWords.filter(function (w) { return taughtWords[w.slice(0, 5)]; }).length;
    if (answerWords.length && covered / answerWords.length < 0.5) flags.push("the correct answer's words are mostly not in the taught beats");
    if (!q.explain) flags.push("no explanation");
    return flags;
  });
  if (!questions.length) return Promise.resolve({ label: LABEL, rows: [], problems: 1, note: "the lesson has no questions" });
  return chatJson(fetchFn, key, [
    { role: "system", content: "You check multiple-choice questions from one primary lesson. Return one JSON object. Use only the taught lines and source quotes given, not your own knowledge. For each question: defensible is yes when exactly one choice is correct according to the taught lines; supported is yes when the taught lines and a source quote both support the marked correct answer; for each other choice, clearlyWrong is yes when the taught lines or quotes show it is wrong and a child who learned the lesson would not reasonably pick it as also correct. JSON shape: { \"questions\": [{ \"id\": \"\", \"defensible\": \"yes\" or \"no\", \"supported\": \"yes\" or \"no\", \"supportingQuote\": \"\", \"distractors\": [{ \"choice\": \"\", \"clearlyWrong\": \"yes\" or \"no\", \"reason\": \"\" }], \"problem\": \"\" }] }." },
    { role: "user", content: JSON.stringify({ taughtLines: taught.slice(0, 60), sourceQuotes: quotes.slice(0, 24), questions: questions.map(function (q) { return { id: q.id, prompt: q.prompt, choices: q.choices, markedCorrect: q.correct, explain: q.explain }; }) }) }
  ], 2500).then(function (model) {
    var byId = {};
    ((model && model.questions) || []).forEach(function (row) { byId[row.id] = row; });
    var rows = questions.map(function (q, index) {
      var m = byId[q.id] || {};
      var distractors = (m.distractors || []).map(function (d) { return { choice: clean(d.choice, 200), clearlyWrong: d.clearlyWrong, reason: clean(d.reason, 200) }; });
      var ok = !code[index].length && m.defensible === "yes" && m.supported === "yes" && distractors.length >= q.choices.length - 1 && distractors.every(function (d) { return d.clearlyWrong === "yes"; });
      return Object.assign({}, q, { codeFlags: code[index], defensible: m.defensible || "unchecked", supported: m.supported || "unchecked", supportingQuote: clean(m.supportingQuote, 300), distractors: distractors, problem: clean(m.problem, 300), ok: ok });
    });
    return { label: LABEL, method: "code (one correct choice, no duplicates, answer words taught, explanation present) + " + CHECK_MODEL + " judgement against taught lines and source quotes", rows: rows, problems: rows.filter(function (r) { return !r.ok; }).length };
  });
}

// ---- Images through the production planner and prompt builder ----

function chooseAssets(adventure, count) {
  var planned = Visuals.planVisualAssets(adventure);
  var picked = [];
  IMAGE_ORDER.forEach(function (id) { var a = planned.filter(function (p) { return p.id === id; })[0]; if (a && picked.length < count) picked.push(a); });
  planned.forEach(function (a) { if (picked.length < count && picked.indexOf(a) === -1) picked.push(a); });
  return picked;
}

function imagePromptFor(adventure, asset) {
  return Visuals.buildAdventurePrompt(adventure, asset, Visuals.charactersForAdventure(adventure));
}

function generateImages(fetchFn, key, adventure, outDir, count) {
  var dir = path.join(outDir, "lesson", "images");
  fs.mkdirSync(dir, { recursive: true });
  var assets = chooseAssets(adventure, count || 4);
  var results = [];
  // Sequential, so the guard sees each settled cost before the next worst case.
  return assets.reduce(function (chain, asset) {
    return chain.then(function () {
      var prompt = imagePromptFor(adventure, asset);
      return fetchFn("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model: IMAGE_MODEL, prompt: prompt, size: IMAGE_SIZE, quality: IMAGE_QUALITY, output_format: "jpeg", output_compression: 80, moderation: "auto", n: 1 })
      }).then(function (res) {
        return res.json().then(function (body) {
          var b64 = body && body.data && body.data[0] && body.data[0].b64_json;
          if (!res.ok || !b64) throw new Error("image failed: HTTP " + res.status + " " + clean(body && body.error && body.error.message, 160));
          var file = asset.id + ".jpg";
          fs.writeFileSync(path.join(dir, file), Buffer.from(b64, "base64"));
          results.push({ id: asset.id, type: asset.type, slotId: asset.slotId || asset.id, status: "ready", fallback: false, publicUrl: "images/" + file, file: path.join(dir, file), usedByScenes: asset.usedByScenes || [], uiSafeArea: asset.uiSafeArea || "", brief: asset.brief || null, model: IMAGE_MODEL, dimensions: IMAGE_SIZE, quality: IMAGE_QUALITY, prompt: prompt, usage: body.usage || null });
        });
      }).catch(function (error) {
        results.push({ id: asset.id, type: asset.type, status: "failed", fallback: true, failure: String(error && error.message || error).slice(0, 200), prompt: prompt });
      });
    });
  }, Promise.resolve()).then(function () { return results; });
}

// ---- Check 4: each image against its beat (cheap vision) ----

function beatTextFor(adventure, asset) {
  var activity = ((adventure && adventure.activities) || []).filter(function (a) { return a.slotId === (asset.slotId || asset.id); })[0];
  var lines = activity ? (activity.beats || []).map(function (b) { return b.pupil && b.pupil.text; }).filter(Boolean) : [];
  if (activity && !lines.length) lines = (activity.config && activity.config.lines) || [];
  if (activity && activity.applyInstruction) lines.push("Task: " + activity.applyInstruction);
  return clean(lines.join(" "), 1200);
}

function checkImages(fetchFn, key, adventure, assets) {
  var ready = assets.filter(function (a) { return a.status === "ready"; });
  var rows = [];
  return ready.reduce(function (chain, asset) {
    return chain.then(function () {
      var data = fs.readFileSync(asset.file).toString("base64");
      var teaching = beatTextFor(adventure, asset);
      return chatJson(fetchFn, key, [
        { role: "system", content: "You check one picture made for one moment of a primary lesson. Return one JSON object. Judge only what you can see. JSON shape: { \"matchesBeat\": \"yes\" or \"partly\" or \"no\", \"whatIsShown\": \"one sentence\", \"humansWithLivingDinosaurs\": true or false (true if any person appears beside a living, non-fossil dinosaur), \"anatomyProblems\": [\"wrong or impossible body features for the animals shown\"], \"textInImage\": true or false, \"childSafety\": \"ok\" or \"concern\", \"notes\": \"\" }." },
        { role: "user", content: [
          { type: "text", text: "Lesson topic: " + clean(adventure.topic, 80) + ". Year group: " + clean(adventure.yearGroup, 20) + ". This picture is for the " + (asset.slotId || asset.id) + " moment. What the class hears at this moment: " + teaching + (asset.brief && asset.brief.educationalFocus ? " Visual focus: " + clean(asset.brief.educationalFocus, 200) + "." : "") },
          { type: "image_url", image_url: { url: "data:image/jpeg;base64," + data, detail: "low" } }
        ] }
      ], 400).then(function (m) {
        var flags = [];
        if (m.matchesBeat !== "yes") flags.push("matches beat: " + (m.matchesBeat || "unchecked"));
        if (m.humansWithLivingDinosaurs === true) flags.push("person beside a living dinosaur");
        if ((m.anatomyProblems || []).length) flags.push("anatomy: " + m.anatomyProblems.join("; "));
        if (m.textInImage === true) flags.push("text drawn in the image");
        if (m.childSafety && m.childSafety !== "ok") flags.push("child safety: " + m.childSafety);
        rows.push({ id: asset.id, image: asset.publicUrl, beat: teaching, matchesBeat: m.matchesBeat || "unchecked", whatIsShown: clean(m.whatIsShown, 300), humansWithLivingDinosaurs: m.humansWithLivingDinosaurs === true, anatomyProblems: (m.anatomyProblems || []).map(function (x) { return clean(x, 160); }), textInImage: m.textInImage === true, childSafety: m.childSafety || "unchecked", notes: clean(m.notes, 300), flags: flags, ok: !flags.length });
      }).catch(function (error) {
        rows.push({ id: asset.id, image: asset.publicUrl, ok: false, flags: ["vision check failed: " + clean(error && error.message, 120)] });
      });
    });
  }, Promise.resolve()).then(function () {
    assets.filter(function (a) { return a.status !== "ready"; }).forEach(function (a) { rows.push({ id: a.id, ok: false, flags: ["image not generated: " + (a.failure || "")] }); });
    return { label: LABEL, method: CHECK_MODEL + " vision, detail low, one call per image", rows: rows, problems: rows.filter(function (r) { return !r.ok; }).length };
  });
}

// ---- Render ----

function renderHtml(lesson) {
  var a = lesson.adventure;
  var assetBySlot = {};
  (lesson.images || []).forEach(function (img) { if (img.status === "ready") assetBySlot[img.slotId || img.id] = img; });
  var checks = lesson.checks || {};
  function flagsFor(list, id) { var r = ((list && list.rows) || []).filter(function (x) { return x.id === id; })[0]; return r; }
  var parts = [];
  parts.push("<!doctype html><html lang=\"en-GB\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + esc(a.title || "Lesson") + " (provisional)</title>");
  parts.push("<style>body{font:16px/1.5 system-ui,sans-serif;max-width:980px;margin:24px auto;padding:0 16px;color:#1d1d1f}h1{margin-bottom:4px}.banner{background:#fff4d6;border:1px solid #e0b400;padding:10px 14px;border-radius:8px}.stage{border:1px solid #ddd;border-radius:10px;padding:14px;margin:18px 0}.stage img{width:100%;border-radius:8px}.move{color:#666;font-size:12px;text-transform:uppercase;margin-right:6px}.q{background:#f6f8fa;padding:10px;border-radius:8px;margin:8px 0}.correct{font-weight:700;color:#0a7a2f}.flag{color:#b00020;font-size:13px}.ok{color:#0a7a2f;font-size:13px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #ddd;padding:6px;vertical-align:top}blockquote{margin:4px 0;padding-left:10px;border-left:3px solid #ccc;color:#444}</style></head><body>");
  parts.push("<h1>" + esc(a.title || "") + "</h1><p>" + esc(a.yearGroup || "") + " · " + esc(a.subject || "") + " · " + esc(a.topic || "") + " · " + esc(a.targetMinutes || a.estimateMinutes || "") + " min</p>");
  parts.push("<p class=\"banner\"><strong>Provisional. Not classroom-ready. Not human-reviewed.</strong> Generated by the production lesson boot in research mode. Source support is \"quote-verified + automated entailment check\". All four checks below are automated and provisional.</p>");
  parts.push("<h2>Objective</h2><p>" + esc(lesson.objective) + "</p>");
  parts.push("<h2>Teaching pairs and sources</h2><table><tr><th>Feature</th><th>Feature claim and quote</th><th>Explanation and quote</th></tr>");
  (lesson.pairs || []).forEach(function (p) {
    function cell(s) { return esc(s.text) + "<blockquote>" + esc(s.quote) + "</blockquote><a href=\"" + esc(s.url) + "\">" + esc(s.url) + "</a> <span class=\"ok\">" + esc(s.entailment) + "</span>"; }
    parts.push("<tr><td>" + esc(p.feature) + "</td><td>" + cell(p.featureClaim) + "</td><td>" + cell(p.explanation) + "</td></tr>");
  });
  parts.push("</table>");
  (a.activities || []).forEach(function (activity) {
    var slot = activity.slotId || "";
    parts.push("<section class=\"stage\"><h2>" + esc(activity.title || slot) + " <small>(" + esc(slot) + ", " + esc(activity.minutes) + " min)</small></h2>");
    var img = assetBySlot[slot];
    if (img) {
      var vis = flagsFor(checks.images, img.id);
      parts.push("<img src=\"" + esc(img.publicUrl) + "\" alt=\"Generated picture for the " + esc(slot) + " moment\">");
      if (vis) parts.push("<p class=\"" + (vis.ok ? "ok" : "flag") + "\">Check 4 (vision, provisional): " + esc(vis.ok ? "no flags" : vis.flags.join("; ")) + (vis.whatIsShown ? " — " + esc(vis.whatIsShown) : "") + "</p>");
    }
    (activity.beats || []).forEach(function (beat) {
      var support = ((checks.support && checks.support.rows) || []).filter(function (r) { return r.beatId === beat.id; })[0];
      parts.push("<p><span class=\"move\">" + esc(beat.move) + "</span>" + esc(beat.pupil && beat.pupil.text) + (beat.pupil && beat.pupil.cue ? " <em>(" + esc(beat.pupil.cue) + ")</em>" : "") + (support && !support.ok ? " <span class=\"flag\">[check 1: " + esc(support.unresolved.length ? "unresolved ref" : "no supported claim") + "]</span>" : "") + "</p>");
    });
    if (!(activity.beats || []).length) ((activity.config && activity.config.lines) || []).forEach(function (line) { parts.push("<p>" + esc(line) + "</p>"); });
    if (activity.applyInstruction) parts.push("<p><strong>Task:</strong> " + esc(activity.applyInstruction) + (activity.successCondition ? " <em>Done when: " + esc(activity.successCondition) + "</em>" : "") + "</p>");
    (lesson.questions || []).filter(function (q) { return q.slotId === slot; }).forEach(function (q) {
      var qc = ((checks.questions && checks.questions.rows) || []).filter(function (r) { return r.id === q.id; })[0];
      parts.push("<div class=\"q\"><strong>" + esc(q.prompt) + "</strong><ul>" + q.choices.map(function (c) { return "<li" + (c === q.correct ? " class=\"correct\"" : "") + ">" + esc(c) + (c === q.correct ? " ✓" : "") + "</li>"; }).join("") + "</ul><small>" + esc(q.explain) + "</small>" + (qc ? "<p class=\"" + (qc.ok ? "ok" : "flag") + "\">Check 3 (provisional): " + esc(qc.ok ? "one defensible, supported answer; distractors clearly wrong" : [qc.codeFlags.join("; "), "defensible " + qc.defensible, "supported " + qc.supported, qc.problem].filter(Boolean).join(" · ")) + "</p>" : "") + "</div>");
    });
    parts.push("</section>");
  });
  parts.push("<h2>Check summary (all provisional)</h2><ul>");
  ["support", "age", "questions", "images"].forEach(function (k) { var c = checks[k]; if (c) parts.push("<li>" + esc(k) + ": " + esc(c.problems) + " item(s) flagged of " + esc((c.rows || []).length) + " — " + esc(c.method || "") + "</li>"); });
  parts.push("</ul><script type=\"application/json\" id=\"lesson-json\">" + JSON.stringify(lesson).replace(/</g, "\\u003c") + "</script></body></html>");
  return parts.join("\n");
}

// ---- Orchestration ----

function runFinish(opts) {
  var adventure = JSON.parse(JSON.stringify(opts.adventure));
  var outDir = opts.outDir;
  var key = opts.apiKey;
  var fetchFn = opts.fetch;
  var pack = usedPack(opts.logs);
  var lesson = {
    label: "provisional; quote-verified + automated entailment check; not human-verified; not classroom-ready",
    objective: clean((adventure.lessonPlan && adventure.lessonPlan.learningObjective) || (adventure.objectives || [])[0], 400),
    pairs: teachingPairs(pack),
    questions: questionsOf(adventure),
    images: [],
    checks: {},
    adventure: adventure
  };
  fs.mkdirSync(path.join(outDir, "lesson"), { recursive: true });
  lesson.checks.support = checkSupport(adventure, pack, opts.trace);
  return generateImages(fetchFn, key, adventure, outDir, opts.imageCount || 4).then(function (images) {
    lesson.images = images;
    adventure.visualAssets = images.filter(function (i) { return i.status === "ready"; }).map(function (i) {
      return { id: i.id, type: i.type, status: "ready", fallback: false, publicUrl: i.publicUrl, usedByScenes: i.usedByScenes, uiSafeArea: i.uiSafeArea, brief: i.brief, model: i.model, dimensions: i.dimensions };
    });
    Visuals.stampActivities(adventure.activities || [], adventure.visualAssets);
    return checkAge(fetchFn, key, adventure, adventure.yearGroup || "Year 3").catch(function (e) { return { label: LABEL, failed: String(e.message || e), rows: [], problems: 1 }; });
  }).then(function (age) {
    lesson.checks.age = age;
    return checkQuestions(fetchFn, key, adventure, pack, opts.trace).catch(function (e) { return { label: LABEL, failed: String(e.message || e), rows: [], problems: 1 }; });
  }).then(function (questions) {
    lesson.checks.questions = questions;
    return checkImages(fetchFn, key, adventure, lesson.images);
  }).then(function (images) {
    lesson.checks.images = images;
    var json = path.join(outDir, "lesson", "lesson.json");
    fs.writeFileSync(json, JSON.stringify(lesson, null, 2));
    var html = path.join(outDir, "lesson", "lesson.html");
    fs.writeFileSync(html, renderHtml(lesson));
    return { lesson: lesson, html: html, json: json };
  });
}

module.exports = { runFinish: runFinish, renderHtml: renderHtml, checkSupport: checkSupport, questionsOf: questionsOf, pupilTextItems: pupilTextItems, teachingPairs: teachingPairs, usedPack: usedPack, chooseAssets: chooseAssets, imagePromptFor: imagePromptFor, IMAGE_MODEL: IMAGE_MODEL, IMAGE_SIZE: IMAGE_SIZE, IMAGE_QUALITY: IMAGE_QUALITY };
