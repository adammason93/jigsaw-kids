"use strict";

// Patch 7: the Try it stage gets its own call (research mode only): one unit's reason quote in,
// one choose task out, checked in code, with one repair in the boot. Live run 14 (6 Oct 2026)
// returned no choices from the content call. Task strings below are test strings.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");
var response = require("./fixtures/source-grounded/run9-generate-adventure.json");
function copy(v) { return JSON.parse(JSON.stringify(v)); }
function ctxFor(research, extra) {
  var c = { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs", lessonBrief: { teacherIntent: run9.intent },
    lessonSkeleton: copy(response.lessonSkeleton), lessonPlan: copy(response.lessonPlan), storyPlan: copy(response.storyPlan), knowledgePack: copy(run9.pack), knowledgeSelection: copy(run9.selection),
    applySemantic: { relationship: "apply", reason: "test" }, checkSemantics: [0, 1, 2].map(function () { return { coverage: "sufficient", reason: "test", demonstratedEvidence: "test" }; }) };
  if (research) c.researchEvidence = copy(run9.research);
  return Object.assign(c, extra || {});
}
var ctx = ctxFor(true);
var unit = Brain.applyTaskUnit(ctx);
assert.strictEqual(unit.unitId, "u1", "the unit the plan's apply beats cite (k2 -> u1)");
assert.strictEqual(Brain.applyTaskUnit(ctxFor(false)), null, "no research, no task");

var taught = ["Dinosaurs had straight back legs under their bodies.", "These straight back legs let them use less energy to move than reptiles with sprawling legs."];
var brief = Brain.applyTaskBrief(ctx, unit, { taught: taught, issues: [] });
assert.ok(/^You write the Try it task/.test(brief.system));
var user = JSON.parse(brief.user);
assert.strictEqual(user.reasonQuote, unit.explanationQuote);
assert.deepStrictEqual(user.taughtSentences, taught);
assert.deepStrictEqual(user.applyBeats.map(function (b) { return b.id; }), ["apply:0"]);

var reply = {
  beats: [{ id: "apply:0", text: "Compare two made-up reptiles and decide which one has straight back legs under its body." }],
  newCase: { text: "Imagine two made-up reptiles: one stands on straight back legs under its body, one has legs sprawled out to the side.", kind: "transfer" },
  instruction: "Which reptile would use less energy to move? Choose one.",
  choices: [
    { text: "The reptile with straight back legs", correct: true, feedback: "Yes. Straight back legs let an animal use less energy to move." },
    { text: "The reptile with sprawling legs", correct: false, feedback: "Not this one. Sprawling legs, not straight back legs, take more energy to move." }
  ],
  successText: "The class picks the reptile whose straight back legs let it use less energy to move."
};
var task = Brain.parseApplyTask(reply, unit);
assert.strictEqual(task.unitId, "u1");
assert.deepStrictEqual(task.claimIds, [unit.elementClaimId, unit.explanationClaimId]);
assert.strictEqual(task.successCondition, "correct-choice");
var tctx = Object.assign({}, ctx, { applyTaskTaught: taught });
assert.deepStrictEqual(Brain.applyTaskIssues(task, unit, tctx), []);

// Negative: no choices (run 14), a cut instruction (not clipped by the parser), a copied taught
// sentence as the set-up, a vaguer result, an empty set-up beat.
function variant(change) { var r = copy(reply); change(r); return Brain.applyTaskIssues(Brain.parseApplyTask(r, unit), unit, tctx); }
assert.ok(variant(function (r) { delete r.choices; }).some(function (t) { return /needs two or three choices/.test(t); }));
var longInstruction = "Imagine a dinosaur " + new Array(40).join("with long legs ") + "Choos";
assert.strictEqual(Brain.parseApplyTask(Object.assign(copy(reply), { instruction: longInstruction }), unit).instruction, longInstruction.replace(/\s+/g, " ").trim().slice(0, 400));
assert.ok(variant(function (r) { r.instruction = longInstruction; }).some(function (t) { return /complete sentence of at most 160/.test(t); }));
assert.ok(variant(function (r) { r.beats[0].text = "These straight back legs let them use less energy to move than reptiles with sprawling legs."; }).some(function (t) { return /repeats a taught sentence/.test(t); }));
assert.ok(variant(function (r) { r.choices[0].feedback = "Yes. Straight back legs help an animal move better."; }).some(function (t) { return /vaguer "better"/.test(t); }));
assert.ok(variant(function (r) { r.beats = []; }).some(function (t) { return /set-up text for each apply beat/.test(t); }));
assert.ok(variant(function (r) { r.beats[0].text = "Look closely at the picture now."; }).some(function (t) { return /The apply:0 beat does not use the taught knowledge/.test(t); }));
assert.deepStrictEqual(Brain.applyTaskIssues(task, null, tctx), ["The Try it task has no taught unit to use."]);

// accept(): with ctx.applyTask, the Try it stage is the task's, whatever the content call said.
var raw = { title: response.title, objectives: response.objectives, activities: copy(response.activities) };
// Run 9's content has no choices, so without the task the research apply fails "needs a choose task".
var without = Brain.accept(copy(raw), ctxFor(true));
assert.ok(((without.slotIssues && without.slotIssues.apply) || []).some(function (i) { return /needs a choose task/.test(i); }));
var mat = Brain.accept(copy(raw), ctxFor(true, { applyTask: task }));
var applyIssues = (mat.slotIssues && mat.slotIssues.apply) || [];
assert.deepStrictEqual(applyIssues, [], applyIssues.join(" | "));
// Default path: ctx.applyTask is ignored without research.
var plain = Brain.accept(copy(raw), ctxFor(false, { applyTask: task }));
assert.strictEqual(plain.ok, true);
var plainApply = plain.adventure.activities.filter(function (a) { return a.slotId === "apply"; })[0];
assert.notStrictEqual(plainApply.scene.interaction.type, "choose");
console.log("research apply task tests passed");
