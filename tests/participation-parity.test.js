"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var Mechanics = require("../schools/learn/lesson-mechanics.js");
var Creator = require("../schools/learn/creator-core.js");

var ASK = "Year 1\nScience\n15 minutes\nTeach children about sharks.";
var GOAL = "Students will understand basic facts about sharks and their bodies.";
var MAP = [
  { id: "p1", knowledge: "A shark is a fish that lives in the sea.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "A shark has gills on its head.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "Gills take oxygen from the water so the shark can breathe.", role: "function", importance: "core", dependsOn: ["p2"] },
  { id: "p4", knowledge: "A shark has a strong tail.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p5", knowledge: "The tail pushes the water back so the shark moves forward.", role: "mechanism", importance: "core", dependsOn: ["p4"] },
  { id: "p6", knowledge: "Sharp teeth help a shark grip its food.", role: "function", importance: "core", dependsOn: ["p1"] }
];
var SHORT = {
  "hook:0": "What do sharks look like?",
  "investigate:0": "Look closely at the shark's body.",
  "resolution:0": "Strong tails help sharks swim.",
  "apply:0": "Show how a shark tail moves."
};
var TEACH = ["A shark is a fish.", "Fish like sharks live in the sea.", "Sharks have gills for breathing.", "Gills help sharks breathe underwater.", "Sharks have strong tails.", "Tails push water to move sharks.", "Sharp teeth grip their food."];

function clientCtx() {
  var draft = Creator.blankDraft();
  draft.source.text = ASK;
  var analysis = Creator.analyseSource(ASK);
  if (analysis.ok) Creator.applyAnalysis(draft, analysis);
  return Brain.contextFrom(draft, { pupilCount: 4, availableMechanics: Creator.capabilities(Mechanics).map(function (item) { return item.id; }) });
}

function serverLesson() {
  var ctx = clientCtx();
  Brain.applyTeacherIntent(ctx, { ok: true, learningGoal: GOAL, requiredEvidence: "The pupil describes shark body parts and what they do.", focusConcepts: ["shark bodies"], priorKnowledge: [], exclusions: [], preferences: [], subject: "Science", subjectConfidence: "explicit", durationMinutes: 15 });
  ctx.depthRequired = true;
  var made = Brain.normalisePlan({ title: "Sharks", learningObjective: GOAL, subject: "Science", topic: "Sharks", yearGroup: "Year 1", learningMap: MAP, lessonArc: [{ purpose: "teach" }, { purpose: "check" }] }, ctx);
  assert.strictEqual(made.ok, true, (made.issues || []).join("; "));
  var plan = made.plan;
  var slots = Brain.planBeats(Brain.lessonSkeleton(plan, ctx), plan, "Year 1");
  var frame = Object.assign({}, ctx, { lessonPlan: plan, lessonSkeleton: slots });
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  var textOf = {};
  plan.learningMap.forEach(function (item) { textOf[item.id] = item.knowledge; });
  var teachAt = 0;
  var body = {};
  slots.forEach(function (slot) {
    var beats = slot.beats.map(function (beat) {
      var text = SHORT[beat.id];
      if (slot.id === "teach") text = TEACH[teachAt++];
      if (slot.id === "check") text = "Choose the right answer.";
      if (slot.id === "recap") text = "We learned that " + beat.knowledgeRefs.map(function (ref) { return textOf[ref].replace(/[.]$/, "").replace(/^A /, "a "); }).join(", and ") + ".";
      return { id: beat.id, cue: "", text: text };
    });
    if (slot.id === "apply") body.apply = { beats: beats, instruction: "Show with your arm that " + textOf[slot.beats[0].knowledgeRefs[0]].replace(/^./, function (c) { return c.toLowerCase(); }), target: "shark tail", successCondition: "The pupil moves their arm like a tail pushing water.", teachingConnection: "The task uses how the tail moves the shark." };
    else if (slot.id === "check") {
      body.check = { beats: beats, questions: slot.beats.map(function (beat) {
        var answer = textOf[beat.knowledgeRefs[0]];
        return { id: beat.id, prompt: "Which sentence about sharks is true?", choices: [answer, "Sharks breathe air through their tail."], correct: answer, explain: "That sentence matches what the class learned about sharks.", successEvidence: "The pupil chose the taught idea.", teachingConnection: "The question follows the taught idea." };
      }) };
      body.check.questions.forEach(function (question, index) { question.prompt = "Which sentence about sharks is true, number " + (index + 1) + "?"; });
    } else body[slot.id] = { beats: beats };
  });
  var accepted = Brain.accept({ title: "Shark Body Adventure", objectives: [GOAL], slots: body }, Object.assign({}, frame, {
    applySemantic: { relationship: "apply", reason: "The task uses the idea." },
    checkSemantics: slots.filter(function (slot) { return slot.id === "check"; })[0].beats.map(function () { return { coverage: "sufficient" }; })
  }));
  return { slots: slots, accepted: accepted };
}

var server = serverLesson();
var teachSlot = server.slots.filter(function (slot) { return slot.id === "teach"; })[0];
assert.ok(teachSlot.beats.length > 6, "the lesson has more than six teach beats: " + teachSlot.beats.length);
TEACH.forEach(function (line) {
  var words = line.split(/\s+/).length;
  assert.ok(words >= 4 && words <= 7, "realistic Year 1 copy: " + line);
});
assert.strictEqual(server.accepted.ok, true, "server accept: " + (server.accepted.issues || []).join(" | "));
var shipped = JSON.parse(JSON.stringify(server.accepted.adventure));
var teachActivity = shipped.activities.filter(function (activity) { return activity.slotId === "teach"; })[0];
assert.ok(teachActivity.config.lines.length < teachSlot.beats.length, "the six-line activity cap still applies, so later beat text is not in config.lines");

// 1. A modern beat lesson accepted by the server is accepted by the browser.
var client = Brain.accept(JSON.parse(JSON.stringify(shipped)), clientCtx());
assert.strictEqual(client.ok, true, "client re-accept: " + (client.issues || []).join(" | "));
assert.ok(client.adventure.lessonSkeleton && client.adventure.lessonSkeleton.length, "the beat contract survives client re-accept");
var again = Brain.accept(JSON.parse(JSON.stringify(client.adventure)), clientCtx());
assert.strictEqual(again.ok, true, "a saved adventure re-accepts");
assert.ok(!client.issues || !client.issues.length);
assert.strictEqual(client.adventure.qualityWarnings, undefined, "the browser does not run the semantic slot checks");

// 2. An under-taught modern lesson still fails the shared participation contract on both sides.
var thin = JSON.parse(JSON.stringify(shipped));
thin.activities.forEach(function (activity) {
  if (activity.slotId === "teach") activity.config.lines = ["Sharks."];
});
var thinClient = Brain.accept(JSON.parse(JSON.stringify(thin)), clientCtx());
assert.strictEqual(thinClient.ok, false, "an under-taught lesson is rejected in the browser");
assert.ok(thinClient.issues.indexOf("The teach slot does not have enough participation for its time.") !== -1, thinClient.issues.join(" | "));
assert.ok(thinClient.issues.indexOf("The lesson does not contain enough teaching and participation for the requested time.") === -1, "the browser uses the beat contract, not the line heuristic");

// 3. A legacy beatless lesson keeps the existing fallback validation.
var legacy = JSON.parse(JSON.stringify(shipped));
delete legacy.lessonSkeleton;
legacy.activities.forEach(function (activity) { delete activity.beats; });
var legacyClient = Brain.accept(legacy, clientCtx());
assert.ok((legacyClient.issues || []).indexOf("The lesson does not contain enough teaching and participation for the requested time.") !== -1, "a beatless lesson still uses the line-based check: " + (legacyClient.issues || []).join(" | "));
var beatless = JSON.parse(JSON.stringify(legacy));
beatless.lessonSkeleton = server.slots.map(function (slot) { var copy = Object.assign({}, slot); delete copy.beats; return copy; });
assert.ok((Brain.accept(beatless, clientCtx()).issues || []).indexOf("The lesson does not contain enough teaching and participation for the requested time.") !== -1, "a skeleton without beats is not treated as the modern contract");

console.log("participation parity tests passed");
