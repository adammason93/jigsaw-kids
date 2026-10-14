"use strict";

// Source repair feedback for a pair held only by the relevance check (run 5, 6 Oct 2026).
// Run 5's neck pair had a supported mechanism ("which allowed them to stand still and stretch
// high, low and wide for the best plants around") and was held because no word of it matched a
// goal word. The repair was then told to fix the mechanism wording, which was not the problem.
// The gate itself is unchanged here: the same pair is still held. Only the feedback changes, so
// it names the words the gate reads.

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var passages = [
 {
  "id": "S2-P01",
  "url": "https://www.nhm.ac.uk/discover/what-are-dinosaurs.html",
  "title": "What are dinosaurs? | Natural History Museum",
  "text": "Our brief introduction to dinosaurs reveals a key feature that gave them an advantage over other prehistoric reptiles. Dinosaurs are a group of reptiles that dominated the land for over 140 million years (more than 160 million years in some parts of the world). They evolved diverse shapes and sizes, from the fearsome giant Spinosaurus to the chicken-sized Microraptor , and were able to survive in a variety of ecosystems. One of the reasons for dinosaurs' success is that they had straight back legs, perpendicular to their bodies. This allowed them to use less energy to move than other reptiles that had a sprawling stance like today's lizards and crocodiles. With their legs positioned under their bodies rather than sticking out to the side, dinosaurs' weight was also better supported."
 },
 {
  "id": "S8-P08",
  "url": "https://www.nhm.ac.uk/discover/why-were-dinosaurs-so-big.html",
  "title": "Why were dinosaurs so big? The secrets of titanosaurs' super size | Natural History Museum",
  "text": "Sauropods had further features that made them more stable and capable of carrying hefty weight. Their wrists and ankles were less mobile, which made them stronger. Their hands and feet were also huge and padded, like those of elephants, which helped them spread their weight."
 },
 {
  "id": "S8-P10",
  "url": "https://www.nhm.ac.uk/discover/why-were-dinosaurs-so-big.html",
  "title": "Why were dinosaurs so big? The secrets of titanosaurs' super size | Natural History Museum",
  "text": "Gathering enough food using the least effort possible was something these giants were good at. Sauropods had very long necks , which allowed them to stand still and stretch high, low and wide for the best plants around. Part of the reason elephants can grow so big is because their trunk lets them forage for food without moving much, in a similar way. Extremely long necks also meant sauropods could pluck leaves from the tops of tall trees, which were out of reach to most other animals - much like giraffes do today. Sauropods' long necks were beneficial for other reasons too, which we'll come to later. One of the reasons sauropods were able to have such long necks was because they had relatively small heads. This was possible because they had fewer teeth . They swallowed without chewing."
 }
];
// The relevance-correction commit lets a cited page's title or lead supply the topic, which
// makes this neck pair relevant. This test is about the repair feedback for a pair held only for
// relevance, so it removes the page titles (the S8 lead does not name the topic) to keep that hold.
passages = passages.map(function (p) { return Object.assign({}, p, { title: "" }); });
var intent = {"ok": true, "yearGroup": "Year 3", "subject": "Science", "subjectConfidence": "explicit", "learningGoal": "Pupils will understand how dinosaurs adapted to their environments.", "requiredEvidence": "Pupils can explain how a specific dinosaur's features helped it survive in its habitat.", "focusConcepts": ["adaptation", "habitat", "survival", "features"], "priorKnowledge": [], "exclusions": [], "preferences": [], "durationMinutes": 15};
var ctx = {
  yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs",
  lessonBrief: { intent: "explain", learningGoal: intent.learningGoal, teacherIntent: intent },
  researchEvidence: { passages: passages, selectedPassageIds: passages.map(function (p) { return p.id; }) }
};
var rawClaims = [
 {
  "text": "Dinosaurs had straight back legs perpendicular to their bodies.",
  "kind": "feature",
  "depth": "concrete",
  "confidence": "high",
  "provenance": "retrieved",
  "sourceRef": [
   "S2-P01"
  ],
  "quote": "they had straight back legs, perpendicular to their bodies.",
  "teacherRequested": false,
  "factuallyVerified": false,
  "contested": false,
  "uncertainty": null,
  "ageFit": {
   "from": 1,
   "to": 6
  },
  "correctsPremise": false,
  "importance": "high",
  "accepted": true
 },
 {
  "text": "Their straight back legs let them use less energy to move than reptiles with a sprawling stance.",
  "kind": "mechanism",
  "depth": "mechanism",
  "confidence": "high",
  "provenance": "retrieved",
  "sourceRef": [
   "S2-P01"
  ],
  "quote": "This allowed them to use less energy to move than other reptiles that had a sprawling stance like today's lizards and crocodiles.",
  "teacherRequested": false,
  "factuallyVerified": false,
  "contested": false,
  "uncertainty": null,
  "ageFit": {
   "from": 3,
   "to": 6
  },
  "correctsPremise": false,
  "importance": "high",
  "accepted": true
 },
 {
  "text": "Sauropods had very long necks.",
  "kind": "feature",
  "depth": "concrete",
  "confidence": "high",
  "provenance": "retrieved",
  "sourceRef": [
   "S8-P10"
  ],
  "quote": "Sauropods had very long necks",
  "teacherRequested": false,
  "factuallyVerified": false,
  "contested": false,
  "uncertainty": null,
  "ageFit": {
   "from": 1,
   "to": 6
  },
  "correctsPremise": false,
  "importance": "high",
  "accepted": true
 },
 {
  "text": "Sauropods' very long necks let them stand still and stretch high, low and wide to reach plants.",
  "kind": "mechanism",
  "depth": "mechanism",
  "confidence": "high",
  "provenance": "retrieved",
  "sourceRef": [
   "S8-P10"
  ],
  "quote": "Sauropods had very long necks , which allowed them to stand still and stretch high, low and wide for the best plants around.",
  "teacherRequested": false,
  "factuallyVerified": false,
  "contested": false,
  "uncertainty": null,
  "ageFit": {
   "from": 3,
   "to": 6
  },
  "correctsPremise": false,
  "importance": "high",
  "accepted": true
 },
 {
  "text": "Sauropods' hands and feet were huge and padded.",
  "kind": "feature",
  "depth": "concrete",
  "confidence": "high",
  "provenance": "retrieved",
  "sourceRef": [
   "S8-P08"
  ],
  "quote": "Their hands and feet were also huge and padded, like those of elephants, which helped them spread their weight.",
  "teacherRequested": false,
  "factuallyVerified": false,
  "contested": false,
  "uncertainty": null,
  "ageFit": {
   "from": 2,
   "to": 6
  },
  "correctsPremise": false,
  "importance": "medium",
  "accepted": true
 },
 {
  "text": "Sauropods' huge and padded hands and feet helped spread their weight.",
  "kind": "mechanism",
  "depth": "mechanism",
  "confidence": "high",
  "provenance": "retrieved",
  "sourceRef": [
   "S8-P08"
  ],
  "quote": "Their hands and feet were also huge and padded, like those of elephants, which helped them spread their weight.",
  "teacherRequested": false,
  "factuallyVerified": false,
  "contested": false,
  "uncertainty": null,
  "ageFit": {
   "from": 3,
   "to": 6
  },
  "correctsPremise": false,
  "importance": "medium",
  "accepted": true
 }
];
var rawMechanisms = [
 {
  "text": "Their straight back legs let them use less energy to move than reptiles with a sprawling stance.",
  "feature": "straight back legs",
  "sourceRef": [
   "S2-P01"
  ],
  "quote": "This allowed them to use less energy to move than other reptiles that had a sprawling stance like today's lizards and crocodiles."
 },
 {
  "text": "Sauropods' very long necks let them stand still and stretch high, low and wide to reach plants.",
  "feature": "very long necks",
  "sourceRef": [
   "S8-P10"
  ],
  "quote": "Sauropods had very long necks , which allowed them to stand still and stretch high, low and wide for the best plants around."
 },
 {
  "text": "Sauropods' huge and padded hands and feet helped spread their weight.",
  "feature": "huge and padded hands and feet",
  "sourceRef": [
   "S8-P08"
  ],
  "quote": "Their hands and feet were also huge and padded, like those of elephants, which helped them spread their weight."
 }
];
var LINKS = {
  "Their straight back legs let them use less energy to move than reptiles with a sprawling stance.": "This allowed them to use less energy to move",
  "Sauropods' very long necks let them stand still and stretch high, low and wide to reach plants.": "which allowed them to stand still and stretch high, low and wide",
  "Sauropod dinosaurs' very long necks let them stand still and stretch high, low and wide to reach plants.": "which allowed them to stand still and stretch high, low and wide",
  "Sauropods' huge and padded hands and feet helped spread their weight.": "which helped them spread their weight"
};

function gate(claims, mechanisms) {
  var pack = Brain.normaliseKnowledgePack({ status: "usable", claims: JSON.parse(JSON.stringify(claims)), mechanisms: JSON.parse(JSON.stringify(mechanisms)) }, ctx);
  var results = {};
  pack.claims.forEach(function (claim) {
    if (claim.provenance !== "retrieved") return;
    results[claim.claimId] = { verdict: "supported", missing: "", linkQuote: LINKS[claim.text] || "", wording: claim.wordsNotInSource || [], addedFacts: [] };
  });
  Brain.applySourceEntailment(pack, { ok: true, results: results });
  var selection = Brain.selectPackForLesson(pack, ctx);
  return { pack: pack, selection: selection, readiness: Brain.assessPackReadiness(pack, selection, ctx) };
}

// 1. The gate is unchanged: run 5's neck pair is still held for relevance only.
var live = gate(rawClaims, rawMechanisms);
var neck = live.readiness.pairs.filter(function (p) { return p.feature === "very long necks"; })[0];
assert.ok(neck && !neck.ready, JSON.stringify(live.readiness.pairs));
assert.deepStrictEqual(neck.gaps, ["the pair is not relevant to the learning goal"]);
assert.strictEqual(live.readiness.distinctReady, 2);
assert.strictEqual(live.readiness.status, "incomplete");

// 2. The repair feedback names the problem and the words the gate reads, not mechanism advice.
var feedback = Brain.sourceRepairFeedback(live.pack, live.selection, live.readiness, ctx);
var row = feedback.filter(function (r) { return r.item === neck.explanation; })[0];
assert.ok(row, JSON.stringify(feedback));
assert.strictEqual(row.problem, "PAIR_NOT_LINKED_TO_GOAL");
assert.ok(/dinosaurs/.test(row.fix) && /survive/.test(row.fix) && /adapted/.test(row.fix), row.fix);
assert.ok(!/A mechanism must state how or why/.test(row.fix), row.fix);
assert.ok(/never add a fact/.test(row.fix));
// The repair brief carries that row.
var brief = Brain.sourceRepairBrief(live.pack, live.selection, live.readiness, ctx);
assert.ok(JSON.parse(brief.user).rejections.some(function (r) { return r.problem === "PAIR_NOT_LINKED_TO_GOAL"; }));

// 3. A pair with a mechanism gap still gets the mechanism advice.
var noMech = feedback.filter(function (r) { return r.problem === "PAIR_NOT_READY"; });
noMech.forEach(function (r) { assert.ok(/A mechanism must state how or why/.test(r.fix), r.fix); });

// 4. The fix the feedback asks for passes the same, unchanged gate: the explanation names the
//    group with the topic word and keeps the same quote; "dinosaurs" is placed as wording.
var fixedClaims = rawClaims.map(function (c) {
  if (c.text !== neck.explanation) return c;
  var copy = JSON.parse(JSON.stringify(c));
  copy.text = "Sauropod dinosaurs' very long necks let them stand still and stretch high, low and wide to reach plants.";
  return copy;
});
var fixedMechanisms = rawMechanisms.map(function (m) {
  if (m.text !== neck.explanation) return m;
  var copy = JSON.parse(JSON.stringify(m));
  copy.text = "Sauropod dinosaurs' very long necks let them stand still and stretch high, low and wide to reach plants.";
  return copy;
});
var fixed = gate(fixedClaims, fixedMechanisms);
var neck2 = fixed.readiness.pairs.filter(function (p) { return p.feature === "very long necks"; })[0];
assert.ok(neck2 && neck2.ready, JSON.stringify(fixed.readiness.pairs));
assert.strictEqual(fixed.readiness.status, "ready");
assert.strictEqual(fixed.readiness.distinctReady, 3);

console.log("source repair relevance tests passed");
