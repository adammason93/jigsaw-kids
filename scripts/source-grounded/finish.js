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
var Brain = require("../../js/lesson-brain.js");

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

function teachingPairs(pack, research) {
  var r = pack.readiness || {};
  var passages = {};
  ((research && research.passages) || []).forEach(function (p) { if (p && p.id) passages[p.id] = p; });
  return (r.readyPairs || []).map(function (pair) {
    var feature = pack.byId[pair.featureClaimId] || {};
    var mechanism = pack.byId[pair.mechanismClaimId] || {};
    function side(c) {
      var out = { claimId: c.claimId || "", text: c.text || "", quote: c.sourceQuote || "", url: (c.sourceUrls || [])[0] || "", entailment: c.entailment || "", support: c.sourceSupport || "" };
      // Patch 6: the verbatim passages each claim cites (with source tier), when the research record is given.
      if (research) out.passages = (c.sourceRef || []).map(function (id) { var p = passages[id] || {}; return { id: id, url: p.url || "", title: p.title || "", tier: p.tier || "", text: p.text || "" }; });
      return out;
    }
    var row = { feature: pair.feature, featureClaim: side(feature), explanation: side(mechanism) };
    if (research) {
      var shared = (feature.sourceRef || []).filter(function (id) { return (mechanism.sourceRef || []).indexOf(id) !== -1; });
      // The explanation's own verified quote must state the link (link words), and must name the
      // feature or point back to it ("This", "It") from the passage that states the feature,
      // with the feature's quote earlier in that passage.
      var quote = mechanism.sourceQuote || "";
      var statesLink = Brain.quoteStatesLink(quote);
      var featureWords = String(pair.feature || "").toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length >= 4; });
      var namesFeature = featureWords.some(function (w) { return quote.toLowerCase().indexOf(w.slice(0, 5)) !== -1; });
      var passageText = shared.length && passages[shared[0]] ? String(passages[shared[0]].text || "") : "";
      var pointsBack = /^\s*(?:this|these|it|its|they|their|that)\b/i.test(quote) && !!passageText && passageText.indexOf(feature.sourceQuote || "\u0000") !== -1 && passageText.indexOf(feature.sourceQuote) <= passageText.indexOf(quote.slice(0, 30));
      row.causalLink = {
        linkQuote: mechanism.linkQuote || "",
        quoteStatesLink: statesLink,
        namesFeature: namesFeature,
        pointsBackToFeature: pointsBack,
        samePassage: shared.length > 0,
        result: mechanism.entailment === "supported" && statesLink && (namesFeature || pointsBack) ? "pass" : "fail",
        method: "code: explanation claim entailment supported + its verified quote states the link (link words) + the quote names the feature, or begins This/It/... and follows the feature's quote in the same passage. The entailment check's linkQuote is shown when it set one."
      };
    }
    return row;
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
var GENERAL_TRUTH = " In addition, for each other choice give trueInGeneral: using general science knowledge as well (not only the taught lines), is this wrong choice actually true or partly true as an answer to this question? yes, partly, or no, with a short reason in generalReason. For each question also give teleological: yes when the marked answer says an animal grew or chose a body part in order to get a benefit (purpose language), otherwise no. Distractor shape when these fields are asked: { \"choice\": \"\", \"clearlyWrong\": \"\", \"reason\": \"\", \"trueInGeneral\": \"yes\" or \"partly\" or \"no\", \"generalReason\": \"\" }.";
function checkQuestions(fetchFn, key, adventure, pack, trace, research) {
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
    { role: "system", content: "You check multiple-choice questions from one primary lesson. Return one JSON object. Use only the taught lines and source quotes given, not your own knowledge. For each question: defensible is yes when exactly one choice is correct according to the taught lines; supported is yes when the taught lines and a source quote both support the marked correct answer; for each other choice, clearlyWrong is yes when the taught lines or quotes show it is wrong and a child who learned the lesson would not reasonably pick it as also correct. JSON shape: { \"questions\": [{ \"id\": \"\", \"defensible\": \"yes\" or \"no\", \"supported\": \"yes\" or \"no\", \"supportingQuote\": \"\", \"distractors\": [{ \"choice\": \"\", \"clearlyWrong\": \"yes\" or \"no\", \"reason\": \"\" }], \"problem\": \"\" }] }." + (research ? GENERAL_TRUTH : "") },
    { role: "user", content: JSON.stringify({ taughtLines: taught.slice(0, 60), sourceQuotes: quotes.slice(0, 24), questions: questions.map(function (q) { return { id: q.id, prompt: q.prompt, choices: q.choices, markedCorrect: q.correct, explain: q.explain }; }) }) }
  ], research ? 3500 : 2500).then(function (model) {
    var byId = {};
    ((model && model.questions) || []).forEach(function (row) { byId[row.id] = row; });
    var rows = questions.map(function (q, index) {
      var m = byId[q.id] || {};
      var distractors = (m.distractors || []).map(function (d) { var row = { choice: clean(d.choice, 200), clearlyWrong: d.clearlyWrong, reason: clean(d.reason, 200) }; if (research) { row.trueInGeneral = d.trueInGeneral || "unchecked"; row.generalReason = clean(d.generalReason, 200); } return row; });
      var ok = !code[index].length && m.defensible === "yes" && m.supported === "yes" && distractors.length >= q.choices.length - 1 && distractors.every(function (d) { return d.clearlyWrong === "yes"; });
      var extra = {};
      if (research) {
        var partly = distractors.filter(function (d) { return d.trueInGeneral === "yes" || d.trueInGeneral === "partly"; });
        extra.partlyTrueDistractors = partly.map(function (d) { return d.choice; });
        extra.teleological = m.teleological || "unchecked";
        if (partly.length || m.teleological === "yes") ok = false;
      }
      return Object.assign({}, q, { codeFlags: code[index], defensible: m.defensible || "unchecked", supported: m.supported || "unchecked", supportingQuote: clean(m.supportingQuote, 300), distractors: distractors, problem: clean(m.problem, 300), ok: ok }, extra);
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

function generateImages(fetchFn, key, adventure, outDir, count, reuse, plan) {
  var dir = path.join(outDir, "lesson", "images");
  fs.mkdirSync(dir, { recursive: true });
  var assets = plan ? plan.assets : chooseAssets(adventure, count || 4);
  var promptFor = plan ? plan.promptFor : imagePromptFor;
  function extra(asset) {
    // Patch 6: teaching-visual fields (absent for the production planner's assets).
    var out = {};
    ["frameLabel", "framing", "view", "unitId", "feature", "beatIds", "newCase", "choices", "compared", "subject", "period", "storyScene", "limitation"].forEach(function (k) { if (asset[k] != null && asset[k] !== "") out[k] = asset[k]; });
    return out;
  }
  var results = [];
  // Sequential, so the guard sees each settled cost before the next worst case.
  return assets.reduce(function (chain, asset) {
    return chain.then(function () {
      var prompt = promptFor(adventure, asset);
      var file = asset.id + ".jpg";
      // Resume: an image this run already generated (same asset, same prompt builder) is reused, not paid for again.
      if (reuse && fs.existsSync(path.join(dir, file))) {
        results.push(Object.assign({ id: asset.id, type: asset.type, slotId: asset.slotId || asset.id, status: "ready", fallback: false, publicUrl: "images/" + file, file: path.join(dir, file), usedByScenes: asset.usedByScenes || [], uiSafeArea: asset.uiSafeArea || "", brief: asset.brief || null, model: IMAGE_MODEL, dimensions: IMAGE_SIZE, quality: IMAGE_QUALITY, prompt: prompt, usage: null, reused: true }, extra(asset)));
        return null;
      }
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
          results.push(Object.assign({ id: asset.id, type: asset.type, slotId: asset.slotId || asset.id, status: "ready", fallback: false, publicUrl: "images/" + file, file: path.join(dir, file), usedByScenes: asset.usedByScenes || [], uiSafeArea: asset.uiSafeArea || "", brief: asset.brief || null, model: IMAGE_MODEL, dimensions: IMAGE_SIZE, quality: IMAGE_QUALITY, prompt: prompt, usage: body.usage || null }, extra(asset)));
        });
      }).catch(function (error) {
        results.push(Object.assign({ id: asset.id, type: asset.type, status: "failed", fallback: true, failure: String(error && error.message || error).slice(0, 200), prompt: prompt }, extra(asset)));
      });
    });
  }, Promise.resolve()).then(function () { return results; });
}

// Patch 6: the vision check for teaching visuals asks whether the taught feature is visible,
// whether animals from different periods or non-group animals are shown as the lesson group,
// and (for the example picture) whether the picture gives the answer away.
function teachingVisionMessages(adventure, asset, teaching, data) {
  var topic = clean(adventure.topic, 80);
  var ask = asset.slotId === "apply"
    ? "This is the example picture for a choice task. The example: " + clean(asset.newCase, 300) + " Choices: " + (asset.choices || []).join(" / ") + "."
    : asset.framing === "story"
      ? "This is a story picture for the opening of the lesson. What the class hears: " + teaching
      : "This is a teaching picture (" + asset.view + ") that must clearly show this feature: " + clean(asset.feature, 160) + (asset.subject ? ". The animal should be a " + clean(asset.subject, 60) : "") + (asset.view === "comparison" && asset.compared ? ". It is compared with: " + clean(asset.compared, 120) : "") + ". What the class hears: " + teaching;
  // Patch 7: identity, number of animal kinds and where the taught feature sits (for the panel check).
  var extra = " Also return: \"animalKinds\": the number of different kinds of animal shown (a number), \"identifiableAs\": \"what kind of animal the main animal looks like\", \"isExpectedAnimal\": \"yes\" or \"partly\" or \"no\" or \"n/a\" (n/a when no animal is named), \"featureBox\": { \"left\": 0, \"top\": 0, \"width\": 0, \"height\": 0 } (the smallest box, in percent of the picture width and height from the top-left corner, that holds the taught feature and every compared body part; for a story or example picture, the box that holds all the animals) or null if not visible.";
  return [
    { role: "system", content: "You check one picture made for a primary science lesson about " + topic + ". Return one JSON object. Judge only what you can see. JSON shape: { \"whatIsShown\": \"one sentence\", \"featureVisible\": \"yes\" or \"partly\" or \"no\" or \"n/a\" (is the named feature clearly visible and recognisable; n/a for a story picture), \"matchesBeat\": \"yes\" or \"partly\" or \"no\", \"humansWithLivingDinosaurs\": true or false (any person beside a living, non-fossil dinosaur), \"nonGroupAnimalShownAsGroup\": true or false (a flying reptile, sea reptile, mammal, or other animal that is not one of the " + topic + " shown as if it were one), \"mixedPeriods\": true or false (animals that clearly lived at very different times shown together), \"answerGivenAway\": true or false (only for an example picture: the picture itself shows which choice is right), \"anatomyProblems\": [\"wrong or impossible body features\"], \"textInImage\": true or false, \"childSafety\": \"ok\" or \"concern\", \"cannotShow\": \"what this picture cannot show about the taught idea (for example a result such as energy or force)\" }." + extra },
    { role: "user", content: [
      { type: "text", text: "Year group: " + clean(adventure.yearGroup, 20) + ". " + ask },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64," + data, detail: "low" } }
    ] }
  ];
}

function teachingVisionRow(asset, teaching, m) {
  var flags = [];
  if (asset.framing === "teaching" && asset.slotId !== "apply" && m.featureVisible !== "yes") flags.push("feature visible: " + (m.featureVisible || "unchecked"));
  if (m.matchesBeat && m.matchesBeat === "no") flags.push("matches beat: no");
  if (m.humansWithLivingDinosaurs === true) flags.push("person beside a living dinosaur");
  if (m.nonGroupAnimalShownAsGroup === true) flags.push("non-group animal shown as the lesson group");
  if (m.mixedPeriods === true) flags.push("animals from different periods together");
  if (asset.slotId === "apply" && m.answerGivenAway === true) flags.push("picture gives the answer away");
  if ((m.anatomyProblems || []).length) flags.push("anatomy: " + m.anatomyProblems.join("; "));
  if (m.textInImage === true) flags.push("text drawn in the image");
  if (m.childSafety && m.childSafety !== "ok") flags.push("child safety: " + m.childSafety);
  // Patch 7 image rules (code over the vision answers).
  var kinds = Number(m.animalKinds);
  var teachingPic = asset.framing === "teaching" && asset.slotId !== "apply";
  if (teachingPic) {
    var allowedKinds = asset.view === "comparison" ? 2 : 1;
    if (!isFinite(kinds)) flags.push("animal kinds: unchecked");
    else if (kinds > allowedKinds) flags.push("shows " + kinds + " kinds of animal (one identifiable animal" + (allowedKinds === 2 ? " plus the compared animal" : "") + " expected)");
    if (asset.subject && m.isExpectedAnimal !== "yes") flags.push("not recognisable as " + asset.subject + " (" + (m.isExpectedAnimal || "unchecked") + (m.identifiableAs ? ": looks like " + clean(m.identifiableAs, 80) : "") + ")");
    if (!Visuals.featureBoxClear(m.featureBox)) flags.push(m.featureBox ? "taught feature sits under the text panel (box " + ["left", "top", "width", "height"].map(function (k) { return Math.round(Number(m.featureBox[k])); }).join("/") + ")" : "taught feature position: unchecked");
  }
  if (asset.framing === "story" && asset.storyScene && asset.storyScene.mode === "single") {
    if (!isFinite(kinds)) flags.push("animal kinds: unchecked");
    else if (kinds > 1) flags.push("story picture shows " + kinds + " kinds of animal (a single-animal scene was required: " + clean(asset.storyScene.limitation, 160) + ")");
  }
  return { id: asset.id, animalKinds: isFinite(kinds) ? kinds : null, identifiableAs: clean(m.identifiableAs, 120), isExpectedAnimal: m.isExpectedAnimal || "unchecked", featureBox: m.featureBox || null, limitation: asset.limitation || "", image: asset.publicUrl, frameLabel: asset.frameLabel || "", view: asset.view || "", feature: asset.feature || "", beat: teaching, whatIsShown: clean(m.whatIsShown, 300), featureVisible: m.featureVisible || "unchecked", matchesBeat: m.matchesBeat || "unchecked", humansWithLivingDinosaurs: m.humansWithLivingDinosaurs === true, nonGroupAnimalShownAsGroup: m.nonGroupAnimalShownAsGroup === true, mixedPeriods: m.mixedPeriods === true, answerGivenAway: m.answerGivenAway === true, anatomyProblems: (m.anatomyProblems || []).map(function (x) { return clean(x, 160); }), textInImage: m.textInImage === true, childSafety: m.childSafety || "unchecked", cannotShow: clean(m.cannotShow, 300), flags: flags, ok: !flags.length };
}

// ---- Check 4: each image against its beat (cheap vision) ----

function beatTextFor(adventure, asset) {
  if (asset.beatIds && asset.beatIds.length) {
    var own = [];
    ((adventure && adventure.activities) || []).forEach(function (a) { (a.beats || []).forEach(function (b) { if (asset.beatIds.indexOf(b.id) !== -1 && b.pupil && b.pupil.text) own.push(b.pupil.text); }); });
    if (own.length) return clean(own.join(" "), 1200);
  }
  if (asset.slotId === "apply" && asset.newCase) return clean("New example: " + asset.newCase + " Choices: " + (asset.choices || []).join(" / "), 1200);
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
      if (asset.framing) return chatJson(fetchFn, key, teachingVisionMessages(adventure, asset, teaching, data), 700).then(function (m) {
        rows.push(teachingVisionRow(asset, teaching, m));
      }).catch(function (error) {
        rows.push({ id: asset.id, image: asset.publicUrl, ok: false, flags: ["vision check failed: " + clean(error && error.message, 120)] });
      });
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

// ---- Patch 6: research-mode context, teaching visuals, and extra checks ----

// The boot's context rebuilt from the run's own outputs (no new content).
function ruleContext(adventure, trace, pack) {
  if (!trace || !trace.research || !pack || !pack.final) return null;
  var req = trace.request || {};
  var intent = trace.intent || {};
  return {
    yearGroup: req.yearGroup || adventure.yearGroup, subject: req.subject || adventure.subject, topic: req.topic || adventure.topic,
    requestedMinutes: req.requestedMinutes || adventure.targetMinutes, lessonText: req.lessonText || "",
    lessonBrief: { intent: "explain", rawRequest: req.lessonText || "", learningGoal: intent.learningGoal, requiredEvidence: intent.requiredEvidence, focusConcepts: intent.focusConcepts, teacherIntent: intent },
    researchEvidence: trace.research, knowledgePack: pack.final.pack, knowledgeSelection: pack.final.selection, lessonPlan: adventure.lessonPlan,
    questionAudit: lastQuestionAudit(trace)
  };
}

// Patch 9: the research rules include the question audit's verdicts (patch 7). The finish rule
// check had no audit, so every question failed as "unchecked". It now uses the boot's last
// QUESTION_AUDIT verdicts (the audit of the final content). A verdict only counts for a question
// whose prompt it copies exactly (Brain.questionAuditIssues); any other question still fails.
function lastQuestionAudit(trace) {
  var rows = ((trace && trace.logs) || []).filter(function (row) { return row && row.stage === "QUESTION_AUDIT" && row.ok && Array.isArray(row.verdicts); });
  var last = rows[rows.length - 1];
  return last ? { ok: true, questions: JSON.parse(JSON.stringify(last.verdicts)), source: "boot QUESTION_AUDIT (" + (last.model || "") + ")" } : null;
}

function finalPackRow(trace, pack) {
  var packs = (trace && trace.packs) || [];
  var id = pack && pack.log && pack.log.packId;
  return packs.filter(function (row) { return row.pack && row.pack.id === id; })[0] || packs[packs.length - 1] || null;
}

function lineageOf(adventure, ctx) {
  if (adventure.unitLineage && adventure.unitLineage.units) return adventure.unitLineage;
  return ctx ? Brain.unitLineage(adventure, ctx) : { units: [], issues: [] };
}

function visualUnits(adventure, ctx) {
  if (!ctx) return [];
  var units = Brain.researchUnits(ctx);
  var lineage = lineageOf(adventure, ctx);
  var teach = ((adventure.activities || []).filter(function (a) { return a.slotId === "teach"; })[0] || {}).beats || [];
  var teachIds = teach.map(function (b) { return b.id; });
  return units.map(function (u) {
    var row = (lineage.units || []).filter(function (l) { return l.unitId === u.unitId; })[0] || {};
    return Object.assign({}, u, { beatIds: unitBeatIds(teach, row, u.unitId) });
  });
}

// The teach beats a unit's picture belongs on: every teach beat that cites only this unit (the
// feature beat as well as the explanation beat), so the feature sentence never sits under the
// previous unit's picture. A beat citing several units keeps the last picture shown. Falls back
// to the lineage row when beats carry no unit ids.
function unitBeatIds(teachBeats, row, unitId) {
  var teachIds = (teachBeats || []).map(function (b) { return b.id; });
  var own = (teachBeats || []).filter(function (b) { return Array.isArray(b.unitIds) && b.unitIds.length === 1 && b.unitIds[0] === unitId; }).map(function (b) { return b.id; });
  if (own.length) return own;
  var ids = ((row && row.explainBeats) || []).filter(function (id) { return teachIds.indexOf(id) !== -1; });
  if (!ids.length) ids = ((row && row.beats) || []).filter(function (id) { return teachIds.indexOf(id) !== -1; });
  return ids;
}

function teachingPlan(adventure, units, count) {
  var assets = Visuals.planTeachingVisuals(adventure, units, { max: count });
  return { assets: assets, promptFor: function (a, asset) { return Visuals.buildTeachingVisualPrompt(a, asset); }, mode: "teaching" };
}

// Each beat shows the picture of the unit it teaches; other stages show the story or example picture.
function stampTeachingVisuals(adventure, images) {
  var ready = {};
  images.forEach(function (i) { if (i.status === "ready") ready[i.id] = i; });
  var firstTeach = images.filter(function (i) { return i.status === "ready" && /^teach-/.test(i.id); })[0];
  (adventure.activities || []).forEach(function (activity) {
    activity.scene = activity.scene || {};
    var slot = activity.slotId;
    if (slot === "teach" && firstTeach) {
      activity.scene.visualAssetId = firstTeach.id;
      (activity.beats || []).forEach(function (beat) {
        var own = images.filter(function (i) { return i.status === "ready" && (i.beatIds || []).indexOf(beat.id) !== -1; })[0];
        if (own) beat.visualAssetId = own.id;
      });
      // A teach beat between two unit pictures keeps the last picture shown.
      var last = firstTeach.id;
      (activity.beats || []).forEach(function (beat) { if (beat.visualAssetId) last = beat.visualAssetId; else beat.visualAssetId = last; });
    } else if (slot === "apply" && ready.apply) activity.scene.visualAssetId = "apply";
    else if (ready.hook) activity.scene.visualAssetId = "hook";
  });
}

// Check 5 (code): each teach and recap sentence against the source passages of the units it cites.
var SUPPORT_STOP = { that: 1, this: 1, with: 1, they: 1, them: 1, their: 1, have: 1, from: 1, which: 1, what: 1, when: 1, were: 1, does: 1, into: 1, because: 1, these: 1, those: 1, very: 1, really: 1, some: 1, could: 1, would: 1, about: 1, there: 1, then: 1, also: 1, just: 1, like: 1, other: 1, more: 1, much: 1, many: 1, each: 1, helped: 1, help: 1, helps: 1, made: 1, make: 1, look: 1, think: 1, means: 1, meant: 1, allowed: 1, called: 1, your: 1, will: 1, know: 1, something: 1 };
function stemWord(w) { return w.replace(/(?:ing|ed|es|s)$/, "").slice(0, 6); }
function checkSentenceSupport(adventure, ctx, units) {
  if (!ctx) return { label: LABEL, skipped: "not research mode", rows: [], problems: 0 };
  var lineage = lineageOf(adventure, ctx);
  var byUnit = {};
  units.forEach(function (u) { byUnit[u.unitId] = u; });
  var topicWords = String(adventure.topic || "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
  var rows = [];
  (adventure.activities || []).forEach(function (activity) {
    if (["teach", "recap", "apply"].indexOf(activity.slotId) === -1) return;
    (activity.beats || []).forEach(function (beat) {
      var text = clean(beat.pupil && beat.pupil.text, 400);
      if (!text) return;
      var cited = (lineage.units || []).filter(function (l) { return (l.beats || []).indexOf(beat.id) !== -1; }).map(function (l) { return byUnit[l.unitId]; }).filter(Boolean);
      if (!cited.length) { rows.push({ beatId: beat.id, slotId: activity.slotId, text: text, unitIds: [], ok: activity.slotId !== "teach" || beat.move === "hook", note: "cites no ready unit (story or framing line)" }); return; }
      var sourceText = cited.map(function (u) { return [u.passageText, u.explanationQuote, u.featureQuote, u.feature].join(" "); }).join(" ").toLowerCase();
      var sourceStems = {};
      sourceText.split(/[^a-z]+/).forEach(function (w) { if (w.length >= 3) sourceStems[stemWord(w)] = 1; });
      var words = text.toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length >= 4 && !SUPPORT_STOP[w] && topicWords.indexOf(w) === -1 && topicWords.indexOf(w + "s") === -1; });
      var missing = words.filter(function (w) { return !sourceStems[stemWord(w)]; });
      var meaning = cited.map(function (u) { var m = Brain.meaningCheck(text, u); return { unitId: u.unitId, ok: !!m.ok, kept: m.kept || [], missing: m.missing || [], lostDirection: m.lostDirection || [], vague: m.vague || [] }; });
      var meaningOk = meaning.some(function (m) { return m.ok; }) || activity.slotId === "apply";
      var ok = missing.length <= 2 && (beat.move !== "explain" && activity.slotId !== "recap" ? true : meaningOk);
      rows.push({ beatId: beat.id, slotId: activity.slotId, move: beat.move || "", text: text, unitIds: cited.map(function (u) { return u.unitId; }), sourceRefs: [].concat.apply([], cited.map(function (u) { return u.sourceRefs; })), sourceQuotes: cited.map(function (u) { return u.explanationQuote; }), wordsNotInSource: missing, meaning: meaning, ok: ok });
    });
  });
  return { label: LABEL, method: "code: each teach/recap/apply beat -> units it cites (ID lineage) -> those units' verbatim passages; content words not in the passages (<= 2 allowed: story words); explain and recap beats must keep the source's result clause (Brain.meaningCheck)", rows: rows, problems: rows.filter(function (r) { return !r.ok; }).length };
}

// Check 6 (code): the research teaching rules from lesson-brain.js run again on the final lesson.
function checkResearchRules(adventure, ctx) {
  if (!ctx) return { label: LABEL, skipped: "not research mode", rows: [], problems: 0 };
  var rows = Brain.researchRuleIssues(adventure.activities || [], ctx).map(function (r) { return { slotId: r.slotId || "", rule: r.rule || r.code || "", issue: clean(r.text || r.issue || r.message || JSON.stringify(r), 400) }; });
  var minutes = (adventure.activities || []).map(function (a) { return { slotId: a.slotId, minutes: Number(a.minutes) || 0 }; });
  var total = minutes.reduce(function (s, m) { return s + m.minutes; }, 0);
  var target = Number(adventure.targetMinutes || (ctx && ctx.requestedMinutes) || 15);
  if (total !== target) rows.push({ slotId: "", rule: "timing", issue: "stage minutes total " + total + ", not " + target });
  return { label: LABEL, method: "code: Brain.researchRuleIssues (meaning kept, year-band vocabulary, teleology, answers taught, distractors not partly true per evidence, APPLY choose task) + stage minutes total", timings: { minutes: minutes, total: total, target: target }, rows: rows, problems: rows.length };
}

function applyOf(adventure) {
  var activity = (adventure.activities || []).filter(function (a) { return a.slotId === "apply"; })[0];
  var step = activity && activity.scene && activity.scene.interaction;
  if (!step || step.type !== "choose") return null;
  return { instruction: step.instruction || "", newCase: step.newCase || null, choices: step.choices || [], unitId: step.unitId || "", successCondition: step.successCondition || "", mode: "class screen (teacher or pupil taps a choice on the shared screen; pupil devices show 'Look at the class screen' during this stage)" };
}

// ---- Render ----

function renderHtml(lesson) {
  var a = lesson.adventure;
  var assetBySlot = {};
  var assetById = {};
  (lesson.images || []).forEach(function (img) { if (img.status === "ready") { assetBySlot[img.slotId || img.id] = img; assetById[img.id] = img; } });
  var perBeat = (a.activities || []).some(function (act) { return (act.beats || []).some(function (b) { return b.visualAssetId; }); });
  var checks = lesson.checks || {};
  function flagsFor(list, id) { var r = ((list && list.rows) || []).filter(function (x) { return x.id === id; })[0]; return r; }
  var parts = [];
  parts.push("<!doctype html><html lang=\"en-GB\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + esc(a.title || "Lesson") + " (provisional)</title>");
  parts.push("<style>body{font:16px/1.5 system-ui,sans-serif;max-width:980px;margin:24px auto;padding:0 16px;color:#1d1d1f}h1{margin-bottom:4px}.banner{background:#fff4d6;border:1px solid #e0b400;padding:10px 14px;border-radius:8px}.stage{border:1px solid #ddd;border-radius:10px;padding:14px;margin:18px 0}.stage img{width:100%;border-radius:8px}.move{color:#666;font-size:12px;text-transform:uppercase;margin-right:6px}.q{background:#f6f8fa;padding:10px;border-radius:8px;margin:8px 0}.correct{font-weight:700;color:#0a7a2f}.flag{color:#b00020;font-size:13px}.ok{color:#0a7a2f;font-size:13px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border:1px solid #ddd;padding:6px;vertical-align:top}blockquote{margin:4px 0;padding-left:10px;border-left:3px solid #ccc;color:#444}.tag{display:inline-block;background:#141b4d;color:#fff;border-radius:999px;padding:2px 10px;font-size:13px;margin:6px 0}.choose button{font:inherit;padding:8px 14px;margin:4px;border-radius:10px;border:2px solid #141b4d;background:#fff;cursor:pointer}.choose .feedback{font-weight:700}</style></head><body>");
  parts.push("<h1>" + esc(a.title || "") + "</h1><p>" + esc(a.yearGroup || "") + " · " + esc(a.subject || "") + " · " + esc(a.topic || "") + " · " + esc(a.targetMinutes || a.estimateMinutes || "") + " min</p>");
  parts.push("<p class=\"banner\"><strong>Provisional. Not classroom-ready. Not human-reviewed.</strong> Generated by the production lesson boot in research mode. Source support is \"quote-verified + automated entailment check\". All four checks below are automated and provisional.</p>");
  parts.push("<h2>Objective</h2><p>" + esc(lesson.objective) + "</p>");
  parts.push("<h2>Teaching pairs and sources</h2><table><tr><th>Feature</th><th>Feature claim and quote</th><th>Explanation and quote</th></tr>");
  (lesson.pairs || []).forEach(function (p) {
    function cell(s) { return esc(s.text) + "<blockquote>" + esc(s.quote) + "</blockquote><a href=\"" + esc(s.url) + "\">" + esc(s.url) + "</a> <span class=\"ok\">" + esc(s.entailment) + "</span>"; }
    parts.push("<tr><td>" + esc(p.feature) + "</td><td>" + cell(p.featureClaim) + "</td><td>" + cell(p.explanation) + "</td></tr>");
  });
  parts.push("</table>");
  if ((lesson.pairs || []).some(function (p) { return p.causalLink; })) {
    parts.push("<h2>Verbatim source passages and causal-link results</h2>");
    (lesson.pairs || []).forEach(function (p) {
      var ps = [].concat(p.featureClaim.passages || [], p.explanation.passages || []).filter(function (x, i, all) { return all.map(function (y) { return y.id; }).indexOf(x.id) === i; });
      parts.push("<h3>" + esc(p.feature) + "</h3>" + ps.map(function (x) { return "<blockquote><strong>" + esc(x.id) + "</strong> (" + esc(x.tier || "") + ") <a href=\"" + esc(x.url) + "\">" + esc(x.url) + "</a><br>" + esc(x.text) + "</blockquote>"; }).join("") + "<p class=\"" + (p.causalLink.result === "pass" ? "ok" : "flag") + "\">Causal link: " + esc(p.causalLink.result) + (p.causalLink.linkQuote ? " — \"" + esc(p.causalLink.linkQuote) + "\"" : "") + (p.causalLink.samePassage ? " (feature and explanation in the same passage)" : " (different passages)") + "</p>");
    });
  }
  if (checks.rules && checks.rules.timings) parts.push("<h2>Timing</h2><p>" + esc(checks.rules.timings.minutes.map(function (m) { return m.slotId + " " + m.minutes; }).join(" · ")) + " = <strong>" + esc(checks.rules.timings.total) + "</strong> of " + esc(checks.rules.timings.target) + " minutes</p>");
  (a.activities || []).forEach(function (activity) {
    var slot = activity.slotId || "";
    parts.push("<section class=\"stage\"><h2>" + esc(activity.title || slot) + " <small>(" + esc(slot) + ", " + esc(activity.minutes) + " min)</small></h2>");
    function showImage(img) {
      var vis = flagsFor(checks.images, img.id);
      parts.push((img.frameLabel ? "<p class=\"tag\">" + esc(img.frameLabel) + "</p>" : "") + "<img src=\"" + esc(img.publicUrl) + "\" alt=\"" + esc(img.frameLabel || ("Generated picture for the " + slot + " moment")) + "\">");
      if (vis) parts.push("<p class=\"" + (vis.ok ? "ok" : "flag") + "\">Check 4 (vision, provisional): " + esc(vis.ok ? "no flags" : vis.flags.join("; ")) + (vis.whatIsShown ? " — " + esc(vis.whatIsShown) : "") + (vis.cannotShow ? " Cannot show: " + esc(vis.cannotShow) : "") + "</p>");
    }
    var shownId = "";
    var img = perBeat ? assetById[(activity.scene && activity.scene.visualAssetId) || ""] : assetBySlot[slot];
    if (img && !(perBeat && slot === "teach")) { showImage(img); shownId = img.id; }
    (activity.beats || []).forEach(function (beat) {
      if (perBeat && beat.visualAssetId && beat.visualAssetId !== shownId && assetById[beat.visualAssetId]) { showImage(assetById[beat.visualAssetId]); shownId = beat.visualAssetId; }
      var support = ((checks.support && checks.support.rows) || []).filter(function (r) { return r.beatId === beat.id; })[0];
      parts.push("<p><span class=\"move\">" + esc(beat.move) + "</span>" + esc(beat.pupil && beat.pupil.text) + (beat.pupil && beat.pupil.cue ? " <em>(" + esc(beat.pupil.cue) + ")</em>" : "") + (support && !support.ok ? " <span class=\"flag\">[check 1: " + esc(support.unresolved.length ? "unresolved ref" : "no supported claim") + "]</span>" : "") + "</p>");
    });
    if (!(activity.beats || []).length) ((activity.config && activity.config.lines) || []).forEach(function (line) { parts.push("<p>" + esc(line) + "</p>"); });
    var choose = activity.scene && activity.scene.interaction && activity.scene.interaction.type === "choose" ? activity.scene.interaction : null;
    if (choose) {
      // Patch 6: the APPLY choice works here too: answer-dependent feedback, solved when the right choice is picked.
      parts.push("<div class=\"choose\" data-choose><p><strong>New example:</strong> " + esc(choose.newCase && choose.newCase.text) + " <small>(" + esc(choose.newCase && choose.newCase.kind) + ")</small></p><p><strong>" + esc(choose.instruction) + "</strong></p>" + (choose.choices || []).map(function (c, i) { return "<button type=\"button\" data-pick=\"" + i + "\" data-correct=\"" + (c.correct ? 1 : 0) + "\" data-feedback=\"" + esc(c.feedback) + "\">" + esc(c.text) + "</button>"; }).join(" ") + "<p class=\"feedback\" aria-live=\"polite\"></p></div>");
    }
    if (activity.applyInstruction) parts.push("<p><strong>Task:</strong> " + esc(activity.applyInstruction) + (activity.successCondition ? " <em>Done when: " + esc(activity.successCondition) + "</em>" : "") + "</p>");
    (lesson.questions || []).filter(function (q) { return q.slotId === slot; }).forEach(function (q) {
      var qc = ((checks.questions && checks.questions.rows) || []).filter(function (r) { return r.id === q.id; })[0];
      parts.push("<div class=\"q\"><strong>" + esc(q.prompt) + "</strong><ul>" + q.choices.map(function (c) { return "<li" + (c === q.correct ? " class=\"correct\"" : "") + ">" + esc(c) + (c === q.correct ? " ✓" : "") + "</li>"; }).join("") + "</ul><small>" + esc(q.explain) + "</small>" + (qc ? "<p class=\"" + (qc.ok ? "ok" : "flag") + "\">Check 3 (provisional): " + esc(qc.ok ? "one defensible, supported answer; distractors clearly wrong" : [qc.codeFlags.join("; "), "defensible " + qc.defensible, "supported " + qc.supported, qc.problem].filter(Boolean).join(" · ")) + "</p>" : "") + "</div>");
    });
    parts.push("</section>");
  });
  if (lesson.lineage && lesson.lineage.units && lesson.lineage.units.length) {
    parts.push("<h2>ID lineage: pack unit → plan → beats → questions</h2><p>Followed by id in code (" + esc(lesson.lineage.label || "automated") + "). Each unit is a gate-ready feature-and-explanation pair.</p><table><tr><th>Unit</th><th>Feature claim</th><th>Explanation claim</th><th>Plan points</th><th>Strand</th><th>Teaching beats (states the job)</th><th>All beats</th><th>Questions</th><th>Result</th></tr>");
    lesson.lineage.units.forEach(function (u) {
      parts.push("<tr><td>" + esc(u.unitId) + " " + esc(u.feature) + "</td><td>" + esc(u.elementClaimId) + "</td><td>" + esc(u.explanationClaimId) + "</td><td>" + esc((u.planPoints || []).join(", ")) + "</td><td>" + esc(u.strand) + "</td><td>" + esc((u.explainBeats || []).join(", ")) + "</td><td>" + esc((u.beats || []).join(", ")) + "</td><td>" + esc((u.questions || []).join(", ")) + "</td><td class=\"" + (u.ok ? "ok" : "flag") + "\">" + esc(u.ok ? "ok" : (u.problems || []).join("; ")) + "</td></tr>");
    });
    parts.push("</table>");
  }
  if (lesson.warnings && lesson.warnings.length) {
    parts.push("<h2>Remaining warnings</h2><ul>" + lesson.warnings.map(function (w) { return "<li class=\"flag\">" + esc(w) + "</li>"; }).join("") + "</ul>");
  }
  parts.push("<h2>Check summary (all provisional)</h2><ul>");
  ["support", "sentences", "rules", "age", "questions", "images"].forEach(function (k) { var c = checks[k]; if (c) parts.push("<li>" + esc(k) + ": " + esc(c.problems) + " item(s) flagged of " + esc((c.rows || []).length) + " — " + esc(c.method || "") + "</li>"); });
  parts.push("</ul><script>document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-choose] button');if(!b)return;var box=b.closest('[data-choose]');var ok=b.getAttribute('data-correct')==='1';box.querySelector('.feedback').textContent=(ok?'Yes. ':'Not quite. ')+b.getAttribute('data-feedback')+(ok?' Solved.':' Try another choice.');box.querySelector('.feedback').className='feedback '+(ok?'ok':'flag');if(ok)box.setAttribute('data-solved','1');});</script>");
  parts.push("<script type=\"application/json\" id=\"lesson-json\">" + JSON.stringify(lesson).replace(/</g, "\\u003c") + "</script></body></html>");
  return parts.join("\n");
}

// ---- Orchestration ----

function runFinish(opts) {
  var adventure = JSON.parse(JSON.stringify(opts.adventure));
  var outDir = opts.outDir;
  var key = opts.apiKey;
  var fetchFn = opts.fetch;
  var pack = usedPack(opts.logs);
  // Patch 6: research mode (the trace carries the research record) rebuilds the boot's context
  // so the research checks, teaching visuals and pair passages can run. Otherwise unchanged.
  pack.final = finalPackRow(opts.trace, pack);
  var ctx = opts.trace && opts.trace.research ? ruleContext(adventure, opts.trace, pack) : null;
  var units = ctx ? visualUnits(adventure, ctx) : [];
  var lesson = {
    label: "provisional; quote-verified + automated entailment check; not human-verified; not classroom-ready",
    objective: clean(adventure.objectiveRule && (adventure.objectives || []).length ? adventure.objectives.join(" ") : ((adventure.lessonPlan && adventure.lessonPlan.learningObjective) || (adventure.objectives || [])[0]), 600),
    pairs: teachingPairs(pack, ctx ? ctx.researchEvidence : null),
    questions: questionsOf(adventure),
    images: [],
    checks: {},
    adventure: adventure
  };
  // Patch 8: a lesson continued from a saved pack (--reuse-pack) says so.
  if (opts.trace && opts.trace.packReplay) {
    lesson.label += "; " + opts.trace.packReplay.label + " (re-checked in code)";
    lesson.packReplay = opts.trace.packReplay;
  }
  if (ctx) {
    lesson.apply = applyOf(adventure);
    lesson.lineage = lineageOf(adventure, ctx);
    lesson.units = units.map(function (u) { return { unitId: u.unitId, feature: u.feature, explanation: u.explanation, explanationQuote: u.explanationQuote, featureQuote: u.featureQuote, resultClause: u.resultClause, keyTerms: u.keyTerms, sourceRefs: u.sourceRefs, beatIds: u.beatIds }; });
    lesson.discoverySources = (ctx.researchEvidence.discoverySources || []).slice(0, 12);
  }
  fs.mkdirSync(path.join(outDir, "lesson"), { recursive: true });
  lesson.checks.support = checkSupport(adventure, pack, opts.trace);
  if (ctx) {
    lesson.checks.sentences = checkSentenceSupport(adventure, ctx, units);
    lesson.checks.rules = checkResearchRules(adventure, ctx);
  }
  var plan = ctx && units.length && opts.teachingVisuals !== false ? teachingPlan(adventure, units, opts.imageCount || 5) : null;
  return generateImages(fetchFn, key, adventure, outDir, opts.imageCount || 4, !!opts.reuseImages, plan).then(function (images) {
    lesson.images = images;
    // Patch 7: image-rule limitations (for example a single-animal story picture) are recorded.
    lesson.imageLimitations = images.filter(function (i) { return i.limitation; }).map(function (i) { return { id: i.id, limitation: i.limitation }; });
    adventure.visualAssets = images.filter(function (i) { return i.status === "ready"; }).map(function (i) {
      var asset = { id: i.id, type: i.type, status: "ready", fallback: false, publicUrl: i.publicUrl, usedByScenes: i.usedByScenes, uiSafeArea: i.uiSafeArea, brief: i.brief, model: i.model, dimensions: i.dimensions };
      if (i.frameLabel) asset.frameLabel = i.frameLabel;
      return asset;
    });
    if (plan) stampTeachingVisuals(adventure, images);
    else Visuals.stampActivities(adventure.activities || [], adventure.visualAssets);
    return checkAge(fetchFn, key, adventure, adventure.yearGroup || "Year 3").catch(function (e) { return { label: LABEL, failed: String(e.message || e), rows: [], problems: 1 }; });
  }).then(function (age) {
    lesson.checks.age = age;
    return checkQuestions(fetchFn, key, adventure, pack, opts.trace, !!ctx).catch(function (e) { return { label: LABEL, failed: String(e.message || e), rows: [], problems: 1 }; });
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

module.exports = { runFinish: runFinish, lastQuestionAudit: lastQuestionAudit, renderHtml: renderHtml, checkSupport: checkSupport, checkSentenceSupport: checkSentenceSupport, checkResearchRules: checkResearchRules, ruleContext: ruleContext, finalPackRow: finalPackRow, visualUnits: visualUnits, unitBeatIds: unitBeatIds, teachingPlan: teachingPlan, stampTeachingVisuals: stampTeachingVisuals, teachingVisionRow: teachingVisionRow, applyOf: applyOf, questionsOf: questionsOf, pupilTextItems: pupilTextItems, teachingPairs: teachingPairs, usedPack: usedPack, chooseAssets: chooseAssets, imagePromptFor: imagePromptFor, IMAGE_MODEL: IMAGE_MODEL, IMAGE_SIZE: IMAGE_SIZE, IMAGE_QUALITY: IMAGE_QUALITY };
