"use strict";

// Tense parity for function verbs (source-grounded lesson PR).
// Live source-grounded Year 3 run (agent A, attempt 2): "Straight back legs helped dinosaurs
// move better and use less energy." was quote-verified against the NHM passage "This allowed
// them to use less energy to move" and still failed readiness, because "helped" was not a
// function verb while "help", "helps" and "allowed" were. Lessons about extinct animals are
// written in the past tense, so the gate rejected valid teaching for tense alone.
// This test pins parity only. Minima, relevance, distinctness and feature resolution are unchanged.

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var goal = "Pupils will understand how dinosaurs' body features helped them survive.";
function ctx() {
  return {
    yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15,
    lessonText: "Teach Year 3 about dinosaurs.",
    lessonBrief: { intent: "explain", rawRequest: "Teach Year 3 about dinosaurs.", learningGoal: goal,
      teacherIntent: { ok: true, learningGoal: goal, focusConcepts: ["body features", "survival"], requiredEvidence: "Pupils explain how a feature helped a dinosaur." } }
  };
}
function c(text, depth, extra) {
  return Object.assign({ text: text, depth: depth, confidence: "high", provenance: "model", ageFit: { from: 3, to: 6 } }, depth === "mechanism" ? { kind: "mechanism" } : {}, extra || {});
}
function readiness(verb) {
  var raw = {
    status: "usable",
    claims: [
      c("Dinosaurs had straight back legs under their bodies.", "concrete"),
      c("Some plant-eating dinosaurs had sharp spikes on their thumbs.", "concrete"),
      c("Some dinosaurs had feathers covering their bodies.", "concrete"),
      c("Straight back legs " + verb + " dinosaurs move with less energy.", "mechanism"),
      c("Thumb spikes " + verb + " plant-eaters fight off meat-eaters.", "mechanism"),
      c("Feathers " + verb + " small dinosaurs keep their bodies warm.", "mechanism")
    ],
    mechanisms: [
      { text: "Straight back legs " + verb + " dinosaurs move with less energy.", feature: "straight back legs" },
      { text: "Thumb spikes " + verb + " plant-eaters fight off meat-eaters.", feature: "sharp spikes on their thumbs" },
      { text: "Feathers " + verb + " small dinosaurs keep their bodies warm.", feature: "feathers" }
    ]
  };
  var k = ctx();
  var pack = Brain.normaliseKnowledgePack(raw, k);
  var selection = Brain.selectPackForLesson(pack, k);
  return Brain.assessPackReadiness(pack, selection, k);
}

var present = readiness("help");
var past = readiness("helped");
assert.ok(present.distinctReady >= 1, "present-tense pairs are ready");
assert.strictEqual(past.distinctReady, present.distinctReady, "past tense gives the same readiness as present tense");
assert.strictEqual(past.status, present.status);
assert.strictEqual(past.requiredPairs, present.requiredPairs, "strand minimum unchanged");
assert.strictEqual(past.requiredPairs, 3, "Year 3 explanatory goal still needs 3 pairs");

// Vague purpose with no job still fails the same way in either tense.
function vague(verb) {
  var raw = { status: "usable", claims: [c("Dinosaurs had many features.", "concrete"), c("Features " + verb + " dinosaurs.", "mechanism")],
    mechanisms: [{ text: "Features " + verb + " dinosaurs.", feature: "many features" }] };
  var k = ctx();
  var pack = Brain.normaliseKnowledgePack(raw, k);
  return Brain.assessPackReadiness(pack, Brain.selectPackForLesson(pack, k), k);
}
assert.strictEqual(vague("helped").distinctReady, 0, "a past-tense verb with no stated job is not a pair");
assert.strictEqual(vague("help").distinctReady, 0);

console.log("tense parity tests passed (present " + present.distinctReady + "/" + present.requiredPairs + ", past " + past.distinctReady + "/" + past.requiredPairs + ")");
