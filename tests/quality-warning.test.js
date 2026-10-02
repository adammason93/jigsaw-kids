var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

function contract(prompt, correct) {
  return {
    prompt: prompt,
    choices: [correct, "A different idea that was not taught here."],
    correct: correct,
    explain: "That answer shows the learning the question asked for.",
    knowledgeChecked: "the requested learning",
    successEvidence: "a correct answer shows that learning",
    teachingConnection: "the question follows the required evidence"
  };
}

function frameFor(topic, year, knowledge, goal, evidence) {
  var plan = Brain.normalisePlan({
    learningObjective: knowledge[0],
    subject: "Science",
    topic: topic,
    keyKnowledge: knowledge,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, { subject: "Science", topic: topic, yearGroup: year, requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: [], intent: "explain" }, lessonText: topic }).plan;
  var frame = {
    subject: "Science",
    topic: topic,
    yearGroup: year,
    requestedMinutes: 15,
    pupilCount: 4,
    lessonText: topic,
    lessonBrief: {
      concepts: [],
      intent: "explain",
      rawRequest: topic,
      teacherIntent: {
        ok: true,
        learningGoal: goal,
        requiredEvidence: evidence,
        focusConcepts: ["the requested idea"]
      }
    },
    lessonPlan: plan
  };
  frame.lessonSkeleton = Brain.lessonSkeleton(plan, frame);
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  return frame;
}

function rawFor(knowledge, apply, check) {
  return {
    title: "Class mission",
    objectives: [knowledge[0]],
    slots: {
      hook: { lines: ["Something in this place has started to go wrong."] },
      investigate: { lines: ["Look closely and say what you notice before anyone explains it."], instruction: "Look closely and say what you notice." },
      teach: { lines: knowledge.slice(0, 2).concat(["Say it once more so the class can use it."]) },
      apply: apply,
      check: check,
      resolution: { lines: ["The mission can continue now that the class has used the idea."] },
      recap: { lines: knowledge.slice(0, 2) }
    }
  };
}

function task(instruction, knowledgeUsed) {
  return {
    instruction: instruction,
    knowledgeUsed: knowledgeUsed,
    successCondition: "The pupil completes the action.",
    teachingConnection: "The task follows the teaching.",
    target: "model"
  };
}

var lightningKnowledge = [
  "Lightning is a giant spark of electricity.",
  "A storm cloud can make that spark."
];
var lightningGoal = "understand what lightning is and how it occurs";
var lightningEvidence = "describe the process of lightning formation";
var lightningApply = task(
  "Use the cloud model to show where the giant spark of electricity happens.",
  lightningKnowledge[0]
);
var lightningCheck = contract(
  "Which statement names what lightning is?",
  "Lightning is a giant spark of electricity."
);
var lightningFrame = frameFor("Lightning", "Year 1", lightningKnowledge, lightningGoal, lightningEvidence);
var lightningRaw = rawFor(lightningKnowledge, lightningApply, lightningCheck);

var lightKnowledge = [
  "Light travels faster than sound.",
  "Sound takes longer to reach you than light."
];
var lightGoal = "understand that light travels quickly.";
var lightEvidence = "describe how light travels faster than sound.";
var lightApply = task(
  "Turn the torch and point along the beam.",
  lightKnowledge[0]
);
var lightCheck = contract(
  "Which statement matches what the class learned about light?",
  "Light travels faster than sound."
);
var lightFrame = frameFor("Speed of Light", "Year 1", lightKnowledge, lightGoal, lightEvidence);
var lightRaw = rawFor(lightKnowledge, lightApply, lightCheck);

var lightningPreview = Brain.accept(lightningRaw, lightningFrame);
assert.strictEqual(lightningPreview.applyAlignment.deterministicStatus, "pass", "Lightning apply fixture must stay deterministically runnable");
assert.strictEqual(lightningPreview.checkAlignment.deterministicStatus, "unresolved");

var lightPreview = Brain.accept(lightRaw, lightFrame);
assert.strictEqual(lightPreview.applyAlignment.deterministicStatus, "unresolved", "Speed of Light apply fixture must stay open for the semantic judge: " + lightPreview.applyAlignment.deterministicReason);
assert.notStrictEqual(lightPreview.applyAlignment.deterministicStatus, "fail");
assert.strictEqual(lightPreview.checkAlignment.deterministicStatus, "unresolved");

function settle(raw, frame, checkJudge, applyJudge, repair) {
  var checks = 0;
  var applies = 0;
  var repairs = 0;
  return Brain.resolveLessonContent(raw, frame, {
    judge: function () {
      applies += 1;
      return applyJudge(applies);
    },
    checkJudge: function () {
      checks += 1;
      return checkJudge(checks);
    },
    repair: function () {
      repairs += 1;
      if (repairs > 1) throw new Error("a second repair ran");
      return repair();
    }
  }).then(function (result) {
    return { result: result, checks: checks, applies: applies, repairs: repairs };
  });
}

function partial() {
  return { ok: true, coverage: "partial", reason: "The answer names lightning but does not describe how it forms.", demonstratedEvidence: "Pupil can name lightning as a spark.", ms: 4 };
}
function sufficient() {
  return { ok: true, coverage: "sufficient", reason: "The correct answer shows the required comparison.", demonstratedEvidence: "Pupil states that light travels faster than sound.", ms: 4 };
}
function reproduce() {
  return { ok: true, relationship: "reproduce", reason: "The pupil gives back the named fact.", ms: 5 };
}

Promise.resolve().then(function () {
  return settle(lightningRaw, lightningFrame, partial, function () {
    throw new Error("apply judge must not run when apply already passes");
  }, function () {
    return { slots: { check: lightningCheck } };
  });
}).then(function (run) {
  assert.strictEqual(run.repairs, 1);
  assert.strictEqual(run.checks, 2);
  assert.strictEqual(run.applies, 0);
  assert.strictEqual(run.result.ok, true, (run.result.issues || []).join("; "));
  assert.ok(run.result.adventure.activities.length >= 7);
  var warning = run.result.qualityWarnings.filter(function (item) { return item.slotId === "check"; })[0];
  assert.ok(warning);
  assert.strictEqual(warning.slotType, "check");
  assert.strictEqual(warning.outcome, "check-partial");
  assert.strictEqual(warning.repairAttempted, true);
  assert.strictEqual(warning.postRepair, true);
  assert.ok(warning.issue.indexOf("part of the required evidence") !== -1);
  assert.strictEqual(warning.reason, "The answer names lightning but does not describe how it forms.");
  assert.strictEqual(warning.demonstratedEvidence, "Pupil can name lightning as a spark.");
  assert.strictEqual(run.result.checkAlignment.semanticOutcome, "check-partial");
  assert.deepStrictEqual(run.result.checkAlignment.semanticOutcomes, ["check-partial", "check-partial"]);
  var quiz = run.result.adventure.activities.filter(function (activity) { return activity.slotId === "check"; })[0];
  assert.strictEqual(quiz.config.questions[0].prompt, lightningCheck.prompt);
  assert.deepStrictEqual(quiz.config.questions[0].choices, lightningCheck.choices);
  assert.strictEqual(quiz.config.questions[0].correct, lightningCheck.correct);
  return settle(lightRaw, lightFrame, sufficient, reproduce, function () {
    return { slots: { apply: lightApply } };
  });
}).then(function (run) {
  assert.strictEqual(run.repairs, 1);
  assert.strictEqual(run.applies, 2);
  assert.strictEqual(run.checks, 2);
  assert.strictEqual(run.result.ok, true, (run.result.issues || []).join("; "));
  assert.ok(run.result.adventure.activities.length >= 7);
  var warning = run.result.qualityWarnings.filter(function (item) { return item.slotId === "apply"; })[0];
  assert.ok(warning);
  assert.strictEqual(warning.slotType, "apply");
  assert.strictEqual(warning.outcome, "semantic-reproduce");
  assert.strictEqual(warning.repairAttempted, true);
  assert.strictEqual(warning.postRepair, true);
  assert.ok(warning.issue.indexOf("reproduces the named taught knowledge") !== -1);
  assert.strictEqual(warning.reason, "The pupil gives back the named fact.");
  assert.deepStrictEqual(run.result.applyAlignment.semanticOutcomes, ["semantic-reproduce", "semantic-reproduce"]);
  assert.strictEqual(run.result.checkAlignment.semanticOutcome, "check-pass");
  assert.ok(!run.result.qualityWarnings.some(function (item) { return item.slotId === "check"; }));
  var brokenCheck = {
    prompt: "What?",
    choices: ["A spark."],
    correct: ""
  };
  return settle(lightningRaw, lightningFrame, partial, function () {
    throw new Error("apply judge must not run");
  }, function () {
    return { slots: { check: brokenCheck } };
  });
}).then(function (run) {
  assert.strictEqual(run.repairs, 1);
  assert.strictEqual(run.result.ok, false);
  assert.ok(!run.result.adventure);
  assert.ok((run.result.issues || []).join(" ").indexOf("no real question") !== -1);
  var recallApply = task("What is lightning?", lightningKnowledge[0]);
  return settle(rawFor(lightningKnowledge, recallApply, lightningCheck), lightningFrame, sufficient, function () {
    throw new Error("a recall apply must not reach the semantic judge");
  }, function () {
    return { slots: { apply: recallApply } };
  });
}).then(function (run) {
  assert.strictEqual(run.result.ok, false);
  assert.ok(!run.result.adventure);
  assert.ok((run.result.issues || []).join(" ").indexOf("recall") !== -1);
  assert.strictEqual(run.applies, 0);
  return settle(lightningRaw, lightningFrame, function (n) {
    return n === 1 ? partial() : sufficient();
  }, function () {
    throw new Error("apply judge must not run");
  }, function () {
    return { slots: { check: contract("Which description shows how lightning forms?", "Charges in the cloud become unbalanced and make a giant spark.") } };
  });
}).then(function (run) {
  assert.strictEqual(run.repairs, 1);
  assert.strictEqual(run.checks, 2);
  assert.strictEqual(run.result.ok, true, (run.result.issues || []).join("; "));
  assert.deepStrictEqual(run.result.qualityWarnings, []);
  assert.strictEqual(run.result.checkAlignment.semanticOutcome, "check-pass");
  return settle(lightningRaw, lightningFrame, function () {
    return sufficient();
  }, function () {
    throw new Error("a clean pass must not repair");
  }, function () {
    throw new Error("a clean pass must not repair");
  });
}).then(function (run) {
  assert.strictEqual(run.repairs, 0);
  assert.strictEqual(run.checks, 1);
  assert.strictEqual(run.result.ok, true, (run.result.issues || []).join("; "));
  assert.deepStrictEqual(run.result.qualityWarnings, []);
  assert.ok(run.result.adventure.activities.some(function (activity) { return activity.slotId === "check"; }));
  console.log("quality warning tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
