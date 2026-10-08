"use strict";

// Research mode: one source repair before the readiness gate, and the experimental research
// model for the knowledge, entailment and repair calls. The repaired pack goes through the
// same quote check, entailment and readiness gate. There is never a second repair.

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var localBoot = fs.readFileSync(path.join(__dirname, "../js/learn-generate-boot.js"), "utf8");
var localBrain = fs.readFileSync(path.join(__dirname, "../js/lesson-brain.js"), "utf8");
var localResearch = fs.readFileSync(path.join(__dirname, "../js/source-research.js"), "utf8");

function jsonResponse(body, status, extra) {
  extra = extra || {};
  return { ok: status >= 200 && status < 300, status: status, url: extra.url, headers: { get: function () { return extra.type || "application/json"; } },
    json: function () { return Promise.resolve(body); }, text: function () { return Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)); } };
}
function chat(obj) { return Promise.resolve(jsonResponse({ choices: [{ message: { content: JSON.stringify(obj) } }] }, 200)); }

var article = [
  "Meat-eating dinosaurs such as Tyrannosaurus had sharp, curved teeth with jagged edges. The jagged edges worked like a saw, so the teeth could slice through meat.",
  "", "== Necks ==",
  "Many sauropods had long necks. A long neck let a sauropod reach leaves high in the trees that other animals could not reach, so it could feed without moving its huge body very much.",
  "", "== Armour ==",
  "Ankylosaurus had thick bony plates covering its back. These bony plates acted like armour, which means predators found it very hard to bite through to the animal's body.",
  "", "== Feathers ==",
  "Most of the smaller dinosaurs had feathers, and were probably warm-blooded."
].join("\n");

// Source tiers (patch 6): Wikipedia is discovery only, so the stubbed article cites a museum
// page and the research step follows it. The museum page carries the same text as HTML.
var NHM_FOLLOW_URL = "https://www.nhm.ac.uk/discover/dinosaur-features.html";
function articleHtml(text) {
  return "<html><head><title>Dinosaur features | Natural History Museum</title></head><body><main>" + String(text).split("\n").map(function (line) {
    var h = /^==\s*(.+?)\s*==$/.exec(line.trim());
    if (h) return "<h2>" + h[1] + "</h2>";
    return line.trim() ? "<p>" + line + "</p>" : "";
  }).join("") + "</main></body></html>";
}

var goal = "Pupils will understand how the teeth, necks and armour of dinosaurs helped them survive.";

var state = { research: "wikipedia", repairGood: true, firstOnePair: false, stages: [], logs: [], calls: [] };
var originalLog = console.log;
var originalFetch = global.fetch;
console.log = function (line) {
  try { var parsed = JSON.parse(line); if (parsed && parsed.event === "learn-generate") { state.stages.push(parsed.stage || ""); state.logs.push(parsed); } } catch (e) {}
};
global.Deno = { env: { get: function (name) {
  if (name === "OPENAI_API_KEY") return "test-key";
  if (name === "SUPABASE_URL") return "https://example.supabase.co";
  if (name === "SUPABASE_ANON_KEY") return "test-anon";
  if (name === "LESSON_MODEL") return "gpt-4o-mini";
  if (name === "LESSON_RESEARCH") return state.research;
  return "";
} } };

function claimFrom(sources, text, depth, quote) {
  var hit = sources.filter(function (s) { return s.text.indexOf(quote) !== -1; })[0];
  return { text: text, depth: depth, kind: "fact", confidence: "high", provenance: "retrieved", factuallyVerified: false, sourceRef: [hit ? hit.id : sources[0].id], quote: quote, ageFit: { from: depth === "concrete" ? 1 : 3, to: 6 } };
}
function goodPack(sources) {
  var c = [
    claimFrom(sources, "Meat-eating dinosaurs like Tyrannosaurus had sharp curved teeth with jagged edges.", "concrete", "Meat-eating dinosaurs such as Tyrannosaurus had sharp, curved teeth with jagged edges."),
    claimFrom(sources, "The jagged edges on sharp curved teeth worked like a saw, so they could slice through meat.", "mechanism", "The jagged edges worked like a saw, so the teeth could slice through meat."),
    claimFrom(sources, "Many sauropod dinosaurs had very long necks on their huge bodies.", "concrete", "Many sauropods had long necks. A long neck let a sauropod"),
    claimFrom(sources, "A very long neck let a sauropod reach high leaves, so it could feed without moving much.", "mechanism", "A long neck let a sauropod reach leaves high in the trees"),
    claimFrom(sources, "Ankylosaurus had thick bony plates covering the whole of its back.", "concrete", "Ankylosaurus had thick bony plates covering its back."),
    claimFrom(sources, "The thick bony plates acted like armour, which means predators found it hard to bite through.", "mechanism", "These bony plates acted like armour, which means predators found it very hard to bite through")
  ];
  return { status: "usable", claims: c, mechanisms: [
    { text: c[1].text, feature: "jagged edges", sourceRef: c[1].sourceRef, quote: c[1].quote },
    { text: c[3].text, feature: "long neck", sourceRef: c[3].sourceRef, quote: c[3].quote },
    { text: c[5].text, feature: "bony plates", sourceRef: c[5].sourceRef, quote: c[5].quote }
  ] };
}
function badPack(sources) {
  var c = [
    claimFrom(sources, "Meat-eating dinosaurs like Tyrannosaurus had sharp curved teeth with jagged edges.", "concrete", "Meat-eating dinosaurs such as Tyrannosaurus had sharp, curved teeth with jagged edges."),
    // "helped" on its own: the readiness contract does not accept it as a mechanism.
    claimFrom(sources, "Sharp curved teeth with jagged edges helped them eat meat.", "mechanism", "The jagged edges worked like a saw, so the teeth could slice through meat."),
    // Reworded quote.
    { text: "Ankylosaurus had bony plates that helped protect it from predators.", depth: "mechanism", kind: "fact", confidence: "high", provenance: "retrieved", factuallyVerified: false, sourceRef: [sources[0].id], quote: "Its bony plates protected it from hungry predators.", ageFit: { from: 3, to: 6 } },
    // Side-by-side facts presented as a link (the live lenient pass).
    claimFrom(sources, "Some dinosaurs had feathers, which may have helped them stay warm.", "concrete", "Most of the smaller dinosaurs had feathers, and were probably warm-blooded.")
  ];
  return { status: "usable", claims: c, mechanisms: [{ text: c[1].text, feature: "jagged edges", sourceRef: c[1].sourceRef, quote: c[1].quote }] };
}

global.fetch = function (url, init) {
  var href = String(url);
  if (href.indexOf("lesson-brain.js?v=53") !== -1) return Promise.resolve(jsonResponse(localBrain, 200));
  if (href.indexOf("source-research.js?v=1") !== -1) return Promise.resolve(jsonResponse(localResearch, 200));
  if (href.indexOf("/auth/v1/user") !== -1) return Promise.resolve(jsonResponse({ id: "teacher-1" }, 200));
  if (href.indexOf("/rest/v1/organisation_members") !== -1) return Promise.resolve(jsonResponse([{ role: "teacher", status: "active" }], 200));
  if (href.indexOf("simple.wikipedia.org/w/api.php") !== -1 && href.indexOf("list=search") !== -1) return Promise.resolve(jsonResponse({ query: { search: [{ title: "Dinosaur" }], pages: [{ title: "Dinosaur", description: "group of reptiles" }] } }, 200));
  if (href.indexOf("en.wikipedia.org/w/api.php") !== -1) return Promise.resolve(jsonResponse({ query: { search: [] } }, 200));
  if (href.indexOf(NHM_FOLLOW_URL) === 0) return Promise.resolve(jsonResponse(articleHtml(article), 200, { url: href, type: "text/html; charset=utf-8" }));
  if (href.indexOf("simple.wikipedia.org/w/api.php") !== -1 && href.indexOf("prop=extracts") !== -1) return Promise.resolve(jsonResponse({ query: { pages: [{ title: "Dinosaur", extract: article, extlinks: [{ url: NHM_FOLLOW_URL }] }] } }, 200));
  if (href.indexOf("api.openai.com/v1/chat/completions") !== -1) {
    var body = JSON.parse(init.body);
    var system = body.messages[0].content;
    var user = body.messages[1].content;
    var kind = system.indexOf("You interpret one primary teacher's request.") !== -1 ? "intent"
      : system.indexOf("This is the single repair of a knowledge pack") !== -1 ? "repair"
      : system.indexOf("You select and adapt subject knowledge") === 0 ? "pack"
      : system.indexOf("You check whether a source extract supports") === 0 ? "entail" : "other";
    state.calls.push({ kind: kind, body: body });
    if (kind === "intent") return chat({ learningGoal: goal, requiredEvidence: "Pupils can explain how a dinosaur's features helped it survive.", focusConcepts: ["dinosaur teeth", "long necks", "armour"], priorKnowledge: [], exclusions: [], preferences: [], subject: "Science", subjectConfidence: "high" });
    if (kind === "pack") {
      var sources = JSON.parse(user).sources;
      if (!state.firstOnePair) return chat(badPack(sources));
      var one = goodPack(sources);
      return chat({ status: "usable", claims: one.claims.slice(0, 2), mechanisms: one.mechanisms.slice(0, 1) });
    }
    if (kind === "repair") {
      var rs = JSON.parse(user).sources;
      if (state.repairEmpty) return chat({ status: "usable", claims: goodPack(rs).claims.slice(0, 1), mechanisms: [] });
      return chat(state.repairGood ? goodPack(rs) : badPack(rs));
    }
    if (kind === "entail") return chat({ results: JSON.parse(user).items.map(function (item) { return { claimId: item.claimId, verdict: "supported", missing: "", linkQuote: item.quote, wording: item.wordsNotInSource || [] }; }) });
    return chat({});
  }
  return Promise.reject(new Error("unexpected fetch " + href));
};

function run(id) {
  state.stages = []; state.logs = []; state.calls = [];
  return global.handleGenerate(new Request("https://wondii.co.uk/api/learn/generate", {
    method: "POST", headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: id, context: { organisationId: "org-1", lessonText: "Teach Year 3 about dinosaurs", yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15 } })
  })).then(function (res) { return res.json(); });
}
function calls(kind) { return state.calls.filter(function (c) { return c.kind === kind; }); }

Promise.resolve().then(function () {
  return (0, eval)("(async function(){\n" + localBoot + "\n})()");
}).then(function () {
  return run("repair-good");
}).then(function () {
  var s = state.stages;
  assert.strictEqual(calls("repair").length, 1);
  assert.ok(s.indexOf("PACK_SOURCE_REPAIR") > s.indexOf("SOURCE_ENTAILMENT"), s.join(","));
  assert.ok(s.indexOf("PACK_SOURCE_REPAIR_RESULT") < s.indexOf("KNOWLEDGE_PACK"), s.join(","));
  assert.ok(s.indexOf("KNOWLEDGE_PACK") < s.indexOf("PLAN_REQUEST"), "a repaired pack that passes the same gate goes on to planning: " + s.join(","));
  assert.strictEqual(s.indexOf("PACK_INCOMPLETE"), -1);
  // The repaired pack is entailment-checked again.
  assert.strictEqual(state.logs.filter(function (l) { return l.stage === "SOURCE_ENTAILMENT"; }).map(function (l) { return l.pass; }).join(","), "first,repair");
  // Exact rejections were sent back.
  var feedback = JSON.parse(calls("repair")[0].body.messages[1].content).rejections;
  var problems = feedback.map(function (r) { return r.problem; });
  assert.ok(problems.indexOf("REWORDED_QUOTE") !== -1 || problems.indexOf("WRONG_PASSAGE") !== -1, problems.join(","));
  assert.ok(problems.indexOf("ENTAILMENT_UNSUPPORTED") !== -1, problems.join(","));
  assert.ok(feedback.some(function (r) { return r.problem === "ENTAILMENT_UNSUPPORTED" && /LINK_NOT_IN_QUOTE/.test(r.fix); }));
  // Tense parity: "helped them eat meat" states a job, so that pair is no longer sent back as
  // not ready. (Before the parity commit it was rejected for the past tense alone.)
  assert.ok(!feedback.some(function (r) { return r.problem === "PAIR_NOT_READY" && /helped them eat meat/.test(r.item); }), JSON.stringify(feedback));
  var reworded = feedback.filter(function (r) { return r.problem === "REWORDED_QUOTE"; })[0];
  if (reworded) assert.ok(/closest sentence/.test(reworded.fix) || /No cited passage/.test(reworded.fix));
  // Experimental research model: knowledge, entailment and repair use gpt-6-luna; other calls keep LESSON_MODEL.
  ["pack", "entail", "repair"].forEach(function (kind) {
    calls(kind).forEach(function (c) {
      assert.strictEqual(c.body.model, "gpt-6-luna", kind);
      assert.strictEqual(c.body.reasoning_effort, "low");
      assert.strictEqual(c.body.max_completion_tokens, 16000);
      assert.strictEqual("temperature" in c.body, false);
    });
  });
  assert.strictEqual(calls("intent")[0].body.model, "gpt-4o-mini");
  assert.ok(calls("other").length > 0 && calls("other").every(function (c) { return c.body.model === "gpt-4o-mini" && "temperature" in c.body; }));
  state.repairGood = false;
  return run("repair-bad");
}).then(function (body) {
  assert.strictEqual(calls("repair").length, 1, "at most one repair");
  assert.strictEqual(body.stage, "PACK_INCOMPLETE");
  assert.strictEqual(state.stages.indexOf("PLAN_REQUEST"), -1);
  // A repair that loses ready pairs is not used: the first pack stands (both were gated alike).
  state.firstOnePair = true;
  state.repairEmpty = true;
  return run("repair-worse");
}).then(function (body) {
  assert.strictEqual(calls("repair").length, 1);
  var result = state.logs.filter(function (l) { return l.stage === "PACK_SOURCE_REPAIR_RESULT"; })[0];
  assert.strictEqual(result.keptFirst, true);
  assert.strictEqual(result.readyPairs, 0);
  var used = state.logs.filter(function (l) { return l.stage === "KNOWLEDGE_PACK"; })[0];
  assert.strictEqual(used.packReadiness.distinctReady, 1);
  assert.strictEqual(body.stage, "PACK_INCOMPLETE", "the gate is unchanged: one pair of three is still incomplete");
  // The repair brief tells the model which pairs were ready and to copy passing claims unchanged.
  var repairUser = JSON.parse(calls("repair")[0].body.messages[1].content);
  assert.strictEqual(repairUser.readiness.readyPairs.length, 1);
  assert.ok(/Copy every claim that passed/.test(calls("repair")[0].body.messages[0].content));
  // The knowledge brief lists the passage sentences that state a link.
  var packUser = JSON.parse(calls("pack")[0].body.messages[1].content);
  assert.ok(packUser.linkSentences.some(function (row) { return /so the teeth could slice through meat/.test(row.sentence); }), JSON.stringify(packUser.linkSentences));
  assert.ok(!packUser.linkSentences.some(function (row) { return /Most of the smaller dinosaurs had feathers/.test(row.sentence); }));
  state.firstOnePair = false;
  state.repairEmpty = false;
  state.research = "";
  return run("research-off");
}).then(function () {
  assert.strictEqual(calls("repair").length, 0);
  assert.strictEqual(state.stages.indexOf("PACK_SOURCE_REPAIR"), -1);
  console.log = originalLog;
  global.fetch = originalFetch;
  console.log("source-repair boot tests passed");
}).catch(function (error) {
  console.log = originalLog;
  global.fetch = originalFetch;
  console.error(error);
  process.exit(1);
});
