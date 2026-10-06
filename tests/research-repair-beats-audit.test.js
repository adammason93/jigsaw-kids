"use strict";

// Patch 9, research mode only. Live run 21 (12:43 BST) stopped at the final check:
// - the recap repair returned the recap word for word (the brief showed only the old text to
//   fill) and the unchanged check missed it (same words, different shape);
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");
var response = require("./fixtures/source-grounded/run9-generate-adventure.json");
function copy(v) { return JSON.parse(JSON.stringify(v)); }
function ctxFor(research) {
  var c = { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs", lessonBrief: { teacherIntent: run9.intent },
    lessonSkeleton: copy(response.lessonSkeleton), lessonPlan: copy(response.lessonPlan), storyPlan: copy(response.storyPlan), knowledgePack: copy(run9.pack), knowledgeSelection: copy(run9.selection) };
  if (research) c.researchEvidence = copy(run9.research);
  return c;
}

// 1. Per-beat targets from run 21's own recap, failures and plan (keyKnowledge/droppedKnowledge).
var plan = {
  keyKnowledge: ["Spinosaurus had nostrils further up on its snout than other dinosaurs.", "Spinosaurus's nostrils further up let it breathe with most of its snout underwater.", "Spinosaurus had paddle-like webbed feet.", "Spinosaurus's webbed feet allowed the dinosaur to swim.", "Brachiosaurus had forelegs longer than its hind legs.", "Brachiosaurus's longer forelegs helped it reach high into the trees."],
  droppedKnowledge: ["Spinosaurus lived in what is now North Africa’s Sahara region, which then had a large river system.", "Spinosaurus was well adapted for aquatic life."]
};
var beats = [
  { id: "recap:0", text: "Spinosaurus had nostrils higher up to breathe with most of its snout underwater." },
  { id: "recap:1", text: "Its webbed feet allowed it to swim well." },
  { id: "recap:2", text: "Brachiosaurus's longer forelegs helped it reach high into the trees." }
];
var failure = ["The recap uses knowledge that was not taught.", "The recap slot changes what the source says about webbed feet (u2, beat recap:1): the source says \"swim\", but it uses the vaguer \"well\" instead. Keep the source's meaning and its key words."];
var t = Brain.beatRepairTargets(beats, failure, plan);
assert.deepStrictEqual(t.beats[0].failing, []);
assert.deepStrictEqual(t.beats[2].failing, []);
assert.strictEqual(t.beats[1].failing.length, 2);
assert.ok(t.beats[1].failing.some(function (f) { return /beat recap:1/.test(f); }));
assert.ok(t.beats[1].failing.some(function (f) { return /This line uses "well", a word from knowledge this lesson left out \("Spinosaurus was well adapted for aquatic life\."\)/.test(f); }), JSON.stringify(t.beats[1].failing));
assert.deepStrictEqual(t.slotFailures, []);
// An untaught-knowledge failure with no leaking word in any beat stays slot-wide.
assert.deepStrictEqual(Brain.beatRepairTargets([beats[0]], [failure[0]], plan).slotFailures, [failure[0]]);

// 2. The research repair brief shows currentBeats; the default brief does not.
var raw = { title: response.title, objectives: response.objectives, activities: copy(response.activities) };
var acc = Brain.accept(copy(raw), ctxFor(true));
var recapFail = ["The recap slot changes what the source says about jaws (u2, beat recap:1): the source says \"chew\". Keep the source's meaning and its key words."];
var issues = Object.assign(recapFail.slice(), { slotIssues: { recap: recapFail.slice() } });
var brief = JSON.parse(Brain.slotRepairBrief(ctxFor(true), ["recap"], issues, acc.previous).user);
var spec = brief.slotsToRewrite[0];
assert.ok(spec.currentBeats && spec.currentBeats[1].failing.length === 1 && !spec.currentBeats[0].failing.length, JSON.stringify(spec.currentBeats));
assert.ok(/currentBeats shows each beat's text now/.test(brief.instruction));
var plainAcc = Brain.accept(copy(raw), ctxFor(false));
var plain = JSON.parse(Brain.slotRepairBrief(ctxFor(false), ["recap"], issues, plainAcc.previous).user);
assert.ok(!plain.slotsToRewrite[0].currentBeats && !/currentBeats/.test(plain.instruction), "default brief unchanged");

// 3. A recap returned with the same words in the output shape counts as unchanged; a changed beat does not.
var out = brief.slotsToRewrite[0].output;
var same = Brain.mergeSlotContent(acc.previous, { slots: { recap: copy(out) } });
var acceptedRecap = { previous: acc.previous, slotIds: ["recap"], slotIssues: { recap: recapFail.slice() }, issues: issues };
assert.deepStrictEqual(Brain.targetRepair(acc.previous, same, acceptedRecap).unchanged, ["The repair returned the recap slot unchanged. A repair must change what failed."]);
var changed = copy(out); changed.beats[1].text = "A different recap line.";
assert.deepStrictEqual(Brain.targetRepair(acc.previous, Brain.mergeSlotContent(acc.previous, { slots: { recap: changed } }), acceptedRecap).unchanged, []);

console.log("research repair beats and audit tests passed");
