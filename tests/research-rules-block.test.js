"use strict";

// Patch 7: research rules block after the slot repair too. Live run 14 (6 Oct 2026) completed with
// a tap-to-reveal APPLY because accept() turned research-rule issues into quality warnings once
// semanticWarningsAllowed was set after the repair. Research mode only; the default path is unchanged.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");
var response = require("./fixtures/source-grounded/run9-generate-adventure.json");
function copy(v) { return JSON.parse(JSON.stringify(v)); }
function ctxFor(research, extra) {
  var c = { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs",
    lessonBrief: { teacherIntent: run9.intent }, lessonSkeleton: copy(response.lessonSkeleton), lessonPlan: copy(response.lessonPlan), storyPlan: copy(response.storyPlan),
    knowledgePack: copy(run9.pack), knowledgeSelection: copy(run9.selection),
    applySemantic: { relationship: "apply", reason: "test" }, checkSemantics: [0, 1, 2].map(function () { return { coverage: "sufficient", reason: "test", demonstratedEvidence: "test" }; }) };
  if (research) c.researchEvidence = copy(run9.research);
  return Object.assign(c, extra || {});
}
var raw = { title: response.title, objectives: response.objectives, activities: copy(response.activities) };

// Negative: after the repair (semanticWarningsAllowed) a research-rule issue still fails the lesson.
var after = Brain.accept(copy(raw), ctxFor(true, { semanticWarningsAllowed: true }));
assert.strictEqual(after.ok, false);
assert.ok(after.slotIssues.apply.some(function (i) { return /needs a choose task/.test(i); }), JSON.stringify(after.slotIssues.apply));
assert.ok(!(after.qualityWarnings || []).some(function (w) { return w.outcome === "research-rule"; }), "no research-rule warning");
// Same before the repair.
assert.strictEqual(Brain.accept(copy(raw), ctxFor(true)).ok, false);
// Positive control: without research the same content is accepted, with or without the flag.
assert.strictEqual(Brain.accept(copy(raw), ctxFor(false, { semanticWarningsAllowed: true })).ok, true);
assert.strictEqual(Brain.accept(copy(raw), ctxFor(false)).ok, true);
console.log("research rules block tests passed");
