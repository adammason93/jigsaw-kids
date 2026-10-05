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
Object.keys(sharkBand).forEach(function (year) {
  var made = admit(year, sharkAsk, sharkGoal, sharkShallow, { breadthSettled: true });
  failsClosed(made);
  assert.strictEqual(depthOf(made).requiredDepth, sharkBand[year], year + " uses the depth floor, not the narrow floor");
  assert.strictEqual(depthOf(made).requiredStrands, 2);
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
    { id: "p6", knowledge: "That forward push lets the shark chase fish in the ocean.", role: "effect", importance: "core", dependsOn: ["p5"] },
    { id: "p7", knowledge: "The pointed body and the tail work together so the shark can move through the ocean.", role: "connection", importance: "core", dependsOn: ["p3", "p6"] }
  ].slice(0, count);
}

var young = admit("Year 2", sharkAsk, sharkGoal, sharkRich(5));
assert.strictEqual(young.ok, true, (young.issues || []).join("; "));
assert.strictEqual(depthOf(young).requiredDepth, 5);
assert.strictEqual(depthOf(young).developedStrands, 2);
assert.strictEqual(depthOf(young).met, true);
var youngTooThinForOlder = admit("Year 4", sharkAsk, sharkGoal, sharkRich(5), { breadthSettled: true });
assert.strictEqual(youngTooThinForOlder.ok, false, "breadthSettled must not waive a depth-seeking floor");
assert.ok((youngTooThinForOlder.issues || []).join(" ").indexOf("more connected learning points") !== -1);

var middle = admit("Year 4", sharkAsk, sharkGoal, sharkRich(6));
assert.strictEqual(middle.ok, true, (middle.issues || []).join("; "));
assert.strictEqual(depthOf(middle).requiredDepth, 6);
assert.strictEqual(depthOf(middle).developedStrands, 2);
assert.ok(knowledgeText(middle).indexOf("chase fish in the ocean") !== -1);
var middleShortOfOlder = admit("Year 6", sharkAsk, sharkGoal, sharkRich(6));
assert.strictEqual(middleShortOfOlder.ok, false);
assert.strictEqual(depthOf(middleShortOfOlder).requiredDepth, 7);

var older = admit("Year 6", sharkAsk, sharkGoal, sharkRich(7));
assert.strictEqual(older.ok, true, (older.issues || []).join("; "));
assert.strictEqual(depthOf(older).requiredDepth, 7);
assert.strictEqual(depthOf(older).achievedDepth, 7);
assert.strictEqual(depthOf(older).developedStrands, 2);
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
    { id: "p6", knowledge: "A slow bend drops some of that rock, which changes the shape of the bank.", role: "effect", importance: "core", dependsOn: ["p5"] },
    { id: "p7", knowledge: "Wearing rock away and dropping it further on work together, so the river reshapes the land along its whole path.", role: "connection", importance: "core", dependsOn: ["p3", "p6"] }
  ].slice(0, count);
}
var riverYoung = admit("Year 2", riverAsk, riverGoal, riverRich(5));
var riverMiddle = admit("Year 4", riverAsk, riverGoal, riverRich(6));
var riverOlder = admit("Year 6", riverAsk, riverGoal, riverRich(7));
assert.strictEqual(riverYoung.ok, true, (riverYoung.issues || []).join("; "));
assert.strictEqual(riverMiddle.ok, true, (riverMiddle.issues || []).join("; "));
assert.strictEqual(riverOlder.ok, true, (riverOlder.issues || []).join("; "));
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
    { id: "p6", knowledge: "The plant uses that sugar to grow, and it releases oxygen while the food is made.", role: "effect", importance: "core", dependsOn: ["p5"] },
    { id: "p7", knowledge: "Sunlight, water and carbon dioxide work together, so the leaf makes food the rest of the plant can use.", role: "connection", importance: "core", dependsOn: ["p3", "p6"] }
  ].slice(0, count);
}
var plantYoung = admit("Year 2", plantAsk, plantGoal, plantRich(5));
var plantMiddle = admit("Year 4", plantAsk, plantGoal, plantRich(6));
var plantOlder = admit("Year 6", plantAsk, plantGoal, plantRich(7));
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
    { id: "p6", knowledge: "Messages could travel along the same roads, which kept the army in touch.", role: "effect", importance: "core", dependsOn: ["p3"] },
    { id: "p7", knowledge: "Moving soldiers and carrying goods worked together, so the roads held Roman Britain together.", role: "connection", importance: "core", dependsOn: ["p3", "p5"] }
  ].slice(0, count);
}
assert.strictEqual(admit("Year 2", roadAsk, roadGoal, roadRich(5)).ok, true);
assert.strictEqual(admit("Year 4", roadAsk, roadGoal, roadRich(6)).ok, true);
assert.strictEqual(admit("Year 6", roadAsk, roadGoal, roadRich(7)).ok, true);

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
assert.strictEqual(settledGarden.ok, true, (settledGarden.issues || []).join("; "));
assert.strictEqual(depthOf(settledGarden).developedStrands, 2);
assert.strictEqual(settledGarden.plan.teachingPlan.substantiveDepth.met, false, "the floor miss stays visible after a breadth repair");

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
assert.ok(/several important ideas/.test(scopeLine("Year 4")));
assert.ok(/real mechanisms and a connection/.test(scopeLine("Year 6")));
assert.strictEqual(scopeLine("Year 2").indexOf("two in Year 1 and Year 2"), -1);

console.log("knowledge quality gate tests passed");
