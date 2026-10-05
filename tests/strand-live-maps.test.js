"use strict";

// Regression from the saved live repaired maps (5 Oct 2026). See
// docs/agent/strand-aiding/EVIDENCE.md and the STRAND_TRACE diagnosis.
// The cartilage mechanism is a genuine how/why. It failed only because
// statesFunction listed aid/aids/aided and not aiding. The habitat
// mechanism is inadequate and must stay undeveloped.

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var Brain = require("../js/lesson-brain.js");

function loadBrain(source, filename) {
  var sandbox = { module: { exports: {} }, exports: {}, console: console };
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: filename });
  var api = sandbox.module.exports;
  assert.strictEqual(typeof api.normalisePlan, "function");
  return api;
}

function brainWithoutAiding() {
  var file = path.join(__dirname, "../js/lesson-brain.js");
  var source = fs.readFileSync(file, "utf8");
  assert.ok(source.indexOf("|aiding|") !== -1, "statesFunction includes the aiding inflection");
  var stripped = source.replace("|aiding|", "|");
  assert.strictEqual(stripped.indexOf("aiding"), -1, "the comparison brain has no aiding inflection");
  return loadBrain(stripped, "lesson-brain-without-aiding.js");
}

function intent(goal, evidence, concepts) {
  return { ok: true, learningGoal: goal, requiredEvidence: evidence, focusConcepts: concepts, priorKnowledge: [], exclusions: [], preferences: [], subject: "Science", subjectConfidence: "explicit", durationMinutes: 15 };
}

function context(text, year, topic, teacherIntent, claims) {
  var ctx = Brain.contextFrom({ source: { text: text }, year: year, subject: "Science", topic: topic, targetMinutes: 15 });
  Brain.applyTeacherIntent(ctx, teacherIntent);
  ctx.knowledgePack = { id: "kp_test", status: "usable", claims: claims, rejectedClaims: [] };
  ctx.knowledgeSelection = { status: "ready", depthMode: "mechanism", claimIds: claims.map(function (claim) { return claim.claimId; }) };
  return ctx;
}

function claim(id, text) {
  return { claimId: id, text: text, kind: "fact", depth: "mechanism", confidence: "high", provenance: "model", contested: false, importance: "core" };
}

function planWith(brain, ctx, goal, map, settled) {
  return brain.normalisePlan({
    title: "Test", learningObjective: goal, subject: "Science", topic: ctx.topic, yearGroup: ctx.yearGroup,
    learningMap: map, lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, Object.assign({}, ctx, { depthRequired: true, breadthSettled: settled !== false }));
}

function plan(ctx, goal, map, settled) {
  return planWith(Brain, ctx, goal, map, settled);
}

function strandOf(result, ref) {
  var open = Brain.normalisePlan({
    title: "Test", learningObjective: result.goal, subject: "Science", topic: result.ctx.topic, yearGroup: result.ctx.yearGroup,
    learningMap: result.map, lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, Object.assign({}, result.ctx, { depthRequired: false, breadthSettled: true }));
  assert.ok(open.ok, (open.issues || []).join("; "));
  return open.plan.teachingPlan.strands.filter(function (row) { return row.knowledgeRefs.indexOf(ref) !== -1; })[0];
}

var SHARK_GOAL = "Pupils should understand how sharks are adapted to their ocean environment.";
var sharkCtx = context("Year 4 science. How are sharks adapted to living in the ocean?", "Year 4", "Sharks",
  intent(SHARK_GOAL, "Pupils can explain at least three adaptations of sharks and how these help them survive in the ocean.", ["adaptations", "marine environment", "shark anatomy"]),
  [
    claim("c1a6gdz6", "Sharks have streamlined bodies that reduce water resistance while swimming."),
    claim("c38sg2q", "Sharks have sharp teeth that are adapted for catching and eating prey."),
    claim("c12l5a83", "Sharks have a special organ called the ampullae of Lorenzini that detects electrical fields in the water."),
    claim("c1uhsxz4", "Sharks have a layer of cartilage instead of bones, which makes them lighter and more flexible."),
    claim("cbx24wx", "Sharks have gills that allow them to extract oxygen from water."),
    claim("cpsjkm0", "Sharks can sense vibrations in the water, which helps them locate prey."),
    claim("cbfoomg", "The streamlined body shape reduces drag, allowing sharks to swim efficiently."),
    claim("c1cqab7l", "The cartilage structure provides flexibility and buoyancy, aiding in movement."),
    claim("c1gz46al", "The ampullae of Lorenzini help sharks detect prey by sensing electrical signals.")
  ]);

var sharkMap = [
  { id: "k1", role: "feature", dependsOn: [], knowledge: "Sharks have streamlined bodies that reduce water resistance while swimming." },
  { id: "k2", role: "mechanism", dependsOn: ["k1"], knowledge: "The streamlined body shape reduces drag, allowing sharks to swim efficiently." },
  { id: "k3", role: "feature", dependsOn: [], knowledge: "Sharks have a layer of cartilage instead of bones, which makes them lighter and more flexible." },
  { id: "k4", role: "mechanism", dependsOn: ["k3"], knowledge: "The cartilage structure provides flexibility and buoyancy, aiding in movement." },
  { id: "k5", role: "feature", dependsOn: [], knowledge: "Sharks have a special organ called the ampullae of Lorenzini that detects electrical fields in the water." },
  { id: "k6", role: "mechanism", dependsOn: ["k5"], knowledge: "The ampullae of Lorenzini help sharks detect prey by sensing electrical signals." }
];

var without = brainWithoutAiding();
var sharksBefore = planWith(without, sharkCtx, SHARK_GOAL, sharkMap);
assert.strictEqual(sharksBefore.depth.requiredStrands, 3, "the strand requirement is not lowered");
assert.strictEqual(sharksBefore.depth.developedStrands, 2, "without aiding the cartilage strand stays undeveloped");
assert.strictEqual(sharksBefore.ok, false);

var sharks = plan(sharkCtx, SHARK_GOAL, sharkMap);
assert.strictEqual(sharks.depth.requiredStrands, 3, "the strand requirement is not lowered");
assert.strictEqual(sharks.depth.developedStrands, 3, "the cartilage strand explains its function with aiding in movement");
assert.strictEqual(sharks.ok, true, (sharks.issues || []).join("; "));
var cartilage = strandOf({ ctx: sharkCtx, goal: SHARK_GOAL, map: sharkMap }, "k4");
assert.deepStrictEqual(cartilage.knowledgeRefs, ["k3", "k4"], "grouping keeps the cartilage feature and its mechanism together");
assert.strictEqual(cartilage.developed, true);

var named = sharkMap.map(function (row) { return Object.assign({}, row); });
named[3].knowledge = "Cartilage is a flexible tissue that is lighter than bone.";
var namedCtx = context("Year 4 science. How are sharks adapted to living in the ocean?", "Year 4", "Sharks", sharkCtx.lessonBrief.teacherIntent,
  sharkCtx.knowledgePack.claims.concat([claim("cneg1", "Cartilage is a flexible tissue that is lighter than bone.")]));
var namedPlan = plan(namedCtx, SHARK_GOAL, named);
assert.strictEqual(namedPlan.ok, false, "a mechanism slot that only names the tissue is not a developed strand");
assert.strictEqual(namedPlan.depth.developedStrands, 2);

var singletons = [
  { id: "k1", role: "feature", dependsOn: [], knowledge: "Sharks have streamlined bodies that reduce water resistance while swimming." },
  { id: "k2", role: "feature", dependsOn: [], knowledge: "The cartilage structure provides flexibility and buoyancy, aiding in movement." },
  { id: "k3", role: "feature", dependsOn: [], knowledge: "The ampullae of Lorenzini help sharks detect prey by sensing electrical signals." },
  { id: "k4", role: "function", dependsOn: [], knowledge: "The streamlined body shape reduces drag, allowing sharks to swim efficiently." },
  { id: "k5", role: "mechanism", dependsOn: [], knowledge: "Sharks can sense vibrations in the water, which helps them locate prey." },
  { id: "k6", role: "feature", dependsOn: [], knowledge: "Sharks have gills that allow them to extract oxygen from water." }
];
var single = plan(sharkCtx, SHARK_GOAL, singletons);
assert.strictEqual(single.ok, false, "singleton function points are not developed strands");
assert.strictEqual(single.depth.developedStrands, 0);

var echoCtx = context("Year 4 science. How are sharks adapted to living in the ocean?", "Year 4", "Sharks", sharkCtx.lessonBrief.teacherIntent,
  sharkCtx.knowledgePack.claims.concat([
    claim("cneg2", "Sharks have strong curved tail fins aiding fast swimming."),
    claim("cneg3", "Strong curved tail fins on sharks aiding fast swimming.")
  ]));
var echoMap = sharkMap.slice(0, 2).concat([
  { id: "k3", role: "feature", dependsOn: [], knowledge: "Sharks have strong curved tail fins aiding fast swimming." },
  { id: "k4", role: "mechanism", dependsOn: ["k3"], knowledge: "Strong curved tail fins on sharks aiding fast swimming." }
]).concat(sharkMap.slice(4));
var echoed = plan(echoCtx, SHARK_GOAL, echoMap);
assert.strictEqual(echoed.ok, false, "an echoed mechanism does not develop the tail strand");
assert.strictEqual(echoed.depth.developedStrands, 2);

var DINO_GOAL = "Students will understand the different types of dinosaurs and their characteristics.";
var dinoCtx = context("Year 3 science. Teach children about dinosaurs.", "Year 3", "Dinosaurs",
  intent(DINO_GOAL, "Students can categorize dinosaurs based on their features and provide examples of each type.", ["types of dinosaurs", "characteristics of dinosaurs", "dinosaur habitats"]),
  [
    claim("c1ea3xar", "There are two main types of dinosaurs: herbivores, which eat plants, and carnivores, which eat meat."),
    claim("clgk2q7", "Some dinosaurs, like the Tyrannosaurus rex, had sharp teeth for eating meat."),
    claim("c1t2vs4u", "Dinosaurs lived in a variety of habitats, including forests, deserts, and wetlands."),
    claim("c50naea", "Dinosaurs are classified into different groups based on their physical characteristics, such as body shape and size."),
    claim("c7mrqzd", "Dinosaurs adapted to their environments, which influenced their physical features and behaviors."),
    claim("c1oq7n2x", "The structure of a dinosaur's teeth indicates its diet, helping to classify it as a herbivore or carnivore.")
  ]);
var dinoMap = [
  { id: "k1", role: "feature", dependsOn: [], knowledge: "There are two main types of dinosaurs: herbivores, which eat plants, and carnivores, which eat meat." },
  { id: "k2", role: "example", dependsOn: ["k1"], knowledge: "Some dinosaurs, like the Tyrannosaurus rex, had sharp teeth for eating meat." },
  { id: "k3", role: "mechanism", dependsOn: ["k1"], knowledge: "The structure of a dinosaur's teeth indicates its diet, helping to classify it as a herbivore or carnivore." },
  { id: "k4", role: "feature", dependsOn: [], knowledge: "Dinosaurs lived in a variety of habitats, including forests, deserts, and wetlands." },
  { id: "k5", role: "mechanism", dependsOn: ["k4"], knowledge: "Dinosaurs adapted to their environments, which influenced their physical features and behaviors." }
];
var dinosBefore = planWith(without, dinoCtx, DINO_GOAL, dinoMap);
var dinos = plan(dinoCtx, DINO_GOAL, dinoMap);
assert.strictEqual(dinosBefore.depth.developedStrands, 1);
assert.strictEqual(dinos.depth.requiredStrands, 2, "the broad Year 3 requirement is not lowered");
assert.strictEqual(dinos.depth.developedStrands, 1, "a vague adapted which influenced sentence does not explain the habitat strand");
assert.strictEqual(dinos.ok, false);
assert.deepStrictEqual(dinos.issues, ["The learning map needs two or more developed strands for this broad topic."]);
var habitats = strandOf({ ctx: dinoCtx, goal: DINO_GOAL, map: dinoMap }, "k5");
assert.deepStrictEqual(habitats.knowledgeRefs, ["k4", "k5"]);
assert.strictEqual(habitats.developed, false);

console.log("strand-live-maps tests passed");
