var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var knowledge = [
  "The Romans came to Britain because they wanted its metals and farmland.",
  "Those reasons explain why the Romans came to Britain."
];

function contract(prompt, correct, extra) {
  extra = extra || {};
  return {
    prompt: prompt,
    choices: extra.choices || [correct, "A different idea that was not taught here."],
    correct: correct,
    explain: extra.explain || "That answer shows the learning the question asked for.",
    knowledgeChecked: extra.knowledgeChecked || "the requested learning",
    successEvidence: extra.successEvidence || "a correct answer shows that learning",
    teachingConnection: extra.teachingConnection || "the question follows the learning goal"
  };
}

function frameFor(goal, year) {
  var plan = Brain.normalisePlan({
    learningObjective: knowledge[0],
    subject: "History",
    topic: "Romans",
    keyKnowledge: knowledge,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, { subject: "History", topic: "Romans", yearGroup: year || "Year 4", requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: [], intent: "explain" }, lessonText: "Romans" }).plan;
  var frame = {
    subject: "History",
    topic: "Romans",
    yearGroup: year || "Year 4",
    requestedMinutes: 15,
    pupilCount: 4,
    lessonBrief: {
      concepts: [],
      intent: "explain",
      teacherIntent: { ok: true, learningGoal: goal, focusConcepts: ["the requested idea"] }
    },
    lessonPlan: plan
  };
  frame.lessonSkeleton = Brain.lessonSkeleton(plan, frame);
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  return frame;
}

function rawFor(check) {
  return {
    title: "Romans mission",
    objectives: [knowledge[0]],
    slots: {
      hook: { lines: ["Something in this place has started to go wrong."] },
      investigate: { lines: ["Look closely and say what you notice before anyone explains it."], instruction: "Look closely and say what you notice." },
      teach: { lines: knowledge.slice(0, 2).concat(["Say it once more so the class can use it."]) },
      apply: {
        instruction: "Use the evidence to identify which reasons explain why the Romans wanted Britain.",
        knowledgeUsed: "Those reasons explain why the Romans came to Britain.",
        successCondition: "The pupil has chosen the reasons that explain why the Romans wanted Britain.",
        teachingConnection: "The task uses the reasons the class has just learned."
      },
      check: check,
      resolution: { lines: ["The mission can continue now that the class has used the idea."] },
      recap: { lines: knowledge.slice(0, 2) }
    }
  };
}

function judged(goal, check, relationship, year) {
  var frame = frameFor(goal, year);
  if (relationship) frame.checkSemantic = { relationship: relationship, reason: "test verdict" };
  return Brain.accept(rawFor(check), frame);
}

function rejects(result, snippet) {
  assert.strictEqual(result.ok, false);
  assert.ok((result.issues || []).join(" ").indexOf(snippet) !== -1, (result.issues || []).join(" | "));
  assert.deepStrictEqual(result.slotIds, ["check"]);
}

var compareDefinition = contract(
  "What is a habitat?",
  "A habitat is a place where a living thing lives."
);
var compareGoal = "Compare how two habitats are different.";
var unresolved = judged(compareGoal, compareDefinition);
assert.strictEqual(unresolved.ok, false, "A complete contract is not accepted before a verdict");
assert.strictEqual(unresolved.checkAlignment.deterministicStatus, "unresolved");
assert.strictEqual(unresolved.checkAlignment.deterministicReason, "goal-alignment");
assert.ok((unresolved.issues || []).join(" ").indexOf("needs semantic goal alignment") !== -1);
assert.strictEqual(Brain.checkJudgePlan(unresolved), "judge");

rejects(judged(compareGoal, compareDefinition, "prerequisite"), "nearby definition");
rejects(judged(
  "Explain what causes a puddle to dry up.",
  contract("What is the sun called?", "The sun."),
  "prerequisite"
), "nearby definition");
rejects(judged(
  "Sequence the stages of making a clay pot.",
  contract("What is the first thing you do?", "You get the clay."),
  "prerequisite"
), "nearby definition");
rejects(judged(
  "Measure the length of the desk with a ruler.",
  contract("What is a ruler?", "A tool for measuring length."),
  "prerequisite"
), "nearby definition");

var identify = judged(
  "Identify which object is a square.",
  contract("Which shape is a square?", "The shape with four equal sides."),
  "aligned",
  "Year 1"
);
assert.strictEqual(identify.ok, true, (identify.issues || []).join("; "));

var definitionGoal = judged(
  "Define what a noun is.",
  contract("What is a noun?", "A noun is a naming word."),
  "aligned"
);
assert.strictEqual(definitionGoal.ok, true, (definitionGoal.issues || []).join("; "));

var paraphrase = judged(
  "Explain why a plant bends towards the window.",
  contract("Why does the plant bend towards the window?", "It bends towards the light."),
  "aligned"
);
assert.strictEqual(paraphrase.ok, true, (paraphrase.issues || []).join("; "));

rejects(judged(
  "Explain why a plant bends towards the window.",
  contract("Which room is the plant kept in?", "The classroom."),
  "unrelated"
), "does not test the learning goal");

var thin = judged(compareGoal, {
  prompt: "What?",
  choices: ["A habitat."],
  correct: ""
});
assert.strictEqual(thin.checkAlignment.deterministicStatus, "fail");
assert.strictEqual(thin.checkAlignment.deterministicReason, "incomplete-question");
assert.strictEqual(Brain.checkJudgePlan(thin), "skip");

var missingContract = judged(compareGoal, {
  prompt: "Which description shows how the two habitats differ?",
  choices: ["One is wetter than the other.", "A habitat is a place."],
  correct: "One is wetter than the other.",
  explain: "The correct choice compares the two habitats."
});
assert.strictEqual(missingContract.checkAlignment.deterministicReason, "incomplete-contract");
assert.ok((missingContract.issues || []).join(" ").indexOf("does not say what learning it checks") !== -1);
assert.strictEqual(Brain.checkJudgePlan(missingContract), "skip");

var brief = Brain.checkSemanticBrief(Brain.checkSemanticInput(
  { config: { questions: [compareDefinition] } },
  frameFor(compareGoal),
  "One habitat is wet and the other is dry."
));
assert.ok(brief.system.indexOf("aligned") !== -1);
assert.ok(brief.system.indexOf("prerequisite") !== -1);
assert.ok(brief.system.indexOf("unrelated") !== -1);
assert.ok(brief.system.indexOf("year group") !== -1);
assert.ok(brief.system.indexOf("Do not rewrite the question") !== -1);
assert.strictEqual(brief.system.indexOf("reproduce"), -1);
var parsed = Brain.parseCheckSemantic("{\"relationship\":\"aligned\",\"reason\":\"The answer shows the goal.\"}");
assert.strictEqual(parsed.ok, true);
assert.strictEqual(parsed.relationship, "aligned");
assert.strictEqual(Brain.parseCheckSemantic("{\"relationship\":\"apply\"}").ok, false);
assert.strictEqual(Brain.checkSemanticDecision("prerequisite").outcome, "check-prerequisite");

var checkRepair = JSON.parse(Brain.slotRepairBrief(frameFor(compareGoal, "Year 1"), ["check"], ["The check slot asks for a nearby definition instead of the learning goal."], { activities: [] }).user);
var checkSpec = checkRepair.slotsToRewrite.filter(function (spec) { return spec.slotType === "CHECK"; })[0];
assert.ok(checkSpec.output.prompt === "");
assert.ok(Array.isArray(checkSpec.output.choices));
assert.strictEqual(checkSpec.learningGoal, compareGoal);
assert.ok(checkRepair.instruction.indexOf("must stay a quiz") !== -1);
assert.ok(checkRepair.instruction.indexOf("year group can read") !== -1);
assert.ok(checkRepair.instruction.indexOf(compareGoal) !== -1);

var applyOnly = JSON.parse(Brain.slotRepairBrief(frameFor(compareGoal), ["apply"], ["The apply slot does not use the taught knowledge."], { activities: [] }).user);
assert.strictEqual(applyOnly.instruction.indexOf("CHECK slot must stay a quiz"), -1);
assert.ok(applyOnly.instruction.indexOf("MUST require the pupil to use this knowledge") !== -1);
assert.deepStrictEqual(Object.keys(applyOnly.slotsToRewrite[0].output).sort(), ["instruction", "knowledgeUsed", "successCondition", "target", "teachingConnection"]);

var content = Brain.contentBrief(frameFor(compareGoal), frameFor(compareGoal).lessonPlan, null);
assert.ok(content.system.indexOf("teacherIntent.learningGoal") !== -1);
assert.ok(content.system.indexOf("knowledgeChecked") !== -1);
assert.ok(content.system.indexOf("as easy to read as the year group") !== -1);

function settle(goal, check, judge, repair) {
  var frame = frameFor(goal);
  var judges = 0;
  var repairs = 0;
  var seen = [];
  return Brain.resolveLessonContent(rawFor(check), frame, {
    judge: function () { throw new Error("apply judge must not run"); },
    checkJudge: function (input) {
      judges += 1;
      seen.push(input.prompt);
      return judge(judges, input);
    },
    repair: function (accepted) {
      repairs += 1;
      assert.deepStrictEqual(accepted.slotIds, ["check"]);
      return repair(accepted);
    }
  }).then(function (result) {
    return { result: result, judges: judges, repairs: repairs, seen: seen };
  });
}

var better = contract(
  "Which description shows how the two habitats differ?",
  "One is wet and shady, and the other is dry and open."
);

Promise.resolve().then(function () {
  return settle(compareGoal, compareDefinition, function (n) {
    return n === 1
      ? { ok: true, relationship: "prerequisite", reason: "It only asks for a definition.", ms: 3 }
      : { ok: true, relationship: "aligned", reason: "The correct answer compares the habitats.", ms: 4 };
  }, function () {
    return { slots: { check: better } };
  });
}).then(function (run) {
  assert.strictEqual(run.repairs, 1);
  assert.strictEqual(run.judges, 2);
  assert.strictEqual(run.result.ok, true, (run.result.issues || []).join("; "));
  assert.deepStrictEqual(run.result.repairedSlots, ["check"]);
  assert.strictEqual(run.result.checkAlignment.semanticCalls, 2);
  assert.deepStrictEqual(run.result.checkAlignment.semanticOutcomes, ["check-prerequisite", "check-pass"]);
  assert.strictEqual(run.result.applyAlignment.semanticCalls, 0);
  var quiz = run.result.adventure.activities.filter(function (activity) { return activity.slotId === "check"; })[0];
  assert.ok(quiz.config.questions[0].prompt.indexOf("differ") !== -1);
  return settle(compareGoal, compareDefinition, function () {
    return { ok: true, relationship: "prerequisite", reason: "Still a definition.", ms: 2 };
  }, function () {
    return { slots: { check: compareDefinition } };
  });
}).then(function (run) {
  assert.strictEqual(run.repairs, 1);
  assert.strictEqual(run.judges, 2);
  assert.strictEqual(run.result.ok, false);
  assert.ok((run.result.issues || []).join(" ").indexOf("nearby definition") !== -1);
  return settle(compareGoal, compareDefinition, function () {
    return { ok: false, reason: "error", ms: 1 };
  }, function () {
    throw new Error("repair must not run after a check judge error");
  });
}).then(function (run) {
  assert.strictEqual(run.repairs, 0);
  assert.strictEqual(run.judges, 1);
  assert.strictEqual(run.result.ok, false);
  assert.strictEqual(run.result.checkAlignment.semanticOutcome, "check-error");
  console.log("check alignment tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
