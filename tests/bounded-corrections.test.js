"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var arc = [{ purpose: "teach" }, { purpose: "check" }];
var sharkGoal = "Pupils will understand how sharks are adapted to living in the ocean.";

function sharkCtx() {
  return {
    yearGroup: "Year 4",
    subject: "Science",
    topic: "Sharks",
    requestedMinutes: 15,
    depthRequired: true,
    lessonText: sharkGoal,
    lessonBrief: {
      intent: "explain",
      rawRequest: sharkGoal,
      learningGoal: sharkGoal,
      teacherIntent: { ok: true, learningGoal: sharkGoal }
    }
  };
}

function sharkPlan(map) {
  return Brain.normalisePlan({
    learningObjective: sharkGoal,
    subject: "Science",
    topic: "Sharks",
    yearGroup: "Year 4",
    learningMap: map,
    lessonArc: arc
  }, sharkCtx());
}

function developed(result) {
  if (result.depth && result.depth.developedStrands != null) return result.depth.developedStrands;
  return result.plan.teachingPlan.substantiveDepth.strandsDeveloped;
}

var pair = sharkPlan([
  { id: "p1", knowledge: "A shark has gills on the sides of its head.", role: "feature", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Gills take oxygen from the water so that the shark can breathe.", role: "mechanism", importance: "core", dependsOn: ["p1"] }
]);
assert.strictEqual(developed(pair), 1, "a feature and the mechanism that depends on it is one developed strand");
assert.strictEqual(pair.depth.requiredStrands, 3, "one developed strand does not lower the Year 4 minimum");
assert.strictEqual(pair.ok, false);

var singletons = sharkPlan([
  { id: "p1", knowledge: "Sharks are fish that live in the ocean.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Gills take oxygen from the water so that the shark can breathe.", role: "function", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "The tail pushes water backwards so that the shark moves forward.", role: "function", importance: "core", dependsOn: ["p1"] },
  { id: "p4", knowledge: "A pointed body lets water slide past so that the shark can swim more easily.", role: "mechanism", importance: "core", dependsOn: ["p1"] }
]);
assert.strictEqual(developed(singletons), 0, "functions that depend only on the foundation are not developed strands");

var labelledFoundations = sharkPlan([
  { id: "p1", knowledge: "A shark has gills on the sides of its head.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Gills take oxygen from the water so that the shark can breathe.", role: "function", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "A shark has a strong tail.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p4", knowledge: "The tail pushes water backwards so that the shark moves forward.", role: "function", importance: "core", dependsOn: ["p3"] },
  { id: "p5", knowledge: "A shark has a pointed body.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p6", knowledge: "The pointed shape lets water slide past so that the shark slows down less.", role: "mechanism", importance: "core", dependsOn: ["p5"] }
]);
assert.strictEqual(developed(labelledFoundations), 0, "several foundation labels still collapse and leave singleton functions");

var three = sharkPlan([
  { id: "p1", knowledge: "A shark has gills on the sides of its head.", role: "feature", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Gills take oxygen from the water so that the shark can breathe.", role: "mechanism", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "A shark has a strong tail.", role: "feature", importance: "core", dependsOn: [] },
  { id: "p4", knowledge: "The tail pushes water backwards so that the shark moves forward.", role: "mechanism", importance: "core", dependsOn: ["p3"] },
  { id: "p5", knowledge: "A shark has a pointed body.", role: "feature", importance: "core", dependsOn: [] },
  { id: "p6", knowledge: "The pointed shape lets water slide past so that the shark slows down less.", role: "mechanism", importance: "core", dependsOn: ["p5"] }
]);
assert.strictEqual(three.ok, true, (three.issues || []).join(" | "));
assert.strictEqual(three.plan.teachingPlan.substantiveDepth.strandsDeveloped, 3);
assert.strictEqual(three.plan.teachingPlan.substantiveDepth.strandsRequired, 3);

var planText = Brain.planBrief(sharkCtx()).system;
assert.ok(/at most one shared foundation/i.test(planText));
assert.ok(/dependsOn that specific feature/.test(planText));
assert.ok(/Do not invent a foundation/.test(planText));
assert.ok(/role feature or concept/.test(planText));
assert.strictEqual(/mam tor/i.test(planText), false);
var repairUser = JSON.parse(Brain.planRepairBrief(sharkCtx(), ["The learning map needs developed strands that explain how or why, not only a name."], { learningObjective: sharkGoal, learningMap: [] }).user);
var strandLine = repairUser.relationshipRequired.filter(function (line) { return line.indexOf("strands:") === 0; })[0];
assert.ok(/dependsOn that specific feature/.test(strandLine));
assert.ok(/only names what something has/.test(strandLine));
assert.ok(/non-empty dependsOn/.test(strandLine));
assert.ok(/Do not invent a foundation/.test(strandLine));
assert.ok(/correct those labels/.test(strandLine));
assert.ok(repairUser.instruction.indexOf("Do not invent a foundation") !== -1);
assert.ok(!/shark/i.test(strandLine));

function packOf(raw, ctx) {
  return Brain.normaliseKnowledgePack(raw, ctx);
}

var riverAsk = "Teach children how rivers shape the land.";
var riverCtx = { yearGroup: "Year 4", subject: "Geography", lessonText: riverAsk, topic: "Rivers" };
var localSentence = "The shale at Mam Tor slipped in 1979 because heavy rain saturated the slope.";
var river = packOf({
  status: "usable",
  niche: false,
  claims: [
    { text: "Fast water hits the rock in the river bed.", confidence: "high", depth: "concrete", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "That water wears the rock away, so that the valley grows deeper.", confidence: "high", depth: "mechanism", kind: "mechanism", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: "The water carries worn rock downstream, so that new land builds where the river slows.", confidence: "high", depth: "mechanism", kind: "mechanism", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: localSentence, confidence: "high", depth: "mechanism", kind: "mechanism", provenance: "model", ageFit: { from: 3, to: 6 } }
  ]
}, riverCtx);
assert.strictEqual(river.status, "qualified");
assert.strictEqual(river.localAdmission, "hold");
assert.strictEqual(river.needsSource, false);
assert.strictEqual(river.modelStatus, "usable");
assert.strictEqual(river.modelNiche, false);
var heldLocal = river.claims.filter(function (claim) { return claim.text === localSentence; })[0];
assert.strictEqual(heldLocal.localHold, true);
assert.strictEqual(heldLocal.support, "unsupported");
assert.strictEqual(heldLocal.factuallyVerified, false);
assert.strictEqual(heldLocal.confidence, "high");
var riverSelect = Brain.selectPackForLesson(river, riverCtx);
assert.ok(riverSelect.claimIds.indexOf(heldLocal.claimId) === -1, "selection must not teach the unsupported local claim");
assert.ok(riverSelect.heldBack.some(function (item) { return item.claimId === heldLocal.claimId && item.reason === "unsupported local claim"; }));
assert.ok(riverSelect.claimIds.length >= 2);
var riverMap = Brain.buildLearningMap({
  learningMap: [
    { id: "p1", knowledge: "Fast water hits the rock in the river bed.", role: "feature", importance: "core", dependsOn: [] },
    { id: "p2", knowledge: localSentence, role: "mechanism", importance: "core", dependsOn: ["p1"], claimIds: [heldLocal.claimId] }
  ]
}, Object.assign({}, riverCtx, { knowledgePack: river, knowledgeSelection: riverSelect }), riverAsk);
assert.ok(riverMap.items.every(function (item) { return item.knowledge !== localSentence; }));
assert.ok(riverMap.rejected.some(function (item) { return item.knowledge === localSentence; }));

var mamAsk = "Explain how the geology of Mam Tor caused the landslip.";
var mamCtx = { yearGroup: "Year 6", subject: "Geography", lessonText: mamAsk, topic: "Mam Tor" };
var mam = packOf({
  status: "usable",
  niche: false,
  claims: [
    { text: "Mam Tor is known for its significant landslip events.", confidence: "high", depth: "concrete", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "The geology of Mam Tor includes layers of shale and limestone.", confidence: "high", depth: "concrete", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "The landslip at Mam Tor is primarily caused by the saturation of the soil during heavy rainfall.", confidence: "high", depth: "mechanism", kind: "mechanism", provenance: "model", ageFit: { from: 3, to: 6 } },
    { text: "Heavy rainfall increases water content in the soil, reducing its stability.", confidence: "medium", depth: "mechanism", kind: "mechanism", provenance: "model", ageFit: { from: 3, to: 6 } }
  ]
}, mamCtx);
assert.strictEqual(mam.status, "blocked");
assert.strictEqual(mam.needsSource, true);
assert.ok(mam.statusReason.indexOf("NEEDS_SOURCE") !== -1);
assert.strictEqual(mam.modelStatus, "usable", "a usable model status does not override the admission rule");
assert.strictEqual(mam.modelNiche, false, "niche false does not override the admission rule");
assert.ok(mam.claims.some(function (claim) { return claim.confidence === "high" && claim.localHold && /shale and limestone/.test(claim.text); }));
assert.ok(mam.claims.every(function (claim) { return claim.factuallyVerified === false; }));
var mamSelect = Brain.selectPackForLesson(mam, mamCtx);
assert.strictEqual(mamSelect.status, "blocked");
assert.deepStrictEqual(mamSelect.claimIds, []);
var mamPlan = Brain.normalisePlan({
  learningObjective: "Explain how the geology of Mam Tor caused the landslip.",
  yearGroup: "Year 6",
  learningMap: [{ id: "p1", knowledge: "The geology of Mam Tor includes layers of shale and limestone.", role: "foundation", importance: "core", dependsOn: [] }],
  lessonArc: arc
}, Object.assign({}, mamCtx, { knowledgePack: mam, knowledgeSelection: mamSelect, depthRequired: true }));
assert.strictEqual(mamPlan.ok, false);
assert.ok(mamPlan.issues.join(" ").indexOf("blocked") !== -1);

var londonAsk = "Teach children about London.";
var londonCtx = { yearGroup: "Year 3", subject: "Geography", lessonText: londonAsk, topic: "London" };
var london = packOf({
  status: "usable",
  niche: false,
  claims: [
    { text: "London is a city in England.", confidence: "high", depth: "concrete", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "People visit London to see parks and museums.", confidence: "high", depth: "concrete", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: "Buses carry people into the city so that workers can reach their jobs.", confidence: "high", depth: "mechanism", kind: "mechanism", provenance: "model", ageFit: { from: 3, to: 6 } }
  ]
}, londonCtx);
assert.strictEqual(london.status, "usable");
assert.strictEqual(london.localAdmission, "clear");
assert.strictEqual(london.needsSource, false);
assert.ok(london.claims.every(function (claim) { return claim.localHold === false && claim.placeBound === false; }));
var londonSelect = Brain.selectPackForLesson(london, londonCtx);
assert.notStrictEqual(londonSelect.status, "blocked");

var suppliedText = "The shale at Beachy Head sits on sandstone, so rain made the cliff slip.";
var suppliedCtx = {
  yearGroup: "Year 4",
  subject: "Geography",
  lessonText: "Explain how the geology of Beachy Head caused the slip.",
  uploadedMaterialSummary: suppliedText
};
var supplied = packOf({
  status: "usable",
  niche: false,
  claims: [
    { text: suppliedText, confidence: "high", factuallyVerified: true, provenance: "retrieved", depth: "mechanism", kind: "mechanism", ageFit: { from: 3, to: 6 } },
    { text: "The cliff at Beachy Head fell in 1999 because the chalk was saturated.", confidence: "high", factuallyVerified: true, provenance: "model", depth: "mechanism", ageFit: { from: 3, to: 6 } },
    { text: "Rain adds water to a slope, so that loose rock can start to move.", confidence: "high", provenance: "model", depth: "mechanism", kind: "mechanism", ageFit: { from: 3, to: 6 } }
  ]
}, suppliedCtx);
var suppliedClaim = supplied.claims.filter(function (claim) { return claim.text === suppliedText; })[0];
var inventedDate = supplied.claims.filter(function (claim) { return /1999/.test(claim.text); })[0];
assert.strictEqual(supplied.status, "qualified");
assert.strictEqual(supplied.needsSource, false);
assert.strictEqual(suppliedClaim.provenance, "teacher_material");
assert.strictEqual(suppliedClaim.supplied, true);
assert.strictEqual(suppliedClaim.support, "supplied");
assert.strictEqual(suppliedClaim.factuallyVerified, false, "teacher material is not verification");
assert.strictEqual(suppliedClaim.localHold, false);
assert.strictEqual(inventedDate.localHold, true);
assert.strictEqual(inventedDate.factuallyVerified, false);
assert.strictEqual(inventedDate.support, "unsupported");
var suppliedSelect = Brain.selectPackForLesson(supplied, suppliedCtx);
assert.ok(suppliedSelect.claimIds.indexOf(suppliedClaim.claimId) !== -1);
assert.ok(suppliedSelect.claimIds.indexOf(inventedDate.claimId) === -1);

console.log("bounded corrections tests passed");
