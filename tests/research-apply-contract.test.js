"use strict";

// Patch 7 APPLY contract (research mode only; blocking): a choose task on a new example (not the
// taught animal), 2-3 options with exactly one correct, feedback for every option that names the
// taught claim, a complete instruction (run 14's was cut mid-word), the unit's claim ids and a
// success condition. Test strings only.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
function copy(v) { return JSON.parse(JSON.stringify(v)); }

var nose = { unitId: "u2", feature: "nostrils further up", explanation: "Nostrils further up on its snout let Spinosaurus breathe even with most of its snout submerged.",
  resultClause: "breathe even with most of its snout submerged", keyTerms: ["breathe", "even", "most", "snout", "submerged"], directions: [],
  explanationQuote: "This would've allowed the animal to breathe even with most of its snout submerged.", elementClaimId: "c70tt8c", explanationClaimId: "crmd4vj" };
function task(change) {
  var inter = { type: "choose", target: "choices", unitId: "u2", claimIds: ["c70tt8c", "crmd4vj"], successCondition: "correct-choice",
    successText: "The class picks the animal whose nostrils sit high on its snout.",
    instruction: "Which animal could breathe with most of its snout under water? Choose one.",
    newCase: { text: "Imagine two made-up river animals: one has nostrils high on its snout and one has nostrils at the tip.", kind: "transfer", sourceRef: [], quote: "" },
    choices: [
      { text: "The animal with nostrils high on its snout", correct: true, feedback: "Yes. Nostrils further up let it breathe even with most of its snout submerged." },
      { text: "The animal with nostrils at the tip", correct: false, feedback: "Not this one. With nostrils at the tip, its snout cannot be submerged while it breathes." }
    ] };
  if (change) change(inter);
  return { slotId: "apply", beats: [], scene: { interaction: inter } };
}
function issues(activity) { return Brain.applyChoiceIssues(activity, { __activities: [] }, [nose]).map(function (r) { return r.text; }); }

// Positive.
assert.deepStrictEqual(issues(task()), []);
// Wrong-choice feedback must name the taught claim.
assert.ok(issues(task(function (i) { i.choices[1].feedback = "Not this one, have another look at the two animals."; })).some(function (t) { return /feedback for the choice "The animal with nostrils at the tip" must name the taught idea/.test(t); }));
// Claim ids.
assert.ok(issues(task(function (i) { delete i.claimIds; })).some(function (t) { return /claim ids \(c70tt8c, crmd4vj\)/.test(t); }));
assert.ok(issues(task(function (i) { i.claimIds = ["crmd4vj"]; })).some(function (t) { return /claim ids/.test(t); }));
// Instruction cut off (run 14: "... Choos"), or too long.
assert.ok(issues(task(function (i) { i.instruction = "Imagine a new dinosaur with nostrils high up. Choos"; })).some(function (t) { return /complete sentence/.test(t); }));
assert.ok(issues(task(function (i) { i.instruction = "Which animal " + new Array(30).join("really ") + "fits? Choose one."; })).some(function (t) { return /at most 160/.test(t); }));
// A new example, not the taught animal.
assert.ok(issues(task(function (i) { i.newCase.text = "Imagine Spinosaurus in a deeper river with its whole snout under the water."; })).some(function (t) { return /new example is about Spinosaurus, the animal already taught/.test(t); }));
// Success condition.
assert.ok(issues(task(function (i) { i.successCondition = "The pupil explains how straight back leg"; })).some(function (t) { return /needs a success condition/.test(t); }));
assert.ok(issues(task(function (i) { delete i.successText; })).some(function (t) { return /needs a success condition/.test(t); }));
// Patch 6 checks still hold: exactly one correct, 2-3 options.
assert.ok(issues(task(function (i) { i.choices[1].correct = true; })).some(function (t) { return /exactly one correct/.test(t); }));
assert.ok(issues(task(function (i) { i.choices = i.choices.slice(0, 1); })).some(function (t) { return /two or three choices/.test(t); }));
// No choices at all (run 14's tap-to-reveal) still fails first.
assert.ok(/needs a choose task/.test(issues({ slotId: "apply", scene: { interaction: { type: "move", instruction: "Think about it." } } })[0]));

// cleanInteraction keeps a choose step's whole instruction, claim ids and success text; other steps keep 120 characters.
var long = "Imagine a new dinosaur with straight back legs and another with sprawling legs side by side in a field today. Which one would use less energy to move? Choose one.";
var kept = Brain.cleanInteraction(task(function (i) { i.instruction = long; }).scene.interaction);
assert.strictEqual(kept.instruction, long);
assert.deepStrictEqual(kept.claimIds, ["c70tt8c", "crmd4vj"]);
assert.ok(/nostrils sit high/.test(kept.successText));
var move = Brain.cleanInteraction({ type: "move", instruction: long, target: "t1" });
assert.strictEqual(move.instruction.length <= 120, true);
assert.strictEqual(move.claimIds, undefined);
console.log("research apply contract tests passed");
