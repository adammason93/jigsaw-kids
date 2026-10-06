"use strict";

// Patch 8, research mode only: the Try it brief no longer invites invented animal names, and its
// repair asks for a changed task. Live run 17 (6 Oct 2026, 12:16 BST) stopped at APPLY_TASK_FAILED:
// the task called its made-up animal "Swimnosaurus" (a hard word for Year 3), and the repair
// returned the same reply word for word. The vocabulary rule is unchanged and still blocks.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");
var response = require("./fixtures/source-grounded/run9-generate-adventure.json");
function copy(v) { return JSON.parse(JSON.stringify(v)); }
var ctx = { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs", lessonBrief: { teacherIntent: run9.intent },
  lessonSkeleton: copy(response.lessonSkeleton), lessonPlan: copy(response.lessonPlan), storyPlan: copy(response.storyPlan), knowledgePack: copy(run9.pack), knowledgeSelection: copy(run9.selection), researchEvidence: copy(run9.research) };
var unit = Brain.applyTaskUnit(ctx);
var taught = ["Dinosaurs had straight back legs under their bodies.", "These straight back legs let them use less energy to move than reptiles with sprawling legs."];

// The brief: plain-words animals, no invented names; the repair must change the reply.
var brief = Brain.applyTaskBrief(ctx, unit, { taught: taught, issues: ["The apply slot uses words above Year 3 reading level: \"Strideosaurus\"."], previous: { instruction: "x" } });
assert.ok(/Never invent a name for it, in any field/.test(brief.system));
assert.ok(/Never return previous unchanged, and leave out every word that fixThese quotes/.test(brief.system));
assert.deepStrictEqual(JSON.parse(brief.user).fixThese, ["The apply slot uses words above Year 3 reading level: \"Strideosaurus\"."]);

// The rule is unchanged: a task that names its made-up animal still fails; plain words pass.
var plain = {
  beats: [{ id: "apply:0", text: "Compare two made-up reptiles and decide which one has straight back legs under its body." }],
  newCase: { text: "Imagine two made-up reptiles: one stands on straight back legs under its body, one has legs sprawled out to the side.", kind: "transfer" },
  instruction: "Which reptile would use less energy to move? Choose one.",
  choices: [
    { text: "The reptile with straight back legs", correct: true, feedback: "Yes. Straight back legs let an animal use less energy to move." },
    { text: "The reptile with sprawling legs", correct: false, feedback: "Not this one. Sprawling legs, not straight back legs, take more energy to move." }
  ],
  successText: "The class picks the reptile whose straight back legs let it use less energy to move."
};
var tctx = Object.assign({}, ctx, { applyTaskTaught: taught });
assert.deepStrictEqual(Brain.applyTaskIssues(Brain.parseApplyTask(plain, unit), unit, tctx), []);
var named = copy(plain);
named.newCase.text = "Imagine a made-up reptile called the Strideosaurus that stands on straight back legs under its body.";
named.instruction = "Would the Strideosaurus use less energy to move? Choose one.";
assert.ok(Brain.applyTaskIssues(Brain.parseApplyTask(named, unit), unit, tctx).some(function (t) { return /above Year 3 reading level: "Strideosaurus"/.test(t); }), "an invented name still fails");
console.log("research apply task names tests passed");
