"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var goal = "Pupils will learn how a plant takes in water and moves it to its leaves.";
var ctx = {
  yearGroup: "Year 2", subject: "Science", topic: "How plants drink", requestedMinutes: 15, pupilCount: 5,
  lessonText: "Show the class how plants get water.", depthRequired: true,
  lessonBrief: {
    intent: "explain", rawRequest: "Show the class how plants get water.", learningGoal: goal,
    teacherIntent: { ok: true, learningGoal: goal, requiredEvidence: "Pupils can say how water travels from the soil to the leaves.", focusConcepts: ["roots", "stem", "leaves"] }
  }
};

var made = Brain.normalisePlan({
  learningObjective: goal, subject: "Science", topic: "plants", yearGroup: "Year 2",
  learningMap: [
    { id: "a", knowledge: "Plants need water to stay alive and grow.", role: "foundation", importance: "core", dependsOn: [] },
    { id: "b", knowledge: "Roots soak up water from the soil.", role: "feature", importance: "core", dependsOn: ["a"] },
    { id: "c", knowledge: "The stem carries water up to the leaves.", role: "function", importance: "core", dependsOn: ["b"] },
    { id: "d", knowledge: "Dry soil holds no water for the plant.", role: "feature", importance: "core", dependsOn: ["a"] },
    { id: "f", knowledge: "The plant droops when that water does not arrive, so the leaves wilt.", role: "effect", importance: "core", dependsOn: ["d"] },
    { id: "e", knowledge: "Roots, stem and leaves work as one water path.", role: "connection", importance: "core", dependsOn: ["b", "c"] }
  ],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, ctx);
assert.strictEqual(made.ok, true, (made.issues || []).join("; "));
var plan = made.plan;
var withPlan = Object.assign({}, ctx, { lessonPlan: plan });
var story = Brain.storyFromPlan(plan, withPlan);
var skeleton = Brain.planBeats(Brain.lessonSkeleton(plan, Object.assign({}, withPlan, { storyPlan: story })), plan, "Year 2");
var frame = Object.assign({}, withPlan, { storyPlan: story, lessonSkeleton: skeleton });

var investigate = skeleton.filter(function (slot) { return slot.id === "investigate"; })[0];
assert.ok(investigate.beats.some(function (beat) { return beat.move === "notice"; }), "the investigate stage carries a notice beat");
assert.ok(!/look and ask/i.test(investigate.pedagogicalPurpose), "investigate must not ask for two speech acts: " + investigate.pedagogicalPurpose);
assert.ok(/one question/i.test(investigate.pedagogicalPurpose), "investigate asks for one question: " + investigate.pedagogicalPurpose);

var system = Brain.contentBrief(frame, plan, story).system;
assert.ok(/notice beat is one sentence/.test(system) && /never an instruction followed by a question/.test(system), "the Year 2 brief must show the one-sentence notice shape");
var older = Object.assign({}, frame, { yearGroup: "Year 5", lessonPlan: Object.assign({}, plan, { yearGroup: "Year 5" }) });
assert.ok(!/never an instruction followed by a question/.test(Brain.contentBrief(older, older.lessonPlan, story).system), "older years keep their one-or-two sentence rule");

var items = Brain.beatKnowledge(plan, "Year 2");
var lookThenAsk = "Peek at the thirsty plant pot. Where could the water be hiding?";
var slots = {};
skeleton.forEach(function (slot) {
  var beats = slot.beats.filter(function (beat) { return beat.move !== "retrieve"; }).map(function (beat, index) {
    var text = "The plant in our pot needs a drink today.";
    if (slot.id === "investigate" && index === 0) text = lookThenAsk;
    return { id: beat.id, cue: "", text: text };
  });
  if (slot.id === "apply") {
    slots.apply = { beats: beats, instruction: "Move the water drop from the roots up the stem to the leaves.", target: "Water drop", successCondition: "The drop reaches the leaves through the stem.", teachingConnection: "It follows the water path the class learned." };
  } else if (slot.id === "check") {
    slots.check = { beats: [], questions: slot.beats.map(function (beat, index) {
      var answer = items.filter(function (item) { return item.id === beat.knowledgeRefs[0]; })[0].text;
      return { id: beat.id, prompt: "Which is true about plants, number " + (index + 1) + "?", choices: [answer, "Plants drink through their petals."], correct: answer, explain: "That is what the class learned about plants.", successEvidence: "The pupil chose the taught idea.", teachingConnection: "From the taught idea." };
    }) };
  } else slots[slot.id] = { beats: beats };
});

var accepted = Brain.accept({ title: "Plant mission", objectives: [goal], slots: slots }, Object.assign({}, frame, {
  applySemantic: { relationship: "apply", reason: "x" },
  checkSemantics: skeleton.filter(function (slot) { return slot.id === "check"; })[0].beats.map(function () { return { coverage: "sufficient" }; })
}));
assert.strictEqual(accepted.ok, false);
assert.ok(accepted.issues.indexOf("The investigate:0 beat needs a pupil sentence.") !== -1, "a two-sentence Year 2 notice is still rejected: " + accepted.issues.join(" | "));

var brief = JSON.parse(Brain.slotRepairBrief(frame, accepted.slotIds, accepted.issues, accepted.previous).user);
var spec = brief.slotsToRewrite.filter(function (item) { return item.slotType === "INVESTIGATE"; })[0];
var row = ((spec || {}).rejectedBeats || []).filter(function (item) { return item.beatId === "investigate:0"; })[0];
assert.ok(row, "the investigate repair sees the rejected beat");
assert.strictEqual(row.text, lookThenAsk);
assert.strictEqual(row.reason, "too many sentences for year");
assert.ok(/exactly one sentence/.test(row.fix) && /instruction followed by a question/.test(row.fix), "the repair names the instruction-then-question shape: " + row.fix);

console.log("notice one-sentence tests passed");
