"use strict";
// Offline stubs for the source-grounded flow: a stubbed allowlisted page, stubbed model
// replies for every boot step, and stubbed image/vision/check replies. Test fixtures only;
// nothing here is a lesson. Used by tests/source-grounded-finish.test.js and by
// preload.js (an offline dry run of scripts/source-grounded/generate.js).
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "../../..");
var brainSource = fs.readFileSync(path.join(root, "js/lesson-brain.js"), "utf8");
var researchSource = fs.readFileSync(path.join(root, "js/source-research.js"), "utf8");

function jsonResponse(body, status, extra) {
  extra = extra || {};
  return { ok: status >= 200 && status < 300, status: status, url: extra.url, headers: { get: function () { return extra.type || "application/json"; } },
    json: function () { return Promise.resolve(body); }, text: function () { return Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)); },
    clone: function () { return jsonResponse(body, status, extra); } };
}
function chat(obj, usage) { return Promise.resolve(jsonResponse({ choices: [{ message: { content: JSON.stringify(obj) } }], usage: usage || { prompt_tokens: 1000, completion_tokens: 300 } }, 200)); }

var article = [
  "Meat-eating dinosaurs such as Tyrannosaurus had sharp, curved teeth with jagged edges. The jagged edges worked like a saw, so the teeth could slice through meat.",
  "", "== Necks ==",
  "Many sauropods had long necks. A long neck let a sauropod reach leaves high in the trees that other animals could not reach, so it could feed without moving its huge body very much.",
  "", "== Armour ==",
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

var goal = "Pupils will understand how the teeth, necks and armour of dinosaurs helped them survive.";
var TEXT = {
  teethF: "Meat-eating dinosaurs like Tyrannosaurus had sharp curved teeth with jagged edges.",
  teethM: "The jagged edges on the sharp curved teeth of Tyrannosaurus worked like a saw, so they could slice through meat.",
  neckF: "Many sauropod dinosaurs had very long necks on their huge bodies.",
  neckM: "A very long neck let a sauropod reach high leaves so that it could feed without moving much.",
  armourF: "Ankylosaurus had thick bony plates covering the whole of its back.",
  armourM: "The thick bony plates of Ankylosaurus acted like armour, which means predators found it hard to bite through."
};
function claimFrom(sources, text, depth, quote) {
  var hit = sources.filter(function (s) { return s.text.indexOf(quote) !== -1; })[0];
  return { text: text, depth: depth, kind: depth === "mechanism" ? "mechanism" : "fact", confidence: "high", provenance: "retrieved", factuallyVerified: false, sourceRef: [hit ? hit.id : sources[0].id], quote: quote, ageFit: { from: depth === "concrete" ? 1 : 3, to: 6 } };
}
function pack(sources) {
  var c = [
    claimFrom(sources, TEXT.teethF, "concrete", "Meat-eating dinosaurs such as Tyrannosaurus had sharp, curved teeth with jagged edges."),
    claimFrom(sources, TEXT.teethM, "mechanism", "The jagged edges worked like a saw, so the teeth could slice through meat."),
    claimFrom(sources, TEXT.neckF, "concrete", "Many sauropods had long necks. A long neck let a sauropod"),
    claimFrom(sources, TEXT.neckM, "mechanism", "A long neck let a sauropod reach leaves high in the trees"),
    claimFrom(sources, TEXT.armourF, "concrete", "Ankylosaurus had thick bony plates covering its back."),
    claimFrom(sources, TEXT.armourM, "mechanism", "These bony plates acted like armour, which means predators found it very hard to bite through")
  ];
  return { status: "usable", claims: c, mechanisms: [
    { text: c[1].text, feature: "jagged edges", sourceRef: c[1].sourceRef, quote: c[1].quote },
    { text: c[3].text, feature: "long neck", sourceRef: c[3].sourceRef, quote: c[3].quote },
    { text: c[5].text, feature: "bony plates", sourceRef: c[5].sourceRef, quote: c[5].quote }
  ] };
}
function speak(beat, items) {
  var item = items[0];
  // A consolidating beat cites feature then explanation; it recaps the explanation (patch 7).
  var ref = beat.move === "consolidate" ? (beat.knowledgeRefs || []).slice(-1)[0] : (beat.knowledgeRefs || [])[0];
  items.forEach(function (entry) { if (entry.id === ref) item = entry; });
  var known = String(item.text || "").replace(/[.?!]$/, "");
  var lower = known.charAt(0).toLowerCase() + known.slice(1);
  var text = { notice: "Look at the scene and say what you can see.", predict: "Say what you think is happening before we find out.", name: item.text, explain: item.text,
    exemplify: "For example, you can see it when " + lower + ".", model: "First follow this step: " + lower + ", then check what changed.", compare: "Look at both sides and say what is different.",
    connect: "These two ideas belong together in this lesson.", practise: "Show a new case where " + lower + ".", apply: "Show a new case where " + lower + ".",
    retrieve: "Which sentence matches the idea you just learned?", reveal: "So, " + lower + ".", consolidate: "So, " + lower + "." }[beat.move] || item.text;
  return { id: beat.id, cue: "", text: text };
}

var calls = [];
var tinyJpeg = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

function openai(href, body) {
  if (href.indexOf("/v1/images/generations") !== -1) {
    calls.push({ kind: "image", body: body });
    return Promise.resolve(jsonResponse({ data: [{ b64_json: tinyJpeg }], usage: { input_tokens: 900, output_tokens: 158, input_tokens_details: { text_tokens: 900, image_tokens: 0 } } }, 200));
  }
  var system = typeof body.messages[0].content === "string" ? body.messages[0].content : "";
  var userRaw = body.messages[1].content;
  var user = typeof userRaw === "string" ? userRaw : "";
  if (system.indexOf("You interpret one primary teacher's request.") === 0) return chat({ learningGoal: goal, requiredEvidence: "Pupils explain how a body part helped a dinosaur.", focusConcepts: ["dinosaur teeth", "long necks", "armour"], priorKnowledge: [], exclusions: [], preferences: [], subject: "Science", subjectConfidence: "explicit", yearGroup: "Year 3" });
  if (system.indexOf("You select and adapt subject knowledge") === 0) return chat(pack(JSON.parse(user).sources));
  if (system.indexOf("You check whether a source extract supports") === 0) return chat({ results: JSON.parse(user).items.map(function (item) { return { claimId: item.claimId, verdict: "supported", missing: "", linkQuote: item.quote, wording: item.wordsNotInSource || [] }; }) });
  if (system.indexOf("Do not write pupil activities") !== -1) {
    var u = JSON.parse(user);
    var id = {};
    ((u.knowledgePack && u.knowledgePack.claims) || []).forEach(function (c) { id[c.text] = c.claimId; });
    calls.push({ kind: "plan" });
    return chat({ learningObjective: goal, subject: "Science", topic: "Dinosaurs", yearGroup: "Year 3",
      learningMap: [
        { id: "p1", knowledge: TEXT.teethF, role: "feature", importance: "core", dependsOn: [], explains: "", claimIds: [id[TEXT.teethF]] },
        { id: "p2", knowledge: TEXT.teethM, role: "mechanism", importance: "core", dependsOn: ["p1"], explains: "p1", claimIds: [id[TEXT.teethM]] },
        { id: "p3", knowledge: TEXT.neckF, role: "feature", importance: "core", dependsOn: [], explains: "", claimIds: [id[TEXT.neckF]] },
        { id: "p4", knowledge: TEXT.neckM, role: "mechanism", importance: "core", dependsOn: ["p3"], explains: "p3", claimIds: [id[TEXT.neckM]] },
        { id: "p5", knowledge: TEXT.armourF, role: "feature", importance: "core", dependsOn: [], explains: "", claimIds: [id[TEXT.armourF]] },
        { id: "p6", knowledge: TEXT.armourM, role: "mechanism", importance: "core", dependsOn: ["p5"], explains: "p5", claimIds: [id[TEXT.armourM]] }
      ], lessonArc: [{ purpose: "teach" }, { purpose: "check" }] });
  }
  if (system.indexOf("internal story plan") !== -1) return chat({ enabled: true, structure: "investigation", title: "The dinosaur museum", premise: "The class visits a museum to find out how dinosaur bodies worked.", setting: "a natural history museum", tone: "clear", mission: "Find out how teeth, necks and armour helped dinosaurs.",
    characters: [{ id: "guide", label: "Guide", visualRole: "young fictional explorer" }], narrativeArc: [{ beat: "beginning", learning: TEXT.teethM }, { beat: "development", learning: TEXT.neckM }, { beat: "application", learning: TEXT.armourM }, { beat: "resolution", learning: TEXT.teethM }, { beat: "debrief", learning: TEXT.neckM }],
    learningIntegration: "The museum shows how bodies worked.", ending: "The class can explain three dinosaur features.", continuity: { setting: "a natural history museum", mission: "Find out how teeth, necks and armour helped dinosaurs.", discovered: [], objects: ["fossil skeletons"], roles: ["guide"] } });
  if (system.indexOf("You judge only the task explicitly required") === 0) return chat({ relationship: "apply", reason: "The task uses the taught idea in a new action." });
  if (system.indexOf("You state only what a correct answer") === 0) return chat({ demonstratedEvidence: "The pupil can explain how a body part helped a dinosaur.", reason: "The correct choice states that." });
  if (system.indexOf("You compare two statements of learning evidence.") === 0) return chat({ coverage: "sufficient", reason: "The answer shows the required idea." });
  if (system.indexOf("You review pupil-facing text") === 0) { calls.push({ kind: "age" }); return chat({ items: JSON.parse(user).items.map(function (i) { return { id: i.id, verdict: "ok", reason: "fine" }; }), overall: "ok", summary: "fine" }); }
  if (system.indexOf("You audit the check questions") === 0) { calls.push({ kind: "question-audit" }); return chat({ questions: JSON.parse(user).questions.map(function (q) { return { prompt: q.prompt, teleological: "no", teleologyReason: "", circular: "no", circularReason: "", distractors: q.choices.filter(function (c) { return c !== q.correct; }).map(function (c) { return { choice: c, trueInGeneral: "no", reason: "r" }; }) }; }) }); }
  if (system.indexOf("You check multiple-choice questions") === 0) { calls.push({ kind: "questions", body: body }); return chat({ questions: JSON.parse(user).questions.map(function (q) { return { id: q.id, defensible: "yes", supported: "yes", supportingQuote: "q", distractors: q.choices.filter(function (c) { return c !== q.markedCorrect; }).map(function (c) { return { choice: c, clearlyWrong: "yes", reason: "r" }; }), problem: "" }; }) }); }
  if (system.indexOf("You check one picture") === 0) { calls.push({ kind: "vision", body: body }); return chat({ matchesBeat: "yes", whatIsShown: "a fossil skeleton", humansWithLivingDinosaurs: false, anatomyProblems: [], textInImage: false, childSafety: "ok", notes: "" }); }
  // Content step.
  var safe = JSON.parse(user);
  var brain = global.WondiiLessonBrain;
  var items = brain.beatKnowledge(safe.lessonPlan, "Year 3");
  var slots = {};
  (safe.lessonSkeleton || []).forEach(function (slot) {
    var beats = (slot.beats || []).map(function (beat) { return speak(beat, items); });
    if (slot.id === "apply") slots.apply = { beats: beats, instruction: beats[0].text, target: "scene", successCondition: "The pupil has used the taught idea in the task.", teachingConnection: "The task follows the idea the class just learned." };
    // Patch 6: a research-mode brief (sourceWording present) asks for a choose task on a new example.
    // Test fixture built from the brief's own source wording, not lesson content.
    if (slot.id === "apply" && Array.isArray(safe.sourceWording) && safe.sourceWording.length) {
      // The wording row of the unit this apply beat teaches (patch 7: research rules now block).
      var w = safe.sourceWording.filter(function (row) { return String(beats[0].text).toLowerCase().indexOf(String(row.feature || "").toLowerCase()) !== -1; })[0] || safe.sourceWording[0];
      slots.apply.instruction = beats[0].text + " Choose the animal that fits.";
      slots.apply.choices = [
        { text: "The animal with " + w.feature, correct: true, feedback: "The source says " + w.feature + " meant they could " + w.keepThisResult + "." },
        { text: "The animal without " + w.feature, correct: false, feedback: "Without that feature the animal has nothing the source links to this result." }
      ];
      slots.apply.newCase = { text: "Imagine two new animals side by side: one has " + w.feature + " and one does not.", kind: "transfer", sourceRef: [], quote: "" };
    }
    else if (slot.id === "check") {
      var retrieves = (slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; });
      var qs = (retrieves.length ? retrieves : [slot.beats[0]]).map(function (beat, index) {
        var item = items[0];
        items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
        return { id: beat.id, prompt: "Which sentence matches taught idea number " + (index + 1) + "?", choices: [item.text, "A different idea that was not part of this lesson."], correct: item.text, explain: "That sentence matches the idea the class has just learned.", successEvidence: "The pupil chose the taught idea.", teachingConnection: "The question follows the taught idea." };
      });
      slots.check = qs.length > 1 ? { beats: beats, questions: qs } : Object.assign({ beats: beats }, qs[0]);
    } else slots[slot.id] = { beats: beats };
  });
  calls.push({ kind: "content" });
  return chat({ title: "How dinosaur bodies worked", objectives: [goal], slots: slots });
}


function network(href) {
  if (href.indexOf("lesson-brain.js?v=53") !== -1) return Promise.resolve(jsonResponse(brainSource, 200));
  if (href.indexOf("source-research.js?v=1") !== -1) return Promise.resolve(jsonResponse(researchSource, 200));
  if (href.indexOf("/auth/v1/user") !== -1) return Promise.resolve(jsonResponse({ id: "teacher-1" }, 200));
  if (href.indexOf("/rest/v1/organisation_members") !== -1) return Promise.resolve(jsonResponse([{ role: "teacher", status: "active" }], 200));
  if (href.indexOf("simple.wikipedia.org/w/api.php") !== -1 && href.indexOf("list=search") !== -1) return Promise.resolve(jsonResponse({ query: { search: [{ title: "Dinosaur" }], pages: [{ title: "Dinosaur", description: "group of reptiles" }] } }, 200));
  if (href.indexOf("en.wikipedia.org/w/api.php") !== -1) return Promise.resolve(jsonResponse({ query: { search: [] } }, 200));
  if (href.indexOf(NHM_FOLLOW_URL) === 0) return Promise.resolve(jsonResponse(articleHtml(article), 200, { url: href, type: "text/html; charset=utf-8" }));
  if (href.indexOf("simple.wikipedia.org/w/api.php") !== -1 && href.indexOf("prop=extracts") !== -1) return Promise.resolve(jsonResponse({ query: { pages: [{ title: "Dinosaur", extract: article, extlinks: [{ url: NHM_FOLLOW_URL }] }] } }, 200));
  return null;
}

module.exports = { jsonResponse: jsonResponse, openai: openai, network: network, calls: calls, TEXT: TEXT, goal: goal, brainSource: brainSource };
