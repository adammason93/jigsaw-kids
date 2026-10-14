"use strict";

/* Runs Knowledge Pack phase 1 on the five review topics.
   Without OPENAI_API_KEY this is the production-equivalent path:
   real normalise / select / plan admission / beats. It does not call a model.
   Pass --e2e to also drive learn-generate-boot (the edge pipeline) for Year 4 sharks. */

var fs = require("fs");
var path = require("path");
var Brain = require("../js/lesson-brain.js");

function intent(raw, ctx) {
  return Brain.normaliseTeacherIntent(raw, ctx);
}

function artefact(row) {
  var ctx = row.ctx;
  var teacherIntent = intent(row.intent, ctx);
  var applied = Brain.applyTeacherIntent(Object.assign({}, ctx), teacherIntent);
  var pack = Brain.normaliseKnowledgePack(row.rawPack, applied);
  var selection = Brain.selectPackForLesson(pack, applied);
  var planned = null;
  var trace = null;
  var boundMap = null;
  var blocked = pack.status === "blocked" || selection.status === "blocked";
  var withPack = Object.assign({}, applied, { knowledgePack: pack, knowledgeSelection: selection, depthRequired: true });
  if (!blocked && row.map) {
    boundMap = Brain.buildLearningMap(row.map, withPack, row.map.learningObjective);
    planned = Brain.normalisePlan(row.map, withPack);
    if (planned.ok) {
      var slots = Brain.planBeats(Brain.lessonSkeleton(planned.plan, applied), planned.plan, applied.yearGroup);
      trace = Brain.knowledgeTrace(planned.plan, slots, withPack);
    }
  }
  return {
    id: row.id,
    source: "production-equivalent",
    liveModel: false,
    liveModelReason: process.env.OPENAI_API_KEY ? "" : "OPENAI_API_KEY is not set. No model call was made. teacherIntent and rawPack are scripted inputs to the real admission code.",
    request: applied.lessonText,
    teacherIntent: teacherIntent,
    rawPack: row.rawPack,
    admittedPack: Brain.knowledgePackLog(pack, selection),
    claimIds: (pack.claims || []).map(function (claim) { return claim.claimId; }),
    selectedClaimIds: selection.claimIds,
    yearDepth: {
      year: selection.year,
      depthMode: selection.depthMode,
      status: selection.status,
      reason: selection.reason,
      heldBack: selection.heldBack
    },
    samePackYears: row.yearSpan ? ["2", "4", "6"].map(function (year) {
      var picked = Brain.selectPackForLesson(pack, Object.assign({}, applied, { yearGroup: "Year " + year }));
      return {
        year: "Year " + year,
        depthMode: picked.depthMode,
        status: picked.status,
        reason: picked.reason,
        claimIds: picked.claimIds,
        claims: picked.claimIds.map(function (id) {
          var claim = (pack.claims || []).filter(function (item) { return item.claimId === id; })[0];
          return claim ? { claimId: id, depth: claim.depth, text: claim.text } : { claimId: id };
        })
      };
    }) : null,
    learningMap: planned && planned.ok ? planned.plan.learningMap.map(function (item) {
      return { id: item.id, knowledge: item.knowledge, role: item.role, claimIds: item.claimIds, dependsOn: item.dependsOn };
    }) : (boundMap ? boundMap.items.map(function (item) {
      return { id: item.id, knowledge: item.knowledge, role: item.role, claimIds: item.claimIds, dependsOn: item.dependsOn };
    }) : null),
    boundRejections: boundMap ? boundMap.rejected : [],
    planOk: planned ? planned.ok : false,
    planIssues: planned && !planned.ok ? planned.issues : [],
    mapRejected: planned && planned.plan ? planned.plan.mapRejected : (planned ? planned.previous : null),
    knowledgeGrounding: planned && planned.ok ? planned.plan.knowledgeGrounding : null,
    trace: trace,
    blocked: blocked,
    packStatus: pack.status,
    packStatusReason: pack.statusReason
  };
}

var sharkClaims = [
  { text: "A shark is a fish with fins, gills and a tail.", depth: "concrete", kind: "definition", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
  { text: "A shark has gills on the side of its head.", depth: "concrete", kind: "fact", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
  { text: "Gills take oxygen from the water so that a shark can breathe.", depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
  { text: "A shark has a strong tail.", depth: "concrete", kind: "fact", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
  { text: "The tail pushes water backwards so that the shark moves forward.", depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
  { text: "A shark has a pointed body shape.", depth: "concrete", kind: "fact", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
  { text: "The pointed shape lets water slide past the body so that the shark slows down less.", depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
  { text: "Fins, tail and gills work together as one system that lets a shark hunt in open water.", depth: "system", kind: "mechanism", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 5, to: 6 } },
  { text: "Sharks keep fish numbers in balance, so the ocean stays healthy.", depth: "system", kind: "caveat", confidence: "low", provenance: "model", factuallyVerified: false, importance: "optional", ageFit: { from: 5, to: 6 }, uncertainty: "This is a broad food-web claim, not a mechanism of the body." }
];

function mapFromClaims(objective, points) {
  return {
    learningObjective: objective,
    subject: "Science",
    topic: objective,
    learningMap: points,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  };
}

var cases = [
  {
    id: "y3-dinosaurs",
    ctx: { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Year 3 science. Teach the class about dinosaurs." },
    intent: { learningGoal: "Pupils understand that fossils show what dinosaurs were like.", requiredEvidence: "A pupil says what a fossil can show about a dinosaur, including what it ate.", focusConcepts: ["fossils", "dinosaurs"], priorKnowledge: [], exclusions: [], preferences: [], subject: "Science", subjectConfidence: "explicit", yearGroup: "Year 3", durationMinutes: 15 },
    rawPack: {
      status: "usable",
      claims: [
        { text: "Dinosaurs were animals that lived a very long time ago.", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
        { text: "A fossil is a trace of a living thing kept in rock.", depth: "concrete", kind: "definition", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
        { text: "Sharp fossil teeth cut meat, so that the fossil shows a meat-eating dinosaur.", depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
        { text: "A dinosaur egg is a round fossil with a shell.", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
        { text: "The shell kept the baby inside, because a thin shell would have broken.", depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
        { text: "Some dinosaur bones are hollow.", depth: "concrete", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 2, to: 6 } },
        { text: "Hollow bones made the body lighter, so that a large dinosaur could still move.", depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
        { text: "Fossils, tooth shape and the rock layer together show how a dinosaur lived.", depth: "system", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 5, to: 6 } },
        { text: "Some dinosaurs could breathe fire when they were angry.", depth: "concrete", confidence: "low", provenance: "retrieved", factuallyVerified: true, ageFit: { from: 1, to: 6 } }
      ]
    },
    map: mapFromClaims("Pupils understand that fossils show what dinosaurs were like.", [
      { id: "p1", knowledge: "Dinosaurs were animals that lived a very long time ago.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "A fossil is a trace of a living thing kept in rock.", role: "definition", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "Sharp fossil teeth cut meat, so that the fossil shows a meat-eating dinosaur.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "A dinosaur egg is a round fossil with a shell.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p5", knowledge: "The shell kept the baby inside, because a thin shell would have broken.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "Some dinosaur bones are hollow.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p7", knowledge: "Hollow bones made the body lighter, so that a large dinosaur could still move.", role: "mechanism", importance: "core", dependsOn: ["p6"] },
      { id: "p8", knowledge: "Some dinosaurs could breathe fire when they were angry.", role: "fact", importance: "core", dependsOn: ["p1"] }
    ])
  },
  {
    id: "y4-shark-adaptations",
    yearSpan: true,
    ctx: { yearGroup: "Year 4", subject: "Science", topic: "Shark adaptations", requestedMinutes: 15, lessonText: "Year 4 science. Teach how sharks' adaptations help them live and hunt in the sea." },
    intent: { learningGoal: "Pupils explain how a shark's body helps it live and hunt in the sea.", requiredEvidence: "A pupil explains how gills, the tail, or the body shape helps a shark in the water.", focusConcepts: ["shark adaptations", "gills", "tail"], priorKnowledge: [], exclusions: [], preferences: [], subject: "Science", subjectConfidence: "explicit", yearGroup: "Year 4", durationMinutes: 15 },
    rawPack: { status: "usable", claims: sharkClaims, concepts: ["adaptation", "gills"], vocabulary: [{ term: "gill", gloss: "a body part that takes oxygen from water" }], misconceptions: [{ text: "Sharks are mammals.", corrects: "A shark is a fish with fins, gills and a tail." }] },
    map: mapFromClaims("Pupils explain how a shark's body helps it live and hunt in the sea.", [
      { id: "p1", knowledge: "A shark is a fish with fins, gills and a tail.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "A shark has gills on the side of its head.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "Gills take oxygen from the water so that a shark can breathe.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "A shark has a strong tail.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p5", knowledge: "The tail pushes water backwards so that the shark moves forward.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "A shark has a pointed body shape.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p7", knowledge: "The pointed shape lets water slide past the body so that the shark slows down less.", role: "mechanism", importance: "core", dependsOn: ["p6"] },
      { id: "p8", knowledge: "Sharks keep the ocean healthy by being important predators.", role: "effect", importance: "supporting", dependsOn: ["p1"] }
    ])
  },
  {
    id: "y5-henry-rome",
    ctx: { yearGroup: "Year 5", subject: "History", topic: "Henry VIII and Rome", requestedMinutes: 20, lessonText: "Year 5 history. Teach how Henry VIII's break with Rome changed England." },
    intent: { learningGoal: "Pupils explain how Henry VIII's break with Rome changed the church in England.", requiredEvidence: "A pupil names the break with Rome and one change that followed for the church in England.", focusConcepts: ["Henry VIII", "break with Rome"], priorKnowledge: [], exclusions: [], preferences: [], subject: "History", subjectConfidence: "explicit", yearGroup: "Year 5", durationMinutes: 20 },
    rawPack: {
      status: "qualified",
      niche: false,
      claims: [
        { text: "Henry VIII was king of England from 1509 to 1547.", depth: "concrete", kind: "fact", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
        { text: "In 1534 the Act of Supremacy said Henry, not the Pope, was head of the Church in England.", depth: "concrete", kind: "fact", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 4, to: 6 } },
        { text: "Henry wanted a male heir, so he asked Rome to end his marriage to Catherine of Aragon.", depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 4, to: 6 } },
        { text: "When Rome refused, Henry's break with Rome let him control the English church.", depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 5, to: 6 } },
        { text: "Catherine of Aragon was Henry's first wife.", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 4, to: 6 } },
        { text: "A monastery was a religious house that owned land.", depth: "concrete", kind: "definition", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 4, to: 6 } },
        { text: "The break closed many monasteries, so that their land and wealth went to the crown and new owners.", depth: "system", kind: "process", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 5, to: 6 } },
        { text: "Historians still disagree about whether Henry cared more about religion or about power.", depth: "system", contested: true, uncertainty: "Motive is interpreted, not a single settled fact.", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 5, to: 6 } },
        { text: "Henry said the exact words 'I am the only church' in 1534.", depth: "concrete", confidence: "low", provenance: "model", factuallyVerified: true, ageFit: { from: 5, to: 6 } }
      ]
    },
    map: mapFromClaims("Pupils explain how Henry VIII's break with Rome changed the church in England.", [
      { id: "p1", knowledge: "Henry VIII was king of England from 1509 to 1547.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "Henry wanted a male heir, so he asked Rome to end his marriage to Catherine of Aragon.", role: "mechanism", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "When Rome refused, Henry's break with Rome let him control the English church.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "In 1534 the Act of Supremacy said Henry, not the Pope, was head of the Church in England.", role: "fact", importance: "core", dependsOn: ["p3"] },
      { id: "p5", knowledge: "A monastery was a religious house that owned land.", role: "definition", importance: "core", dependsOn: ["p1"] },
      { id: "p8", knowledge: "Catherine of Aragon was Henry's first wife.", role: "fact", importance: "core", dependsOn: ["p1"] },
      { id: "p9", knowledge: "The break closed many monasteries, so that their land and wealth went to the crown and new owners.", role: "effect", importance: "core", dependsOn: ["p5"] },
      { id: "p6", knowledge: "Henry said the exact words 'I am the only church' in 1534.", role: "fact", importance: "core", dependsOn: ["p4"] },
      { id: "p7", knowledge: "Historians still disagree about whether Henry cared more about religion or about power.", role: "connection", importance: "supporting", dependsOn: ["p3", "p5"] }
    ])
  },
  {
    id: "y6-mam-tor",
    ctx: { yearGroup: "Year 6", subject: "Geography", topic: "Mam Tor", requestedMinutes: 20, lessonText: "Year 6 geography. Teach how the geology of Mam Tor caused the landslip." },
    intent: { learningGoal: "Pupils explain how Mam Tor's geology caused the landslip.", requiredEvidence: "A pupil explains how the rock and water made the hillside slip.", focusConcepts: ["Mam Tor", "landslip"], priorKnowledge: [], exclusions: [], preferences: [], subject: "Geography", subjectConfidence: "explicit", yearGroup: "Year 6", durationMinutes: 20 },
    rawPack: {
      status: "blocked",
      blockReason: "Specific strata, dates and measurements for this hillside are not secure enough to teach without inventing them.",
      niche: true,
      claims: [
        { text: "Mam Tor is a hill in the Peak District.", depth: "concrete", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
        { text: "The road below Mam Tor has cracked and been closed.", depth: "concrete", confidence: "low", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } }
      ]
    },
    map: null
  },
  {
    id: "y4-false-premise-sharks-mammals",
    ctx: { yearGroup: "Year 4", subject: "Science", topic: "Sharks", requestedMinutes: 15, lessonText: "Year 4 science. Explain why sharks are mammals.", uploadedMaterialSummary: "Sharks are fish. They use gills to take oxygen from water." },
    intent: { learningGoal: "Pupils explain why sharks are mammals.", requiredEvidence: "A pupil gives the reason sharks are mammals.", focusConcepts: ["sharks", "mammals"], priorKnowledge: [], exclusions: [], preferences: [], subject: "Science", subjectConfidence: "explicit", yearGroup: "Year 4", durationMinutes: 15 },
    rawPack: {
      status: "qualified",
      falsePremise: "sharks are mammals",
      claims: [
        { text: "Sharks are mammals.", accepted: false, provenance: "model", teacherRequested: true, factuallyVerified: true, confidence: "high", depth: "concrete", ageFit: { from: 1, to: 6 } },
        { text: "Sharks are fish, not mammals.", provenance: "teacher_material", teacherRequested: true, factuallyVerified: true, correctsPremise: true, confidence: "high", depth: "concrete", kind: "definition", ageFit: { from: 1, to: 6 } },
        { text: "Gills take oxygen from the water so that a shark can breathe.", provenance: "retrieved", factuallyVerified: true, confidence: "high", depth: "mechanism", kind: "mechanism", ageFit: { from: 3, to: 6 } },
        { text: "Mammals feed milk to their young and breathe air with lungs.", depth: "mechanism", kind: "definition", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
        { text: "A shark does not feed its young on milk, because a shark is a fish.", depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, correctsPremise: true, ageFit: { from: 3, to: 6 } },
        { text: "Sharks have scales rather than hair, so that they are not classed as mammals.", depth: "mechanism", kind: "mechanism", confidence: "high", provenance: "model", factuallyVerified: false, correctsPremise: true, ageFit: { from: 3, to: 6 } },
        { text: "Whales and dolphins are mammals, because they breathe air and feed milk.", depth: "mechanism", kind: "comparison", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
        { text: "A shark's skin is covered in tiny scales called denticles.", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
        { text: "Denticles let water flow smoothly over the skin, so that the shark wastes less effort.", depth: "mechanism", kind: "mechanism", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 4, to: 6 } },
        { text: "Lungs and gills are different systems for getting oxygen.", depth: "system", confidence: "medium", provenance: "curriculum_planning", factuallyVerified: true, ageFit: { from: 5, to: 6 } }
      ]
    },
    map: mapFromClaims("Pupils explain why sharks are mammals.", [
      { id: "p1", knowledge: "Sharks are mammals.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "Sharks are fish, not mammals.", role: "definition", importance: "core", dependsOn: [] },
      { id: "p3", knowledge: "Gills take oxygen from the water so that a shark can breathe.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "Mammals feed milk to their young and breathe air with lungs.", role: "comparison", importance: "core", dependsOn: ["p2"] },
      { id: "p5", knowledge: "A shark does not feed its young on milk, because a shark is a fish.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "Sharks have scales rather than hair, so that they are not classed as mammals.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
      { id: "p7", knowledge: "Whales and dolphins are mammals, because they breathe air and feed milk.", role: "comparison", importance: "core", dependsOn: ["p4"] },
      { id: "p8", knowledge: "A shark's skin is covered in tiny scales called denticles.", role: "feature", importance: "core", dependsOn: ["p2"] },
      { id: "p9", knowledge: "Denticles let water flow smoothly over the skin, so that the shark wastes less effort.", role: "mechanism", importance: "core", dependsOn: ["p8"] }
    ])
  }
];

var results = cases.map(artefact);
var outDir = path.join(__dirname, "../docs/agent/knowledge-pack-phase1");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "matrix.json"), JSON.stringify({ generatedAt: new Date().toISOString(), liveModel: !!process.env.OPENAI_API_KEY, results: results }, null, 2));
results.forEach(function (row) {
  console.log([row.id, row.packStatus, row.blocked ? "BLOCKED" : "flow", "map", row.planOk, "claims", row.claimIds.length, "selected", (row.selectedClaimIds || []).length].join(" "));
  if (row.planIssues && row.planIssues.length) console.log("  issues: " + row.planIssues.join(" | "));
});

if (process.argv.indexOf("--e2e") === -1) {
  console.log("matrix written");
  process.exit(0);
}

var brainSource = fs.readFileSync(path.join(__dirname, "../js/lesson-brain.js"), "utf8");
var boot = fs.readFileSync(path.join(__dirname, "../js/learn-generate-boot.js"), "utf8");
var shark = results.filter(function (row) { return row.id === "y4-shark-adaptations"; })[0];

function jsonResponse(body, status) {
  return { ok: status >= 200 && status < 300, status: status, json: function () { return Promise.resolve(body); }, text: function () { return Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)); } };
}

var stages = [];
var originalLog = console.log;
console.log = function (line) {
  try {
    var parsed = JSON.parse(line);
    if (parsed && parsed.event === "learn-generate") stages.push(parsed);
  } catch (e) { /* ignore */ }
  originalLog(line);
};

global.Deno = { env: { get: function (name) {
  if (name === "OPENAI_API_KEY") return "test-key";
  if (name === "SUPABASE_URL") return "https://example.supabase.co";
  if (name === "SUPABASE_ANON_KEY") return "test-anon";
  if (name === "LESSON_MODEL") return "gpt-4o-mini";
  return "";
} } };

var sharkPlan = cases.filter(function (row) { return row.id === "y4-shark-adaptations"; })[0];
global.fetch = function (url, init) {
  var href = String(url);
  if (href.indexOf("lesson-brain.js?v=53") !== -1) return Promise.resolve(jsonResponse(brainSource, 200));
  if (href.indexOf("/auth/v1/user") !== -1) return Promise.resolve(jsonResponse({ id: "teacher-1" }, 200));
  if (href.indexOf("/rest/v1/organisation_members") !== -1) return Promise.resolve(jsonResponse([{ role: "teacher", status: "active" }], 200));
  if (href.indexOf("api.openai.com") === -1) return Promise.reject(new Error("unexpected fetch " + href));
  var body = JSON.parse(init.body);
  var system = body.messages[0].content;
  var payload;
  if (system.indexOf("You interpret one primary teacher's request.") === 0) payload = sharkPlan.intent;
  else if (system.indexOf("You ground subject knowledge") === 0) payload = sharkPlan.rawPack;
  else if (system.indexOf("internal story plan") !== -1) {
    payload = {
      enabled: true, structure: "investigation", title: "The hunt", premise: "The class must work out how a shark's body helps it hunt.",
      setting: "a rocky bay", tone: "clear", mission: "Find out how the shark's body helps it hunt.",
      characters: [{ id: "guide", label: "Guide", visualRole: "a fictional harbour naturalist" }],
      narrativeArc: [
        { beat: "beginning", learning: "The class has not yet explained the body." },
        { beat: "discovery", learning: sharkClaims[2].text },
        { beat: "application", learning: sharkClaims[4].text },
        { beat: "resolution", learning: sharkClaims[6].text },
        { beat: "debrief", learning: sharkClaims[2].text }
      ],
      learningIntegration: "The bay task uses the body mechanisms.", ending: "The class can explain one adaptation.",
      continuity: { setting: "a rocky bay", mission: "Find out how the shark's body helps it hunt.", discovered: [], objects: ["shark"], roles: ["guide"] }
    };
  } else if (system.indexOf("You judge only the task explicitly required") === 0) payload = { relationship: "apply", reason: "The task uses the taught mechanism on a new case." };
  else if (system.indexOf("You state only what a correct answer") === 0) payload = { demonstratedEvidence: "The pupil explains how a body part helps the shark in the water.", reason: "The correct choice states that mechanism." };
  else if (system.indexOf("You compare two statements of learning evidence.") === 0) payload = { coverage: "sufficient", reason: "The answer shows the required mechanism." };
  else if (system.indexOf("Do not write pupil activities") !== -1) payload = Object.assign({ subject: "Science", topic: "Shark adaptations", yearGroup: "Year 4", title: "Shark adaptations" }, sharkPlan.map);
  else {
    var safe = JSON.parse(body.messages[1].content);
    var skeleton = safe.lessonSkeleton || [];
    var items = (safe.lessonPlan && safe.lessonPlan.learningMap) || [];
    var slots = {};
    skeleton.forEach(function (slot) {
      var beats = (slot.beats || []).map(function (beat) {
        var item = items[0] || { knowledge: "A shark is a fish with fins, gills and a tail." };
        items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
        var known = String(item.knowledge || item.text || "").replace(/[.?!]$/, "");
        var lower = known.charAt(0).toLowerCase() + known.slice(1);
        var text = {
          notice: "Look at the shark and say what you can see.",
          predict: "Say what you think the gills are for.",
          name: item.knowledge,
          explain: item.knowledge,
          exemplify: "You can see this when " + lower + ".",
          model: "Watch how this works: " + lower + ".",
          compare: "Look at both body parts and say what is different.",
          connect: "These parts work together: " + lower + ".",
          practise: "Use this idea on a new shark: " + lower + ".",
          apply: "Choose the body part that helps: " + lower + ".",
          retrieve: "Which sentence matches the idea you just learned?",
          reveal: "So, " + lower + ".",
          consolidate: "So, " + lower + "."
        }[beat.move] || item.knowledge;
        return { id: beat.id, cue: "", text: text };
      });
      if (slot.id === "apply") {
        slots.apply = { beats: beats, instruction: "Which change helps a shark move forward: a tail that pushes water back, or a tail that stays still?", target: "tail", successCondition: "The pupil chooses the tail that pushes water back.", teachingConnection: "The task uses the taught tail mechanism on a choice the teach slot did not answer." };
      } else if (slot.id === "check") {
        var retrieves = (slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; });
        slots.check = {
          beats: beats,
          questions: (retrieves.length ? retrieves : [{ id: "q1", knowledgeRefs: [] }]).map(function (beat, index) {
            var item = items[0];
            items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
            return {
              id: beat.id || ("q" + (index + 1)),
              prompt: "Which sentence explains this idea? " + item.knowledge,
              choices: [item.knowledge, "The shark is a mammal because it lives in the sea."],
              correct: item.knowledge,
              explain: "That sentence is the mechanism the class has just learned.",
              successEvidence: "The pupil chose the taught mechanism.",
              teachingConnection: "The question asks for the taught how or why."
            };
          })
        };
      } else slots[slot.id] = { beats: beats };
    });
    payload = { title: "Shark adaptations", objectives: [sharkPlan.map.learningObjective], slots: slots };
  }
  return Promise.resolve(jsonResponse({ choices: [{ message: { content: JSON.stringify(payload) } }] }, 200));
};

(0, eval)("(async function(){\n" + boot + "\n})()").then(function () {
  return global.handleGenerate(new Request("https://wondii.co.uk/api/learn/generate", {
    method: "POST",
    headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({
      attemptId: "kp-phase1-shark",
      context: {
        organisationId: "org-1",
        lessonText: sharkPlan.ctx.lessonText,
        yearGroup: "Year 4",
        subject: "Science",
        topic: "Shark adaptations",
        requestedMinutes: 15
      }
    })
  }));
}).then(function (response) {
  return response.json();
}).then(function (body) {
  console.log = originalLog;
  var lesson = {
    ok: body.ok,
    stage: body.stage,
    issues: body.issues || [],
    stages: stages.map(function (row) { return row.stage; }),
    knowledgePackLog: (stages.filter(function (row) { return row.stage === "KNOWLEDGE_PACK"; })[0]) || null,
    learningMapLog: (stages.filter(function (row) { return row.stage === "LEARNING_MAP"; })[0]) || null,
    pupil: []
  };
  var adventure = body.adventure || {};
  (adventure.activities || []).forEach(function (activity) {
    lesson.pupil.push({
      slot: activity.slotId,
      beats: (activity.beats || []).map(function (beat) {
        return { id: beat.id, move: beat.move, knowledgeRefs: beat.knowledgeRefs, text: beat.pupil && beat.pupil.text };
      }),
      lines: (activity.config && activity.config.lines) || [],
      questions: ((activity.config && activity.config.questions) || []).map(function (question) {
        return { prompt: question.prompt, correct: question.correct, choices: question.choices };
      })
    });
  });
  if (body.meta && body.meta.learningMap) lesson.responseLearningMap = body.meta.learningMap;
  fs.writeFileSync(path.join(outDir, "shark-e2e.json"), JSON.stringify({ liveModel: false, note: "Boot pipeline with scripted model payloads. Gates, claim binding, beats and pupil materialiser are the real code.", matrixId: shark.id, lesson: lesson }, null, 2));
  console.log("e2e", body.ok, body.stage, (body.issues || []).join(" | "));
  console.log("stages", lesson.stages.join(" > "));
  if (!body.ok) process.exit(1);
}).catch(function (error) {
  console.log = originalLog;
  console.error(error);
  process.exit(1);
});
