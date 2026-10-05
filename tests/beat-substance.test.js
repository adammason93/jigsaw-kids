"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

function lesson(year, minutes, subject, topic, ask, goal, map) {
  var ctx = {
    yearGroup: year,
    subject: subject,
    topic: topic,
    requestedMinutes: minutes,
    lessonText: ask,
    lessonBrief: { intent: "explain", rawRequest: ask, learningGoal: goal }
  };
  var made = Brain.normalisePlan({
    learningObjective: goal,
    subject: subject,
    topic: ask,
    yearGroup: year,
    learningMap: map,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, ctx);
  assert.strictEqual(made.ok, true, year + " " + (made.issues || []).join("; "));
  var slots = Brain.planBeats(Brain.lessonSkeleton(made.plan, ctx), made.plan, year);
  assert.deepStrictEqual(Brain.beatProblems(slots), [], year + " beat order");
  return { ctx: ctx, plan: made.plan, slots: slots, trace: Brain.teachingTrace(made.plan, slots, ctx) };
}

function moves(slots, id) {
  var slot = slots.filter(function (item) { return item.id === id; })[0];
  return (slot.beats || []).map(function (beat) { return beat.move; });
}

var young = lesson("Year 2", 15, "Science", "plants", "Teach children about plants.", "Pupils explain how roots take in water and how leaves use light.", [
  { id: "p1", knowledge: "A plant is a living thing that needs water and light to grow.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Roots grow down into the soil.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "Roots take in water from the soil, and the stem carries it up to the leaves.", role: "function", importance: "core", dependsOn: ["p2"] },
  { id: "p4", knowledge: "Most leaves are wide and flat.", role: "feature", importance: "core", dependsOn: ["p1"] },
  { id: "p5", knowledge: "Leaves use light to make food that helps the plant grow.", role: "function", importance: "core", dependsOn: ["p4"] }
]);

var middle = lesson("Year 4", 20, "Maths", "fractions", "Teach children how to make equivalent fractions.", "Pupils multiply the top and the bottom by the same number to make an equivalent fraction.", [
  { id: "p1", knowledge: "Equivalent fractions are different names for the same amount.", role: "definition", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Multiply the top and the bottom by the same number.", role: "procedure", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "One half is the same amount as two quarters.", role: "example", importance: "supporting", dependsOn: ["p1"] }
]);

var older = lesson("Year 6", 20, "Geography", "rivers", "Teach children about rivers.", "Pupils explain how rivers carry water, wear away land and drop mud.", [
  { id: "p1", knowledge: "A river is water flowing downhill in a channel from its source to its mouth.", role: "foundation", importance: "core", dependsOn: [] },
  { id: "p2", knowledge: "Rain on high ground feeds small streams.", role: "concept", importance: "core", dependsOn: ["p1"] },
  { id: "p3", knowledge: "Tributaries join the main river, so it carries more water as it flows downstream.", role: "process", importance: "core", dependsOn: ["p2"] },
  { id: "p4", knowledge: "Fast water picks up stones and drags them along the riverbed.", role: "process", importance: "core", dependsOn: ["p1"] },
  { id: "p5", knowledge: "The moving stones wear away the banks, which deepens the valley.", role: "effect", importance: "core", dependsOn: ["p4"] },
  { id: "p6", knowledge: "When the river slows, it drops the mud it was carrying.", role: "process", importance: "core", dependsOn: ["p1"] },
  { id: "p7", knowledge: "Dropped mud builds new land, such as a delta at the mouth.", role: "effect", importance: "core", dependsOn: ["p6"] },
  { id: "p8", knowledge: "The Nile delta grew where the river dropped mud into the sea.", role: "example", importance: "supporting", dependsOn: ["p7"] }
]);

function assertSequence(built, label) {
  var trace = built.trace;
  assert.ok(trace.checkQuestions >= 1 && trace.checkQuestions <= trace.questionBudget, label + " check depth " + trace.checkQuestions + "/" + trace.questionBudget);
  var beforeApply = {};
  trace.taughtBeforeApply.forEach(function (ref) { beforeApply[ref] = true; });
  var beforeCheck = {};
  trace.taughtBeforeCheck.forEach(function (ref) { beforeCheck[ref] = true; });
  trace.knowledge.forEach(function (row) {
    if (row.used) assert.ok(beforeApply[row.ref], label + " " + row.ref + " is used before it is taught");
    if (row.checked) assert.ok(beforeCheck[row.ref], label + " " + row.ref + " is checked before it is taught");
    if (row.consolidated) assert.ok(row.learned, label + " " + row.ref + " is consolidated before it is taught");
    if (row.learned) assert.ok(row.consolidated, label + " " + row.ref + " is taught but never consolidated");
  });
}

[young, middle, older].forEach(function (built) { assertSequence(built, built.ctx.yearGroup); });

assert.ok(young.trace.questionBudget < older.trace.questionBudget, "question budget rises from Y2 to Y6");
assert.ok(young.trace.checkQuestions <= middle.trace.checkQuestions, "Y2 does not out-question Y4");
assert.ok(middle.trace.checkQuestions <= older.trace.checkQuestions, "Y4 does not out-question Y6");
assert.ok(older.trace.checkQuestions > young.trace.checkQuestions, "Y6 retrieves more taught strands than Y2: " + older.trace.checkQuestions + " vs " + young.trace.checkQuestions);
assert.ok(moves(middle.slots, "teach").indexOf("model") !== -1, "a Year 4 procedure keeps its model beat");
assert.ok(moves(middle.slots, "teach").indexOf("exemplify") !== -1, "a Year 4 example keeps its exemplify beat");
assert.ok(moves(older.slots, "teach").indexOf("exemplify") !== -1, "a Year 6 example keeps its exemplify beat");
assert.ok(older.trace.checkStrands.length >= 2, "Year 6 check samples more than one strand: " + older.trace.checkStrands.join(","));

function speak(beat, items, mode) {
  var item = items[0];
  items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
  var known = String(item.text || "").replace(/[.?!]$/, "");
  var lower = known.charAt(0).toLowerCase() + known.slice(1);
  var empty = {
    explain: "Sharks have fins and sharp teeth.",
    exemplify: "Here is one clear example of the idea in use.",
    model: "Watch this worked step and say what changes.",
    practise: "Use " + known + " in what you make.",
    apply: "Use " + known + " in what you make.",
    reveal: "The class can now use the idea from this lesson.",
    consolidate: "The class can now use the idea about fins."
  };
  var full = {
    notice: "Look at the plant and say what you can see.",
    predict: "Say what you think the roots are doing.",
    name: item.text,
    explain: item.text,
    exemplify: "For example, you can see it when " + lower + ".",
    model: "First follow this step: " + lower + ", then check what changed.",
    compare: "Look at both sides and say what is different.",
    connect: "These two ideas belong together in this lesson.",
    practise: "Show a new case where " + lower + ".",
    apply: "The idea you will use is that " + lower + ".",
    retrieve: "Which sentence matches the idea you just learned?",
    reveal: "So, " + lower + ".",
    consolidate: "So, " + lower + "."
  };
  var text = (mode === "empty" && empty[beat.move]) || full[beat.move];
  return { id: beat.id, cue: "", text: text };
}

function bodyFor(slots, items, mode) {
  var body = {};
  slots.forEach(function (slot) {
    var beats = (slot.beats || []).map(function (beat) { return speak(beat, items, mode); });
    if (slot.id === "apply") {
      body.apply = {
        beats: beats,
        instruction: mode === "draw" ? "Draw and explain that roots take in water from the soil, and the stem carries it up to the leaves." : "Show the path water takes from the roots up to the leaves.",
        target: "scene",
        successCondition: "The pupil has used the taught path.",
        teachingConnection: "The task follows the root and stem idea."
      };
    } else if (slot.id === "check") {
      var retrieves = (slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; });
      body.check = {
        beats: beats,
        questions: retrieves.map(function (beat, index) {
          var item = items[0];
          items.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
          var correct = mode === "miss" ? "A bell rings at lunch." : item.text;
          return {
            id: beat.id,
            prompt: mode === "miss" ? "What happens at lunch time in school?" : "Which sentence matches taught idea number " + (index + 1) + "?",
            choices: [correct, "A different idea that was not part of this lesson."],
            correct: correct,
            explain: mode === "miss" ? "Lunch has a bell." : "That sentence matches the idea the class has just learned.",
            successEvidence: "The pupil chose an answer.",
            teachingConnection: "The question follows the lesson."
          };
        })
      };
    } else body[slot.id] = { beats: beats };
  });
  return body;
}

function frameFor(built) {
  var frame = Object.assign({}, built.ctx, { lessonPlan: built.plan, lessonSkeleton: built.slots, pupilCount: 4 });
  frame.storyPlan = Brain.storyFromPlan(built.plan, frame);
  return frame;
}

var items = Brain.beatKnowledge(young.plan, "Year 2");
var empty = Brain.accept({ title: "Plant mission", objectives: [young.plan.learningObjective], slots: bodyFor(young.slots, items, "empty") }, frameFor(young));
assert.strictEqual(empty.ok, false);
var emptyText = (empty.issues || []).join(" | ");
assert.ok(emptyText.indexOf("does not explain the idea") !== -1, emptyText);
assert.ok(emptyText.indexOf("does not give an example") !== -1 || moves(young.slots, "teach").indexOf("exemplify") === -1, emptyText);
assert.ok(emptyText.indexOf("does not use the taught knowledge") !== -1, emptyText);
assert.ok(emptyText.indexOf("does not bring the learning together") !== -1, emptyText);
assert.ok(emptyText.indexOf("does not settle the taught knowledge") !== -1, emptyText);

var held = Brain.accept({ title: "Plant mission", objectives: [young.plan.learningObjective], slots: bodyFor(young.slots, items, "full") }, frameFor(young));
assert.strictEqual(held.ok, true, (held.issues || []).join(" | "));

var missed = Brain.accept({ title: "Plant mission", objectives: [young.plan.learningObjective], slots: bodyFor(young.slots, items, "miss") }, frameFor(young));
assert.strictEqual(missed.ok, false);
assert.ok((missed.issues || []).join(" ").indexOf("does not retrieve the taught knowledge") !== -1, (missed.issues || []).join(" | "));

var drawn = Brain.accept({ title: "Plant mission", objectives: [young.plan.learningObjective], slots: bodyFor(young.slots, items, "draw") }, frameFor(young));
assert.strictEqual(drawn.ok, false);
assert.ok((drawn.issues || []).join(" ").indexOf("does not use the taught knowledge") !== -1, (drawn.issues || []).join(" | "));

var shown = Brain.accept({ title: "Plant mission", objectives: [young.plan.learningObjective], slots: bodyFor(young.slots, items, "full") }, frameFor(young));
assert.strictEqual(shown.ok, true, (shown.issues || []).join(" | "));

function formatTrace(label, built) {
  var lines = ["## " + label, "", "Year " + built.trace.year + ", " + built.trace.minutes + " minutes. Depth floor " + built.trace.depthFloor + ", max " + built.trace.depthMax + ", question budget " + built.trace.questionBudget + ", check questions " + built.trace.checkQuestions + ".", ""];
  lines.push("Check strands: " + (built.trace.checkStrands.join(", ") || "(none labelled)") + ".");
  lines.push("");
  lines.push("| Ref | Where the pupil first learns it | Where they use it | Where Wondii checks it | Consolidation |");
  lines.push("| --- | --- | --- | --- | --- |");
  built.trace.knowledge.forEach(function (row) {
    lines.push("| " + row.ref + " " + row.knowledge + " | " + (row.learned || "—") + " | " + (row.used || "—") + " | " + (row.checked || "—") + " | " + (row.consolidated || "—") + " |");
  });
  lines.push("");
  return lines.join("\n");
}

if (process.env.TEACHING_TRACE === "1") {
  console.log([
    formatTrace("Year 2 plants", young),
    formatTrace("Year 4 equivalent fractions", middle),
    formatTrace("Year 6 rivers", older)
  ].join("\n"));
}

console.log("beat substance tests passed");
