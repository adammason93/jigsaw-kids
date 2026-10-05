"use strict";

// dependsOn on the saved Year 3 map was already empty in the parsed model JSON.
// These checks lock the contract: keep a real link, reject a bad id, and do not
// invent a link from point order or from a neighbour that happens to match.

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var mesozoic = "Dinosaurs lived during the Mesozoic Era, which lasted about 180 million years.";
var kinds = "There are three main types of dinosaurs: carnivores, herbivores, and omnivores.";
var rex = "Tyrannosaurus rex was a carnivorous dinosaur known for its large size and sharp teeth.";
var brach = "Brachiosaurus was a herbivorous dinosaur that had a long neck for reaching high vegetation.";
var teeth = "The structure of a dinosaur's teeth helps determine whether it was a carnivore or herbivore.";
var body = "The shape of a dinosaur's body can indicate how it moved and what it ate.";
var neck = "The length of a dinosaur's neck allows it to reach food in tall trees.";
var ask = "Year 3 science. Teach children about dinosaurs.";
var goal = "Students will understand the different types of dinosaurs and their characteristics.";

function ctxFor(extra) {
  return Object.assign({
    yearGroup: "Year 3",
    subject: "Science",
    topic: "Dinosaurs",
    requestedMinutes: 15,
    lessonText: ask,
    lessonBrief: {
      intent: "explain",
      rawRequest: ask,
      learningGoal: goal,
      teacherIntent: { ok: true, learningGoal: goal, requiredEvidence: "Students can identify and describe types of dinosaurs and their features." }
    }
  }, extra || {});
}

function point(id, role, knowledge, dependsOn, explains) {
  var row = { id: id, role: role, importance: "core", knowledge: knowledge, dependsOn: dependsOn || [] };
  if (explains != null) row.explains = explains;
  return row;
}

function built(map, extra) {
  var parsed = {
    learningObjective: goal,
    subject: "Science",
    topic: "Dinosaurs",
    yearGroup: "Year 3",
    learningMap: map,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  };
  return Brain.buildLearningMap(parsed, ctxFor(extra), goal);
}

function item(result, snippet) {
  return result.items.filter(function (row) { return row.knowledge.indexOf(snippet) !== -1; })[0] || null;
}

function linkedKnowledge(result, snippet) {
  var row = item(result, snippet);
  if (!row) return null;
  return row.dependsOn.map(function (id) {
    var other = result.items.filter(function (pointRow) { return pointRow.id === id; })[0];
    return other ? other.knowledge : id;
  });
}

var savedOrder = [
  point("p1", "fact", mesozoic),
  point("p2", "fact", kinds),
  point("p3", "fact", rex),
  point("p4", "fact", brach),
  point("p5", "mechanism", teeth),
  point("p6", "mechanism", body)
];
var flat = built(savedOrder);
assert.ok(item(flat, "teeth helps determine"), "an unlinked mechanism stays in the map when nothing else is linked");
assert.deepStrictEqual(linkedKnowledge(flat, "teeth helps determine"), [], "empty dependsOn is not filled from the previous point");
assert.deepStrictEqual(linkedKnowledge(flat, "shape of a dinosaur"), [], "a later mechanism is not tied to an earlier fact by order");
savedOrder.forEach(function (row) {
  assert.deepStrictEqual(linkedKnowledge(flat, row.knowledge.slice(0, 24)), [], row.id);
});

var valid = built([
  point("p1", "fact", mesozoic),
  point("p2", "fact", kinds),
  point("p3", "fact", rex),
  point("p4", "fact", brach),
  point("p5", "mechanism", teeth, ["p3"])
]);
assert.ok(linkedKnowledge(valid, "teeth helps determine").indexOf(rex) !== -1, "an array link to the teeth feature is kept");
assert.ok(linkedKnowledge(valid, "teeth helps determine").indexOf(mesozoic) === -1);

var asString = built([
  point("p1", "feature", rex),
  point("p2", "mechanism", teeth, "p1")
], { requestedMinutes: 8 });
assert.deepStrictEqual(linkedKnowledge(asString, "teeth helps determine"), [rex], "a string dependsOn id is kept");

var explained = built([
  point("p1", "feature", rex),
  point("p2", "mechanism", teeth, [], "p1")
], { requestedMinutes: 8 });
assert.deepStrictEqual(linkedKnowledge(explained, "teeth helps determine"), [rex], "explains id is kept as the feature link");

var wrong = built([
  point("p1", "fact", mesozoic),
  point("p2", "fact", kinds),
  point("p3", "fact", rex),
  point("p4", "fact", brach),
  point("p5", "mechanism", teeth, ["p1"]),
  point("p6", "mechanism", body, ["p99"])
]);
assert.deepStrictEqual(linkedKnowledge(wrong, "teeth helps determine"), [], "a link that does not explain the teeth feature is dropped");
assert.ok((linkedKnowledge(wrong, "teeth helps determine") || []).indexOf(rex) === -1, "the dropped link is not moved onto the teeth point");
var bodyLinks = linkedKnowledge(wrong, "shape of a dinosaur");
assert.ok(bodyLinks === null || bodyLinks.length === 0, "an unknown id is dropped and not replaced by a neighbour");

var first = [
  point("p1", "fact", mesozoic),
  point("p2", "fact", rex),
  point("p3", "mechanism", teeth, ["p2"])
];
var repaired = built([
  point("p1", "fact", mesozoic),
  point("p2", "fact", rex),
  point("p3", "mechanism", teeth, [])
], { priorPlan: { learningMap: first } });
assert.ok(linkedKnowledge(repaired, "teeth helps determine").indexOf(rex) !== -1, "a repair that omits dependsOn keeps the earlier valid link");

var changed = built([
  point("p1", "fact", mesozoic),
  point("p2", "fact", rex),
  point("p3", "mechanism", "Dinosaurs had feathers that kept them warm.", [])
], { priorPlan: { learningMap: first } });
var feather = item(changed, "feathers");
assert.ok(feather);
assert.deepStrictEqual(feather.dependsOn, [], "a new sentence does not inherit another point's link");

var pack = Brain.normaliseKnowledgePack({
  status: "usable",
  claims: [
    { text: mesozoic, kind: "fact", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
    { text: kinds, kind: "fact", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
    { text: rex, kind: "fact", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
    { text: brach, kind: "fact", depth: "concrete", confidence: "high", provenance: "model", factuallyVerified: false, ageFit: { from: 1, to: 6 } },
    { text: teeth, kind: "mechanism", depth: "mechanism", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } },
    { text: neck, kind: "mechanism", depth: "mechanism", confidence: "medium", provenance: "model", factuallyVerified: false, ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [
    { text: teeth, feature: "sharp teeth" },
    { text: neck, feature: "long neck" }
  ]
}, ctxFor());
var kindsClaim = pack.claims.filter(function (claim) { return /omnivores/.test(claim.text); })[0];
assert.ok(kindsClaim);
assert.strictEqual(kindsClaim.confidence, "high");
assert.strictEqual(kindsClaim.factuallyVerified, false, "model confidence is not verification");
assert.strictEqual(kindsClaim.classificationHold, true);
assert.strictEqual(pack.claims.filter(function (claim) { return /teeth helps determine/.test(claim.text); })[0].classificationHold, false);
var selection = Brain.selectPackForLesson(pack, ctxFor());
assert.ok(selection.claimIds.indexOf(kindsClaim.claimId) === -1, "the unverified classification is not selected");
assert.ok(selection.heldBack.some(function (row) { return row.claimId === kindsClaim.claimId && row.reason === "unsupported classification"; }));
var packedBrief = JSON.parse(Brain.planBrief(ctxFor({ knowledgePack: pack, knowledgeSelection: selection })).user);
assert.ok(packedBrief.knowledgePack.doNotTeach.indexOf(kinds) !== -1);
var teethMech = pack.mechanisms.filter(function (item) { return /teeth helps determine/.test(item.text); })[0];
var rexClaim = pack.claims.filter(function (claim) { return /Tyrannosaurus rex/.test(claim.text); })[0];
assert.strictEqual(teethMech.feature, "sharp teeth");
assert.strictEqual(teethMech.featureClaimId, rexClaim.claimId, "the mechanism records the claim for its feature");

var asked = Brain.normaliseKnowledgePack({
  status: "usable",
  claims: [{ text: kinds, kind: "fact", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } }]
}, ctxFor({ lessonText: "Year 3 science. Teach three types of dinosaurs.", lessonBrief: { rawRequest: "Year 3 science. Teach three types of dinosaurs.", teacherIntent: { learningGoal: "Name three types of dinosaurs." } } }));
assert.strictEqual(asked.claims[0].classificationHold, false, "a count the teacher asked for stays eligible");

var supplied = Brain.normaliseKnowledgePack({
  status: "usable",
  claims: [{ text: kinds, kind: "fact", depth: "concrete", confidence: "high", provenance: "teacher_material", ageFit: { from: 1, to: 6 } }]
}, ctxFor({ uploadedMaterialSummary: kinds }));
assert.strictEqual(supplied.claims[0].classificationHold, false, "teacher material is not treated as an invented classification");
assert.strictEqual(supplied.claims[0].factuallyVerified, false);

var paired = built([
  point("p1", "fact", rex),
  point("p2", "mechanism", teeth),
  point("p3", "fact", brach)
], {
  requestedMinutes: 8,
  knowledgePack: pack,
  knowledgeSelection: selection
});
assert.deepStrictEqual(linkedKnowledge(paired, "teeth helps determine"), [rex], "the pack feature links the teeth mechanism to the teeth claim");
var neckPair = built([
  point("p1", "fact", brach),
  point("p2", "mechanism", neck),
  point("p3", "fact", rex)
], {
  requestedMinutes: 8,
  knowledgePack: pack,
  knowledgeSelection: selection
});
assert.deepStrictEqual(linkedKnowledge(neckPair, "length of a dinosaur's neck"), [brach], "the pack feature links the neck mechanism to the neck claim");
assert.ok(linkedKnowledge(neckPair, "length of a dinosaur's neck").indexOf(rex) === -1, "the neck mechanism is not linked to the neighbouring teeth point");

var mismatched = Brain.normaliseKnowledgePack({
  status: "usable",
  claims: [
    { text: mesozoic, kind: "fact", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: rex, kind: "fact", depth: "concrete", confidence: "high", provenance: "model", ageFit: { from: 1, to: 6 } },
    { text: teeth, kind: "mechanism", depth: "mechanism", confidence: "medium", provenance: "model", ageFit: { from: 3, to: 6 } }
  ],
  mechanisms: [{ text: teeth, feature: "Mesozoic Era" }]
}, ctxFor());
var mismatchSelect = Brain.selectPackForLesson(mismatched, ctxFor());
var mismatchMap = built([
  point("p1", "fact", mesozoic),
  point("p2", "fact", rex),
  point("p3", "mechanism", teeth)
], { requestedMinutes: 8, knowledgePack: mismatched, knowledgeSelection: mismatchSelect });
assert.deepStrictEqual(linkedKnowledge(mismatchMap, "teeth helps determine"), [], "a feature phrase the mechanism does not explain does not create a link");

var shape = Brain.planBrief(ctxFor()).system;
assert.ok(shape.indexOf("dependsOn, explains") !== -1);
assert.ok(shape.indexOf("mechanisms: [{ text, feature }]") === -1, "the plan brief is not the pack brief");
var packShape = Brain.knowledgePackBrief(ctxFor()).system;
assert.ok(packShape.indexOf("mechanisms: [{ text, feature }]") !== -1);
assert.ok(/does not verify a claim/.test(packShape));

console.log("link contract tests passed");
