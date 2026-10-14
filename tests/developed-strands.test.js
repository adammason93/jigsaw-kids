"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var GOAL = "Students will understand basic facts about sharks and their habitats.";
var CTX = {
  yearGroup: "Year 1", subject: "Science", topic: "Science Children Sharks", requestedMinutes: 15, depthRequired: true,
  lessonText: "Year 1\nScience\n15 minutes\nTeach children about sharks.",
  lessonBrief: {
    intent: "explain", rawRequest: "Year 1\nScience\n15 minutes\nTeach children about sharks.", learningGoal: GOAL,
    teacherIntent: { ok: true, learningGoal: GOAL, requiredEvidence: "Students can describe at least three characteristics of sharks and where they live.", focusConcepts: ["shark anatomy", "shark habitats", "shark behavior"] }
  }
};

function plan(map, extra) {
  return Brain.normalisePlan({ title: "Sharks", learningObjective: GOAL, subject: "Science", topic: "Sharks", yearGroup: "Year 1", learningMap: map, lessonArc: [{ purpose: "teach" }, { purpose: "check" }] }, Object.assign({}, CTX, extra || {}));
}

// Exact structure of production request 469a81fc: six substantive points, every dependsOn empty,
// with relationship wording in two of them.
var production = [
  { id: "k1", knowledge: "Sharks have a unique body structure with fins and gills.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "k2", knowledge: "Sharks use their fins to swim efficiently in the water.", role: "function", importance: "core", dependsOn: [] },
  { id: "k3", knowledge: "Sharks live in various habitats, including oceans and some rivers.", role: "feature", importance: "core", dependsOn: [] },
  { id: "k4", knowledge: "Some sharks are fast swimmers because of their strong fins.", role: "mechanism", importance: "core", dependsOn: [] },
  { id: "k5", knowledge: "Different species of sharks have different behaviors, such as hunting or schooling.", role: "concept", importance: "core", dependsOn: [] },
  { id: "k6", knowledge: "The unique body structure of sharks, their habitats, and their behaviors all work together to make them successful predators.", role: "connection", importance: "core", dependsOn: [] }
];

var first = plan(production);
assert.strictEqual(first.ok, false, "the flat production map is not accepted on the first pass");
assert.deepStrictEqual(first.issues, ["The learning map needs two or more developed strands for this broad topic."], first.issues.join("; "));
assert.strictEqual(first.depth.requiredStrands, 2);
assert.strictEqual(first.depth.developedStrands, 0, "relationship wording alone does not develop a strand");
assert.strictEqual(first.depth.met, false);
assert.ok(first.depth.achievedDepth >= first.depth.requiredDepth, "the failure is the strand structure, not the point count");
assert.deepStrictEqual(first.depth.map.map(function (row) { return row.dependsOn.length; }), [0, 0, 0, 0, 0, 0], "the diagnostic carries the first-pass dependencies");

var settled = plan(production, { breadthSettled: true });
assert.strictEqual(settled.ok, false, "a repaired flat map still has to develop its strands");
assert.ok((settled.issues || []).indexOf("The learning map needs two or more developed strands for this broad topic.") !== -1, (settled.issues || []).join("; "));
assert.strictEqual(settled.depth.developedStrands, 0);
assert.strictEqual(settled.depth.met, false, "a flat map is recorded as met:false");
var inspected = plan(production, { depthRequired: false });
assert.strictEqual(inspected.ok, true, (inspected.issues || []).join("; "));
inspected.plan.teachingPlan.strands.forEach(function (row) {
  assert.strictEqual(row.developed, false, row.id + " is a single point and is not developed");
});

var brief = JSON.parse(Brain.planRepairBrief(CTX, first.issues, first.previous).user);
var strands = brief.relationshipRequired.filter(function (line) { return line.indexOf("strands:") === 0; })[0];
assert.ok(strands && /dependsOn/.test(strands) && /non-empty dependsOn/.test(strands), "the repair says development is read from dependsOn");
assert.ok(!/shark/i.test(strands), "the repair example is not topic-specific");
assert.ok(brief.previous && brief.previous.learningMap, "the repair sees the failed map");

// The same ideas, with genuine dependency-linked progression.
var repaired = [
  { id: "k1", knowledge: "Sharks are fish with fins and gills.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "k2", knowledge: "Sharks have strong fins and a tail.", role: "feature", importance: "core", dependsOn: ["k1"] },
  { id: "k3", knowledge: "The tail and fins push the water so the shark moves fast.", role: "mechanism", importance: "core", dependsOn: ["k2"] },
  { id: "k4", knowledge: "Sharks have gills on the sides of their heads.", role: "feature", importance: "core", dependsOn: ["k1"] },
  { id: "k5", knowledge: "Gills take oxygen out of the water so sharks can breathe.", role: "function", importance: "core", dependsOn: ["k4"] },
  { id: "k6", knowledge: "Sharks live in oceans and some rivers.", role: "concept", importance: "core", dependsOn: ["k1"] }
];
var fixed = plan(repaired);
assert.strictEqual(fixed.ok, true, (fixed.issues || []).join("; "));
var depth = fixed.plan.teachingPlan.substantiveDepth;
assert.strictEqual(depth.strandsDeveloped, 2, "two genuine developed strands");
assert.strictEqual(depth.met, true);
assert.deepStrictEqual(fixed.plan.teachingPlan.strands.filter(function (row) { return row.developed; }).map(function (row) { return row.knowledgeRefs; }), [["k2", "k3"], ["k4", "k5"]]);

// Structure, not prose: the same dependency shape with plain wording still develops,
// and relationship wording without the dependency still does not.
var plain = repaired.map(function (row) { return Object.assign({}, row); });
plain[2].knowledge = "The tail and fins push water back to move the shark fast.";
assert.strictEqual(plan(plain).plan.teachingPlan.substantiveDepth.strandsDeveloped, 2);
var unlinked = repaired.map(function (row) { return Object.assign({}, row, { dependsOn: row.id === "k1" ? [] : ["k1"] }); });
var hub = plan(unlinked, { depthRequired: false }).plan.teachingPlan.substantiveDepth;
assert.strictEqual(hub.strandsDeveloped, 0, "points that each hang off the foundation are separate facts, not developed strands");

// A connection that spans undeveloped strands does not manufacture development.
var spanning = production.map(function (row) { return Object.assign({}, row); });
spanning[5].dependsOn = ["k2", "k4"];
var span = plan(spanning, { depthRequired: false }).plan.teachingPlan;
assert.strictEqual(span.substantiveDepth.strandsDeveloped, 0, "a connection point does not develop the strands it links");

// An example that depends on the idea it shows develops that idea.
var example = repaired.slice(0, 3).concat([
  { id: "k4", knowledge: "Sharks have gills on the sides of their heads.", role: "feature", importance: "core", dependsOn: ["k1"] },
  { id: "k5", knowledge: "A great white shark has five gill slits on each side.", role: "example", importance: "supporting", dependsOn: ["k4"] }
]);
assert.strictEqual(plan(example, { depthRequired: false }).plan.teachingPlan.substantiveDepth.strandsDeveloped, 2);

console.log("developed strand tests passed");
