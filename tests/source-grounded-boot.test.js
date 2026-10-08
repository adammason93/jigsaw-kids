"use strict";

// The generate boot runs source research only when LESSON_RESEARCH is set. It loads the
// research module lazily, sends fetched passages to the knowledge step, runs one automated
// entailment pass, and blocks with NEEDS_SOURCE when research finds nothing.

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var localBoot = fs.readFileSync(path.join(__dirname, "../js/learn-generate-boot.js"), "utf8");
var localBrain = fs.readFileSync(path.join(__dirname, "../js/lesson-brain.js"), "utf8");
var localResearch = fs.readFileSync(path.join(__dirname, "../js/source-research.js"), "utf8");

function jsonResponse(body, status, extra) {
  extra = extra || {};
  return {
    ok: status >= 200 && status < 300, status: status, url: extra.url,
    headers: { get: function () { return extra.type || "application/json"; } },
    json: function () { return Promise.resolve(body); },
    text: function () { return Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)); }
  };
}
function chat(obj) { return Promise.resolve(jsonResponse({ choices: [{ message: { content: JSON.stringify(obj) } }] }, 200)); }

var article = [
  "Meat-eating dinosaurs such as Tyrannosaurus had sharp, curved teeth with jagged edges. The jagged edges worked like a saw, so the teeth could slice through meat.",
  "",
  "== Necks ==",
  "Many sauropods had long necks. A long neck let a sauropod reach leaves high in the trees that other animals could not reach, so it could feed without moving its huge body very much.",
  "",
  "== Armour ==",
  "Ankylosaurus had thick bony plates covering its back. These bony plates acted like armour, which means predators found it very hard to bite through to the animal's body."
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


var goal = "Pupils will explain how the teeth, necks and armour of dinosaurs helped them survive.";
var state = { research: "wikipedia", wikiHits: true, stages: [], logs: [], systems: [], fetched: [] };

var originalLog = console.log;
var originalFetch = global.fetch;
console.log = function (line) {
  try {
    var parsed = JSON.parse(line);
    if (parsed && parsed.event === "learn-generate") { state.stages.push(parsed.stage || parsed.category || ""); state.logs.push(parsed); }
  } catch (e) { /* not a generate log */ }
};
global.Deno = { env: { get: function (name) {
  if (name === "OPENAI_API_KEY") return "test-key";
  if (name === "SUPABASE_URL") return "https://example.supabase.co";
  if (name === "SUPABASE_ANON_KEY") return "test-anon";
  if (name === "LESSON_MODEL") return "gpt-4o-mini";
  if (name === "LESSON_RESEARCH") return state.research;
  return "";
} } };

function quoteClaim(sources, text, depth, quote) {
  var hit = sources.filter(function (s) { return s.text.indexOf(quote) !== -1; })[0];
  return { text: text, depth: depth, kind: "fact", confidence: "high", provenance: "retrieved", factuallyVerified: false, sourceRef: [hit ? hit.id : "S9-P09"], quote: quote, ageFit: { from: depth === "concrete" ? 1 : 3, to: 6 }, accepted: true };
}

global.fetch = function (url, init) {
  var href = String(url);
  state.fetched.push(href);
  if (href.indexOf("lesson-brain.js?v=53") !== -1) return Promise.resolve(jsonResponse(localBrain, 200));
  if (href.indexOf("source-research.js?v=1") !== -1) return Promise.resolve(jsonResponse(localResearch, 200));
  if (href.indexOf("/auth/v1/user") !== -1) return Promise.resolve(jsonResponse({ id: "teacher-1" }, 200));
  if (href.indexOf("/rest/v1/organisation_members") !== -1) return Promise.resolve(jsonResponse([{ role: "teacher", status: "active" }], 200));
  if (href.indexOf("simple.wikipedia.org/w/api.php") !== -1 && href.indexOf("list=search") !== -1) {
    return Promise.resolve(jsonResponse({ query: { search: state.wikiHits ? [{ title: "Dinosaur", snippet: "SNIPPET" }] : [] } }, 200));
  }
  if (href.indexOf("en.wikipedia.org/w/api.php") !== -1 && href.indexOf("list=search") !== -1) return Promise.resolve(jsonResponse({ query: { search: [] } }, 200));
  if (href.indexOf(NHM_FOLLOW_URL) === 0) return Promise.resolve(jsonResponse(articleHtml(article), 200, { url: href, type: "text/html; charset=utf-8" }));
  if (href.indexOf("simple.wikipedia.org/w/api.php") !== -1 && href.indexOf("prop=extracts") !== -1) {
    return Promise.resolve(jsonResponse({ query: { pages: [{ title: "Dinosaur", extract: article, extlinks: [{ url: NHM_FOLLOW_URL }] }] } }, 200));
  }
  if (href.indexOf("api.openai.com/v1/chat/completions") !== -1) {
    var body = JSON.parse(init.body);
    var system = body.messages[0].content;
    state.systems.push(system);
    if (system.indexOf("You interpret one primary teacher's request.") !== -1) {
      return chat({ learningGoal: goal, requiredEvidence: "Pupils explain how a body part helped a dinosaur.", focusConcepts: ["dinosaur teeth", "long necks", "armour"], priorKnowledge: [], exclusions: [], preferences: [], subject: "Science", subjectConfidence: "high" });
    }
    if (system.indexOf("You select and adapt subject knowledge") === 0) {
      var sources = JSON.parse(body.messages[1].content).sources;
      var c = [
        quoteClaim(sources, "Meat-eating dinosaurs like Tyrannosaurus had sharp curved teeth with jagged edges.", "concrete", "Meat-eating dinosaurs such as Tyrannosaurus had sharp, curved teeth with jagged edges."),
        quoteClaim(sources, "The jagged edges on sharp curved teeth worked like a saw, so they could slice through meat.", "mechanism", "The jagged edges worked like a saw, so the teeth could slice through meat."),
        quoteClaim(sources, "Many sauropod dinosaurs had very long necks on their huge bodies.", "concrete", "Many sauropods had long necks. A long neck let a sauropod"),
        quoteClaim(sources, "A very long neck let a sauropod reach high leaves, so it could feed without moving much.", "mechanism", "A long neck let a sauropod reach leaves high in the trees"),
        quoteClaim(sources, "Ankylosaurus had thick bony plates covering the whole of its back.", "concrete", "Ankylosaurus had thick bony plates covering its back."),
        quoteClaim(sources, "The thick bony plates acted like armour, which means predators found it hard to bite through.", "mechanism", "These bony plates acted like armour, which means predators found it very hard to bite through")
      ];
      return chat({ status: "usable", claims: c, mechanisms: [
        { text: c[1].text, feature: "jagged edges", sourceRef: c[1].sourceRef, quote: c[1].quote },
        { text: c[3].text, feature: "long neck", sourceRef: c[3].sourceRef, quote: c[3].quote },
        { text: c[5].text, feature: "bony plates", sourceRef: c[5].sourceRef, quote: c[5].quote }
      ] });
    }
    if (system.indexOf("You check whether a source extract supports") === 0) {
      var items = JSON.parse(body.messages[1].content).items;
      return chat({ results: items.map(function (item) { return { claimId: item.claimId, verdict: "supported", missing: "", linkQuote: item.quote, wording: item.wordsNotInSource || [] }; }) });
    }
    return chat({});
  }
  return Promise.reject(new Error("unexpected fetch " + href));
};

function run(attemptId) {
  state.stages = []; state.logs = []; state.systems = []; state.fetched = [];
  return global.handleGenerate(new Request("https://wondii.co.uk/api/learn/generate", {
    method: "POST",
    headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId: attemptId, context: { organisationId: "org-1", lessonText: "Teach Year 3 about dinosaurs", yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15 } })
  }));
}

Promise.resolve().then(function () {
  return (0, eval)("(async function(){\n" + localBoot + "\n})()");
}).then(function () {
  // The boot loads only the lesson brain at start; research is loaded on demand.
  assert.strictEqual(state.fetched.some(function (u) { return u.indexOf("source-research.js") !== -1; }), false);
  return run("research-on");
}).then(function () {
  var s = state.stages;
  assert.ok(s.indexOf("TEACHER_INTENT") !== -1 && s.indexOf("TEACHER_INTENT") < s.indexOf("RESEARCH"), s.join(","));
  assert.ok(s.indexOf("RESEARCH") < s.indexOf("SOURCE_ENTAILMENT"), s.join(","));
  assert.ok(s.indexOf("SOURCE_ENTAILMENT") < s.indexOf("KNOWLEDGE_PACK"), s.join(","));
  assert.ok(s.indexOf("KNOWLEDGE_PACK") < s.indexOf("PLAN_REQUEST"), s.join(","));
  var research = state.logs.filter(function (l) { return l.stage === "RESEARCH"; })[0];
  assert.strictEqual(research.sources.length, 1);
  assert.ok(research.passages >= 1);
  var entail = state.logs.filter(function (l) { return l.stage === "SOURCE_ENTAILMENT"; })[0];
  assert.strictEqual(entail.ran, true);
  assert.strictEqual(entail.counts.supported, 6);
  assert.strictEqual(entail.label, "quote-verified + automated entailment check");
  var packLog = state.logs.filter(function (l) { return l.stage === "KNOWLEDGE_PACK"; })[0];
  assert.strictEqual(JSON.stringify(packLog).indexOf("\"sourceMode\":\"retrieved\"") !== -1, true, JSON.stringify(packLog).slice(0, 400));
  // Later prompts never carry the raw fetched pages.
  var planSystemIndex = state.systems.findIndex(function (x) { return x.indexOf("You are planning one primary lesson") === 0; });
  assert.ok(planSystemIndex > 0);
  // No research when the env flag is off.
  state.research = "";
  return run("research-off");
}).then(function () {
  assert.strictEqual(state.stages.indexOf("RESEARCH"), -1);
  assert.strictEqual(state.systems.some(function (x) { return x.indexOf("You select and adapt subject knowledge") === 0; }), false);
  // Research that finds nothing blocks before the knowledge call.
  state.research = "wikipedia";
  state.wikiHits = false;
  return run("research-empty");
}).then(function (response) {
  return response.json().then(function (body) {
    assert.strictEqual(body.ok, false);
    assert.ok(/NEEDS_SOURCE/.test(JSON.stringify(body.issues)));
    assert.ok(state.stages.indexOf("RESEARCH") !== -1);
    assert.strictEqual(state.stages.indexOf("KNOWLEDGE_PACK"), -1);
    assert.strictEqual(state.systems.some(function (x) { return x.indexOf("You select and adapt subject knowledge") === 0; }), false);
    console.log = originalLog;
    global.fetch = originalFetch;
    console.log("source-grounded boot tests passed");
  });
}).catch(function (error) {
  console.log = originalLog;
  global.fetch = originalFetch;
  console.error(error);
  process.exit(1);
});
