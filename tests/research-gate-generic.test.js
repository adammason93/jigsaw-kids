"use strict";

// Research-mode gate tightening (patch 6): an explanation whose only result is a general benefit
// (survive, live somewhere, thrive, do well) does not say what the feature did, so the pair is
// not ready. Live run 13 (6 Oct 2026) admitted "The dinosaur's sail likely stuck out of the water
// while Spinosaurus was swimming and helped the animal survive in its river home." This only
// tightens the gate, and only in research mode. Unit names (Brachiosaurus) are not hard words.
// No network and no paid call.

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var f = require("./fixtures/source-grounded/run13-pack.json");

var ctx = {
  yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: f.request.lessonText,
  lessonBrief: { intent: "explain", learningGoal: f.intent.learningGoal, requiredEvidence: f.intent.requiredEvidence, focusConcepts: f.intent.focusConcepts, teacherIntent: f.intent },
  researchEvidence: f.research, knowledgePack: f.pack, knowledgeSelection: f.selection
};

// Positive: concrete actions are explanations.
assert.strictEqual(Brain.genericResultOnly("Straight back legs let dinosaurs use less energy to move than reptiles with a sprawling stance."), false);
assert.strictEqual(Brain.genericResultOnly("Longer forelegs helped Brachiosaurus reach high into the trees."), false);
assert.strictEqual(Brain.genericResultOnly("Its nostrils let it breathe even with most of its snout submerged."), false);
// Negative: only a general benefit.
assert.strictEqual(Brain.genericResultOnly(f.pack.claims.filter(function (c) { return c.claimId === "c1t8skbl"; })[0].text), true);
assert.strictEqual(Brain.genericResultOnly("Feathers helped dinosaurs survive."), true);
assert.strictEqual(Brain.genericResultOnly("Strong legs allowed them to live in many places."), true);

// The run 13 pack: legs and forelegs stay ready; the sail pair is held with a reason and a fix.
var readiness = Brain.assessPackReadiness(f.pack, f.selection, ctx);
assert.deepStrictEqual(readiness.readyPairs.map(function (p) { return p.feature; }), ["straight back legs", "Longer forelegs"]);
assert.strictEqual(readiness.status, "incomplete");
var sail = readiness.pairs.filter(function (p) { return /sail/.test(p.explanation); })[0];
assert.ok(sail && !sail.ready && sail.gaps.some(function (g) { return /only says the feature helped the animal survive/.test(g); }), JSON.stringify(sail));
var feedback = Brain.sourceRepairFeedback(f.pack, f.selection, readiness, ctx);
assert.ok(feedback.some(function (row) { return /sail/.test(row.item) && /not what a feature did/.test(row.fix); }));
assert.ok(/only result is that the animal survived/.test(Brain.knowledgePackBrief(ctx).system));
// Default path unchanged: without research evidence the same pack keeps the sail pair ready.
var plain = Object.assign({}, ctx, { researchEvidence: null });
assert.ok(!Brain.assessPackReadiness(f.pack, f.selection, plain).pairs.some(function (p) { return p.gaps && p.gaps.some(function (g) { return /survive/.test(g); }); }));

// Unit names are the subject, not hard words; other long words are still flagged.
var activities = [{ slotId: "teach", beats: [{ id: "teach:0", pupil: { text: "Brachiosaurus had longer forelegs than hind legs." } }, { id: "teach:1", pupil: { text: "Dinosaurs had legs perpendicular to their bodies." } }, { id: "teach:2", pupil: { text: "The Ornithischia ate plants." } }] }];
var vocab = Brain.vocabularyIssues(activities, ctx).map(function (i) { return i.text; }).join(" ");
assert.ok(!/Brachiosaurus/.test(vocab), vocab);
assert.ok(/"perpendicular"/.test(vocab) && /"Ornithischia"/.test(vocab), vocab);
// The content rules tell the apply beats not to copy a knowledge sentence.
assert.ok(/Never repeat or closely reword a teach sentence/.test(Brain.researchContentRules("Year 3")));
console.log("research gate generic-result tests passed");
