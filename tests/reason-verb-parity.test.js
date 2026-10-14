"use strict";

// Verb parity for the learning-map reason check (source-grounded lesson PR, its own commit).
// After the readiness gate, plan validation asks a "how ... helped/adapted" goal for one
// learning point that states the reason. statesRelation accepted "allowed" but not "allows",
// "let", "lets" or "enables", so the same sourced mechanism (NHM: "This allowed them to use less
// energy to move") passed as "allowed them to use" and failed as "let them use", the wording the
// live packs used in runs 5 and 6. This pins parity only; vague reasons still fail, and the help
// family is unchanged (tests/knowledge-depth.test.js keeps "helps sharks stay afloat" as an outcome).

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var intent = { ok: true, learningGoal: "Pupils will understand how dinosaurs adapted to their environments.", requiredEvidence: "Pupils can explain how a specific dinosaur's features helped it survive in its habitat.", focusConcepts: ["adaptation", "habitat", "survival", "features"] };
function ctx() {
  return { yearGroup: "Year 3", subject: "Science", topic: "Dinosaurs", requestedMinutes: 15, lessonText: "Teach Year 3 about dinosaurs",
    lessonBrief: { intent: "explain", rawRequest: "Teach Year 3 about dinosaurs", learningGoal: intent.learningGoal, teacherIntent: intent } };
}
function plan(objective, mech) {
  var map = [
    { id: "p1", knowledge: "Dinosaurs had straight back legs under their bodies.", role: "feature", dependsOn: [] },
    { id: "p2", knowledge: mech[0], role: "mechanism", dependsOn: ["p1"], explains: "p1" },
    { id: "p3", knowledge: "Sauropods had very long necks.", role: "feature", dependsOn: [] },
    { id: "p4", knowledge: mech[1], role: "mechanism", dependsOn: ["p3"], explains: "p3" },
    { id: "p5", knowledge: "Dinosaurs had large, strong jaw muscles attached to the top of the skull.", role: "feature", dependsOn: [] },
    { id: "p6", knowledge: mech[2], role: "mechanism", dependsOn: ["p5"], explains: "p5" }
  ];
  return Brain.normalisePlan({ learningObjective: objective, subject: "Science", topic: "Dinosaurs", learningMap: map, lessonArc: [{ purpose: "teach" }, { purpose: "check" }] }, ctx());
}
function issues(result) { return (result.issues || []).join(" / "); }
var OUTCOME = "outcome, not the reason";
var objective = "Explain how dinosaurs' features helped them survive.";
var forms = {
  allowed: ["Straight back legs allowed them to use less energy to move.", "Very long necks allowed sauropods to reach plants high, low and wide while standing still.", "Strong jaw muscles allowed the jaws to open wide and clamp down with more force."],
  let: ["Straight back legs let them use less energy to move.", "Very long necks let sauropods reach plants high, low and wide while standing still.", "Strong jaw muscles let the jaws open wide and clamp down with more force."],
  allows: ["Straight back legs allow them to use less energy to move.", "Very long necks allow sauropods to reach plants high, low and wide while standing still.", "Strong jaw muscles allow the jaws to open wide and clamp down with more force."],
  enabled: ["Straight back legs enabled them to use less energy to move.", "Very long necks enabled sauropods to reach plants high, low and wide while standing still.", "Strong jaw muscles enabled the jaws to open wide and clamp down with more force."]
};
var reference = plan(objective, forms.allowed);
assert.strictEqual(reference.ok, true, issues(reference));
Object.keys(forms).forEach(function (verb) {
  var result = plan(objective, forms[verb]);
  assert.strictEqual(result.ok, reference.ok, verb + ": " + issues(result));
  assert.strictEqual(issues(result).indexOf(OUTCOME), -1, verb);
});

// Vague reasons still fail, in any of these verbs.
[
  ["Straight back legs let them survive.", "Very long necks let sauropods live.", "Strong jaw muscles let them do well."],
  ["Straight back legs allow them to live.", "Very long necks enable sauropods to adapt to their environments.", "Strong jaw muscles let dinosaurs survive."],
  ["Straight back legs let dinosaurs.", "Very long necks let sauropods.", "Strong jaw muscles enabled dinosaurs."]
].forEach(function (set) {
  var result = plan(objective, set);
  assert.strictEqual(result.ok, false, set.join(" "));
  assert.ok(issues(result).indexOf(OUTCOME) !== -1, issues(result));
});

// Unit view of the parity rule.
assert.ok(Brain.statesEnabledJob("Straight back legs let them use less energy to move."));
assert.ok(Brain.statesEnabledJob("Fins allow it to swim."));
assert.ok(Brain.statesEnabledJob("Strong jaw muscles let the jaws open wide."));
["Size let dinosaurs survive.", "Necks let sauropods.", "Legs let them do well.", "Long necks let them live.", "Features enabled dinosaurs to adapt to their environments.", "Long necks helped sauropods reach plants."].forEach(function (text) {
  assert.strictEqual(Brain.statesEnabledJob(text), false, text);
});

// A why goal with only outcomes still fails; the parity verbs do not rescue an outcome list.
var why = Brain.normalisePlan({
  learningObjective: "Explain why we have day and night.",
  keyKnowledge: ["The sky gets light.", "People go to sleep."],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, { topic: "day and night", lessonText: "teach why we have day and night", lessonBrief: { intent: "why" }, yearGroup: "Year 5" });
assert.strictEqual(why.ok, false);
assert.ok(issues(why).indexOf(OUTCOME) !== -1);

// "so ... could" (live run 8): the readiness gate reads "so the jaws could open wide" as a
// mechanism, but the plan stage did not count it as answering the goal, so a ready NHM pair was
// dropped as "not connected to the learning goal". It now counts like "so that ... could".
assert.ok(Brain.statesSoCould("The jaw muscles attached through the holes, so the jaws could open wide and clamp down with more force."));
assert.ok(Brain.statesSoCould("Long necks reached high, so sauropods could eat leaves from tall trees."));
["Long necks were useful, so they could survive.", "Big legs were strong, so they could live.", "So could they.", "The jaws were so strong."].forEach(function (text) {
  assert.strictEqual(Brain.statesSoCould(text), false, text);
});
function jawMap(mechanism) {
  var goalText = "Pupils will understand how dinosaurs adapted to their environments.";
  var raw = { learningObjective: goalText, topic: "Dinosaurs", learningMap: [
    { id: "p1", knowledge: "Dinosaurs had straight back legs under their bodies.", role: "feature", dependsOn: [] },
    { id: "p2", knowledge: "Straight back legs allowed dinosaurs to use less energy to move.", role: "mechanism", dependsOn: ["p1"], explains: "p1" },
    { id: "p3", knowledge: "Dinosaurs had two holes behind the eye socket, with large, strong jaw muscles going through them.", role: "feature", dependsOn: [] },
    { id: "p4", knowledge: mechanism, role: "mechanism", dependsOn: ["p3"], explains: "p3" }
  ] };
  var k = Object.assign(ctx(), { lessonPlan: { learningObjective: goalText, topic: "Dinosaurs" } });
  var map = Brain.buildLearningMap(raw, k, goalText);
  return (map.rejected || []).some(function (x) { return x.knowledge === mechanism && x.reason === "not connected to the learning goal"; });
}
assert.strictEqual(jawMap("The jaw muscles attached through the holes, so that the jaws could open wide and clamp down with more force."), false, "reference: so that");
assert.strictEqual(jawMap("The jaw muscles attached through the holes, so the jaws could open wide and clamp down with more force."), false, "so ... could now counts");
assert.strictEqual(jawMap("The jaw muscles were big, so they could survive."), true, "vague job still dropped");

console.log("reason verb parity tests passed");
