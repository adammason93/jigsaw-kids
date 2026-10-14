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
    exemplify: "For example, you can see it when " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    model: "First follow this step: " + known.charAt(0).toLowerCase() + known.slice(1) + ", then check what changed.",
    compare: "Look at both sides and say what is different.",
    connect: "These two ideas belong together in this lesson.",
    practise: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    apply: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    retrieve: "Which sentence matches the idea you just learned?",
    reveal: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    consolidate: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + "."
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
      var retrieves = (slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; });
      if (retrieves.length > 1) {
        body.check = {
          beats: beats,
          questions: retrieves.map(function (beat, index) {
            var item = items[0];
            items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
            var answer = item.text;
            return {
              id: beat.id,
              prompt: "Which sentence matches taught idea number " + (index + 1) + "?",
              choices: [answer, "A different idea that was not part of this lesson."],
              correct: answer,
              explain: "That sentence matches the idea the class has just learned.",
              successEvidence: "The pupil chose the taught idea.",
              teachingConnection: "The question follows the taught idea."
            };
          })
        };
      } else {
        var correct = items[items.length - 1].text;
        body.check = { beats: beats, prompt: task, choices: [correct, "A different idea that was not part of this lesson."], correct: correct, explain: "That sentence matches the idea the class has just learned.", successEvidence: "The pupil chose the taught idea.", teachingConnection: "The question follows the taught idea." };
      }
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
repair.slotsToRewrite.forEach(function (spec) {
  if (!spec.teachingBeats || !spec.teachingBeats.length) return;
  assert.ok(!Object.prototype.hasOwnProperty.call(spec.output, "lines"), spec.slotType);
  assert.ok(!Object.prototype.hasOwnProperty.call(spec.output, "title"), spec.slotType);
  spec.output.beats.forEach(function (beat) {
    assert.deepStrictEqual(Object.keys(beat).sort(), ["cue", "id", "text"]);
  });
});
assert.ok(repair.instruction.toLowerCase().indexOf("do not return beats") === -1);
assert.ok(repair.instruction.indexOf("Do not add, remove, reorder, rename, or choose teaching beats") !== -1);
assert.ok(repair.instruction.indexOf("Do not alter moves or knowledgeRefs") !== -1);
assert.ok(repair.instruction.indexOf("at least four words") !== -1);
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
assert.ok(brief.system.indexOf("teach:0") !== -1);
assert.ok(brief.system.indexOf("\"cue\":\"...\"") !== -1 || brief.system.indexOf('"cue":"..."') !== -1);
assert.ok(brief.system.indexOf("{ title, lines }") === -1);
assert.ok(brief.system.toLowerCase().indexOf("do not return beats") === -1);
assert.ok(brief.system.indexOf("notice directs attention") !== -1);
assert.ok(brief.system.indexOf("consolidate restates") !== -1);
assert.ok(plainBrief.system.indexOf("{ title, lines }") !== -1);
assert.ok(plainBrief.schema.properties.slots.properties.hook.properties.lines);
assert.ok(plainBrief.schema.properties.slots.properties.hook.properties.title);
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
assert.ok(checkRepairBeat.instruction.toLowerCase().indexOf("do not return beats") === -1);

var flipped = slotsFrom(sharkSlots, sharkItems);
var teachPlan = sharkSlots.filter(function (slot) { return slot.id === "teach"; })[0].beats;
flipped.teach.beats = teachPlan.slice().reverse().map(function (beat, index) {
  return { id: teachPlan[teachPlan.length - 1 - index].id, cue: "", text: "Fins help a shark turn.", knowledgeRefs: ["k9"], move: "invent" };
});
var flippedAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: flipped }, frameFor(sharkPlan, "Year 1", sharkSlots));
var flippedTeach = flippedAccept.adventure ? flippedAccept.adventure.activities[2] : flippedAccept.previous.activities[2];
assert.deepStrictEqual(flippedTeach.beats.map(function (beat) { return beat.id; }), teachPlan.map(function (beat) { return beat.id; }));
assert.deepStrictEqual(flippedTeach.beats.map(function (beat) { return beat.move; }), teachPlan.map(function (beat) { return beat.move; }));
assert.deepStrictEqual(flippedTeach.beats.map(function (beat) { return beat.knowledgeRefs[0]; }), teachPlan.map(function (beat) { return beat.knowledgeRefs[0]; }));
var dropped = slotsFrom(sharkSlots, sharkItems);
dropped.teach.beats = dropped.teach.beats.slice(0, 1);
var droppedAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: dropped }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(droppedAccept.ok, false);
assert.strictEqual(droppedAccept.previous.activities[2].beats.length, teachPlan.length);

var applySchema = brief.schema.properties.slots.properties.apply;
assert.ok(brief.system.indexOf("apply:0") !== -1);
assert.ok(brief.system.indexOf("\"cue\"") !== -1 || brief.system.indexOf('"cue"') !== -1);
assert.deepStrictEqual(applySchema.required.sort(), ["beats", "instruction", "successCondition", "target", "teachingConnection"]);
assert.ok(applySchema.properties.instruction);
assert.ok(applySchema.properties.target);
assert.ok(applySchema.properties.successCondition);
assert.ok(applySchema.properties.teachingConnection);
assert.ok(!applySchema.properties.knowledgeUsed);
assert.ok(!applySchema.properties.title);
assert.ok(!applySchema.properties.lines);
assert.ok(brief.system.indexOf("Do not omit the planned beat because the task instruction is present.") !== -1);
assert.ok(brief.system.indexOf("does not merely say use your knowledge") !== -1);
assert.ok(brief.system.indexOf("does not duplicate the entire task instruction") !== -1);
assert.ok(brief.system.toLowerCase().indexOf("knowledgeused must name") === -1);
var fractionBrief = Brain.contentBrief(frameFor(fractionPlan, "Year 4", fractionSlots), fractionPlan, null);
assert.ok(fractionBrief.system.indexOf("short pupil-facing bridge") !== -1);
assert.ok(fractionBrief.system.indexOf("does not replace the task itself") !== -1);

var taskWithoutBeat = slotsFrom(sharkSlots, sharkItems);
taskWithoutBeat.apply.beats[0].cue = "";
taskWithoutBeat.apply.beats[0].text = "";
var taskWithoutBeatAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: taskWithoutBeat }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(taskWithoutBeatAccept.ok, false);
assert.ok((taskWithoutBeatAccept.issues || []).join(" ").indexOf("The apply:0 beat needs a pupil sentence.") !== -1);
assert.ok((taskWithoutBeatAccept.issues || []).join(" ").indexOf("Activity 4 needs something for the class to read.") !== -1);

var beatWithoutTask = slotsFrom(sharkSlots, sharkItems);
beatWithoutTask.apply.beats[0].cue = "Look at the fins.";
beatWithoutTask.apply.beats[0].text = "The fins you named are what you will use.";
beatWithoutTask.apply.instruction = "";
beatWithoutTask.apply.successCondition = "";
var beatWithoutTaskAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: beatWithoutTask }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(beatWithoutTaskAccept.ok, false);
assert.ok((beatWithoutTaskAccept.issues || []).join(" ").indexOf("The apply slot has no learning instruction.") !== -1);
assert.ok((beatWithoutTaskAccept.issues || []).join(" ").indexOf("The apply slot has no success condition.") !== -1);
var beatWithoutTaskApply = beatWithoutTaskAccept.previous.activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
assert.strictEqual(beatWithoutTaskApply.config.lines[0], "The fins you named are what you will use.");
assert.notStrictEqual(beatWithoutTaskApply.applyInstruction, beatWithoutTaskApply.config.lines[0]);

var applyUnit = slotsFrom(sharkSlots, sharkItems);
applyUnit.apply.beats[0].cue = "Look at the fins.";
applyUnit.apply.beats[0].text = "The fins you named are what you will use.";
applyUnit.apply.instruction = "Show the fins pushing against the water so the shark can turn.";
applyUnit.apply.target = "model";
applyUnit.apply.successCondition = "The pupil shows the fins turning the shark.";
applyUnit.apply.teachingConnection = "The action uses the fin idea from the lesson.";
var applyUnitAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: applyUnit }, frameFor(sharkPlan, "Year 1", sharkSlots));
assert.strictEqual(applyUnitAccept.ok, true, (applyUnitAccept.issues || []).join(" | "));
var applyUnitActivity = applyUnitAccept.adventure.activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
assert.strictEqual(applyUnitActivity.config.lines[0], "The fins you named are what you will use.");
assert.strictEqual(applyUnitActivity.applyInstruction, "Show the fins pushing against the water so the shark can turn.");
assert.notStrictEqual(applyUnitActivity.applyInstruction, applyUnitActivity.config.lines[0]);
assert.strictEqual(applyUnitActivity.beats[0].pupil.text, applyUnitActivity.config.lines[0]);

var applyRepair = JSON.parse(Brain.slotRepairBrief(frameFor(sharkPlan, "Year 1", sharkSlots), ["apply"], taskWithoutBeatAccept.issues, taskWithoutBeatAccept.previous).user);
var applyRepairSpec = applyRepair.slotsToRewrite.filter(function (spec) { return spec.slotType === "APPLY"; })[0];
assert.deepStrictEqual(applyRepair.slotsToRewrite.map(function (spec) { return spec.slotType; }), ["APPLY"]);
assert.ok(applyRepairSpec.output.beats.some(function (beat) { return beat.id === "apply:0"; }));
assert.deepStrictEqual(Object.keys(applyRepairSpec.output.beats[0]).sort(), ["cue", "id", "text"]);
assert.ok(Object.prototype.hasOwnProperty.call(applyRepairSpec.output, "instruction"));
assert.ok(Object.prototype.hasOwnProperty.call(applyRepairSpec.output, "target"));
assert.ok(Object.prototype.hasOwnProperty.call(applyRepairSpec.output, "successCondition"));
assert.ok(Object.prototype.hasOwnProperty.call(applyRepairSpec.output, "teachingConnection"));
assert.ok(!Object.prototype.hasOwnProperty.call(applyRepairSpec.output, "knowledgeUsed"));
assert.ok(!Object.prototype.hasOwnProperty.call(applyRepairSpec.output, "title"));
assert.ok(!Object.prototype.hasOwnProperty.call(applyRepairSpec.output, "lines"));
assert.ok(applyRepair.instruction.indexOf("The beat pupil copy and task fields are both required.") !== -1);
assert.ok(applyRepair.instruction.indexOf("Do not omit the planned beat because the task instruction is present.") !== -1);
assert.ok(applyRepair.instruction.indexOf("Do not return knowledgeUsed.") !== -1);

var orderedSlots = sharkSlots.map(function (slot) {
  var beats = (slot.beats || []).map(function (beat) { return Object.assign({}, beat, { knowledgeRefs: beat.knowledgeRefs.slice() }); });
  if (slot.id === "apply") {
    beats = [
      { id: "apply:0", stageId: "apply", move: "practise", knowledgeRefs: ["k2"] },
      { id: "apply:1", stageId: "apply", move: "practise", knowledgeRefs: ["k2"] }
    ];
  }
  return Object.assign({}, slot, { beats: beats });
});
var orderedBody = slotsFrom(orderedSlots, sharkItems);
orderedBody.apply.beats[1].text = "Push the water with the fins you can already name.";
var orderedBefore = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: orderedBody }, frameFor(sharkPlan, "Year 1", orderedSlots));
var orderedSource = orderedBefore.adventure || orderedBefore.previous;
var hookBefore = orderedSource.activities.filter(function (activity) { return activity.slotId === "hook"; })[0].beats[0].pupil.text;
var applyPatch = {
  slots: {
    apply: {
      beats: [
        { id: "apply:9", cue: "Extra.", text: "This extra beat must not appear in the plan.", move: "invent", knowledgeRefs: ["k9"] },
        { id: "apply:1", cue: "Watch the tail.", text: "The tail you named is ready for the turn.", move: "invent", knowledgeRefs: ["k9"] },
        { id: "apply:0", cue: "Look at the fins.", text: "The fins you named are what you will use.", move: "invent", knowledgeRefs: ["k9"] }
      ],
      instruction: "Show the fins pushing against the water so the shark can turn.",
      target: "model",
      successCondition: "The pupil shows the fins turning the shark.",
      teachingConnection: "The action uses the fin idea from the lesson.",
      knowledgeUsed: "This model field must not replace the planned ref.",
      title: "Try it",
      lines: ["This line must not replace the beat."]
    }
  }
};
var mergedApply = Brain.mergeSlotContent(orderedSource, applyPatch);
var mergedAccept = Brain.accept({ title: "Sharks mission", objectives: [sharkPlan.learningObjective], slots: mergedApply.slots }, frameFor(sharkPlan, "Year 1", orderedSlots));
var mergedActivity = (mergedAccept.adventure || mergedAccept.previous).activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
var mergedHook = (mergedAccept.adventure || mergedAccept.previous).activities.filter(function (activity) { return activity.slotId === "hook"; })[0];
assert.deepStrictEqual(mergedActivity.beats.map(function (beat) { return beat.id; }), ["apply:0", "apply:1"]);
assert.deepStrictEqual(mergedActivity.beats.map(function (beat) { return beat.move; }), ["practise", "practise"]);
assert.deepStrictEqual(mergedActivity.beats.map(function (beat) { return beat.knowledgeRefs[0]; }), ["k2", "k2"]);
assert.strictEqual(mergedActivity.beats[0].pupil.cue, "Look at the fins.");
assert.strictEqual(mergedActivity.beats[0].pupil.text, "The fins you named are what you will use.");
assert.strictEqual(mergedActivity.beats[1].pupil.text, "The tail you named is ready for the turn.");
assert.strictEqual(mergedActivity.applyInstruction, "Show the fins pushing against the water so the shark can turn.");
assert.strictEqual(mergedActivity.successCondition, "The pupil shows the fins turning the shark.");
assert.strictEqual(mergedActivity.teachingConnection, "The action uses the fin idea from the lesson.");
assert.notStrictEqual(mergedActivity.knowledgeUsed, "This model field must not replace the planned ref.");
assert.strictEqual(mergedActivity.config.lines[0], mergedActivity.beats[0].pupil.text);
assert.strictEqual(mergedHook.beats[0].pupil.text, hookBefore);

var longCue = "Look. ";
var loggedBeats = Brain.boundedBeatLog({
  slots: {
    apply: {
      instruction: "This task field must stay out of the beat log.",
      beats: [{ id: "apply:0", cue: longCue + "x".repeat(200), text: "y".repeat(400) }]
    },
    hook: { beats: [{ id: "hook:0", cue: "", text: "Look at the scene and say what you can see." }] }
  }
});
assert.strictEqual(loggedBeats.length, 2);
assert.deepStrictEqual(Object.keys(loggedBeats[0]).sort(), ["beatId", "cue", "stage", "text"]);
assert.strictEqual(loggedBeats[0].stage, "apply");
assert.strictEqual(loggedBeats[0].beatId, "apply:0");
assert.ok(loggedBeats[0].cue.length <= 120);
assert.ok(loggedBeats[0].text.length <= 160);
assert.ok(JSON.stringify(loggedBeats).indexOf("must stay out of the beat log") === -1);
var overflow = { slots: {} };
var many = [];
for (var beatIndex = 0; beatIndex < 13; beatIndex += 1) many.push({ id: "hook:" + beatIndex, cue: "", text: "Look at the scene and say what you can see." });
overflow.slots.hook = { beats: many };
assert.strictEqual(Brain.boundedBeatLog(overflow).length, 12);

function reproducedShark() {
  function speakLive(beat, items) {
    var item = items[0];
    items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
    var known = String(item.text || "").replace(/[.?!]$/, "");
    var text = {
      notice: "Look at the scene and say what you can see.",
      name: item.kind === "relationship" ? "The class gives this idea its own name." : item.text,
      explain: item.text,
      practise: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
      retrieve: "Which sentence matches the idea you just learned?",
      reveal: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
      consolidate: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + "."
    }[beat.move];
    return { id: beat.id, cue: "", text: text };
  }
  var requestText = "Teach children how a shark's body helps it swim.";
  var knowledge = ["Sharks have a streamlined shape that reduces water resistance.", "Their fins help them steer and keep balanced while swimming."];
  var plan = planFor("Year 1", "Science", knowledge, "Name the body features a shark uses in the water.");
  var slots = beatsFor(plan, "Year 1");
  var items = Brain.beatKnowledge(plan, "Year 1");
  var frame = { subject: "Science", topic: plan.topic, yearGroup: "Year 1", requestedMinutes: 15, pupilCount: 4, lessonPlan: plan, lessonText: requestText, teacherInstructions: requestText, lessonBrief: { intent: "explain", rawRequest: requestText, topic: plan.topic } };
  Brain.applyTeacherIntent(frame, {
    ok: true,
    learningGoal: "Understand how a shark's body structure aids in its swimming ability.",
    requiredEvidence: "Describe the relationship between a shark's body parts and their function in swimming.",
    focusConcepts: ["shark anatomy", "buoyancy", "streamlined shape"],
    priorKnowledge: [], exclusions: [], preferences: [],
    subject: "Science", subjectConfidence: "explicit"
  });
  frame.lessonSkeleton = slots;
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  frame.applySemantic = { relationship: "apply", reason: "The instruction requires using knowledge about shark anatomy." };
  frame.checkSemantic = { coverage: "sufficient", reason: "The answer shows the relationship.", demonstratedEvidence: "The pupil understands the shape." };
  var live = {};
  slots.forEach(function (slot) {
    var beats = (slot.beats || []).map(function (beat) { return speakLive(beat, items); });
    if (slot.id === "apply") {
      live.apply = {
        beats: beats,
        instruction: "Discuss how a shark's body helps it swim.",
        target: "Understanding the relationship between body parts and swimming.",
        successCondition: "Students can explain how body parts aid in swimming.",
        teachingConnection: "This task uses what we learned about shark anatomy."
      };
    } else if (slot.id === "check") {
      live.check = {
        beats: beats,
        prompt: "Why does a shark's streamlined shape help it swim?",
        choices: ["It makes them sink.", "It reduces water resistance."],
        correct: "It reduces water resistance.",
        explain: "A streamlined shape lets the shark move through the water with less resistance.",
        successEvidence: "The pupil chose the resistance idea.",
        teachingConnection: "The question follows the shape idea."
      };
    } else live[slot.id] = { beats: beats };
  });
  live.hook.beats[0].text = "Look at how sharks swim in the water!";
  live.investigate.beats[0].text = "Observe the shark's body and think about how it helps them swim.";
  live.teach.beats[0].text = "Sharks have a streamlined shape that helps them move quickly.";
  live.teach.beats[1].text = "A streamlined shape reduces water resistance so the shark moves more easily.";
  live.apply.beats[0].text = "Show how the streamlined shape changes the swim.";
  live.resolution.beats[0].text = "All these features help sharks swim efficiently.";
  live.recap.beats[0].text = "Sharks have a streamlined shape that helps them swim.";
  live.recap.beats[1].text = "Their fins are important for steering and balance.";
  return { frame: frame, live: live, requestText: requestText };
}

function clientContext(requestText) {
  return Brain.contextFrom({
    source: { text: requestText },
    year: "Year 1",
    subject: "Science",
    topic: "Science Children How a Shark's Body Helps It Swim",
    title: "",
    goals: [],
    targetMinutes: 15,
    playMode: "whole_class"
  }, { pupilCount: 4, availableMechanics: Creator.capabilities(Mechanics).map(function (item) { return item.id; }) });
}

var thinkLine = "Show how the streamlined shape changes the swim.";
assert.notStrictEqual(thinkLine, "Discuss how a shark's body helps it swim.");
var reproduced = reproducedShark();
var serverShark = Brain.accept({ title: "How sharks swim", objectives: [reproduced.frame.lessonBrief.learningGoal], slots: reproduced.live }, reproduced.frame);
assert.strictEqual(serverShark.ok, true, (serverShark.issues || []).join(" | "));
var materialised = JSON.parse(JSON.stringify(serverShark.adventure));
var clientShark = Brain.accept(materialised, clientContext(reproduced.requestText));
assert.strictEqual(clientShark.ok, true, (clientShark.issues || []).join(" | "));
assert.strictEqual(!!clientContext(reproduced.requestText).lessonSkeleton, false);
var clientApply = clientShark.adventure.activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
assert.strictEqual(clientApply.config.lines[0], thinkLine);
assert.strictEqual(clientApply.beats[0].pupil.text, thinkLine);
assert.strictEqual(clientApply.applyInstruction, "Discuss how a shark's body helps it swim.");
assert.ok(clientApply.scene.interaction.target);
assert.strictEqual(clientApply.successCondition, "Students can explain how body parts aid in swimming.");
assert.strictEqual(clientApply.teachingConnection, "This task uses what we learned about shark anatomy.");
assert.deepStrictEqual(clientShark.adventure.activities.map(function (activity) { return activity.slotId; }), ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"]);
var clientCheck = clientShark.adventure.activities.filter(function (activity) { return activity.slotId === "check"; })[0];
assert.strictEqual(clientCheck.mechanic, "quiz");
assert.strictEqual(clientCheck.config.questions[0].prompt, "Why does a shark's streamlined shape help it swim?");
assert.strictEqual(clientCheck.config.questions[0].correct, "It reduces water resistance.");
assert.strictEqual(Brain.applySemanticDecision("apply").outcome, "semantic-pass");
assert.strictEqual(Brain.checkEvidenceDecision("sufficient").outcome, "check-pass");

function withoutApplyContract(adventure, fields) {
  var copy = JSON.parse(JSON.stringify(adventure));
  var apply = copy.activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
  apply.config.lines = ["The streamlined shape is the idea for this task."];
  apply.beats[0].pupil.text = thinkLine;
  apply.applyInstruction = fields.instruction || "";
  apply.successCondition = fields.success || "";
  apply.teachingConnection = fields.connection || "";
  if (!fields.target && apply.scene) delete apply.scene.interaction;
  else if (apply.scene && apply.scene.interaction) apply.scene.interaction.target = fields.target;
  return copy;
}

var strayInstruction = Brain.accept(withoutApplyContract(materialised, {
  instruction: "Discuss how a shark's body helps it swim."
}), clientContext(reproduced.requestText));
assert.strictEqual(strayInstruction.ok, false);
assert.ok((strayInstruction.issues || []).indexOf("The lesson is missing the apply stage.") !== -1);

var incompleteSuccess = Brain.accept(withoutApplyContract(materialised, {
  instruction: "Discuss how a shark's body helps it swim.",
  target: "model",
  success: "done"
}), clientContext(reproduced.requestText));
assert.strictEqual(incompleteSuccess.ok, false);
assert.ok((incompleteSuccess.issues || []).indexOf("The lesson is missing the apply stage.") !== -1);

var legacyApply = JSON.parse(JSON.stringify(materialised));
var legacyActivity = legacyApply.activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
legacyActivity.beats = [];
legacyActivity.applyInstruction = "";
legacyActivity.successCondition = "";
legacyActivity.teachingConnection = "";
legacyActivity.knowledgeUsed = "";
if (legacyActivity.scene) delete legacyActivity.scene.interaction;
legacyActivity.config.lines = ["Show the fins pushing against the water so the shark can turn."];
var legacyClient = Brain.accept(legacyApply, clientContext(reproduced.requestText));
assert.ok((legacyClient.issues || []).indexOf("The lesson is missing the apply stage.") === -1, (legacyClient.issues || []).join(" | "));

var neitherApply = withoutApplyContract(materialised, {});
var neitherClient = Brain.accept(neitherApply, clientContext(reproduced.requestText));
assert.strictEqual(neitherClient.ok, false);
assert.ok((neitherClient.issues || []).indexOf("The lesson is missing the apply stage.") !== -1);
assert.ok((neitherClient.issues || []).indexOf("The lesson is missing the check stage.") === -1);
assert.ok((neitherClient.issues || []).indexOf("The lesson is missing the hook stage.") === -1);
assert.ok((neitherClient.issues || []).indexOf("The lesson is missing the teach stage.") === -1);

var swimFact = "A shark's streamlined body reduces water resistance, helping it swim more easily.";
var tailFact = "A shark's tail pushes backwards, helping it swim forward.";
var finsFact = "Shark anatomy includes fins and a tail that aid in movement.";
var swimGoal = "Understand how a shark's body helps it swim.";
var swimRequest = "Teach children how a shark's body helps it swim.";
var swimNormalised = Brain.normalisePlan({
  learningObjective: swimGoal,
  subject: "Science",
  topic: swimGoal,
  keyKnowledge: [finsFact, swimFact, tailFact],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, {
  yearGroup: "Year 1",
  subject: "Science",
  lessonText: swimRequest,
  topic: swimGoal,
  lessonBrief: {
    intent: "process",
    rawRequest: swimRequest,
    learningGoal: swimGoal,
    teacherIntent: { ok: true, learningGoal: swimGoal, requiredEvidence: swimGoal }
  }
});
assert.strictEqual(swimNormalised.ok, true, (swimNormalised.issues || []).join("; "));
var swimPlan = swimNormalised.plan;
assert.deepStrictEqual(swimPlan.keyKnowledge, [swimFact, tailFact]);
assert.ok(swimPlan.droppedKnowledge.indexOf(finsFact) !== -1);
var swimSlots = beatsFor(swimPlan, "Year 1");
var swimItems = Brain.beatKnowledge(swimPlan, "Year 1");
assert.deepStrictEqual(swimItems.map(function (item) { return item.text; }), [swimFact, tailFact]);
var swimTeach = swimSlots.filter(function (slot) { return slot.id === "teach"; })[0];
assert.deepStrictEqual(swimTeach.beats.map(function (beat) { return beat.move + ":" + beat.knowledgeRefs[0]; }), ["name:k1", "explain:k1", "name:k2", "explain:k2"]);
var swimCheck = swimSlots.filter(function (slot) { return slot.id === "check"; })[0];
assert.deepStrictEqual(swimCheck.beats.map(function (beat) { return beat.knowledgeRefs[0]; }), ["k1", "k2"]);
var swimRecap = swimSlots.filter(function (slot) { return slot.id === "recap"; })[0];
assert.deepStrictEqual(swimRecap.beats.map(function (beat) { return beat.knowledgeRefs[0]; }), ["k1", "k2"]);
swimPlan.topic = "sharks";
function sharkSlotsBody() {
  var body = slotsFrom(swimSlots, swimItems);
  body.recap.beats.forEach(function (beat, index) {
    beat.text = index ? "The tail pushes and the shark swims forward." : "A smooth body lets a shark swim more easily.";
  });
  return body;
}
var taughtCheck = sharkSlotsBody();
var taughtFrame = frameFor(swimPlan, "Year 1", swimSlots);
var taughtAccept = Brain.accept({ title: "Shark swim", objectives: [swimGoal], slots: taughtCheck }, taughtFrame);
assert.strictEqual(taughtAccept.ok, true, (taughtAccept.issues || []).join(" | "));
var taughtQuiz = taughtAccept.adventure.activities.filter(function (activity) { return activity.slotId === "check"; })[0];
assert.strictEqual(taughtQuiz.config.questions.length, 2);
assert.deepStrictEqual(taughtQuiz.config.questions.map(function (item) { return item.knowledgeChecked; }), [swimFact, tailFact]);
var untaughtCheck = sharkSlotsBody();
untaughtCheck.check.questions[1].correct = "They have fins and a streamlined shape.";
untaughtCheck.check.questions[1].choices = [untaughtCheck.check.questions[1].correct, "A different idea that was not part of this lesson."];
var untaughtAccept = Brain.accept({ title: "Shark swim", objectives: [swimGoal], slots: untaughtCheck }, frameFor(swimPlan, "Year 1", swimSlots));
assert.strictEqual(untaughtAccept.ok, false);
assert.ok((untaughtAccept.issues || []).indexOf("The check scores knowledge that was not taught.") !== -1, (untaughtAccept.issues || []).join(" | "));
var judgeFrame = frameFor(swimPlan, "Year 1", swimSlots);
judgeFrame.lessonBrief.teacherIntent = { ok: true, learningGoal: swimGoal, requiredEvidence: "The pupil shows how the body helps the shark swim." };
var seenChecks = [];
var repairSlots = null;
Brain.resolveLessonContent({ title: "Shark swim", objectives: [swimGoal], slots: taughtCheck }, judgeFrame, {
  judge: function () { throw new Error("apply judge must not run"); },
  checkJudge: function (input) {
    seenChecks.push({ prompt: input.prompt, requiredEvidence: input.requiredEvidence, correct: input.correct });
    return { ok: true, coverage: "sufficient", reason: "The answer shows that relationship.", demonstratedEvidence: input.requiredEvidence, ms: 1 };
  },
  repair: function (failed) {
    repairSlots = (failed.slotIds || []).slice();
      var patched = sharkSlotsBody();
    patched.check.questions[1].correct = "Blood stays warm in the sun.";
    patched.check.questions[1].choices = [patched.check.questions[1].correct, "A different idea that was not part of this lesson."];
    return { slots: patched };
  }
}).then(function (firstPass) {
  assert.strictEqual(firstPass.ok, true, (firstPass.issues || []).join(" | "));
  assert.strictEqual(seenChecks.length, 2);
  assert.strictEqual(seenChecks[0].prompt, taughtCheck.check.questions[0].prompt);
  assert.strictEqual(seenChecks[1].prompt, taughtCheck.check.questions[1].prompt);
  assert.strictEqual(seenChecks[0].requiredEvidence, swimFact);
  assert.strictEqual(seenChecks[1].requiredEvidence, tailFact);
  assert.strictEqual(repairSlots, null);
  seenChecks = [];
  return Brain.resolveLessonContent({ title: "Shark swim", objectives: [swimGoal], slots: taughtCheck }, judgeFrame, {
    judge: function () { throw new Error("apply judge must not run"); },
    checkJudge: function (input) {
      var index = seenChecks.length;
      seenChecks.push(input.prompt);
      if (index === 1) return { ok: true, coverage: "unrelated", reason: "The answer does not show the tail relationship.", demonstratedEvidence: "A different idea.", ms: 1 };
      return { ok: true, coverage: "sufficient", reason: "The answer shows that relationship.", demonstratedEvidence: input.requiredEvidence || swimFact, ms: 1 };
    },
    repair: function (failed) {
      repairSlots = (failed.slotIds || []).slice();
      assert.deepStrictEqual(repairSlots, ["check"]);
      var brief = JSON.parse(Brain.slotRepairBrief(judgeFrame, failed.slotIds, failed, failed.previous).user);
      assert.ok(brief.instruction.indexOf("Rewrite only a question whose relationship failed.") !== -1);
      assert.ok(brief.instruction.indexOf("Copy a question that already passed.") !== -1);
      assert.deepStrictEqual(brief.slotsToRewrite.map(function (spec) { return spec.slotType; }), ["CHECK"]);
      assert.strictEqual(brief.slotsToRewrite[0].output.questions.length, 2);
      return { slots: sharkSlotsBody() };
    }
  });
}).then(function (secondPass) {
  assert.strictEqual(secondPass.ok, true, (secondPass.issues || []).join(" | "));
  assert.deepStrictEqual(repairSlots, ["check"]);
  assert.ok(seenChecks.length >= 2);
  console.log("teaching-beats tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});

dump("YEAR 1 SHARK FIXTURE", sharkPlan, sharkSlots, sharkItems, sharkAccept);
dump("YEAR 4 FRACTIONS FIXTURE", fractionPlan, fractionSlots, fractionItems, fractionAccept);
