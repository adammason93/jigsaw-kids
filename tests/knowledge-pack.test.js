"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

function claimText(pack, id) {
  var found = (pack.claims || []).filter(function (claim) { return claim.claimId === id; })[0];
  return found ? found.text : "";
}

var upload = "Sharks are fish. They use gills to take oxygen from water.";
var request = "Year 4 science. Explain why sharks are mammals.";
var raw = {
  status: "usable",
  lessonArc: [{ purpose: "teach" }],
  questions: [{ prompt: "Are sharks mammals?" }],
  falsePremise: "sharks are mammals",
  claims: [
    { text: "Sharks are mammals.", provenance: "model", teacherRequested: true, factuallyVerified: true, confidence: "high", depth: "concrete", ageFit: { from: 1, to: 6 } },
    { text: "Sharks are fish, not mammals.", provenance: "teacher_material", teacherRequested: true, factuallyVerified: true, correctsPremise: true, confidence: "high", depth: "concrete", kind: "definition", ageFit: { from: 1, to: 6 } },
    { text: "Gills take oxygen from the water so a shark can breathe.", provenance: "retrieved", factuallyVerified: true, confidence: "high", depth: "mechanism", kind: "mechanism", ageFit: { from: 3, to: 6 } },
    { text: "Fins, tail and gills work together as one system for living in water.", provenance: "curriculum_planning", confidence: "medium", depth: "system", ageFit: { from: 5, to: 6 } },
    { text: "Some scientists still argue about how often sharks sleep.", provenance: "curated", contested: true, uncertainty: "Sleep in sharks is still debated.", confidence: "low", depth: "mechanism", ageFit: { from: 3, to: 6 } },
    { text: "A classroom poster can show a labelled shark drawing.", provenance: "teacher_material", factuallyVerified: true, confidence: "medium", depth: "concrete", ageFit: { from: 1, to: 6 } }
  ],
  mechanisms: [{ text: "The tail pushes water backwards, which moves the shark forward." }],
  concepts: ["gills", "This is a full sentence about sharks and should not be a concept label."],
  vocabulary: [{ term: "gill", gloss: "a body part that takes oxygen from water" }],
  misconceptions: [{ text: "Sharks are mammals.", corrects: "Sharks are fish, not mammals." }]
};

var ctx = {
  yearGroup: "Year 4",
  subject: "Science",
  topic: "Sharks",
  requestedMinutes: 15,
  lessonText: request,
  teacherInstructions: request,
  uploadedMaterialSummary: upload,
  lessonBrief: {
    rawRequest: request,
    intent: "why",
    teacherIntent: {
      ok: true,
      learningGoal: "Explain why sharks are mammals.",
      focusConcepts: ["sharks"],
      requiredEvidence: "Say what group sharks belong to and how they breathe."
    }
  }
};

var pack = Brain.normaliseKnowledgePack(raw, ctx);
assert.strictEqual(pack.status, "qualified");
assert.ok(pack.falsePremise);
assert.deepStrictEqual(pack.strippedFields.sort(), ["lessonArc", "questions"].sort());
assert.strictEqual(pack.lessonArc, undefined);
assert.strictEqual(pack.questions, undefined);
assert.ok(pack.claims.length >= 4);
assert.ok(pack.claims.length > 2, "the pack holds more than one lesson will teach");
assert.ok(pack.claims.every(function (claim) { return claim.factuallyVerified === false; }));
assert.ok(pack.verificationOverrides >= 1);
assert.ok(pack.provenanceSummary.indexOf("not factually verified") !== -1 || pack.provenanceSummary.indexOf("no claim is factually verified") !== -1);
assert.ok(!pack.claims.some(function (claim) { return /are mammals\.$/i.test(claim.text); }));
assert.ok(pack.rejectedClaims.some(function (claim) { return claim.reason === "false premise"; }));

var fish = pack.claims.filter(function (claim) { return /fish/.test(claim.text); })[0];
var gills = pack.claims.filter(function (claim) { return /gills take oxygen/i.test(claim.text); })[0];
var system = pack.claims.filter(function (claim) { return claim.depth === "system"; })[0];
var corridor = pack.claims.filter(function (claim) { return /poster/.test(claim.text); })[0];
var tail = pack.claims.filter(function (claim) { return /tail pushes/i.test(claim.text); })[0];
assert.ok(fish && gills && system && tail);
assert.strictEqual(fish.provenance, "teacher_material");
assert.strictEqual(fish.teacherRequested, false);
assert.strictEqual(fish.factuallyVerified, false);
assert.ok(/unverified/.test(fish.provenanceNote));
assert.strictEqual(gills.provenance, "teacher_material");
assert.strictEqual(gills.factuallyVerified, false);
assert.ok(/ignored retrieved/.test(gills.provenanceNote));
assert.strictEqual(system.provenance, "model");
assert.ok(/curriculum_planning/.test(system.provenanceNote));
assert.strictEqual(corridor.provenance, "model");
assert.ok(pack.claims.some(function (claim) { return claim.contested; }));
assert.ok(pack.mechanisms.some(function (item) { return item.claimId === gills.claimId || item.claimId === tail.claimId; }));
assert.ok(pack.mechanisms.every(function (item) { return pack.claims.some(function (claim) { return claim.claimId === item.claimId; }); }));
assert.deepStrictEqual(pack.concepts, ["gills"]);
assert.strictEqual(pack.vocabulary[0].term, "gill");
assert.strictEqual(pack.misconceptions[0].correctsClaimId, fish.claimId);
assert.ok(/^c[a-z0-9]+$/.test(fish.claimId));
var again = Brain.normaliseKnowledgePack(raw, ctx);
assert.strictEqual(again.claims.filter(function (claim) { return /fish/.test(claim.text); })[0].claimId, fish.claimId);

var selection = Brain.selectPackForLesson(pack, ctx);
assert.ok(selection.claimIds.indexOf(gills.claimId) !== -1);
assert.ok(selection.claimIds.indexOf(system.claimId) === -1, "Year 4 holds the system claim back");
assert.ok(selection.heldBack.some(function (item) { return item.claimId === system.claimId; }));
assert.ok(selection.claimIds.length < pack.claims.length);

function yearSelection(year) {
  return Brain.selectPackForLesson(pack, Object.assign({}, ctx, { yearGroup: "Year " + year }));
}
var y2 = yearSelection(2);
var y4 = yearSelection(4);
var y6 = yearSelection(6);
assert.strictEqual(y2.depthMode, "concrete");
assert.strictEqual(y4.depthMode, "mechanism");
assert.strictEqual(y6.depthMode, "system");
assert.notDeepStrictEqual(y2.claimIds.slice().sort(), y4.claimIds.slice().sort());
assert.notDeepStrictEqual(y4.claimIds.slice().sort(), y6.claimIds.slice().sort());
assert.ok(y2.claimIds.indexOf(system.claimId) === -1);
assert.ok(y2.claimIds.indexOf(gills.claimId) === -1, "a mechanism marked from Year 3 is not a Year 2 selection");
assert.ok(y6.claimIds.indexOf(system.claimId) !== -1);
assert.ok(y6.claimIds.indexOf(gills.claimId) !== -1);
y2.claimIds.forEach(function (id) {
  var claim = pack.claims.filter(function (item) { return item.claimId === id; })[0];
  assert.ok(claim.depth === "concrete" || (claim.depth === "mechanism" && claim.ageFit.from <= 2));
});

var blocked = Brain.normaliseKnowledgePack({ status: "blocked", blockReason: "local detail is missing", claims: [] }, ctx);
assert.strictEqual(blocked.status, "blocked");
var blockedPlan = Brain.normalisePlan({
  learningObjective: "Explain why sharks are mammals.",
  learningMap: [{ id: "p1", knowledge: "Sharks are mammals.", role: "fact", importance: "core", dependsOn: [] }],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, Object.assign({}, ctx, { knowledgePack: blocked, knowledgeSelection: Brain.selectPackForLesson(blocked, ctx) }));
assert.strictEqual(blockedPlan.ok, false);
assert.ok(blockedPlan.issues.join(" ").indexOf("blocked") !== -1);

var forced = Brain.normaliseKnowledgePack({
  status: "blocked",
  blockReason: "the topic is too thin to teach without inventing",
  claims: [
    { text: "Mam Tor is a hill in the Peak District.", depth: "concrete", confidence: "low", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "The hillside has slipped.", depth: "concrete", confidence: "low", provenance: "model", ageFit: { from: 1, to: 6 } }
  ]
}, { yearGroup: "Year 6", lessonText: "Teach Year 6 how Mam Tor's geology formed." });
assert.strictEqual(forced.status, "blocked");
assert.strictEqual(Brain.selectPackForLesson(forced, { yearGroup: "Year 6" }).status, "blocked");
assert.ok(forced.claims.every(function (claim) { return claim.factuallyVerified === false && claim.provenance === "model"; }));

var plainCtx = {
  yearGroup: "Year 3",
  subject: "Science",
  topic: "Dinosaurs",
  requestedMinutes: 15,
  lessonText: "Year 3 science. Teach the class about dinosaurs.",
  lessonBrief: { rawRequest: "Year 3 science. Teach the class about dinosaurs.", intent: "explain", teacherIntent: { ok: true, learningGoal: "Understand what fossils tell us about dinosaurs.", focusConcepts: ["fossils", "dinosaurs"], requiredEvidence: "Say what a fossil shows about a dinosaur." } }
};
var plain = Brain.normaliseKnowledgePack({
  status: "usable",
  claims: [
    { text: "A dinosaur was a kind of animal that lived long ago.", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "A fossil is a trace of a living thing preserved in rock.", depth: "concrete", confidence: "high", provenance: "model", kind: "definition", ageFit: { from: 1, to: 6 } },
    { text: "Teeth in a fossil show what that dinosaur ate.", depth: "mechanism", confidence: "high", provenance: "model", kind: "mechanism", ageFit: { from: 3, to: 6 } },
    { text: "Fossils, rock layers and teeth together show how a dinosaur lived.", depth: "system", confidence: "medium", provenance: "model", ageFit: { from: 5, to: 6 } }
  ]
}, plainCtx);
assert.strictEqual(plain.status, "usable");
assert.ok(plain.claims.every(function (claim) { return claim.provenance === "model" && /unverified/.test(claim.provenanceNote); }));
var plainSelect = Brain.selectPackForLesson(plain, plainCtx);
var taught = "Teeth in a fossil show what that dinosaur ate.";
var invented = "Dinosaurs were warm pets that lived in classrooms.";
var mapCtx = Object.assign({}, plainCtx, { knowledgePack: plain, knowledgeSelection: plainSelect });
var kept = Brain.buildLearningMap({
  learningMap: [
    { id: "p1", knowledge: "A fossil is a trace of a living thing preserved in rock.", role: "foundation", importance: "core", dependsOn: [], claimIds: ["c-not-real"] },
    { id: "p2", knowledge: taught, role: "mechanism", importance: "core", dependsOn: ["p1"] },
    { id: "p3", knowledge: invented, role: "fact", importance: "core", dependsOn: ["p1"], claimIds: [plain.claims[0].claimId] }
  ]
}, mapCtx, "Understand what fossils tell us about dinosaurs.");
assert.ok(kept.items.some(function (item) { return item.knowledge === taught && item.claimIds.length === 1; }));
assert.ok(kept.rejected.some(function (item) { return item.knowledge === invented && /invented fact/.test(item.reason); }));
var fossilId = plain.claims.filter(function (claim) { return /fossil is a trace/.test(claim.text); })[0].claimId;
assert.ok(kept.items.some(function (item) { return item.claimIds.indexOf(fossilId) !== -1; }));

var planned = Brain.normalisePlan({
  learningObjective: "Understand what fossils tell us about dinosaurs.",
  subject: "Science",
  topic: "Dinosaurs",
  yearGroup: "Year 3",
  learningMap: [
    { id: "p1", knowledge: "A fossil is a trace of a living thing preserved in rock.", role: "foundation", importance: "core", dependsOn: [] },
    { id: "p2", knowledge: taught, role: "mechanism", importance: "core", dependsOn: ["p1"] }
  ],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, mapCtx);
assert.strictEqual(planned.ok, true, (planned.issues || []).join(" | "));
assert.ok(planned.plan.learningMap.every(function (item) { return item.claimIds && item.claimIds.length; }));
assert.ok(planned.plan.knowledgeGrounding);
assert.strictEqual(planned.plan.knowledgeGrounding.packId, plain.id);
assert.ok(planned.plan.knowledgeGrounding.points.every(function (point) { return point.provenance.indexOf("model") !== -1 && point.claimIds.length; }));

var bareBrief = Brain.planBrief({ yearGroup: "Year 4", lessonBrief: { learningGoal: "Understand why a change mattered." } });
assert.strictEqual(bareBrief.system.indexOf("claimIds"), -1);
var packedBrief = Brain.planBrief(mapCtx);
assert.ok(packedBrief.system.indexOf("claimIds") !== -1);
assert.ok(packedBrief.system.indexOf("knowledgePack.claims is the only source") !== -1);
assert.strictEqual(/shark/i.test(packedBrief.system), false);
var packedUser = JSON.parse(packedBrief.user);
assert.ok(packedUser.knowledgePack.claims.length > packedUser.knowledgeSelection.claimIds.length);
assert.ok(packedUser.knowledgePack.claims.every(function (claim) { return claim.factuallyVerified === false; }));
assert.ok(!packedUser.knowledgePack.lessonArc);

var repair = Brain.planRepairBrief(mapCtx, ["The learning map must select claim ids from the knowledge pack."], planned.plan);
assert.ok(repair.user.indexOf("claimIds") !== -1);
assert.strictEqual(repair.system, Brain.planBrief(mapCtx).system);

var traceSlots = Brain.planBeats(Brain.lessonSkeleton(planned.plan, mapCtx), planned.plan, "Year 3");
var trace = Brain.knowledgeTrace(planned.plan, traceSlots, mapCtx);
assert.ok(trace.map.every(function (point) { return point.claimIds.length && point.factuallyVerified === false; }));
assert.ok(trace.teach.some(function (beat) { return beat.claimIds.length; }));
assert.ok(trace.apply.some(function (beat) { return beat.claimIds.length; }) || trace.check.some(function (beat) { return beat.claimIds.length; }));
assert.ok(trace.check.some(function (beat) { return beat.move === "retrieve" && beat.claimIds.length; }));

var noPack = Brain.normalisePlan({
  learningObjective: "Know the names of the planets in order.",
  subject: "Science",
  topic: "planets",
  keyKnowledge: ["Mercury is the closest planet to the Sun.", "Neptune is the farthest planet from the Sun."],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, { yearGroup: "Year 3", subject: "Science", topic: "planets", lessonBrief: { intent: "explain" } });
assert.strictEqual(noPack.ok, true, (noPack.issues || []).join(" | "));
assert.strictEqual(noPack.plan.knowledgeGrounding, undefined);

console.log("knowledge-pack tests passed");
console.log("sample claim", fish.claimId, claimText(pack, fish.claimId));
