"use strict";

// ID lineage (source-grounded lesson PR, patch 5). A gate-ready pack pair is a teaching unit
// (unitId, elementClaimId, explanationClaimId). The learning map, teaching beats and questions
// carry those ids and validation follows them; goal relevance is not re-derived from words after
// the gate. Substance still applies: a point or beat citing a unit must state the feature's job.
// Fixtures are trimmed copies of live runs 8 and 9 (pack, cited passages, recorded raw plans,
// and run 9's generated lesson). No model call is made.

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var run8 = require("./fixtures/source-grounded/run8-plan-replay.json");
var run9 = require("./fixtures/source-grounded/run9-lesson-lineage.json");

function copy(value) { return JSON.parse(JSON.stringify(value)); }
function ctxFrom(fx, extra) {
  return Object.assign({
    yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs",
    lessonBrief: { intent: "explain", rawRequest: "Teach Year 3 about dinosaurs", learningGoal: fx.intent.learningGoal, requiredEvidence: fx.intent.requiredEvidence, focusConcepts: fx.intent.focusConcepts, teacherIntent: fx.intent },
    researchEvidence: copy(fx.research), knowledgePack: copy(fx.pack), knowledgeSelection: copy(fx.selection)
  }, extra || {});
}
function plan(fx, raw, index) {
  var extra = index === 0 ? { depthRequired: true } : { depthRequired: true, breadthSettled: true, priorPlan: fx.rawPlans[0] };
  return Brain.normalisePlan(copy(raw), ctxFrom(fx, extra));
}

// ---- (a) all three recorded run-8 pairs survive planning, by id ----
var ctx8 = ctxFrom(run8);
var ready8 = Brain.assessPackReadiness(ctx8.knowledgePack, ctx8.knowledgeSelection, ctx8);
assert.strictEqual(ready8.status, "ready");
assert.strictEqual(ready8.requiredPairs, 3, "Year 3 still needs 3 pairs");
var units8 = Brain.readyUnits(ready8);
assert.deepStrictEqual(units8.map(function (u) { return u.unitId; }), ["u1", "u2", "u3"]);
units8.forEach(function (u) { assert.ok(u.elementClaimId && u.explanationClaimId && u.elementClaimId !== u.explanationClaimId, JSON.stringify(u)); });
run8.rawPlans.forEach(function (raw, index) {
  var out = plan(run8, raw, index);
  assert.ok(out.ok, "recorded run-8 plan " + index + ": " + JSON.stringify(out.issues));
  assert.strictEqual(out.packPairs.preserved, 3);
  var map = out.plan.learningMap;
  units8.forEach(function (u) {
    var explain = map.filter(function (p) { return p.claimIds.indexOf(u.explanationClaimId) !== -1; })[0];
    var element = map.filter(function (p) { return p.claimIds.indexOf(u.elementClaimId) !== -1; })[0];
    assert.ok(explain && element, u.unitId + " missing from plan " + index);
    assert.deepStrictEqual(explain.unitIds, [u.unitId]);
    assert.deepStrictEqual(element.unitIds, [u.unitId]);
    assert.ok(explain.answers, u.unitId + " answers by id");
    assert.ok(explain.dependsOn.indexOf(element.id) !== -1, u.unitId + " explanation depends on its feature");
  });
});

// The ornithischian pair (no word "dinosaurs") and the "so ... could" pair answer by id. The
// lexical check alone would not have accepted the ornithischian one.
var jaw = units8.filter(function (u) { return /jaw joint/.test(u.feature); })[0];
assert.ok(jaw, JSON.stringify(units8.map(function (u) { return u.feature; })));

// ---- (b) an unrelated claim is still rejected ----
var unitClaims = {};
units8.forEach(function (u) { unitClaims[u.elementClaimId] = 1; unitClaims[u.explanationClaimId] = 1; });
var other = (ctx8.knowledgeSelection.claimIds || []).map(function (id) { return ctx8.knowledgePack.claims.filter(function (c) { return c.claimId === id; })[0]; })
  .filter(function (c) { return c && !unitClaims[c.claimId] && !c.sourceHold; })[0];
assert.ok(other, "the run-8 pack has a selected claim outside the ready units");
var withOther = copy(run8.rawPlans[0]);
withOther.learningMap.push({ id: "p9", knowledge: other.text, role: "fact", dependsOn: [], claimIds: [other.claimId] });
var outOther = plan(run8, withOther, 0);
assert.ok((outOther.mapRejected || (outOther.plan && outOther.plan.mapRejected) || []).some(function (r) { return r.knowledge === other.text && /not connected/.test(r.reason); }),
  "a claim outside the ready units is not connected: " + JSON.stringify(outOther.mapRejected || (outOther.plan && outOther.plan.mapRejected)));
// A row citing an id that is not in the pack at all is rejected too.
var withFake = copy(run8.rawPlans[0]);
withFake.learningMap.push({ id: "p9", knowledge: "Dinosaurs could breathe fire to keep warm.", role: "mechanism", dependsOn: [], claimIds: ["czzzzzz"] });
var outFake = plan(run8, withFake, 0);
assert.ok((outFake.mapRejected || (outFake.plan && outFake.plan.mapRejected) || []).some(function (r) { return /breathe fire/.test(r.knowledge); }));

// ---- (c) a hollow explanation citing a valid id is still rejected ----
function hollowPlan(text) {
  var raw = copy(run8.rawPlans[0]);
  var legs = units8.filter(function (u) { return /legs/.test(u.feature); })[0];
  raw.learningMap.forEach(function (row) {
    if ((row.claimIds || []).indexOf(legs.explanationClaimId) !== -1 || /less energy/.test(row.knowledge)) { row.knowledge = text; row.claimIds = [legs.explanationClaimId]; }
  });
  return plan(run8, raw, 0);
}
["Dinosaurs' straight back legs allowed them.", "Dinosaurs' straight back legs helped them survive.", "Dinosaurs' straight back legs allowed them to adapt to their environments."].forEach(function (text) {
  var out = hollowPlan(text);
  assert.strictEqual(out.ok, false, text + " must not pass: " + JSON.stringify(out.issues));
  assert.ok((out.issues || []).join(" ").match(/pair was removed|outcome, not the reason|feature-and-explanation|invented/), text + ": " + JSON.stringify(out.issues));
});
// The unit job check itself.
var legsUnit = units8.filter(function (u) { return /legs/.test(u.feature); })[0];
assert.ok(Brain.statesUnitJob("Straight back legs allowed dinosaurs to use less energy to move than reptiles with sprawling legs.", legsUnit, ctx8));
assert.ok(!Brain.statesUnitJob("Straight back legs allowed dinosaurs.", legsUnit, ctx8));
assert.ok(!Brain.statesUnitJob("Straight back legs helped dinosaurs survive in their environment.", legsUnit, ctx8));
assert.ok(!Brain.statesUnitJob("Dinosaurs had straight back legs.", legsUnit, ctx8), "a feature statement is not a job");

// ---- (d) the 3-pair minimum is unchanged ----
var two = copy(run8.pack);
var dropMech = units8[2].explanationClaimId;
two.claims = two.claims.filter(function (c) { return c.claimId !== dropMech; });
two.mechanisms = (two.mechanisms || []).filter(function (m) { return m.claimId !== dropMech; });
var sel2 = copy(run8.selection);
sel2.claimIds = (sel2.claimIds || []).filter(function (id) { return id !== dropMech; });
var ctx2 = ctxFrom(run8, { knowledgePack: two, knowledgeSelection: sel2 });
var ready2 = Brain.assessPackReadiness(two, sel2, ctx2);
assert.strictEqual(ready2.requiredPairs, 3);
assert.strictEqual(ready2.status, "incomplete", "two ready pairs are not enough for Year 3");

// ---- run 9's generated lesson: every unit planned, taught and assessed, by id ----
var ctx9 = ctxFrom(run9);
var lesson = copy(run9.adventure);
var before = copy(lesson);
var lineage = Brain.unitLineage(lesson, ctx9);
assert.strictEqual(lineage.skipped, false);
assert.deepStrictEqual(lineage.issues, [], JSON.stringify(lineage.units));
assert.strictEqual(lineage.units.length, 3);
lineage.units.forEach(function (u) {
  assert.ok(u.ok && u.planPoints.length === 2 && u.strand && u.explainBeats.length && u.questions.length, JSON.stringify(u));
});
lesson.activities.filter(function (a) { return a.slotId === "check"; })[0].config.questions.forEach(function (q) {
  assert.strictEqual(q.unitIds.length, 1, "each question assesses one unit by id: " + q.id);
  assert.ok(q.claimIds.length && q.knowledgeRefs.length);
});

// ---- (e) no hand-written teaching: lineage only adds id fields, never text ----
function strip(adventure) {
  var out = copy(adventure);
  (out.lessonPlan.learningMap || []).forEach(function (p) { delete p.unitIds; });
  ((out.lessonPlan.teachingPlan || {}).strands || []).forEach(function (s) { delete s.unitIds; });
  out.activities.forEach(function (a) {
    (a.beats || []).forEach(function (b) { delete b.unitIds; delete b.claimIds; });
    ((a.config || {}).questions || []).forEach(function (q) { delete q.unitIds; delete q.claimIds; delete q.knowledgeRefs; });
  });
  return out;
}
assert.deepStrictEqual(strip(lesson), before, "unitLineage changed lesson content");

// A beat that cites the unit but says nothing about the job fails lineage (substance at the beat).
var hollowLesson = copy(run9.adventure);
hollowLesson.activities.forEach(function (a) {
  (a.beats || []).forEach(function (b) { if (b.id === "teach:1") b.pupil.text = "This leg position was very special for them."; });
});
var hollowLineage = Brain.unitLineage(hollowLesson, ctx9);
assert.ok(hollowLineage.issues.some(function (i) { return /unit u1/.test(i) && /no teaching beat/.test(i); }), JSON.stringify(hollowLineage.issues));
// A unit no question assesses fails lineage.
var noQ = copy(run9.adventure);
noQ.activities.forEach(function (a) { if (a.slotId === "check") a.config.questions = a.config.questions.slice(0, 2); });
var noQLineage = Brain.unitLineage(noQ, ctx9);
assert.ok(noQLineage.issues.some(function (i) { return /no question assesses it/.test(i); }), JSON.stringify(noQLineage.issues));
// Without a gate-ready pack (no research mode), lineage is skipped and nothing is stamped.
var noPack = Brain.unitLineage(copy(run9.adventure), { yearGroup: "Year 3", topic: "Dinosaurs" });
assert.strictEqual(noPack.skipped, true);

console.log("unit lineage tests passed");
