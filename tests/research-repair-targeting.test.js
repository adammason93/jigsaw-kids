"use strict";

// Patch 9, research mode only: repair targeting. Live run 18's slot repair rewrote every check
// question blind (it never saw the current questions) and gave all three the same choices; run
// 17's Try it repair returned its first reply word for word. Now:
// - each check question's own failures are passed to the repair with the current question,
//   a question with no failures keeps its first version after the repair, and
// - a repaired slot or Try it task that comes back unchanged is rejected.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");
var response = require("./fixtures/source-grounded/run9-generate-adventure.json");
function copy(v) { return JSON.parse(JSON.stringify(v)); }
function ctxFor(research) {
  var c = { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs", lessonBrief: { teacherIntent: run9.intent },
    lessonSkeleton: copy(response.lessonSkeleton), lessonPlan: copy(response.lessonPlan), storyPlan: copy(response.storyPlan), knowledgePack: copy(run9.pack), knowledgeSelection: copy(run9.selection),
    applySemantic: { relationship: "apply", reason: "test" }, checkSemantics: [0, 1, 2].map(function () { return { coverage: "sufficient", reason: "test", demonstratedEvidence: "test" }; }) };
  if (research) c.researchEvidence = copy(run9.research);
  return c;
}
var raw = { title: response.title, objectives: response.objectives, activities: copy(response.activities) };
var acc = Brain.accept(copy(raw), ctxFor(true));
var check = acc.previous.activities.filter(function (a) { return a.slotId === "check"; })[0];

// 1. Each failure is attributed to its question (by "Question N" or by the words it quotes).
var targets = Brain.repairTargets(check, acc.slotIssues.check, acc.issues.questionFailures);
assert.ok(targets.questions[0].failing.some(function (f) { return /Question 1 has a correct answer/.test(f); }));
assert.ok(targets.questions[1].failing.some(function (f) { return /reading level: "effectively"/.test(f); }), "quoted word belongs to question 2");
assert.ok(targets.questions[2].failing.some(function (f) { return /goal-directed wording \("Why did some dinosaurs/.test(f); }), "quoted prompt belongs to question 3");
assert.deepStrictEqual(targets.slotFailures, []);

// 2. The repair brief shows the current questions with their failures (research only).
var brief = Brain.slotRepairBrief(ctxFor(true), ["check"], acc.issues, acc.previous);
var spec = JSON.parse(brief.user);
var text = JSON.stringify(spec);
assert.ok(/currentQuestions/.test(text) && /How did straight back legs help dinosaurs save energy\?/.test(text));
assert.ok(/Copy a question whose failing list is empty exactly as it is/.test(brief.system + brief.user));
assert.ok(/never give two questions the same choices/.test(brief.system + brief.user));
var plainAcc = Brain.accept(copy(raw), ctxFor(false));
var plainBrief = Brain.slotRepairBrief(ctxFor(false), ["check"], plainAcc.issues || [], plainAcc.previous);
assert.ok(!/currentQuestions/.test(plainBrief.user) && !/Copy a question whose failing list is empty/.test(plainBrief.system + plainBrief.user), "default brief unchanged");

// 3. After the repair, a question that failed nothing keeps its first version.
var onlyQ2 = Object.assign(["The check slot Question 2 has a wrong choice (\"x\") that is true in general."], { questionFailures: {} });
var accepted = { previous: acc.previous, slotIds: ["check"], slotIssues: { check: onlyQ2.slice() }, issues: onlyQ2 };
var rewritten = { slots: { check: { questions: [0, 1, 2].map(function (i) { return { id: "check:" + i, prompt: "Same choices for every question " + i + "?", choices: ["A", "B", "C"], correct: "A", explain: "A." }; }) } } };
var merged = Brain.mergeSlotContent(acc.previous, rewritten);
var out = Brain.targetRepair(acc.previous, merged, accepted);
assert.deepStrictEqual(out.kept, [1, 3]);
assert.strictEqual(merged.slots.check.questions[0].prompt, check.config.questions[0].prompt, "Q1 kept");
assert.strictEqual(merged.slots.check.questions[1].prompt, "Same choices for every question 1?", "Q2 replaced");
assert.strictEqual(merged.slots.check.questions[2].prompt, check.config.questions[2].prompt, "Q3 kept");
assert.deepStrictEqual(out.unchanged, []);
// A slot-wide failure (names no question, quotes nothing in one) lets every question change.
var wide = Object.assign(["The check slot leaves part of the required evidence untested."], { questionFailures: {} });
var merged2 = Brain.mergeSlotContent(acc.previous, copy(rewritten));
assert.deepStrictEqual(Brain.targetRepair(acc.previous, merged2, { previous: acc.previous, slotIds: ["check"], slotIssues: { check: wide.slice() }, issues: wide }).kept, []);

// 4. An unchanged repaired slot is rejected.
var same = Brain.mergeSlotContent(acc.previous, { slots: {} });
var unchanged = Brain.targetRepair(acc.previous, same, { previous: acc.previous, slotIds: ["teach"], slotIssues: { teach: ["The teach slot changes what the source says."] }, issues: ["x"] });
assert.deepStrictEqual(unchanged.unchanged, ["The repair returned the teach slot unchanged. A repair must change what failed."]);

// 5. A Try it repair that returns the same task is rejected.
var tctx = Object.assign(ctxFor(true), { applyTaskTaught: [] });
var unit = Brain.applyTaskUnit(tctx);
var task = Brain.parseApplyTask({ beats: [{ id: "apply:0", text: "Compare two made-up reptiles and decide which one stands on straight back legs." }], newCase: { text: "Imagine two made-up reptiles: one stands on straight back legs, one has sprawling legs.", kind: "transfer" }, instruction: "Choose the reptile that would use less energy to move?", choices: [{ text: "The reptile with straight back legs", correct: true, feedback: "Yes. Straight back legs let an animal use less energy to move." }, { text: "The reptile with sprawling legs", correct: false, feedback: "Not this one. Sprawling legs, not straight back legs, take more energy to move." }], successText: "The class picks the reptile whose straight back legs let it use less energy to move." }, unit);
assert.ok(!Brain.applyTaskIssues(task, unit, tctx).some(function (t) { return /unchanged/.test(t); }));
assert.ok(Brain.applyTaskIssues(task, unit, Object.assign({}, tctx, { applyTaskPrevious: copy(task) })).some(function (t) { return /The Try it repair returned the same task unchanged/.test(t); }));
console.log("research repair targeting tests passed");
