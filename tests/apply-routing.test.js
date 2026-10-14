var fs = require("fs");
var path = require("path");
var Module = require("module");
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var sourcePath = path.join(__dirname, "../js/lesson-brain.js");
var source = fs.readFileSync(sourcePath, "utf8");
var patched = source.replace(
  "accept: accept,",
  "accept: accept, _audit: { applyAlignment: applyAlignment },"
);
var loaded = new Module(sourcePath);
loaded.filename = sourcePath;
loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
loaded._compile(patched, sourcePath);
var align = loaded.exports._audit.applyAlignment;

function aligned(instruction, knowledgeUsed, required) {
  return align({
    applyInstruction: instruction,
    knowledgeUsed: knowledgeUsed,
    scene: { interaction: { instruction: instruction, target: "model" } }
  }, required || [knowledgeUsed]);
}

var measured = aligned(
  "Measure each side of the triangle and record the longest side.",
  "A triangle has three straight sides."
);
assert.notStrictEqual(measured.status, "fail", "A unseen verb");
assert.notStrictEqual(measured.status, "pass", "A unseen verb");
assert.strictEqual(measured.status, "unresolved");
assert.strictEqual(measured.reason, "unlisted-action");

var paraphrased = aligned(
  "Squeeze each object and separate the ones that spring back into their old form from the ones that stay squashed.",
  "A solid keeps its own shape."
);
assert.strictEqual(paraphrased.status, "unresolved", "B paraphrase");
assert.notStrictEqual(paraphrased.status, "pass");
assert.notStrictEqual(paraphrased.reason, "topic-word-only");

var numerator = "The numerator is the top number and the denominator is the bottom number in a fraction.";
var equivalent = "Equivalent fractions name the same amount with different numbers.";
var sibling = aligned(
  "Show an equivalent amount and label the numerator.",
  numerator,
  [numerator, equivalent]
);
assert.strictEqual(sibling.status, "unresolved", "C sibling " + sibling.reason);
assert.strictEqual(sibling.reason, "shared-knowledge");
assert.notStrictEqual(sibling.status, "pass");

var selected = aligned(
  "Choose a pupil to explain the answer.",
  "A complete circuit lets electricity flow."
);
assert.strictEqual(selected.status, "fail");
assert.strictEqual(selected.reason, "pupil-selection");

var bare = aligned(
  "Sort the cards.",
  "Materials can be grouped by whether they are attracted to a magnet."
);
assert.strictEqual(bare.status, "fail");
assert.strictEqual(bare.reason, "bare-interaction");

var recall = aligned(
  "What is a prime number?",
  "A prime number has exactly two factors."
);
assert.strictEqual(recall.status, "fail");
assert.strictEqual(recall.reason, "recall-only");
var defined = aligned(
  "Define a prime number as a number with exactly two factors.",
  "A prime number has exactly two factors."
);
assert.notStrictEqual(defined.status, "pass", "F definition");
assert.strictEqual(defined.status, "fail");

function filledSlots(knowledge, apply) {
  return {
    hook: { lines: ["Something in this place has started to go wrong."] },
    investigate: { lines: ["Look closely and say what you notice before anyone explains it."], instruction: "Look closely and say what you notice." },
    teach: { lines: knowledge.slice(0, 2).concat(["Say it once more so the class can use it."]) },
    apply: apply,
    check: { prompt: "Which statement matches the lesson?", choices: [knowledge[0], "A different idea that was not taught here."], correct: knowledge[0], explain: "That statement matches the idea the class has just used." },
    resolution: { lines: ["The mission can continue now that the class has used the idea."] },
    recap: { lines: knowledge.slice(0, 2) }
  };
}

function frameFor(knowledge) {
  var plan = Brain.normalisePlan({
    learningObjective: knowledge[0],
    subject: "Maths",
    topic: "prime numbers",
    keyKnowledge: knowledge,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, { subject: "Maths", topic: "prime numbers", yearGroup: "Year 5", requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: [], intent: "explain" }, lessonText: "prime numbers" }).plan;
  var frame = { subject: "Maths", topic: "prime numbers", yearGroup: "Year 5", requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: [], intent: "explain" }, lessonPlan: plan };
  frame.lessonSkeleton = Brain.lessonSkeleton(plan, frame);
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  return frame;
}

var unrelatedKnowledge = ["A prime number has exactly two factors.", "Two is the smallest prime number."];
var unrelatedTask = {
  instruction: "Draw a picture of a castle.",
  knowledgeUsed: unrelatedKnowledge[0],
  successCondition: "The pupil completes the action.",
  teachingConnection: "The task follows the teaching.",
  target: "model"
};
var unrelatedAligned = aligned(unrelatedTask.instruction, unrelatedKnowledge[0]);
assert.notStrictEqual(unrelatedAligned.status, "pass", "G unrelated");
var frame = frameFor(unrelatedKnowledge);
var raw = { title: "prime numbers mission", objectives: unrelatedKnowledge, slots: filledSlots(unrelatedKnowledge, unrelatedTask) };

var cartilage = "Sharks have a skeleton made of cartilage.";
var ecosystem = "Sharks help keep the ocean ecosystem healthy.";
var fish = "Sharks are a type of fish.";
var sharkGoal = "Pupils should understand basic facts about sharks and their habitats.";
var sharkEvidence = "Pupils can describe at least two characteristics of sharks and where they live.";
var sharkRequest = "Year 1 science lesson about sharks and their habitats.";
var sharkPlan = Brain.normalisePlan({
  learningObjective: sharkGoal,
  subject: "Science",
  topic: "sharks",
  keyKnowledge: [cartilage, ecosystem, fish],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, {
  subject: "Science",
  topic: "sharks",
  yearGroup: "Year 1",
  requestedMinutes: 15,
  pupilCount: 4,
  lessonText: sharkRequest,
  lessonBrief: { concepts: ["marine life", "habitats"], intent: "explain", rawRequest: sharkRequest }
}).plan;
assert.ok(sharkPlan.keyKnowledge.indexOf(cartilage) !== -1 && sharkPlan.keyKnowledge.indexOf(ecosystem) !== -1, sharkPlan.keyKnowledge.join(" | "));
var sharkFrame = {
  subject: "Science",
  topic: "sharks",
  yearGroup: "Year 1",
  requestedMinutes: 15,
  pupilCount: 4,
  lessonPlan: sharkPlan,
  lessonText: sharkRequest,
  lessonBrief: {
    concepts: ["marine life", "habitats"],
    intent: "explain",
    rawRequest: sharkRequest,
    teacherIntent: {
      ok: true,
      learningGoal: sharkGoal,
      requiredEvidence: sharkEvidence,
      focusConcepts: ["marine life", "habitats", "shark species"]
    }
  }
};
sharkFrame.lessonSkeleton = Brain.planBeats(Brain.lessonSkeleton(sharkPlan, sharkFrame), sharkPlan, "Year 1");
sharkFrame.storyPlan = Brain.storyFromPlan(sharkPlan, sharkFrame);
var sharkItems = Brain.beatKnowledge(sharkPlan, "Year 1");
function sharkSentence(beat) {
  var item = sharkItems[0];
  sharkItems.forEach(function (entry) { if (entry.id === (beat.knowledgeRefs || [])[0]) item = entry; });
  var known = String(item.text || "").replace(/[.?!]$/, "");
  var text = {
    notice: "Look at the scene and say what you can see.",
    name: item.kind === "relationship" ? "The class gives this idea its own name." : item.text,
    explain: item.kind === "relationship" ? known + " in the ocean." : "This is how that idea works for a shark.",
    exemplify: "For example, you can see it when " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    practise: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    retrieve: "Which sentence matches the idea you just learned?",
    reveal: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    consolidate: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + "."
  }[beat.move];
  return { id: beat.id, cue: "", text: text };
}
var sharkSlots = {};
sharkFrame.lessonSkeleton.forEach(function (slot) {
  var beats = (slot.beats || []).filter(function (beat) { return beat.move !== "retrieve"; }).map(sharkSentence);
  if (slot.id === "apply") {
    sharkSlots.apply = {
      beats: (slot.beats || []).map(sharkSentence),
      instruction: "Select how sharks help the ocean.",
      target: ecosystem,
      successCondition: "The pupil selects how sharks help the ocean.",
      teachingConnection: "The task uses the ocean idea."
    };
  } else if (slot.id === "check") {
    var retrieves = (slot.beats || []).filter(function (beat) { return beat.move === "retrieve"; });
    sharkSlots.check = {
      questions: retrieves.map(function (beat, index) {
        var swapped = index === 0
          ? { prompt: "How do sharks help the ocean stay healthy?", correct: "They keep the ecosystem healthy." }
          : { prompt: "What do sharks have that helps them swim?", correct: "Cartilage" };
        return {
          id: beat.id,
          prompt: swapped.prompt,
          choices: [swapped.correct, "A different idea that was not taught."],
          correct: swapped.correct,
          explain: "That answer matches the idea the question asks about.",
          successEvidence: "The pupil chose the matching idea.",
          teachingConnection: "The question follows the taught idea."
        };
      })
    };
  } else sharkSlots[slot.id] = { beats: beats };
});
var sharkRaw = { title: "Sharks mission", objectives: [sharkGoal], slots: sharkSlots };
var sharkGate = aligned("Select how sharks help the ocean.", cartilage, sharkPlan.keyKnowledge);
assert.strictEqual(sharkGate.status, "fail", "the gate still rejects a named mismatch");
assert.strictEqual(sharkGate.reason, "different-knowledge");
var sharkPreview = Brain.accept(sharkRaw, sharkFrame);
var sharkApply = (sharkPreview.adventure || sharkPreview.previous).activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
var sharkCheck = (sharkPreview.adventure || sharkPreview.previous).activities.filter(function (activity) { return activity.slotId === "check"; })[0];
assert.strictEqual(sharkApply.knowledgeUsed, ecosystem, "a beat stamp follows the taught fact the task uses");
assert.notStrictEqual(sharkPreview.applyAlignment.deterministicReason, "different-knowledge");
var sharkBlockers = (sharkPreview.issues || []).filter(function (issue) {
  return String(issue).indexOf("semantic knowledge alignment") === -1 && String(issue).indexOf("evidence alignment") === -1;
});
assert.strictEqual(sharkBlockers.length, 0, (sharkPreview.issues || []).join(" | "));
assert.strictEqual(sharkCheck.config.questions[0].knowledgeChecked, ecosystem);
assert.strictEqual(sharkCheck.config.questions[1].knowledgeChecked, cartilage);
var recallSlots = JSON.parse(JSON.stringify(sharkSlots));
recallSlots.apply.instruction = "What keeps the ocean ecosystem healthy?";
var recallPreview = Brain.accept({ title: "Sharks mission", objectives: [sharkGoal], slots: recallSlots }, sharkFrame);
var recallApply = (recallPreview.adventure || recallPreview.previous).activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
assert.strictEqual(recallApply.knowledgeUsed, cartilage, "a recall task does not borrow another fact's label");
assert.strictEqual(recallPreview.applyAlignment.deterministicReason, "recall-only");
assert.strictEqual(recallPreview.ok, false);
var legacySkeleton = Brain.lessonSkeleton(sharkPlan, sharkFrame);
var legacyFrame = Object.assign({}, sharkFrame, { lessonSkeleton: legacySkeleton });
var legacySlots = {
  hook: { lines: ["Something in this ocean has started to go wrong."] },
  investigate: { lines: ["Look closely and say what you notice before anyone explains it."], instruction: "Look closely and say what you notice." },
  teach: { lines: [cartilage, ecosystem, "Say it once more so the class can use it."] },
  apply: {
    instruction: "Select how sharks help the ocean.",
    target: ecosystem,
    knowledgeUsed: cartilage,
    successCondition: "The pupil selects how sharks help the ocean.",
    teachingConnection: "The task uses the ocean idea."
  },
  check: {
    prompt: "Which statement matches the lesson?",
    choices: [ecosystem, "A different idea that was not taught."],
    correct: ecosystem,
    explain: "That statement matches the idea the class has just used.",
    knowledgeChecked: ecosystem,
    successEvidence: "The pupil chose the ocean idea.",
    teachingConnection: "The question follows the taught idea."
  },
  resolution: { lines: ["The mission can continue now that the class has used the idea."] },
  recap: { lines: [cartilage, ecosystem] }
};
var legacyPreview = Brain.accept({ title: "Sharks mission", objectives: [sharkGoal], slots: legacySlots }, legacyFrame);
var legacyApply = (legacyPreview.adventure || legacyPreview.previous).activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
assert.strictEqual(legacyApply.knowledgeUsed, cartilage, "an explicit knowledge label is not rewritten");
assert.strictEqual(legacyPreview.applyAlignment.deterministicReason, "different-knowledge");
assert.strictEqual(legacyPreview.ok, false);

Brain.resolveLessonContent(raw, frame, {
  judge: function () { return { ok: true, relationship: "unrelated", reason: "The castle drawing does not use factors.", ms: 4 }; },
  repair: function () { return { slots: { apply: unrelatedTask } }; }
}).then(function (result) {
  assert.strictEqual(result.ok, true, (result.issues || []).join("; "));
  assert.strictEqual(result.applyAlignment.semanticJudgeUsed, true);
  assert.strictEqual(result.applyAlignment.semanticRelationship, "unrelated");
  var applyWarning = (result.qualityWarnings || []).filter(function (item) { return item.slotId === "apply"; })[0];
  assert.ok(applyWarning);
  assert.ok(applyWarning.issue.indexOf("without using the named taught knowledge") !== -1);
  assert.strictEqual(applyWarning.postRepair, true);
  assert.strictEqual(result.repairUsed, true);
  assert.ok(result.adventure && result.adventure.activities.length);
  var selectionTask = {
    instruction: "Choose a pupil to explain the answer.",
    knowledgeUsed: unrelatedKnowledge[0],
    successCondition: "The pupil completes the action.",
    teachingConnection: "The task follows the teaching.",
    target: "model"
  };
  var forced = Brain.accept(
    { title: "prime numbers mission", objectives: unrelatedKnowledge, slots: filledSlots(unrelatedKnowledge, selectionTask) },
    Object.assign({}, frame, { applySemantic: { relationship: "apply", reason: "override" } })
  );
  assert.strictEqual(forced.applyAlignment.deterministicStatus, "fail");
  assert.strictEqual(forced.ok, false);
  var seen = [];
  var checked = [];
  return Brain.resolveLessonContent(sharkRaw, sharkFrame, {
    judge: function (input) {
      seen.push(input.knowledgeUsed);
      return { ok: true, relationship: "apply", reason: "The pupil has to use how sharks help the ocean.", ms: 3 };
    },
    checkJudge: function (input) {
      checked.push({ prompt: input.prompt, requiredEvidence: input.requiredEvidence });
      return { ok: true, coverage: "sufficient", reason: "The answer shows that fact.", demonstratedEvidence: input.requiredEvidence, ms: 2 };
    },
    repair: function () { throw new Error("the repaired label must not need another repair"); }
  }).then(function (sharkResult) {
    assert.strictEqual(sharkResult.ok, true, (sharkResult.issues || []).join(" | "));
    assert.strictEqual(sharkResult.repairUsed, false);
    assert.strictEqual(sharkResult.applyAlignment.deterministicReason, "unlisted-action");
    assert.notStrictEqual(sharkResult.applyAlignment.finalDeterministicReason, "different-knowledge");
    assert.strictEqual(sharkResult.applyAlignment.semanticJudgeUsed, true);
    assert.strictEqual(sharkResult.applyAlignment.semanticRelationship, "apply");
    assert.deepStrictEqual(seen, [ecosystem]);
    var done = sharkResult.adventure.activities.filter(function (activity) { return activity.slotId === "apply"; })[0];
    assert.strictEqual(done.knowledgeUsed, ecosystem);
    assert.strictEqual(done.applyInstruction, "Select how sharks help the ocean.");
    var quiz = sharkResult.adventure.activities.filter(function (activity) { return activity.slotId === "check"; })[0];
    assert.strictEqual(quiz.config.questions[1].knowledgeChecked, cartilage);
    assert.strictEqual(checked[0].requiredEvidence, ecosystem);
    assert.strictEqual(checked[1].requiredEvidence, cartilage);
    assert.strictEqual(sharkResult.adventure.activities.map(function (activity) { return activity.slotId; }).join(","), "hook,investigate,teach,apply,check,resolution,recap");
    console.log("apply-routing ok");
  });
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
