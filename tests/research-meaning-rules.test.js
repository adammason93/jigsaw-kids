"use strict";

// Patch 7 meaning preservation (research mode only; blocking). Teach, recap and APPLY sentences
// must not replace or overstate the source's concrete result. Sentences are run 14's live lines
// (6 Oct 2026) and test strings, not lesson content.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");
var response = require("./fixtures/source-grounded/run9-generate-adventure.json");
function copy(v) { return JSON.parse(JSON.stringify(v)); }

var legs = { unitId: "u1", feature: "straight back legs", resultClause: "use less energy to move", keyTerms: ["energy", "move"], directions: ["less"],
  explanationQuote: "This allowed them to use less energy to move than other reptiles that had a sprawling stance like today's lizards and crocodiles.",
  passageText: "With legs positioned under their bodies, dinosaurs' weight was also better supported." };
var nose = { unitId: "u2", feature: "nostrils further up", resultClause: "breathe even with most of its snout submerged", keyTerms: ["breathe", "even", "most", "snout", "submerged"], directions: [],
  explanationQuote: "This would've allowed the animal to breathe even with most of its snout submerged.", passageText: "" };

// ---- meaningCheck ----
// Run 14 recap: "could breathe underwater" replaces "breathe even with most of its snout submerged".
assert.strictEqual(Brain.meaningCheck("Spinosaurus could breathe underwater because of its nostril position.", nose).ok, false);
// Run 14 teach line keeps it.
assert.strictEqual(Brain.meaningCheck("This adaptation let Spinosaurus breathe even when most of its snout was underwater.", nose).ok, true);
// Run 14 APPLY: "move better" for "use less energy"; "better" elsewhere in the passage no longer excuses it.
var better = Brain.meaningCheck("How do those legs help it move better than other reptiles?", legs);
assert.deepStrictEqual(better.vague, ["better"]);
assert.strictEqual(better.ok, false);
assert.deepStrictEqual(Brain.meaningCheck("Straight back legs let dinosaurs use less energy to move.", legs).vague, []);
assert.strictEqual(Brain.meaningCheck("Straight back legs let dinosaurs use less energy to move.", legs).ok, true);
// Absolute words overstate the source.
assert.deepStrictEqual(Brain.meaningCheck("Straight back legs let dinosaurs always use less energy to move.", legs).overstated, ["always"]);

// ---- applyMeaningIssues ----
function applyAct(choices, extra) {
  return [{ slotId: "apply", beats: [{ id: "apply:0", knowledgeRefs: ["k2"], pupil: { text: (extra && extra.beat) || "Use what you know about straight back legs to choose." } }],
    scene: { interaction: { type: "choose", unitId: "u1", instruction: "Which animal would use less energy to walk? Choose one.", newCase: { text: "Two new reptiles: one with straight legs under its body, one with sprawling legs." }, choices: choices } } }];
}
var goodChoices = [
  { text: "The animal with straight legs", correct: true, feedback: "Yes. Straight legs under the body let an animal use less energy to move." },
  { text: "The animal with sprawling legs", correct: false, feedback: "Not this one. Straight back legs, not sprawling legs, let an animal use less energy to move." }
];
assert.deepStrictEqual(Brain.applyMeaningIssues(applyAct(goodChoices), {}, legs), []);
var vagueFeedback = copy(goodChoices); vagueFeedback[0].feedback = "Yes. Straight legs under the body help an animal move better.";
var rows = Brain.applyMeaningIssues(applyAct(vagueFeedback), {}, legs);
assert.ok(rows.length >= 1 && /choice 1 feedback/.test(rows[0].text) && /vaguer "better"/.test(rows[0].text), JSON.stringify(rows));
var vagueBeat = Brain.applyMeaningIssues(applyAct(goodChoices, { beat: "How do those legs help it move better than other reptiles?" }), {}, legs);
assert.ok(vagueBeat.some(function (r) { return /beat apply:0/.test(r.text); }), JSON.stringify(vagueBeat));
// A task for another unit is not checked against this one.
var other = applyAct(vagueFeedback); other[0].scene.interaction.unitId = "u2";
assert.deepStrictEqual(Brain.applyMeaningIssues(other, {}, legs), []);

// ---- accept(): recap sentences must each keep the meaning (run 9 fixture ctx) ----
function ctxFor(research) {
  var c = { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs", lessonBrief: { teacherIntent: run9.intent },
    lessonSkeleton: copy(response.lessonSkeleton), lessonPlan: copy(response.lessonPlan), storyPlan: copy(response.storyPlan), knowledgePack: copy(run9.pack), knowledgeSelection: copy(run9.selection),
    applySemantic: { relationship: "apply", reason: "test" }, checkSemantics: [0, 1, 2].map(function () { return { coverage: "sufficient", reason: "test", demonstratedEvidence: "test" }; }) };
  if (research) c.researchEvidence = copy(run9.research);
  return c;
}
var raw = { title: response.title, objectives: response.objectives, activities: copy(response.activities) };
var a = {}; raw.activities.forEach(function (act) { a[act.slotId] = act; });
a.teach.beats[1].pupil.text = "These straight back legs let them use less energy to move than reptiles with sprawling legs.";
// Keeps the direction word, so patch 6 let it pass; it drops the key words, so patch 7 blocks it.
a.recap.beats[0].pupil.text = "Dinosaurs with straight back legs needed less effort.";
var res = Brain.accept(copy(raw), ctxFor(true));
assert.ok((res.slotIssues.recap || []).some(function (i) { return /beat recap:0\): .*drops the source words "energy", "move"/.test(i); }), JSON.stringify(res.slotIssues.recap));
a.recap.beats[0].pupil.text = "Straight back legs let dinosaurs use less energy to move.";
var res2 = Brain.accept(copy(raw), ctxFor(true));
assert.ok(!(res2.slotIssues.recap || []).some(function (i) { return /beat recap:0\)/.test(i); }), JSON.stringify(res2.slotIssues.recap));
// A teach sentence that overstates fails even when another teach sentence keeps the meaning.
a.teach.beats[1].pupil.text = "These straight back legs let them use less energy to move than reptiles with sprawling legs, so they could walk forever.";
var res3 = Brain.accept(copy(raw), ctxFor(true));
assert.ok((res3.slotIssues.teach || []).some(function (i) { return /overstates the source with "forever"/.test(i); }), JSON.stringify(res3.slotIssues.teach));
// Default path: no meaning rule.
assert.strictEqual(Brain.researchRuleIssues(copy(raw).activities, ctxFor(false)).length, 0);
console.log("research meaning rules tests passed");
