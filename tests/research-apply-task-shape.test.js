"use strict";

// Patch 8, research mode only: the Try it task is checked in code for two things it got wrong
// live, so its own repair can fix them (the content slot repair cannot: the task overrides the
// content's apply fields).
// - Runs 17 and 18 (6 Oct 2026) asked "Which feature helps ...?": the frozen apply-alignment check
//   fails that as recall-only after every repair (run 18 stopped there).
// - Run 18's new example stated the result ("..., allowing it to breathe even while its long snout
//   is underwater"), giving the answer away.
// The task strings below are the saved live outputs (negative) and test strings (positive).
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var unit = { unitId: "u1", feature: "nostrils further up", featureQuote: "Its nostrils were further up on its snout than the nostrils of other dinosaurs.", resultClause: "breathe even with most of its snout submerged" };
var run18 = {
  instruction: "Which feature helps this new animal breathe while submerged?",
  newCase: { text: "Imagine a new animal whose nostrils sit high on its snout, allowing it to breathe even while its long snout is underwater.", kind: "transfer" },
  beats: [{ id: "apply:0", text: "The new animal has nostrils further up on its snout. Compare this with Spinosaurus and decide how it helps." }]
};
var rows = Brain.applyTaskShapeIssues(run18, unit).map(function (r) { return r.text; });
assert.ok(rows.some(function (t) { return /^The apply slot asks for recall instead of using the knowledge\. Start the instruction with Choose/.test(t); }), rows.join(" | "));
assert.ok(rows.some(function (t) { return /already gives the result \("Imagine a new animal whose nostrils sit high/.test(t); }), rows.join(" | "));
// Run 17's instruction fails the same way.
assert.strictEqual(Brain.applyTaskShapeIssues({ instruction: "Which feature helps the new animal breathe while submerged?", newCase: { text: "Imagine a new animal with nostrils high on its snout." }, beats: [] }, unit).length, 1);
// Positive: a Choose instruction and a set-up that only describes features.
var good = {
  instruction: "Choose the animal that could breathe with most of its snout under water?",
  newCase: { text: "Imagine two new animals in a river: one has nostrils high on its snout, the other has nostrils at the very tip of its snout.", kind: "transfer" },
  beats: [{ id: "apply:0", text: "Compare the two new animals and decide which nostrils sit higher on the snout." }]
};
assert.deepStrictEqual(Brain.applyTaskShapeIssues(good, unit), []);
// A feature-only link sentence is fine ("helps" with no result word).
assert.deepStrictEqual(Brain.applyTaskShapeIssues({ instruction: good.instruction, newCase: good.newCase, beats: [{ id: "apply:0", text: "Compare the two new animals and decide which feature helps." }] }, unit), []);
// The frozen alignment check is the same one: the instruction it fails here fails applyAlignment.
// The brief now asks for Choose instructions and feature-only set-ups.
var brief = Brain.applyTaskBrief({ yearGroup: "Year 3", lessonSkeleton: [] }, unit, { taught: [], issues: [] });
assert.ok(/starts with Choose/.test(brief.system) && /Never start it with Which, What or Why/.test(brief.system));
assert.ok(/describe only the new animals' features, never what a feature lets or helps an animal do/.test(brief.system));
console.log("research apply task shape tests passed");
