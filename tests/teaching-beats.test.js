"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var Shell = require("../schools/learn/lesson-shell.js");
var Mechanics = require("../schools/learn/lesson-mechanics.js");
var Creator = require("../schools/learn/creator-core.js");

function planFor(year, subject, knowledge, objective) {
  return Brain.normalisePlan({
    learningObjective: objective,
    subject: subject,
    topic: objective,
    keyKnowledge: knowledge,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, { subject: subject, topic: objective, yearGroup: year, requestedMinutes: 15, lessonBrief: { intent: "explain" } }).plan;
}

function beatsFor(plan, year) {
  var frame = { subject: plan.subject, topic: plan.topic, yearGroup: year, requestedMinutes: 15, pupilCount: 4, lessonPlan: plan };
  return Brain.planBeats(Brain.lessonSkeleton(plan, frame), plan, year);
}

function moves(slots) {
  var list = [];
  (slots || []).forEach(function (slot) {
    (slot.beats || []).forEach(function (beat) { list.push(beat.move); });
  });
  return list;
}

function speak(beat, items) {
  var item = items[0];
  items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
  var known = String(item.text || "").replace(/[.?!]$/, "");
  var text = {
    notice: "Look at the scene and say what you can see.",
    predict: "Say what you think is happening before the explanation.",
    name: item.kind === "relationship" || item.kind === "procedure" ? "The class gives this idea its own name." : item.text,
    explain: item.text,
    exemplify: "Here is one clear example of the idea in use.",
    model: "Watch this worked step and say what changes.",
    compare: "Look at both sides and say what is different.",
    connect: "These two ideas belong together in this lesson.",
    practise: "Use " + known + " in what you make.",
    apply: "Use " + known + " in what you make.",
    retrieve: "Which sentence matches the idea you just learned?",
    reveal: "The class can now use the idea from this lesson.",
    consolidate: "The class can now use the idea about " + known.split(" ")[0].toLowerCase() + "."
  }[beat.move];
  return { id: beat.id, cue: "", text: text };
}

function slotsFrom(slots, items) {
  var body = {};
  slots.forEach(function (slot) {
    var beats = (slot.beats || []).map(function (beat) { return speak(beat, items); });
    var task = (beats[0] && beats[0].text) || "";
    if (slot.id === "apply") {
      body.apply = { beats: beats, instruction: task, target: "scene", successCondition: "The pupil has used the taught idea in the task.", teachingConnection: "The task follows the idea the class just learned." };
    } else if (slot.id === "check") {
      var correct = items[items.length - 1].text;
      body.check = { beats: beats, prompt: task, choices: [correct, "A different idea that was not part of this lesson."], correct: correct, explain: "That sentence matches the idea the class has just learned.", successEvidence: "The pupil chose the taught idea.", teachingConnection: "The question follows the taught idea." };
    } else body[slot.id] = { beats: beats };
  });
  return body;
}

function frameFor(plan, year, slots) {
  var frame = { subject: plan.subject, topic: plan.topic, yearGroup: year, requestedMinutes: 15, pupilCount: 4, lessonPlan: plan, lessonBrief: { intent: "explain" } };
  frame.lessonSkeleton = slots;
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  return frame;
}

var sharkKnowledge = ["Sharks have fins and sharp teeth.", "Fins help a shark turn because they push against the water."];
var sharkPlan = planFor("Year 1", "Science", sharkKnowledge, sharkKnowledge[0]);
var sharkSlots = beatsFor(sharkPlan, "Year 1");
var sharkItems = Brain.beatKnowledge(sharkPlan, "Year 1");
var sharkMoves = moves(sharkSlots);

assert.deepStrictEqual(sharkItems.map(function (item) { return item.id; }), ["k1", "k2"]);
assert.deepStrictEqual(sharkMoves, ["notice", "notice", "name", "name", "explain", "practise", "retrieve", "reveal", "consolidate", "consolidate"]);
assert.deepStrictEqual(Brain.beatProblems(sharkSlots), []);
assert.ok(sharkMoves.indexOf("predict") === -1);
assert.ok(sharkMoves.indexOf("model") === -1);
assert.ok(sharkMoves.indexOf("apply") === -1);

var fractionKnowledge = ["Equivalent fractions are different names for the same amount.", "Multiply the top and the bottom by the same number."];
var fractionPlan = planFor("Year 4", "Maths", fractionKnowledge, fractionKnowledge[0]);
var fractionSlots = beatsFor(fractionPlan, "Year 4");
var fractionItems = Brain.beatKnowledge(fractionPlan, "Year 4");
var fractionMoves = moves(fractionSlots);
assert.ok(fractionMoves.indexOf("notice") !== -1);
assert.ok(fractionMoves.indexOf("name") !== -1);
assert.ok(fractionMoves.indexOf("model") !== -1);
assert.ok(fractionMoves.indexOf("apply") !== -1);
assert.ok(fractionMoves.indexOf("retrieve") !== -1);
assert.ok(fractionMoves.indexOf("consolidate") !== -1);
assert.ok(fractionMoves.indexOf("practise") === -1);
assert.deepStrictEqual(Brain.beatProblems(fractionSlots), []);

var older = beatsFor(planFor("Year 6", "History", ["Trade grew because new routes linked the towns.", "The new routes carried grain and cloth.", "Markets changed when more goods arrived.", "Towns kept records of what was sold."], "Explain how trade changed the towns."), "Year 6");
assert.ok(older[0].beats.some(function (beat) { return beat.move === "predict"; }));
assert.ok(older[2].beats.length <= 5);
assert.ok(older[6].beats.length === 1);

var early = beatsFor(sharkPlan, "Year 1");
assert.ok(early[2].beats.length <= 3);
assert.strictEqual(Brain.beatKnowledge(sharkPlan, "Year 1").length, 2);
assert.strictEqual(Brain.beatKnowledge(planFor("Year 6", "Science", ["One.", "Two.", "Three.", "Four facts stay in the plan for later."], "Describe four ideas in order."), "Year 6").length, 4);

var messy = Brain.keepBeatPlan(sharkSlots[2].beats, [
  { id: "teach:9", move: "invent", text: "This extra beat must not survive the plan." },
  { id: sharkSlots[2].beats[1].id, text: "The class gives this idea its own name." },
  { id: sharkSlots[2].beats[0].id, text: "Sharks have fins and sharp teeth." }
]);
assert.deepStrictEqual(messy.map(function (beat) { return beat.id; }), sharkSlots[2].beats.map(function (beat) { return beat.id; }));
assert.deepStrictEqual(messy.map(function (beat) { return beat.move; }), sharkSlots[2].beats.map(function (beat) { return beat.move; }));
assert.ok(!messy.some(function (beat) { return beat.id === "teach:9" || beat.move === "invent"; }));

var explainFirst = sharkSlots.map(function (slot) {
  return { id: slot.id, beats: (slot.beats || []).map(function (beat) { return Object.assign({}, beat, { knowledgeRefs: beat.knowledgeRefs.slice() }); }) };
});
var earlyApply = { id: "apply", beats: [{ id: "apply:0", stageId: "apply", move: "practise", knowledgeRefs: ["k2"] }] };
explainFirst.splice(2, 0, earlyApply);
assert.ok(Brain.beatProblems(explainFirst).some(function (issue) { return /before it is explained/.test(issue); }));

var untought = sharkSlots.map(function (slot) {
  return { id: slot.id, beats: (slot.beats || []).map(function (beat) { return Object.assign({}, beat, { knowledgeRefs: beat.knowledgeRefs.slice() }); }) };
});
untought[4].beats[0] = Object.assign({}, untought[4].beats[0], { knowledgeRefs: ["k9"] });
assert.ok(Brain.beatProblems(untought).some(function (issue) { return /before it is taught/.test(issue); }));

var brief = Brain.contentBrief(frameFor(sharkPlan, "Year 1", sharkSlots), sharkPlan, null);
assert.deepStrictEqual(Object.keys(brief.schema.properties.slots.properties.hook.properties), ["beats"]);
assert.ok(brief.schema.properties.slots.properties.apply.properties.instruction);
assert.ok(!brief.schema.properties.slots.properties.apply.properties.knowledgeUsed);
assert.ok(brief.system.indexOf("Do not add, remove, reorder") !== -1);
var plain = Brain.lessonSkeleton(sharkPlan, { yearGroup: "Year 1", subject: "Science", topic: sharkPlan.topic });
var plainBrief = Brain.contentBrief({ yearGroup: "Year 1", lessonSkeleton: plain, lessonPlan: sharkPlan }, sharkPlan, null);
assert.ok(plainBrief.schema.properties.slots.properties.hook.properties.lines);

var sharkAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: slotsFrom(sharkSlots, sharkItems) }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(sharkAccept.ok, true, (sharkAccept.issues || []).join(" | "));
var sharkActivity = sharkAccept.adventure.activities[2];
assert.ok(sharkActivity.beats.length > 1);
assert.notStrictEqual(sharkActivity.title, sharkActivity.purpose);
assert.ok(sharkActivity.config.lines.join(" ").indexOf("Do not explain yet") === -1);
assert.ok(sharkActivity.config.lines.join(" ").indexOf("Use the new knowledge") === -1);

var badSlots = slotsFrom(sharkSlots, sharkItems);
badSlots.teach.beats[0].text = "Let's sharks.";
badSlots.investigate.beats[0].text = "";
var firstBad = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: badSlots }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(firstBad.ok, false);
assert.ok((firstBad.issues || []).join(" ").indexOf("needs a pupil sentence") !== -1);
assert.ok(firstBad.previous.activities[1].config.lines.join(" ").indexOf("Do not explain yet") === -1);
assert.notStrictEqual(firstBad.previous.activities[1].title, firstBad.previous.activities[1].purpose);
var repair = JSON.parse(Brain.slotRepairBrief(frameFor(sharkPlan, "Year 1", sharkSlots), firstBad.slotIds, firstBad, firstBad.previous).user);
assert.ok(repair.slotsToRewrite.some(function (spec) { return spec.output && Array.isArray(spec.output.beats); }));
var secondBad = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: badSlots }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(secondBad.ok, false);

var fractionAccept = Brain.accept({ title: "Fractions mission", objectives: [fractionPlan.learningObjective], slots: slotsFrom(fractionSlots, fractionItems) }, frameFor(fractionPlan, "Year 4", fractionSlots));
assert.strictEqual(fractionAccept.ok, true, (fractionAccept.issues || []).join(" | "));

var stepped = Shell.advancePlay({ beats: [{ id: "teach:0" }, { id: "teach:1" }, { id: "teach:2" }], visualAssetId: "teach" }, { beat: 0, index: 2 });
assert.strictEqual(stepped.stage, false);
assert.strictEqual(stepped.play.beat, 1);
assert.strictEqual(Shell.advancePlay({ beats: [{ id: "teach:0" }, { id: "teach:1" }, { id: "teach:2" }] }, stepped.play).play.beat, 2);
assert.strictEqual(Shell.advancePlay({ beats: [{ id: "teach:0" }, { id: "teach:1" }, { id: "teach:2" }] }, { beat: 2 }).stage, true);
assert.strictEqual(Shell.advancePlay({ lines: ["The old lesson still moves on."] }, { beat: 0 }).stage, true);

var shared = Creator.slidesFor({
  activities: [{
    mechanic: "story",
    title: "Discovery",
    scene: { beat: "discovery", visualAssetId: "teach" },
    beats: sharkActivity.beats,
    config: { lines: sharkActivity.config.lines }
  }]
});
assert.strictEqual(shared[0].visualAssetId, "teach");
assert.strictEqual(shared[0].beats.length, sharkActivity.beats.length);

var firstBeat = Mechanics.render({
  type: "story",
  beat: "discovery",
  lines: ["This old line should stay hidden.", "This second old line should stay hidden."],
  beats: [
    { pupil: { text: "The class names the first idea here." } },
    { pupil: { text: "The class hears the explanation next." } }
  ]
}, { immersed: true, interact: { beat: 0 } }).html;
assert.ok(firstBeat.indexOf("names the first idea") !== -1);
assert.ok(firstBeat.indexOf("explanation next") === -1);
assert.ok(firstBeat.indexOf("explain") === -1 || firstBeat.indexOf("explanation next") === -1);

var oldLesson = Mechanics.render({
  type: "story",
  beat: "discovery",
  lines: ["First line of the old lesson.", "Second line of the old lesson."]
}, { immersed: true, interact: { beat: 0 } }).html;
assert.ok(oldLesson.indexOf("First line of the old lesson.") !== -1);
assert.ok(oldLesson.indexOf("Second line of the old lesson.") !== -1);

function dump(label, plan, slots, items, accepted) {
  var lines = [label, "PLAN KNOWLEDGE"];
  items.forEach(function (item) { lines.push(item.id + " [" + item.kind + "] " + item.text); });
  lines.push("BEAT MAP");
  slots.forEach(function (slot) {
    lines.push(slot.id + ": " + (slot.beats || []).map(function (beat) { return beat.move + "(" + beat.knowledgeRefs.join("+") + ")"; }).join(" → "));
  });
  lines.push("GENERATED PUPIL COPY");
  (accepted.adventure.activities || []).forEach(function (activity) {
    (activity.beats || []).forEach(function (beat) {
      lines.push(beat.id + " " + beat.move + ": " + ((beat.pupil && beat.pupil.text) || ""));
    });
  });
  var apply = accepted.adventure.activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
  var check = accepted.adventure.activities.filter(function (activity) { return activity.slotId === "check"; })[0];
  var recap = accepted.adventure.activities.filter(function (activity) { return activity.slotId === "recap"; })[0];
  lines.push("APPLY TASK");
  lines.push(apply.applyInstruction || "");
  lines.push("CHECK");
  lines.push((check.config.questions[0].prompt || "") + " | " + check.config.questions[0].correct);
  lines.push("RECAP");
  (recap.beats || []).forEach(function (beat) { lines.push(beat.pupil.text); });
  lines.push("VALIDATION RESULT");
  lines.push(accepted.ok ? "pass" : (accepted.issues || []).join(" | "));
  console.log(lines.join("\n"));
}

var shortPlan = planFor("Year 1", "Science", ["Fins help a shark turn because they push against the water.", "A shark also has a tail."], "Fins help a shark turn because they push against the water.");
var shortSlots = beatsFor(shortPlan, "Year 1");
var shortItems = Brain.beatKnowledge(shortPlan, "Year 1");
var explained = shortSlots.map(function (slot) {
  var beats = (slot.beats || []).map(function (beat) { return Object.assign({}, beat, { knowledgeRefs: beat.knowledgeRefs.slice() }); });
  if (slot.id === "teach") beats = beats.filter(function (beat) { return beat.move === "explain" || (beat.move === "name" && beat.knowledgeRefs[0] === "k1"); });
  return Object.assign({}, slot, { beats: beats });
});
var shortBody = slotsFrom(explained, shortItems);
shortBody.teach.beats.forEach(function (beat) {
  beat.text = beat.id.indexOf("0") !== -1 ? "Fins steer a shark." : "They push the water.";
});
var shortWords = shortBody.teach.beats.map(function (beat) { return beat.text; }).join(" ").split(/\s+/).filter(Boolean);
assert.deepStrictEqual(explained[2].beats.map(function (beat) { return beat.move; }), ["name", "explain"]);
assert.ok(shortWords.length < 12, shortWords.join(" "));
var shortAccept = Brain.accept({ title: "Shark swim", objectives: [shortPlan.learningObjective], slots: shortBody }, frameFor(shortPlan, "Year 1", explained));
assert.ok((shortAccept.issues || []).join(" ").indexOf("names the topic but does not explain it") === -1, (shortAccept.issues || []).join(" | "));

var namedOnly = shortSlots.map(function (slot) {
  return Object.assign({}, slot, { beats: (slot.beats || []).map(function (beat) { return Object.assign({}, beat, { knowledgeRefs: beat.knowledgeRefs.slice() }); }) });
});
namedOnly[2].beats = namedOnly[2].beats.filter(function (beat) { return beat.move === "name"; });
var namedBody = slotsFrom(namedOnly, shortItems);
var namedAccept = Brain.accept({ title: "Shark swim", objectives: [shortPlan.learningObjective], slots: namedBody }, frameFor(shortPlan, "Year 1", namedOnly));
assert.strictEqual(namedAccept.ok, false);
assert.ok((namedAccept.issues || []).join(" ").indexOf("without the required explain beat") !== -1, (namedAccept.issues || []).join(" | "));

var legacyPlan = planFor("Year 1", "Science", ["Sharks have fins and sharp teeth.", "Fins help a shark turn because they push against the water."], "Sharks have fins and sharp teeth.");
var legacySlots = Brain.lessonSkeleton(legacyPlan, { yearGroup: "Year 1", subject: "Science", topic: legacyPlan.topic, requestedMinutes: 15, pupilCount: 4 });
assert.ok(!legacySlots.some(function (slot) { return slot.beats && slot.beats.length; }));
var legacyBody = {};
legacySlots.forEach(function (slot) {
  legacyBody[slot.id] = { lines: ["Fins steer."] };
});
legacyBody.investigate = { lines: ["Look at the fins in the water."], instruction: "Look at the fins in the water." };
legacyBody.apply = { lines: ["Show how the fins steer the shark."], instruction: "Show how the fins steer the shark through the water.", knowledgeUsed: legacyPlan.keyKnowledge[1], successCondition: "The pupil shows the fins steering.", teachingConnection: "The task uses the fin idea." };
legacyBody.check = { lines: ["Which part helps a shark turn?"], prompt: "Which part helps a shark turn?", choices: [legacyPlan.keyKnowledge[1], "A different idea that was not part of this lesson."], correct: legacyPlan.keyKnowledge[1], explain: "Fins push against the water and that turns the shark.", knowledgeChecked: legacyPlan.keyKnowledge[1], successEvidence: "The pupil chose the fin idea.", teachingConnection: "The question follows the fin idea." };
legacyBody.teach = { lines: ["Sharks have fins."] };
legacyBody.recap = { lines: ["Sharks have fins and sharp teeth that help them."] };
var legacyFrame = { subject: "Science", topic: legacyPlan.topic, yearGroup: "Year 1", requestedMinutes: 15, pupilCount: 4, lessonPlan: legacyPlan, lessonBrief: { intent: "explain" }, lessonSkeleton: legacySlots, storyPlan: Brain.storyFromPlan(legacyPlan, { yearGroup: "Year 1", topic: legacyPlan.topic }) };
var legacyAccept = Brain.accept({ title: "Shark swim", objectives: [legacyPlan.learningObjective], slots: legacyBody }, legacyFrame);
assert.ok((legacyAccept.issues || []).join(" ").indexOf("names the topic but does not explain it") !== -1, (legacyAccept.issues || []).join(" | "));

function brokenCopy(slotId, text) {
  var broken = slotsFrom(sharkSlots, sharkItems);
  broken[slotId].beats[0].text = text;
  return Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: broken }, frameFor(sharkPlan, "Year 1", sharkSlots));
}
var badInvestigate = brokenCopy("investigate", "Look.");
var badCheck = brokenCopy("check", "Hmm.");
var badRecap = brokenCopy("recap", "Fins steer a shark. They push water.");
[badInvestigate, badRecap].forEach(function (result) {
  assert.strictEqual(result.ok, false);
  assert.ok((result.issues || []).join(" ").indexOf("needs a pupil sentence") !== -1, (result.issues || []).join(" | "));
});
assert.strictEqual(badCheck.ok, true, (badCheck.issues || []).join(" | "));
assert.ok((badCheck.issues || []).join(" ").indexOf("check:0") === -1);
assert.ok(badInvestigate.pupilBeatDiagnostics.some(function (row) {
  return row.beatId === "investigate:0" && row.reason === "fewer than minimum words" && row.text === "Look." && row.stageId === "investigate";
}));
assert.ok(badRecap.pupilBeatDiagnostics.some(function (row) {
  return row.beatId === "recap:0" && row.reason === "too many sentences for year" && row.text === "Fins steer a shark. They push water.";
}));
var missing = brokenCopy("investigate", "");
assert.ok(missing.pupilBeatDiagnostics.some(function (row) { return row.beatId === "investigate:0" && row.reason === "missing"; }));
var bare = brokenCopy("recap", "Fins help a shark turn");
assert.ok(bare.pupilBeatDiagnostics.some(function (row) { return row.beatId === "recap:0" && row.reason === "missing terminal punctuation"; }));
assert.deepStrictEqual(shortSlots.map(function (slot) { return slot.id; }), ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"]);
assert.strictEqual(Brain.applySemanticDecision("apply").outcome, "semantic-pass");
assert.strictEqual(Brain.checkEvidenceDecision("partial").issue.indexOf("part of the required evidence") !== -1, true);
assert.strictEqual(Brain.checkEvidenceDecision("sufficient").outcome, "check-pass");
assert.strictEqual(Brain.checkEvidenceDecision("unrelated").outcome, "check-unrelated");

var checkSchema = brief.schema.properties.slots.properties.check.properties;
assert.deepStrictEqual(Object.keys(checkSchema).sort(), ["choices", "correct", "explain", "prompt", "successEvidence", "teachingConnection"]);
assert.ok(!checkSchema.beats);
assert.ok(brief.system.indexOf("does not return beat cue or text") !== -1);
assert.ok(brief.system.indexOf("at least four words") !== -1);
assert.ok(brief.system.indexOf("exactly one pupil-facing sentence") !== -1);
assert.ok(brief.schema.properties.slots.properties.apply.properties.beats);
assert.ok(brief.schema.properties.slots.properties.apply.properties.instruction);
assert.ok(brief.schema.properties.slots.properties.teach.properties.beats);

var quizBody = slotsFrom(sharkSlots, sharkItems);
quizBody.check.beats[0].cue = "";
quizBody.check.beats[0].text = "";
var quizAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: quizBody }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(quizAccept.ok, true, (quizAccept.issues || []).join(" | "));
var quizBeat = quizAccept.adventure.activities[4].beats[0];
assert.strictEqual(quizBeat.id, "check:0");
assert.strictEqual(quizBeat.move, "retrieve");
assert.ok(quizBeat.knowledgeRefs.length);
assert.strictEqual(quizBeat.pupil.text, "");
assert.ok(quizAccept.adventure.activities[4].config.questions[0].prompt);
assert.ok(quizAccept.adventure.activities[4].config.questions[0].correct);
var brokenQuiz = slotsFrom(sharkSlots, sharkItems);
brokenQuiz.check.prompt = "";
brokenQuiz.check.beats[0].text = "";
var brokenQuizAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: brokenQuiz }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(brokenQuizAccept.ok, false);
assert.ok((brokenQuizAccept.issues || []).join(" ").indexOf("no real question") !== -1, (brokenQuizAccept.issues || []).join(" | "));

var quizSlide = { type: "question", beats: [{ id: "check:0", move: "retrieve", pupil: { text: "This retrieve sentence must stay off the quiz." } }], question: { prompt: "What helps a shark swim?" } };
assert.ok(Mechanics.render(quizSlide, {}).html.indexOf("must stay off the quiz") === -1);
assert.strictEqual(Shell.primaryLabel(quizSlide, { beat: 0 }, 4, 7, { answered: false, index: 0, count: 1 }), "");
assert.strictEqual(Shell.primaryLabel(quizSlide, { beat: 0 }, 4, 7, { answered: true, index: 0, count: 1 }), "Next");

var fastBody = slotsFrom(sharkSlots, sharkItems);
fastBody.recap.beats[0].text = "Sharks swim fast!";
var fastAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: fastBody }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(fastAccept.ok, false);
assert.ok(fastAccept.pupilBeatDiagnostics.some(function (row) {
  return row.beatId === "recap:0" && row.move === "consolidate" && row.text === "Sharks swim fast!" && row.reason === "fewer than minimum words";
}));
var longBody = slotsFrom(sharkSlots, sharkItems);
longBody.recap.beats.forEach(function (beat) { beat.text = "Fins help a shark turn."; });
var longAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: longBody }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(longAccept.ok, true, (longAccept.issues || []).join(" | "));

var recapRepair = JSON.parse(Brain.slotRepairBrief(frameFor(sharkPlan, "Year 1", sharkSlots), fastAccept.slotIds, fastAccept, fastAccept.previous).user);
var recapSpec = recapRepair.slotsToRewrite.filter(function (spec) { return spec.slotType === "RECAP"; })[0];
assert.ok(recapSpec.rejectedBeats.some(function (row) {
  return row.beatId === "recap:0" && row.move === "consolidate" && row.text === "Sharks swim fast!" && row.reason === "fewer than minimum words" && row.knowledgeRefs.length;
}));
assert.ok(recapSpec.pupilCopyRequirements.indexOf("at least four words") !== -1);
assert.ok(recapRepair.instruction.indexOf("at least four words") !== -1);
assert.ok(recapRepair.instruction.indexOf("Do not regenerate the plan") !== -1);
assert.deepStrictEqual(recapRepair.slotsToRewrite.map(function (spec) { return spec.slotType; }), ["RECAP"]);

var checkRepairBeat = JSON.parse(Brain.slotRepairBrief(frameFor(sharkPlan, "Year 1", sharkSlots), ["check"], ["The check slot has no real question."], quizAccept.adventure).user);
var checkRepairSpec = checkRepairBeat.slotsToRewrite.filter(function (spec) { return spec.slotType === "CHECK"; })[0];
assert.ok(!checkRepairSpec.output.beats);
assert.ok(!checkRepairSpec.teachingBeats);
assert.strictEqual(checkRepairSpec.retrieveBeat.id, "check:0");
assert.strictEqual(checkRepairSpec.retrieveBeat.move, "retrieve");
assert.ok(checkRepairBeat.instruction.indexOf("Do not return cue or text") !== -1);
assert.ok(checkRepairBeat.instruction.indexOf("must stay a quiz") !== -1);

dump("YEAR 1 SHARK FIXTURE", sharkPlan, sharkSlots, sharkItems, sharkAccept);
dump("YEAR 4 FRACTIONS FIXTURE", fractionPlan, fractionSlots, fractionItems, fractionAccept);

console.log("teaching-beats tests passed");
