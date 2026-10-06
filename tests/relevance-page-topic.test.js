"use strict";

// Relevance correction (source-grounded lesson PR, its own revertible commit).
// Live Year 3 runs 5 and 6 (6 Oct 2026) held a verbatim, entailment-supported NHM pair,
// "Sauropods' very long necks let them stand still and stretch high, low and wide to reach
// plants", as "not relevant to the learning goal" only because "sauropods" is not the word
// "dinosaurs". The cited page now supplies the topic when its title or lead names it, but only
// for a pair that names a body feature the animal had and states what it did, under a feature or
// adaptation goal. The page alone makes nothing relevant. Minima are unchanged.
// Passages are the real ones fetched in runs 5 and 6 (NHM, Simple English Wikipedia).

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var passages = require("./fixtures/source-grounded/relevance-passages.json");

var intent = { ok: true, learningGoal: "Pupils will understand how dinosaurs adapted to their environments.", requiredEvidence: "Pupils can explain how a specific dinosaur's features helped it survive in its habitat.", focusConcepts: ["adaptation", "habitat", "survival", "features"] };
function ctx(list) {
  list = list || passages;
  return { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs",
    lessonBrief: { intent: "explain", learningGoal: intent.learningGoal, teacherIntent: intent },
    researchEvidence: { passages: list, selectedPassageIds: list.map(function (p) { return p.id; }) } };
}
function c(text, kind, ref, quote) {
  return { text: text, kind: kind, depth: kind === "mechanism" ? "mechanism" : "concrete", confidence: "high", provenance: "retrieved", sourceRef: [ref], quote: quote, factuallyVerified: false, ageFit: { from: 1, to: 6 } };
}
var LEGS = [c("Dinosaurs had straight back legs perpendicular to their bodies.", "feature", "S2-P01", "they had straight back legs, perpendicular to their bodies."),
  c("Their straight back legs let them use less energy to move than reptiles with a sprawling stance.", "mechanism", "S2-P01", "This allowed them to use less energy to move than other reptiles that had a sprawling stance like today's lizards and crocodiles.")];
var NECK = [c("Sauropods had very long necks.", "feature", "S8-P10", "Sauropods had very long necks , which allowed them to stand still"),
  c("Sauropods' very long necks let them stand still and stretch high, low and wide to reach plants.", "mechanism", "S8-P10", "Sauropods had very long necks , which allowed them to stand still and stretch high, low and wide for the best plants around.")];
var FEET = [c("Sauropods' hands and feet were huge and padded.", "feature", "S8-P08", "Their hands and feet were also huge and padded, like those of elephants, which helped them spread their weight."),
  c("Sauropods' huge and padded hands and feet helped spread their weight.", "mechanism", "S8-P08", "Their hands and feet were also huge and padded, like those of elephants, which helped them spread their weight.")];
var M = {
  legs: { text: LEGS[1].text, feature: "straight back legs", link: "This allowed them to use less energy to move" },
  neck: { text: NECK[1].text, feature: "very long necks", link: "which allowed them to stand still and stretch high, low and wide" },
  feet: { text: FEET[1].text, feature: "huge and padded hands and feet", link: "which helped them spread their weight" }
};

function gate(claims, mechanisms, list) {
  var k = ctx(list);
  var links = {};
  mechanisms.forEach(function (m) { links[m.text] = m.link || ""; });
  var pack = Brain.normaliseKnowledgePack({ status: "usable", claims: JSON.parse(JSON.stringify(claims)),
    mechanisms: mechanisms.map(function (m) { return { text: m.text, feature: m.feature }; }) }, k);
  var results = {};
  pack.claims.forEach(function (claim) {
    if (claim.provenance === "retrieved") results[claim.claimId] = { verdict: "supported", missing: "", linkQuote: links[claim.text] || "", wording: claim.wordsNotInSource || [], addedFacts: [] };
  });
  Brain.applySourceEntailment(pack, { ok: true, results: results });
  var readiness = Brain.assessPackReadiness(pack, Brain.selectPackForLesson(pack, k), k);
  readiness.pair = function (text) { return readiness.pairs.filter(function (p) { return p.explanation === text; })[0]; };
  readiness.retrieved = pack.claims.filter(function (x) { return x.provenance === "retrieved" && !x.sourceHold; }).length;
  return readiness;
}
var NOT_RELEVANT = "the pair is not relevant to the learning goal";

// 1. The neck pair now passes, and the run-5 pack is ready with 3 pairs.
var full = gate(LEGS.concat(NECK, FEET), [M.legs, M.neck, M.feet]);
assert.strictEqual(full.retrieved, 6, "all six claims admitted");
assert.ok(full.pair(M.neck.text).ready, JSON.stringify(full.pair(M.neck.text)));
assert.strictEqual(full.status, "ready");
assert.strictEqual(full.distinctReady, 3);

// 2. Year 3 still needs 3 pairs: two ready pairs are not enough.
var two = gate(LEGS.concat(NECK), [M.legs, M.neck]);
assert.strictEqual(two.requiredPairs, 3);
assert.strictEqual(two.distinctReady, 2);
assert.strictEqual(two.status, "incomplete");

// 3. The same sauropod sentence on a page whose title and lead do not name the topic gets no boost.
//    (Patch 6: the off-topic page is an evidence-tier host, since Wikipedia is discovery only.)
var giraffe = passages.filter(function (p) { return p.id !== "S8-P10"; }).concat([
  { id: "S20-P01", url: "https://www.nhm.ac.uk/discover/long-necks-in-animals.html", title: "Long necks in animals | Natural History Museum", text: "A long neck is found in several groups of animals, living and extinct." },
  { id: "S20-P02", url: "https://www.nhm.ac.uk/discover/long-necks-in-animals.html", title: "Long necks in animals | Natural History Museum", text: passages.filter(function (p) { return p.id === "S8-P10"; })[0].text }
]);
var offPage = gate(LEGS.concat([Object.assign({}, NECK[0], { sourceRef: ["S20-P02"] }), Object.assign({}, NECK[1], { sourceRef: ["S20-P02"] })], FEET), [M.legs, M.neck, M.feet], giraffe);
assert.strictEqual(offPage.retrieved, 6, "quotes still verify on the other page");
assert.deepStrictEqual(offPage.pair(M.neck.text).gaps, [NOT_RELEVANT]);
assert.strictEqual(offPage.status, "incomplete");

// 4. Off-goal claims from dinosaur pages are still rejected. Each is offered as an extra pair
//    next to the ready legs pair, with every entailment verdict forced to "supported".
function offGoal(claims, mechanism) {
  var r = gate(LEGS.concat(claims), [M.legs, mechanism]);
  var pair = r.pair(mechanism.text);
  return { ready: !!(pair && pair.ready), gaps: pair ? pair.gaps : ["not examined"] };
}
// Extinction (NHM "What killed the dinosaurs?"): a cause, not a body feature, so no boost.
var volcano = offGoal([
  c("Volcanic eruptions may also have been involved in the extinction.", "feature", "S11-P02", "Volcanic eruptions that caused large-scale climate change may also have been involved"),
  c("Volcanic eruptions caused large-scale climate change.", "mechanism", "S11-P02", "Volcanic eruptions that caused large-scale climate change may also have been involved")
], { text: "Volcanic eruptions caused large-scale climate change.", feature: "volcanic eruptions", link: "Volcanic eruptions that caused large-scale climate change" });
assert.strictEqual(volcano.ready, false);
assert.ok(volcano.gaps.indexOf(NOT_RELEVANT) !== -1, volcano.gaps.join("; "));
var vanished = offGoal([
  c("Dinosaurs disappeared completely 66 million years ago.", "feature", "S11-P01", "But then 66 million years ago, over a relatively short time, dinosaurs disappeared completely"),
  c("An asteroid impact was the main culprit, so dinosaurs disappeared completely.", "mechanism", "S11-P02", "Evidence suggests an asteroid impact was the main culprit.")
], { text: "An asteroid impact was the main culprit, so dinosaurs disappeared completely.", feature: "disappeared completely", link: "Evidence suggests an asteroid impact was the main culprit" });
assert.strictEqual(vanished.ready, false, vanished.gaps.join("; "));
// The craft activity (NHM "Dinosaurs and birds" resources page): people making things, so no boost.
var craft = offGoal([
  c("Children can make tie-on feet to wear.", "feature", "KS10-P14", "Make and decorate tie-on dinosaur feet to wear (DT)"),
  c("Tie-on feet let children decorate them to wear.", "mechanism", "KS10-P14", "Make and decorate tie-on dinosaur feet to wear (DT)")
], { text: "Tie-on feet let children decorate them to wear.", feature: "tie-on feet", link: "Make and decorate tie-on dinosaur feet to wear" });
assert.strictEqual(craft.ready, false);
assert.deepStrictEqual(craft.gaps, [NOT_RELEVANT]);
// A plain definition states no job.
var definition = offGoal([
  c("Sauropods were a group of reptiles with long necks.", "feature", "S1-P01", "Dinosaurs are a group of Archosaur reptiles of the clade Dinosauria."),
  c("Dinosaurs are a group of Archosaur reptiles of the clade Dinosauria.", "mechanism", "S1-P01", "Dinosaurs are a group of Archosaur reptiles of the clade Dinosauria.")
], { text: "Dinosaurs are a group of Archosaur reptiles of the clade Dinosauria.", feature: "group of reptiles", link: "" });
assert.strictEqual(definition.ready, false, definition.gaps.join("; "));
// "Features changed because they adapted" with no feature named.
var vague = offGoal([
  c("Dinosaurs took on a huge variety of forms as the environment changed.", "feature", "S11-P01", "dinosaurs took on a huge variety of forms as the environment changed"),
  c("Dinosaurs' features changed because they adapted to new conditions.", "mechanism", "S11-P01", "new species evolved that were suited to these new conditions. Dinosaurs that failed to adapt went extinct.")
], { text: "Dinosaurs' features changed because they adapted to new conditions.", feature: "", link: "new species evolved that were suited to these new conditions" });
assert.strictEqual(vague.ready, false);
assert.ok(vague.gaps.some(function (g) { return /no concrete feature/.test(g); }), vague.gaps.join("; "));

// 5. The page does not help under a goal that is not about features or adaptation.
var datesGoal = { ok: true, learningGoal: "Pupils will know when dinosaurs lived.", requiredEvidence: "Pupils can name the period when dinosaurs lived.", focusConcepts: ["time", "periods"] };
var saved = intent;
intent = datesGoal;
var dates = gate(LEGS.concat(NECK, FEET), [M.legs, M.neck, M.feet]);
intent = saved;
assert.deepStrictEqual(dates.pair(M.neck.text).gaps, [NOT_RELEVANT], JSON.stringify(dates.pair(M.neck.text)));

console.log("relevance page-topic tests passed");

// 6. Plan stage (live run 8): after the gate passed 3/3, plan validation dropped the
//    ornithischian jaw-joint pair as "not connected to the learning goal", because that check
//    reads the goal's subject word ("dinosaurs") and the pair says "ornithischians". The same
//    page-topic rule applied there in patch 4; patch 5 replaces it with ID lineage (the plan
//    follows the gate-ready unit ids). Passages are run 8's real Simple Wikipedia and NHM text.
var run8 = require("./fixtures/source-grounded/run8-passages.json");
function planCtx(list) {
  var k = ctx(list);
  var claims = [
    c("Dinosaurs had straight back legs positioned perpendicular to their bodies.", "feature", "S4-P01", "One of the reasons for dinosaurs' success is that they had straight back legs, perpendicular to their bodies."),
    c("Dinosaurs' straight back legs allowed them to use less energy to move than reptiles with sprawling legs.", "mechanism", "S4-P01", "This allowed them to use less energy to move than other reptiles that had a sprawling stance like today's lizards and crocodiles."),
    c("The upper skull of ornithischians was more solid, and the joint connecting the lower jaw was more flexible.", "feature", "S1-P15", "the upper skull of the Ornithischia is more solid, and the joint connecting the lower jaw is more flexible."),
    c("The flexible lower jaw joint helped ornithischians grind vegetable food.", "mechanism", "S1-P15", "These features are adaptations to herbivory; in other words, it helped them grind vegetable food."),
    c("Dinosaurs laid eggs in nests.", "feature", "S1-P04", "They laid eggs in nests.")
  ];
  var mechanisms = [
    { text: claims[1].text, feature: "straight back legs" },
    { text: claims[3].text, feature: "flexible lower jaw joint" }
  ];
  var links = {};
  links[claims[1].text] = "This allowed them to use less energy to move";
  links[claims[3].text] = "it helped them grind vegetable food";
  var pack = Brain.normaliseKnowledgePack({ status: "usable", claims: claims, mechanisms: mechanisms }, k);
  var results = {};
  pack.claims.forEach(function (claim) {
    if (claim.provenance === "retrieved") results[claim.claimId] = { verdict: "supported", missing: "", linkQuote: links[claim.text] || "", wording: claim.wordsNotInSource || [], addedFacts: [] };
  });
  Brain.applySourceEntailment(pack, { ok: true, results: results });
  k.knowledgePack = pack;
  k.knowledgeSelection = Brain.selectPackForLesson(pack, k);
  k.depthRequired = true;
  return k;
}
function mapFor(k) {
  var objective = "Pupils will understand how dinosaurs adapted to their environments.";
  var raw = { learningObjective: objective, topic: "Dinosaurs", learningMap: [
    { id: "p1", knowledge: "Dinosaurs had straight back legs positioned perpendicular to their bodies.", role: "feature", dependsOn: [] },
    { id: "p2", knowledge: "Dinosaurs' straight back legs allowed them to use less energy to move than reptiles with sprawling legs.", role: "mechanism", dependsOn: ["p1"], explains: "p1" },
    { id: "p3", knowledge: "The upper skull of ornithischians was more solid, and the joint connecting the lower jaw was more flexible.", role: "feature", dependsOn: [] },
    { id: "p4", knowledge: "The flexible lower jaw joint helped ornithischians grind vegetable food.", role: "mechanism", dependsOn: ["p3"], explains: "p3" },
    { id: "p5", knowledge: "Dinosaurs laid eggs in nests.", role: "feature", dependsOn: [] }
  ] };
  var rc = Object.assign({}, k, { lessonPlan: { learningObjective: objective, topic: "Dinosaurs" } });
  return Brain.buildLearningMap(raw, rc, objective);
}
function droppedAsUnconnected(map, text) {
  return (map.rejected || []).some(function (x) { return x.knowledge === text && x.reason === "not connected to the learning goal"; });
}
var JAW = "The flexible lower jaw joint helped ornithischians grind vegetable food.";
// Patch 6 (source tiers), negative: with run 8's real URLs the jaw-joint pair cites Simple
// English Wikipedia (S1-P15), which is discovery only, so the gate never makes it ready.
var realCtx = planCtx(run8);
var realReady = Brain.assessPackReadiness(realCtx.knowledgePack, realCtx.knowledgeSelection, realCtx).readyPairs.map(function (p) { return p.feature; });
assert.strictEqual(realReady.indexOf("flexible lower jaw joint"), -1, JSON.stringify(realReady));
assert.ok(realCtx.knowledgePack.sourceAudit.rejected.some(function (r) { return /lower jaw/.test(r.text) && r.reason === "SOURCE_NOT_EVIDENCE"; }));
// The plan-stage rule below is about ID lineage, not source tiers. To isolate it, the same
// passage text is placed on an evidence-tier host (a test-only relabel; never used in a lesson).
run8 = run8.map(function (p) { return /wikipedia\.org/.test(p.url) ? Object.assign({}, p, { url: "https://www.example-museum.ac.uk/test-relabel/" + p.id }) : p; });
var withPage = mapFor(planCtx(run8));
assert.strictEqual(droppedAsUnconnected(withPage, JAW), false, JSON.stringify(withPage.rejected));
assert.strictEqual(droppedAsUnconnected(withPage, "The upper skull of ornithischians was more solid, and the joint connecting the lower jaw was more flexible."), false);
// An unconnected fact on a topic page is still dropped: the page alone answers nothing.
assert.strictEqual(droppedAsUnconnected(withPage, "Dinosaurs laid eggs in nests."), true, JSON.stringify(withPage.rejected));
// Patch 5 (ID lineage): the plan stage no longer reads page context or words for relevance. It
// follows the gate: this jaw-joint pair is gate-ready by its own words even without page titles,
// so the plan keeps it by its unit id; the eggs fact (no ready unit) is still dropped.
var noPageCtx = planCtx(run8.map(function (p) { return Object.assign({}, p, { title: "", text: p.id === "S1-P01" ? "Archosaurs are a group of reptiles." : p.text }); }));
var noPage = mapFor(noPageCtx);
var noPageReady = Brain.assessPackReadiness(noPageCtx.knowledgePack, noPageCtx.knowledgeSelection, noPageCtx).readyPairs.map(function (p) { return p.feature; });
assert.ok(noPageReady.indexOf("flexible lower jaw joint") !== -1, JSON.stringify(noPageReady));
assert.strictEqual(droppedAsUnconnected(noPage, JAW), false, JSON.stringify(noPage.rejected));
assert.strictEqual(droppedAsUnconnected(noPage, "Dinosaurs laid eggs in nests."), true, JSON.stringify(noPage.rejected));

console.log("relevance page-topic tests passed (plan stage)");
