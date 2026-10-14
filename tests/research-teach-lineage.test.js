"use strict";

// Patch 9, research mode only: the frozen lineage rule for teach beats also runs before the slot
// repair, pinned to the beat, so the repair can fix it. Live run 23 passed every other check
// and then failed lineage after the repair: "These webbed feet allowed the dinosaur to swim."
// states one job word ("swim"; "webbed feet" is the feature, "dinosaur" the topic).
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
function rawWith(text) {
  var raw = { title: response.title, objectives: response.objectives, activities: copy(response.activities) };
  if (text) raw.activities.forEach(function (a) { (a.beats || []).forEach(function (b) { if (b.id === "teach:3" && b.pupil) b.pupil.text = text; }); });
  return raw;
}

// The run 9 lesson passes: no teach lineage issue.
var good = Brain.accept(rawWith(null), ctxFor(true));
assert.deepStrictEqual(Brain.teachLineageIssues(good.previous.activities, ctxFor(true)), []);
assert.ok(!(good.issues || []).some(function (i) { return /cites the explanation for/.test(i); }));

// A teach beat with one job word fails before the repair, pinned to the teach slot and beat.
var thin = "This joint helped them eat.";
var bad = Brain.accept(rawWith(thin), ctxFor(true));
var hit = (bad.issues || []).filter(function (i) { return /The teach slot beat teach:3 \("This joint helped them eat\."\) cites the explanation for/.test(i); });
assert.strictEqual(hit.length, 1, JSON.stringify(bad.issues));
assert.ok(/as the explanation does: "/.test(hit[0]));
assert.ok((bad.slotIssues.teach || []).indexOf(hit[0]) !== -1, "owned by the teach slot");
assert.ok(bad.slotIds.indexOf("teach") !== -1);
// The repair brief pins it to beat teach:3 only.
var spec = JSON.parse(Brain.slotRepairBrief(ctxFor(true), ["teach"], bad.issues, bad.previous).user).slotsToRewrite[0];
var failingIds = spec.currentBeats.filter(function (b) { return b.failing.length; }).map(function (b) { return b.id; });
assert.ok(failingIds.indexOf("teach:3") !== -1, JSON.stringify(failingIds));
// The frozen rule is unchanged: the same lesson still fails lineage after the repair stage.
var lin = Brain.unitLineage({ lessonPlan: copy(response.lessonPlan), activities: copy(bad.previous.activities) }, ctxFor(true));
assert.ok(lin.issues.some(function (i) { return /no teaching beat cites its explanation/.test(i); }));
// Default mode: no new issue.
var plain = Brain.accept(rawWith(thin), ctxFor(false));
assert.ok(!(plain.issues || []).some(function (i) { return /cites the explanation for/.test(i); }), "default accept unchanged");
console.log("research teach lineage tests passed");
