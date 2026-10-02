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
  console.log("apply-routing ok");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
