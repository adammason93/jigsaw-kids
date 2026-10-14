"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var arc = [{ purpose: "teach" }, { purpose: "check" }];

function admit(year, ask, goal, map, extra) {
  extra = extra || {};
  var brief = Object.assign({
    intent: "explain",
    rawRequest: ask,
    learningGoal: goal,
    teacherIntent: { ok: true, learningGoal: goal }
  }, extra.lessonBrief || {});
  var ctx = {
    yearGroup: year,
    requestedMinutes: extra.minutes || 15,
    lessonText: ask,
    topic: ask,
    depthRequired: extra.depthRequired !== false,
    breadthSettled: !!extra.breadthSettled,
    lessonBrief: brief
  };
  return Brain.normalisePlan({
    learningObjective: goal,
    yearGroup: year,
    topic: ask,
    learningMap: map,
    lessonArc: arc
  }, ctx);
}

function depthOf(made) {
  return made.depth || (made.plan && made.plan.teachingPlan && made.plan.teachingPlan.substantiveDepth && {
    requiredDepth: made.plan.teachingPlan.substantiveDepth.required,
    achievedDepth: made.plan.teachingPlan.substantiveDepth.achieved,
    requiredStrands: made.plan.teachingPlan.substantiveDepth.strandsRequired,
    developedStrands: made.plan.teachingPlan.substantiveDepth.strandsDeveloped,
    met: made.plan.teachingPlan.substantiveDepth.met,
    map: made.plan.learningMap
  }) || {};
}

function knowledgeText(made) {
  var rows = (made.depth && made.depth.map) || (made.plan && made.plan.learningMap) || [];
  return rows.map(function (row) { return row.knowledge; }).join(" | ");
}

function failsClosed(made) {
  var issues = (made.issues || []).join(" ");
  assert.strictEqual(made.ok, false, issues);
  assert.ok(issues.indexOf("developed strands that explain how or why") !== -1, issues);
  assert.strictEqual(depthOf(made).developedStrands, 0);
  assert.strictEqual(depthOf(made).met, false);
}

var sharkAsk = "How are sharks adapted to living in the ocean?";
var sharkGoal = "Pupils will understand how sharks are adapted to living in the ocean.";
var sharkShallow = [
  { id: "p1", knowledge: "Sharks live in the ocean.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Sharks have fins.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "Sharks have gills.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p4", knowledge: "Sharks have sharp teeth.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p5", knowledge: "Sharks have a tail.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p6", knowledge: "Sharks have skin.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p7", knowledge: "Sharks have a pointed nose.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p8", knowledge: "These parts help sharks survive in the ocean.", role: "function", importance: "core", dependsOn: ["p2"] }
];
var sharkBand = { "Year 1": 5, "Year 2": 5, "Year 4": 6, "Year 6": 7 };
var strandMin = { "Year 1": 2, "Year 2": 2, "Year 4": 3, "Year 6": 3 };
Object.keys(sharkBand).forEach(function (year) {
  var made = admit(year, sharkAsk, sharkGoal, sharkShallow, { breadthSettled: true });
  failsClosed(made);
  assert.strictEqual(depthOf(made).requiredDepth, sharkBand[year], year + " uses the depth floor, not the narrow floor");
  assert.strictEqual(depthOf(made).requiredStrands, strandMin[year]);
  assert.ok(knowledgeText(made).indexOf("Sharks have fins.") !== -1, "a name can stay as a foundation");
});

var oneStrand = [
  { id: "p1", knowledge: "Sharks are fish that live in the ocean.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "A shark has a smooth, pointed body.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "The pointed shape lets water slide past, so the shark can swim more easily.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
  { id: "p4", knowledge: "The tail pushes water backwards so that the shark swims forward.", role: "mechanism", importance: "core", dependsOn: ["p3"] },
  { id: "p5", knowledge: "That forward push lets the shark chase fish in the ocean.", role: "effect", importance: "core", dependsOn: ["p4"] }
];
var single = admit("Year 2", sharkAsk, sharkGoal, oneStrand, { breadthSettled: true });
assert.strictEqual(single.ok, false);
assert.strictEqual(depthOf(single).developedStrands, 1, "one developed strand is not a pass");
assert.strictEqual(depthOf(single).requiredStrands, 2);
assert.ok((single.issues || []).join(" ").indexOf("more connected learning points") === -1, "Year 2 already has enough points; the miss is strands");

function sharkRich(count) {
  return [
    { id: "p1", knowledge: "Sharks are fish that live in the ocean.", role: "foundation", importance: "core", dependsOn: [] },
    { id: "p2", knowledge: "A shark has a smooth, pointed body.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p3", knowledge: "The pointed shape lets water slide past, so the shark can swim more easily.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
    { id: "p4", knowledge: "A shark has a strong tail.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p5", knowledge: "The tail pushes water backwards so that the shark swims forward.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
    { id: "p6", knowledge: "A shark has gills on the sides of its head.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p7", knowledge: "Gills take oxygen out of the water so that the shark can breathe.", role: "mechanism", importance: "core", dependsOn: ["p6"] },
    { id: "p8", knowledge: "The pointed body, the tail and the gills work together so the shark can live and hunt in the ocean.", role: "connection", importance: "core", dependsOn: ["p3", "p5", "p7"] }
  ].slice(0, count);
}

var young = admit("Year 2", sharkAsk, sharkGoal, sharkRich(5));
assert.strictEqual(young.ok, true, (young.issues || []).join("; "));
assert.strictEqual(depthOf(young).requiredDepth, 5);
assert.strictEqual(depthOf(young).requiredStrands, 2);
assert.strictEqual(depthOf(young).developedStrands, 2);
assert.strictEqual(depthOf(young).met, true);
var twoStrands = admit("Year 4", sharkAsk, sharkGoal, sharkRich(5), { breadthSettled: true });
assert.strictEqual(twoStrands.ok, false, "breadthSettled must not waive a depth-seeking floor");
assert.ok((twoStrands.issues || []).join(" ").indexOf("more connected learning points") !== -1);
var middleShort = admit("Year 4", sharkAsk, sharkGoal, sharkRich(5).concat([
  { id: "p6", knowledge: "That forward push lets the shark chase fish in the ocean.", role: "effect", importance: "core", dependsOn: ["p5"] }
]), { breadthSettled: true });
assert.strictEqual(middleShort.ok, false, "two developed strands are not enough in Year 4");
assert.strictEqual(depthOf(middleShort).developedStrands, 2);
assert.strictEqual(depthOf(middleShort).requiredStrands, 3);
assert.ok((middleShort.issues || []).join(" ").indexOf("developed strands that explain how or why") !== -1);

var middle = admit("Year 4", sharkAsk, sharkGoal, sharkRich(7));
assert.strictEqual(middle.ok, true, (middle.issues || []).join("; "));
assert.strictEqual(depthOf(middle).requiredDepth, 6);
assert.strictEqual(depthOf(middle).requiredStrands, 3);
assert.strictEqual(depthOf(middle).developedStrands, 3);
assert.ok(knowledgeText(middle).indexOf("shark can breathe") !== -1);
var middleShortOfOlder = admit("Year 6", sharkAsk, sharkGoal, sharkRich(6));
assert.strictEqual(middleShortOfOlder.ok, false);
assert.strictEqual(depthOf(middleShortOfOlder).requiredDepth, 7);
assert.strictEqual(depthOf(middleShortOfOlder).requiredStrands, 3);
var year6Three = admit("Year 6", sharkAsk, sharkGoal, sharkRich(7));
assert.strictEqual(year6Three.ok, true, (year6Three.issues || []).join("; "));
assert.strictEqual(depthOf(year6Three).requiredStrands, 3);
assert.strictEqual(depthOf(year6Three).developedStrands, 3);

var older = admit("Year 6", sharkAsk, sharkGoal, sharkRich(8));
assert.strictEqual(older.ok, true, (older.issues || []).join("; "));
assert.strictEqual(depthOf(older).requiredDepth, 7);
assert.strictEqual(depthOf(older).achievedDepth, 8);
assert.strictEqual(depthOf(older).requiredStrands, 3);
assert.strictEqual(depthOf(older).developedStrands, 3);
assert.ok(knowledgeText(older).indexOf("work together") !== -1, "Year 6 keeps the connection");

function named(ask, goal, feature, nameOnly) {
  return [
    { id: "p1", knowledge: feature, role: "foundation", importance: "core", dependsOn: [] },
    { id: "p2", knowledge: "There is a part worth noticing here.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p3", knowledge: nameOnly, role: "mechanism", importance: "core", dependsOn: ["p2"] },
    { id: "p4", knowledge: "There is a second part worth noticing.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p5", knowledge: nameOnly, role: "function", importance: "core", dependsOn: ["p4"] }
  ];
}
[
  [sharkAsk, sharkGoal, "Sharks live in the ocean.", "Sharks have fins."],
  ["How do rivers shape the land?", "Pupils will understand how rivers shape the land.", "Rivers flow across the land.", "Rivers have banks."],
  ["How do plants make their own food?", "Pupils will understand how plants make their own food.", "Plants grow in soil.", "Plants need water."]
].forEach(function (row) {
  var made = admit("Year 2", row[0], row[1], named(row[0], row[1], row[2], row[3]), { breadthSettled: true });
  failsClosed(made);
  assert.ok(knowledgeText(made).indexOf(row[3]) !== -1, row[3] + " stays on the map");
});

var riverAsk = "How do rivers shape the land?";
var riverGoal = "Pupils will understand how rivers shape the land.";
function riverRich(count) {
  return [
    { id: "p1", knowledge: "A river is water moving downhill across the land.", role: "foundation", importance: "core", dependsOn: [] },
    { id: "p2", knowledge: "Fast water hits the rock and soil in the river bed.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p3", knowledge: "That water wears the rock away, so the valley grows deeper.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
    { id: "p4", knowledge: "The river picks up the pieces of worn rock.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p5", knowledge: "The water carries that rock downstream, so new land builds where the river slows.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
    { id: "p6", knowledge: "A river bends where the land is flatter.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p6b", knowledge: "The outside of the bend flows faster, so it wears that bank away.", role: "mechanism", importance: "core", dependsOn: ["p6"] },
    { id: "p7", knowledge: "Wearing rock away, carrying it and bending the banks work together, so the river reshapes the land along its whole path.", role: "connection", importance: "core", dependsOn: ["p3", "p5", "p6b"] }
  ].slice(0, count);
}
var riverYoung = admit("Year 2", riverAsk, riverGoal, riverRich(5));
var riverMiddle = admit("Year 4", riverAsk, riverGoal, riverRich(7));
var riverOlder = admit("Year 6", riverAsk, riverGoal, riverRich(8));
assert.strictEqual(riverYoung.ok, true, (riverYoung.issues || []).join("; "));
assert.strictEqual(riverMiddle.ok, true, (riverMiddle.issues || []).join("; "));
assert.strictEqual(riverOlder.ok, true, (riverOlder.issues || []).join("; "));
assert.deepStrictEqual([depthOf(riverYoung).requiredStrands, depthOf(riverMiddle).requiredStrands, depthOf(riverOlder).requiredStrands], [2, 3, 3]);
assert.deepStrictEqual([depthOf(riverYoung).developedStrands, depthOf(riverMiddle).developedStrands, depthOf(riverOlder).developedStrands], [2, 3, 3]);
assert.deepStrictEqual([depthOf(riverYoung).requiredDepth, depthOf(riverMiddle).requiredDepth, depthOf(riverOlder).requiredDepth], [5, 6, 7]);
assert.ok(knowledgeText(riverOlder).indexOf("work together") !== -1);
assert.strictEqual(admit("Year 4", riverAsk, riverGoal, riverRich(5), { breadthSettled: true }).ok, false);

var plantAsk = "How do plants make their own food?";
var plantGoal = "Pupils will understand how plants make their own food.";
function plantRich(count) {
  return [
    { id: "p1", knowledge: "A plant makes food inside its leaves.", role: "foundation", importance: "core", dependsOn: [] },
    { id: "p2", knowledge: "Leaves look green because they hold chlorophyll.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p3", knowledge: "Chlorophyll catches sunlight, which makes the leaf able to start building food.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
    { id: "p4", knowledge: "The leaf takes in carbon dioxide from the air.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p5", knowledge: "Water from the roots joins that gas, so the leaf can make sugar.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
    { id: "p6", knowledge: "The leaf stores some of the sugar it makes.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p6b", knowledge: "Stored sugar feeds the plant when there is no sunlight, and the leaf releases oxygen while the food is made.", role: "mechanism", importance: "core", dependsOn: ["p6"] },
    { id: "p7", knowledge: "Sunlight, water and stored sugar work together, so the leaf makes food the rest of the plant can use.", role: "connection", importance: "core", dependsOn: ["p3", "p5", "p6b"] }
  ].slice(0, count);
}
var plantYoung = admit("Year 2", plantAsk, plantGoal, plantRich(5));
var plantMiddle = admit("Year 4", plantAsk, plantGoal, plantRich(7));
var plantOlder = admit("Year 6", plantAsk, plantGoal, plantRich(8));
assert.strictEqual(plantYoung.ok, true, (plantYoung.issues || []).join("; "));
assert.strictEqual(plantMiddle.ok, true, (plantMiddle.issues || []).join("; "));
assert.strictEqual(plantOlder.ok, true, (plantOlder.issues || []).join("; "));
assert.deepStrictEqual([depthOf(plantYoung).requiredDepth, depthOf(plantMiddle).requiredDepth, depthOf(plantOlder).requiredDepth], [5, 6, 7]);
assert.ok((plantYoung.issues || []).join(" ").indexOf("parts, not the change") === -1);
assert.ok(knowledgeText(plantMiddle).indexOf("releases oxygen") !== -1);

var roadAsk = "Why did the Romans build roads in Britain?";
var roadGoal = "Pupils will understand why the Romans built roads in Britain.";
var roadShallow = [
  { id: "p1", knowledge: "The Romans lived in Britain.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Romans built roads.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "Roads went between towns.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p4", knowledge: "Roads were straight.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p5", knowledge: "Roads were made of stone.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p6", knowledge: "Roads were long.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p7", knowledge: "Many people used the roads.", role: "feature", importance: "core", dependsOn: ["p1"] }
];
["Year 2", "Year 4", "Year 6"].forEach(function (year) {
  var made = admit(year, roadAsk, roadGoal, roadShallow, { breadthSettled: true });
  failsClosed(made);
  assert.ok((made.issues || []).join(" ").indexOf("outcome, not the reason") !== -1);
});
function roadRich(count) {
  return [
    { id: "p1", knowledge: "The Romans ruled a large part of Britain.", role: "foundation", importance: "core", dependsOn: [] },
    { id: "p2", knowledge: "Roman towns were a long way apart.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p3", knowledge: "Straight roads let soldiers move quickly because the route did not wander.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
    { id: "p4", knowledge: "Traders needed to carry food and goods between those towns.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p5", knowledge: "The roads carried those goods so that towns could share what they grew.", role: "function", importance: "core", dependsOn: ["p4"] },
    { id: "p6", knowledge: "Roman governors needed news from distant towns.", role: "feature", importance: "core", dependsOn: ["p1"] },
    { id: "p6b", knowledge: "Riders carried those messages along the roads, so an order could arrive while the army was still away.", role: "mechanism", importance: "core", dependsOn: ["p6"] },
    { id: "p7", knowledge: "Moving soldiers, carrying goods and sending messages worked together, so the roads held Roman Britain together.", role: "connection", importance: "core", dependsOn: ["p3", "p5", "p6b"] }
  ].slice(0, count);
}
assert.strictEqual(admit("Year 2", roadAsk, roadGoal, roadRich(5)).ok, true);
assert.strictEqual(admit("Year 4", roadAsk, roadGoal, roadRich(7)).ok, true);
assert.strictEqual(admit("Year 6", roadAsk, roadGoal, roadRich(8)).ok, true);

var shadowAsk = "Why do shadows change during the day?";
var shadowGoal = "Pupils will understand why shadows change during the day.";
var shadowShallow = admit("Year 4", shadowAsk, shadowGoal, [
  { id: "p1", knowledge: "Shadows appear on the ground.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Shadows are dark.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "The sun is in the sky.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p4", knowledge: "People have shadows.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p5", knowledge: "Shadows can be long.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p6", knowledge: "Shadows can be short.", role: "feature", importance: "core", dependsOn: ["p1"] }
], { breadthSettled: true });
failsClosed(shadowShallow);
assert.strictEqual(depthOf(shadowShallow).requiredDepth, 6);
assert.strictEqual(depthOf(shadowShallow).requiredStrands, 3);

var addAsk = "Show the class how to add two-digit numbers in columns.";
var addGoal = "Pupils will add two-digit numbers in columns.";
var procedure = admit("Year 4", addAsk, addGoal, [
  { id: "p1", knowledge: "Two-digit numbers have tens and ones.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Write the numbers in columns with ones under ones.", role: "procedure", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "Add the ones first, then add the tens.", role: "procedure", importance: "core", dependsOn: ["p2"] },
  { id: "p4", knowledge: "If the ones make more than nine, carry one ten into the tens column.", role: "procedure", importance: "core", dependsOn: ["p3"] }
], { lessonBrief: { intent: "procedure", rawRequest: addAsk, learningGoal: addGoal, teacherIntent: { ok: true, learningGoal: addGoal } } });
assert.strictEqual(procedure.ok, true, (procedure.issues || []).join("; "));
assert.strictEqual(depthOf(procedure).requiredDepth, 4, "a procedure keeps the narrow floor");
assert.strictEqual(depthOf(procedure).requiredStrands, 1, "a procedure is not forced up to two strands");

var gardenAsk = "Teach children about the school garden.";
var gardenGoal = "Pupils will learn about the school garden.";
var gardenMap = [
  { id: "p1", knowledge: "The school garden is a place where plants grow.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Beans climb up sticks in the garden.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "The sticks hold the beans up so the plants can reach the light.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
  { id: "p4", knowledge: "Worms live in the garden soil.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p5", knowledge: "Worms pull dead leaves into the soil, which makes the soil richer.", role: "mechanism", importance: "core", dependsOn: ["p4"] }
];
assert.strictEqual(admit("Year 4", gardenAsk, gardenGoal, gardenMap).ok, false);
var settledGarden = admit("Year 4", gardenAsk, gardenGoal, gardenMap, { breadthSettled: true });
assert.strictEqual(settledGarden.ok, false, "two developed strands do not pass a short map");
assert.strictEqual(depthOf(settledGarden).developedStrands, 2);
assert.strictEqual(depthOf(settledGarden).met, false, "the floor miss stays visible after a breadth repair");
assert.ok((settledGarden.issues || []).join(" ").indexOf("more connected learning points") !== -1);

var repairCtx = {
  yearGroup: "Year 2", requestedMinutes: 15, lessonText: sharkAsk, topic: sharkAsk, depthRequired: true,
  lessonBrief: { intent: "explain", rawRequest: sharkAsk, learningGoal: sharkGoal, teacherIntent: { ok: true, learningGoal: sharkGoal } }
};
var failed = Brain.normalisePlan({ learningObjective: sharkGoal, learningMap: sharkShallow, lessonArc: arc }, repairCtx);
var repair = JSON.parse(Brain.planRepairBrief(repairCtx, failed.issues, failed.previous).user);
var strandLine = repair.relationshipRequired.filter(function (line) { return line.indexOf("strands:") === 0; })[0];
assert.ok(strandLine && /dependsOn/.test(strandLine) && /two linked strands/.test(strandLine) && /only names what something has/.test(strandLine));
assert.ok(!/shark/i.test(strandLine));

function scopeLine(year) {
  return Brain.planBrief({
    yearGroup: year, requestedMinutes: 15, lessonText: sharkAsk, topic: sharkAsk,
    lessonBrief: { intent: "explain", rawRequest: sharkAsk, learningGoal: sharkGoal, teacherIntent: { ok: true, learningGoal: sharkGoal } }
  }).system;
}
assert.ok(/Year 1 and Year 2 stay in everyday words/.test(scopeLine("Year 1")));
assert.ok(/then 2 developed strands/.test(scopeLine("Year 2")));
assert.ok(/need 3 developed strands/.test(scopeLine("Year 4")));
assert.ok(/several important ideas/.test(scopeLine("Year 4")));
assert.ok(/need 3 developed strands/.test(scopeLine("Year 6")));
assert.ok(/real mechanisms and a connection/.test(scopeLine("Year 6")));
assert.ok(/not a fourth strand/.test(scopeLine("Year 6")));
assert.strictEqual(scopeLine("Year 2").indexOf("two in Year 1 and Year 2"), -1);

// Saved Y3 dinosaur shape: two feature→mechanism pairs, plus two selected pack
// claims the planner left unlinked. Those claims are the missing depth. A
// paraphrase of a kept point is still not admitted.
function packClaim(id, text, kind, depth) {
  return {
    claimId: id, text: text, kind: kind || "fact", depth: depth || "concrete", confidence: "high",
    provenance: "model", factuallyVerified: false, contested: false, ageFit: { from: 1, to: 6 }, importance: "core"
  };
}
var mesozoic = "Dinosaurs lived during the Mesozoic Era, which lasted about 180 million years.";
var kinds = "There are two main types of dinosaurs: herbivores, which eat plants, and carnivores, which eat meat.";
var rex = "The Tyrannosaurus rex was a large carnivorous dinosaur known for its powerful jaws and sharp teeth.";
var teeth = "The sharp teeth of the Tyrannosaurus rex were designed for tearing flesh, making it an effective predator.";
var brach = "The Brachiosaurus was a large herbivorous dinosaur known for its long neck, which helped it reach high vegetation.";
var neck = "The long neck of the Brachiosaurus allowed it to reach high trees for food, which helped it survive in its environment.";
var dinoAsk = "Year 3 science. Teach children about dinosaurs.";
var dinoGoal = "Students will understand the different types of dinosaurs and their characteristics.";
var dinoClaims = [
  packClaim("c1", mesozoic),
  packClaim("c2", kinds),
  packClaim("c3", rex),
  packClaim("c4", brach),
  packClaim("c5", neck, "mechanism", "mechanism"),
  packClaim("c6", teeth, "mechanism", "mechanism")
];
var dinoCtx = {
  yearGroup: "Year 3", requestedMinutes: 15, lessonText: dinoAsk, topic: "Dinosaurs", depthRequired: true,
  lessonBrief: { intent: "explain", rawRequest: dinoAsk, learningGoal: dinoGoal, teacherIntent: { ok: true, learningGoal: dinoGoal, requiredEvidence: "Students can identify and describe types of dinosaurs and their features." } },
  knowledgePack: { id: "kp", status: "qualified", claims: dinoClaims, rejectedClaims: [] },
  knowledgeSelection: { status: "qualified", claimIds: dinoClaims.map(function (claim) { return claim.claimId; }), depthMode: "mechanism" }
};
var dinoMap = [
  { id: "p1", knowledge: mesozoic, role: "fact", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: kinds, role: "fact", importance: "core", dependsOn: [] },
  { id: "p3", knowledge: rex, role: "fact", importance: "core", dependsOn: [] },
  { id: "p4", knowledge: teeth, role: "mechanism", importance: "core", dependsOn: ["p3"] },
  { id: "p5", knowledge: brach, role: "fact", importance: "core", dependsOn: [] },
  { id: "p6", knowledge: neck, role: "mechanism", importance: "core", dependsOn: ["p5"] }
];
var dinoPlan = Brain.normalisePlan({
  learningObjective: dinoGoal, subject: "Science", topic: "Dinosaurs", yearGroup: "Year 3", learningMap: dinoMap, lessonArc: arc
}, dinoCtx);
assert.strictEqual(dinoPlan.ok, true, (dinoPlan.issues || []).join("; "));
assert.strictEqual(depthOf(dinoPlan).achievedDepth, 6);
assert.strictEqual(depthOf(dinoPlan).requiredDepth, 6);
assert.strictEqual(depthOf(dinoPlan).developedStrands, 2);
assert.strictEqual(depthOf(dinoPlan).met, true);
assert.ok(knowledgeText(dinoPlan).indexOf("Mesozoic") !== -1, "the admitted era claim is taught");
assert.ok(knowledgeText(dinoPlan).indexOf("herbivores") !== -1, "the admitted classification is taught");
dinoPlan.plan.learningMap.forEach(function (item) {
  if (item.knowledge === mesozoic || item.knowledge === kinds) assert.strictEqual(item.role, "foundation");
});
var invented = dinoMap.concat([
  { id: "p7", knowledge: "Herbivores like the Brachiosaurus use their long necks to access food that other dinosaurs cannot reach.", role: "function", importance: "core", dependsOn: ["p5"] },
  { id: "p8", knowledge: "Carnivores like the Tyrannosaurus rex are effective predators because their teeth are adapted for tearing flesh.", role: "function", importance: "core", dependsOn: ["p3", "p4"] }
]);
var dinoInvented = Brain.normalisePlan({
  learningObjective: dinoGoal, subject: "Science", topic: "Dinosaurs", yearGroup: "Year 3", learningMap: invented, lessonArc: arc
}, dinoCtx);
assert.ok(dinoInvented.plan.mapRejected.some(function (row) { return row.reason === "invented fact outside the knowledge pack"; }));
assert.ok(knowledgeText(dinoInvented).indexOf("cannot reach") === -1);

var dinoFrame = Object.assign({}, dinoCtx, { lessonPlan: dinoPlan.plan, pupilCount: 4 });
var dinoStory = Brain.storyFromPlan(dinoPlan.plan, dinoFrame);
var dinoSlots = Brain.planBeats(Brain.lessonSkeleton(dinoPlan.plan, Object.assign({}, dinoFrame, { storyPlan: dinoStory })), dinoPlan.plan, "Year 3");
var dinoFramed = Object.assign({}, dinoFrame, { storyPlan: dinoStory, lessonSkeleton: dinoSlots });
dinoPlan.plan.droppedKnowledge = (dinoPlan.plan.droppedKnowledge || []).concat([
  "Carnivores like the Tyrannosaurus rex are effective predators because their teeth are adapted for tearing flesh."
]);
var teethAnswer = "Its sharp teeth for tearing flesh.";
var neckAnswer = "Its long neck reaches high trees.";
function dinoLesson(checkQuestions, applyInstruction, applyBeat) {
  var slots = {};
  dinoSlots.forEach(function (slot) {
    if (slot.id === "check") slots.check = { questions: checkQuestions };
    else if (slot.id === "apply") {
      slots.apply = {
        beats: slot.beats.map(function (beat) { return { id: beat.id, cue: "", text: applyBeat }; }),
        instruction: applyInstruction,
        target: "choices",
        successCondition: "The pupil uses the taught teeth idea on a new animal.",
        teachingConnection: "The task follows the taught explanation."
      };
    } else {
      slots[slot.id] = {
        beats: (slot.beats || []).filter(function (beat) { return beat.move !== "retrieve"; }).map(function (beat) {
          return { id: beat.id, cue: "", text: "The class uses the idea in a new sentence here." };
        })
      };
    }
  });
  return Brain.accept({ title: "Dinosaur mission", objectives: [dinoGoal], slots: slots }, Object.assign({}, dinoFramed, {
    applySemantic: { relationship: "apply", reason: "The task uses the taught idea." },
    checkSemantics: checkQuestions.map(function () { return { coverage: "sufficient", reason: "The answer shows the taught idea.", demonstratedEvidence: "The pupil shows the taught idea." }; })
  }));
}
var taughtCheck = [
  { id: "check:0", prompt: "What do the sharp teeth of Tyrannosaurus rex do?", choices: [teethAnswer, neckAnswer, "It flies away."], correct: teethAnswer, explain: "Those teeth were adapted for tearing flesh.", successEvidence: "The pupil chose the taught teeth idea.", teachingConnection: "From the taught idea." },
  { id: "check:1", prompt: "What does the long neck of Brachiosaurus do?", choices: [neckAnswer, teethAnswer, "It flies away."], correct: neckAnswer, explain: "The long neck reaches food in high trees.", successEvidence: "The pupil chose the taught neck idea.", teachingConnection: "From the taught idea." }
];
var scored = dinoLesson(taughtCheck, "A new dinosaur has sharp teeth. Choose whether it tears flesh or reaches trees.", "Choose the animal whose sharp teeth tear flesh.");
assert.ok((scored.issues || []).indexOf("The check scores knowledge that was not taught.") === -1, (scored.issues || []).join(" | "));
var untaughtCorrect = taughtCheck.map(function (question) { return Object.assign({}, question); });
untaughtCorrect[0] = Object.assign({}, untaughtCorrect[0], { correct: "It was adapted for tearing flesh.", choices: ["It was adapted for tearing flesh.", neckAnswer, "It flies away."] });
var leaked = dinoLesson(untaughtCorrect, "A new dinosaur has sharp teeth. Choose whether it tears flesh or reaches trees.", "Choose the animal whose sharp teeth tear flesh.");
assert.ok((leaked.issues || []).indexOf("The check scores knowledge that was not taught.") !== -1, (leaked.issues || []).join(" | "));
var applySpec = JSON.parse(Brain.slotRepairBrief(dinoFramed, ["apply"], ["The apply slot does not use the taught knowledge."], { activities: [] }).user);
assert.ok(applySpec.instruction.indexOf(teeth) !== -1, "the apply repair names the taught idea");
assert.ok(/new case/.test(applySpec.instruction));
assert.ok(/features in general does not use it/.test(applySpec.instruction));

var fullEnough = [
  { id: "p1", knowledge: "A river starts in the hills.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Fast water picks up stones.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "Those stones rub the riverbed and wear the rock away.", role: "mechanism", importance: "core", dependsOn: ["p2"] },
  { id: "p4", knowledge: "The river also carries sand.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p5", knowledge: "Where the water slows, it drops that sand and builds new land.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
  { id: "p6", knowledge: "Wearing rock away and dropping sand both change the valley.", role: "connection", importance: "core", dependsOn: ["p3", "p5"] }
];
var spare = "A river is a kind of water that people can name.";
var spareClaim = packClaim("criver", spare);
var keptFull = Brain.normalisePlan({
  learningObjective: "Pupils will learn how rivers change the land.", yearGroup: "Year 3", learningMap: fullEnough.concat([
    { id: "p7", knowledge: spare, role: "fact", importance: "core", dependsOn: [] }
  ]), lessonArc: arc
}, {
  yearGroup: "Year 3", requestedMinutes: 15, lessonText: "Teach children about rivers.", topic: "rivers", depthRequired: true,
  lessonBrief: { intent: "explain", rawRequest: "Teach children about rivers.", learningGoal: "Pupils will learn how rivers change the land.", teacherIntent: { ok: true, learningGoal: "Pupils will learn how rivers change the land." } },
  knowledgePack: { id: "kr", status: "usable", claims: [spareClaim].concat(fullEnough.map(function (row, index) { return packClaim("ck" + index, row.knowledge, "fact", "concrete"); })), rejectedClaims: [] },
  knowledgeSelection: { status: "ready", claimIds: ["criver"].concat(fullEnough.map(function (row, index) { return "ck" + index; })) }
});
assert.ok(knowledgeText(keptFull).indexOf(spare) === -1, "a full map does not pull in an extra unlinked claim");

console.log("knowledge quality gate tests passed");
