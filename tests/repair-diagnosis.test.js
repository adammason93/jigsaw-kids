"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var goal = "Pupils will understand how a bird's body structure aids in its flying ability.";
var ctx = {
  yearGroup: "Year 1", subject: "Science", topic: "How a bird's body helps it fly", requestedMinutes: 15, pupilCount: 4,
  lessonText: "Teach children how a bird's body helps it fly.", depthRequired: true,
  lessonBrief: {
    intent: "explain", rawRequest: "Teach children how a bird's body helps it fly.", learningGoal: goal,
    teacherIntent: { ok: true, learningGoal: goal, requiredEvidence: "Pupils can explain how features of a bird's body help it fly.", focusConcepts: ["wings", "feathers", "light bones"] }
  }
};

var made = Brain.normalisePlan({
  learningObjective: goal, subject: "Science", topic: "birds", yearGroup: "Year 1",
  learningMap: [
    { id: "a", knowledge: "Birds have a special body that helps them with flying.", role: "foundation", importance: "core", dependsOn: [] },
    { id: "b", knowledge: "Wide wings push down on the air.", role: "feature", importance: "core", dependsOn: ["a"] },
    { id: "c", knowledge: "Feathers help birds steer and glide.", role: "function", importance: "core", dependsOn: ["a"] },
    { id: "d", knowledge: "Light bones allow birds to stay up while flying.", role: "concept", importance: "core", dependsOn: ["a"] },
    { id: "e", knowledge: "All these parts work together to help birds fly well.", role: "connection", importance: "core", dependsOn: ["b", "c", "d"] }
  ],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, ctx);
assert.strictEqual(made.ok, true, (made.issues || []).join("; "));
var plan = made.plan;
var withPlan = Object.assign({}, ctx, { lessonPlan: plan });
var story = Brain.storyFromPlan(plan, withPlan);
var skeleton = Brain.planBeats(Brain.lessonSkeleton(plan, Object.assign({}, withPlan, { storyPlan: story })), plan, "Year 1");
var frame = Object.assign({}, withPlan, { storyPlan: story, lessonSkeleton: skeleton });
var items = Brain.beatKnowledge(plan, "Year 1");
var first = items[0].text;

var twoSentences = "Look at how birds fly. What makes them different from other animals?";
var texts = {
  hook: [twoSentences],
  investigate: ["Let us explore the parts of a bird's body and how they help it fly."],
  teach: ["Birds have a special body that helps them with flying.", "This body is light, which means it lifts easily.", "Wide wings push down on the air to lift the bird.", "Feathers help birds steer and glide through the sky.", "Light bones keep birds up while flying.", "All these parts work together to help birds fly well."],
  apply: ["Think about how each part of a bird's body helps it fly. Share your ideas."],
  resolution: ["Now we know how a bird's body helps it fly."],
  recap: [first, "Wings and feathers lift and steer a bird.", "All the parts of a bird work together."]
};
var slots = {};
skeleton.forEach(function (slot) {
  var beats = slot.beats.filter(function (beat) { return beat.move !== "retrieve"; }).map(function (beat, index) {
    return { id: beat.id, cue: "", text: (texts[slot.id] || [])[index] || "" };
  });
  if (slot.id === "apply") {
    slots.apply = { beats: beats, instruction: "Discuss how a bird's body features contribute to its flying.", target: "Share your thoughts about bird bodies.", successCondition: "Pupils explain how bird features help flying.", teachingConnection: "This task connects to how body features aid flying." };
  } else if (slot.id === "check") {
    slots.check = { beats: [], questions: slot.beats.map(function (beat, index) {
      var answer = items.filter(function (item) { return item.id === beat.knowledgeRefs[0]; })[0].text;
      return { id: beat.id, prompt: "Which sentence is true about birds number " + (index + 1) + "?", choices: [answer, "Birds sleep all winter."], correct: answer, explain: "That is what the class learned about birds.", successEvidence: "The pupil chose the taught idea.", teachingConnection: "From the taught idea." };
    }) };
  } else slots[slot.id] = { beats: beats };
});

var accepted = Brain.accept({ title: "Bird mission", objectives: [goal], slots: slots }, Object.assign({}, frame, {
  applySemantic: { relationship: "apply", reason: "x" },
  checkSemantics: skeleton.filter(function (slot) { return slot.id === "check"; })[0].beats.map(function () { return { coverage: "sufficient" }; })
}));
assert.strictEqual(accepted.ok, false);
assert.deepStrictEqual(accepted.slotIds, ["hook", "apply", "recap"], "the live failure shape: hook, apply, and recap need repair");
assert.ok(accepted.issues.indexOf("The hook:0 beat needs a pupil sentence.") !== -1);
assert.ok(accepted.issues.indexOf("The recap:0 beat repeats a knowledge sentence.") !== -1);
assert.ok(accepted.issues.indexOf("The apply slot does not use the taught knowledge.") !== -1);

var brief = JSON.parse(Brain.slotRepairBrief(frame, accepted.slotIds, accepted.issues, accepted.previous).user);
function spec(type) { return brief.slotsToRewrite.filter(function (item) { return item.slotType === type; })[0]; }
function rejected(type, beatId) { return ((spec(type) || {}).rejectedBeats || []).filter(function (row) { return row.beatId === beatId; })[0]; }

var hook = rejected("HOOK", "hook:0");
assert.ok(hook, "the hook repair must see which beat was rejected");
assert.strictEqual(hook.text, twoSentences, "the hook repair must see the rejected copy");
assert.ok(/exactly one sentence/.test(hook.fix), "the hook repair must be told the real reason: " + (hook && hook.fix));

var applyBeat = rejected("APPLY", "apply:0");
assert.ok(applyBeat && /exactly one sentence/.test(applyBeat.fix), "the apply beat repair must be told the real reason");

var recap = rejected("RECAP", "recap:0");
assert.ok(recap, "the recap repair must see which beat was rejected");
assert.strictEqual(recap.reason, "copies a knowledge sentence");
assert.ok(/new words/.test(recap.fix), "a copied knowledge sentence must be restated in new words: " + recap.fix);

assert.ok(/discuss|explain|describe/.test(spec("APPLY").applyFailure || ""), "the apply repair must be told the task is not an action: " + spec("APPLY").applyFailure);
assert.ok(brief.instruction.indexOf("Do not return the rejected text again") !== -1);
assert.ok(brief.instruction.indexOf(spec("APPLY").applyFailure) !== -1);

var fixed = JSON.parse(JSON.stringify(slots));
fixed.hook.beats[0].text = "Look at how a bird flies through the sky.";
fixed.apply.beats[0].text = "Use your whole body to show how a bird moves.";
fixed.apply.instruction = "Move your arms and body like a bird to show how its special body helps it with flying.";
fixed.recap.beats[0].text = "A bird's body is built to help it fly.";
var after = Brain.accept({ title: "Bird mission", objectives: [goal], slots: fixed }, Object.assign({}, frame, {
  applySemantic: { relationship: "apply", reason: "x" },
  checkSemantics: skeleton.filter(function (slot) { return slot.id === "check"; })[0].beats.map(function () { return { coverage: "sufficient" }; })
}));
assert.strictEqual(after.ok, true, "the same structure passes once the rejected copy is fixed: " + (after.issues || []).join(" | "));

console.log("repair diagnosis tests passed");
