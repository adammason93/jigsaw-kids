var assert = require("assert");
var Brain = require("../js/lesson-brain.js");

var REPRODUCE = "The apply slot reproduces the named taught knowledge instead of applying it.";
var UNRELATED = "The apply slot can be completed without using the named taught knowledge.";
var SEMANTIC_OPEN = "The apply slot needs semantic knowledge alignment.";

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

function frameFor(subject, topic, year, knowledge) {
  var plan = Brain.normalisePlan({
    learningObjective: knowledge[0],
    subject: subject,
    topic: topic,
    keyKnowledge: knowledge,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, { subject: subject, topic: topic, yearGroup: year, requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: [], intent: "explain" }, lessonText: topic }).plan;
  var frame = { subject: subject, topic: topic, yearGroup: year, requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: [], intent: "explain" }, lessonPlan: plan };
  frame.lessonSkeleton = Brain.lessonSkeleton(plan, frame);
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  return frame;
}

function lesson(subject, topic, year, knowledge, apply) {
  var frame = frameFor(subject, topic, year, knowledge);
  var raw = { title: topic + " mission", objectives: [knowledge[0]], slots: filledSlots(knowledge, apply) };
  return { frame: frame, raw: raw };
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

function run(subject, topic, year, knowledge, apply, ports) {
  var built = lesson(subject, topic, year, knowledge, apply);
  return Brain.resolveLessonContent(built.raw, built.frame, ports);
}

var directKnowledge = ["To find equivalent fractions, multiply the numerator and the denominator by the same number.", "Fractions can name the same amount in more than one way."];
var volcanoKnowledge = ["A volcano has a magma chamber, which holds molten rock.", "When pressure builds, magma rises through the vent."];
var dayKnowledge = ["When one side of the Earth faces the Sun, it is day.", "The Earth rotates on its axis once every 24 hours."];
var adjectiveKnowledge = ["Adjectives are words that describe nouns.", "Adjectives add detail to a sentence."];
var rotationKnowledge = ["The Earth rotates on its axis once every 24 hours.", "When one side of the Earth faces the Sun, it is day."];

var calls = { judge: 0, repair: 0 };
function countingJudge(verdict) {
  return function () {
    calls.judge += 1;
    return verdict;
  };
}
function countingRepair(next) {
  return function (accepted) {
    calls.repair += 1;
    return next(accepted);
  };
}
function reset() {
  calls.judge = 0;
  calls.repair = 0;
}

var brief = Brain.applySemanticBrief({
  instruction: "Turn the globe and point to the lit half, the half that is in daylight.",
  knowledgeUsed: dayKnowledge[0],
  requiredKnowledge: dayKnowledge,
  successCondition: "The pupil completes the action.",
  teachingConnection: "The task follows the teaching.",
  subject: "Science",
  yearGroup: "Year 5"
});
var briefUser = JSON.parse(brief.user);
assert.strictEqual(briefUser.instruction, "Turn the globe and point to the lit half, the half that is in daylight.");
assert.strictEqual(briefUser.knowledgeUsed, dayKnowledge[0]);
assert.deepStrictEqual(briefUser.requiredKnowledge, dayKnowledge);
assert.ok(brief.system.indexOf("without understanding") === -1);
assert.ok(brief.system.indexOf("usesKnowledge") === -1);
assert.ok(brief.system.indexOf("requestedProduct") === -1);
assert.ok(brief.system.indexOf("only the task explicitly required by instruction") !== -1);
assert.ok(brief.system.indexOf("Do not imagine later activities") !== -1);
assert.ok(brief.system.indexOf("reproduce means") !== -1);
assert.ok(brief.system.indexOf("apply means") !== -1);
assert.ok(brief.system.indexOf("unrelated means") !== -1);
assert.ok(brief.system.indexOf("A question is not reproduce by itself") !== -1);
assert.ok(!/volcano|fraction|adjective|roman|weather|daylight|globe|even number|underline|\bverb\b/i.test(brief.system));
var contract = [
  { instruction: "Explain when one side of the Earth faces the Sun.", knowledgeUsed: "When one side of the Earth faces the Sun, it is day.", requiredKnowledge: ["When one side of the Earth faces the Sun, it is day."] },
  { instruction: "Explain what equivalent fractions are.", knowledgeUsed: "Equivalent fractions represent the same amount.", requiredKnowledge: ["Equivalent fractions represent the same amount."] },
  { instruction: "Turn the globe and point to the half that is in daylight.", knowledgeUsed: "When one side of the Earth faces the Sun, it is day.", requiredKnowledge: ["When one side of the Earth faces the Sun, it is day."] },
  { instruction: "Build two different fractions that represent the same portion.", knowledgeUsed: "Equivalent fractions represent the same amount.", requiredKnowledge: ["Equivalent fractions represent the same amount."] },
  { instruction: "Draw a volcano.", knowledgeUsed: "Volcanoes can erupt lava.", requiredKnowledge: ["Volcanoes can erupt lava."] },
  { instruction: "What is an even number?", knowledgeUsed: "An even number can be split into two equal groups.", requiredKnowledge: ["An even number can be split into two equal groups."] },
  { instruction: "Which of these piles can be split into two equal groups?", knowledgeUsed: "An even number can be split into two equal groups.", requiredKnowledge: ["An even number can be split into two equal groups."] }
];
contract.forEach(function (row) {
  var sample = JSON.parse(Brain.applySemanticBrief(row).user);
  assert.strictEqual(sample.instruction, row.instruction);
  assert.strictEqual(sample.knowledgeUsed, row.knowledgeUsed);
  assert.ok(Brain.applySemanticBrief(row).system.indexOf("usesKnowledge") === -1);
});
assert.deepStrictEqual(Brain.applySemanticDecision("apply"), { ok: true, relationship: "apply", outcome: "semantic-pass", issue: "" });
assert.strictEqual(Brain.applySemanticDecision("REPRODUCE").outcome, "semantic-reproduce");
assert.strictEqual(Brain.applySemanticDecision("unrelated").issue, UNRELATED);
assert.strictEqual(Brain.applySemanticDecision("maybe").ok, false);
assert.strictEqual(Brain.applySemanticDecision(true).ok, false);
assert.deepStrictEqual(Brain.parseApplySemantic({ relationship: "apply", reason: "The selected item is the product." }), { ok: true, relationship: "apply", reason: "The selected item is the product." });
assert.strictEqual(Brain.parseApplySemantic({ relationship: " Reproduce ", reason: "The pupil gives back the fact." }).relationship, "reproduce");
assert.strictEqual(Brain.parseApplySemantic({ usesKnowledge: true, requestedProduct: "new_result", knowledgeRequired: true, reason: "The pupil is merely explaining the fact." }).ok, false);
assert.strictEqual(Brain.parseApplySemantic({ relationship: "true" }).ok, false);
assert.strictEqual(Brain.parseApplySemantic({ reason: "missing" }).ok, false);
assert.strictEqual(Brain.parseApplySemantic("not json").ok, false);
assert.strictEqual(Brain.parseApplySemantic(null).ok, false);

var directBuilt = lesson("Maths", "equivalent fractions", "Year 4", directKnowledge, task("Create two equivalent fractions by multiplying the numerator and the denominator.", directKnowledge[0]));
var directAccepted = Brain.accept(directBuilt.raw, directBuilt.frame);
assert.strictEqual(directAccepted.ok, true, (directAccepted.issues || []).join("; "));
assert.strictEqual(directAccepted.applyAlignment.deterministicStatus, "pass");
assert.strictEqual(Brain.applyJudgePlan(directAccepted), "skip-pass");

var volcanoBuilt = lesson("Science", "volcanoes", "Year 3", volcanoKnowledge, task("Draw a picture of a volcano.", volcanoKnowledge[0]));
var volcanoAccepted = Brain.accept(volcanoBuilt.raw, volcanoBuilt.frame);
assert.strictEqual(volcanoAccepted.applyAlignment.deterministicStatus, "fail");
assert.strictEqual(Brain.applyJudgePlan(volcanoAccepted), "skip-fail");
var forced = Brain.accept(volcanoBuilt.raw, Object.assign({}, volcanoBuilt.frame, { applySemantic: { relationship: "apply", reason: "override" } }));
assert.strictEqual(forced.ok, false);
assert.ok((forced.issues || []).join(" ").indexOf("does not use the taught knowledge") !== -1);
assert.ok((forced.issues || []).join(" ").indexOf(SEMANTIC_OPEN) === -1);
assert.ok((forced.issues || []).join(" ").indexOf(REPRODUCE) === -1);

var passedAnyway = Brain.accept(directBuilt.raw, Object.assign({}, directBuilt.frame, { applySemantic: { relationship: "reproduce", reason: "override" } }));
assert.strictEqual(passedAnyway.ok, true, (passedAnyway.issues || []).join("; "));

var daylightBuilt = lesson("Science", "Earth", "Year 5", dayKnowledge, task("Turn the globe and point to the lit half, the half that is in daylight.", dayKnowledge[0]));
var booleanIgnored = Brain.accept(daylightBuilt.raw, Object.assign({}, daylightBuilt.frame, { applySemantic: { usesKnowledge: true, requestedProduct: "new_result", knowledgeRequired: true, reason: "The pupil is merely explaining the fact." } }));
assert.strictEqual(booleanIgnored.ok, false);
assert.ok((booleanIgnored.issues || []).join(" ").indexOf(SEMANTIC_OPEN) !== -1);

reset();
run("Maths", "equivalent fractions", "Year 4", directKnowledge, task("Create two equivalent fractions by multiplying the numerator and the denominator.", directKnowledge[0]), {
  judge: function () { throw new Error("judge"); },
  repair: function () { throw new Error("repair"); }
}).then(function (direct) {
  assert.strictEqual(direct.ok, true, (direct.issues || []).join("; "));
  assert.strictEqual(direct.applyAlignment.deterministicStatus, "pass");
  assert.strictEqual(direct.applyAlignment.semanticJudgeUsed, false);
  assert.strictEqual(direct.applyAlignment.semanticOutcome, null);
  assert.strictEqual(direct.applyAlignment.semanticRelationship, null);
  assert.strictEqual(direct.repairUsed, false);
  return run("Science", "volcanoes", "Year 3", volcanoKnowledge, task("Draw a picture of a volcano.", volcanoKnowledge[0]), {
    judge: countingJudge({ ok: true, relationship: "apply", reason: "should not run", ms: 1 }),
    repair: countingRepair(function () { return { slots: { apply: task("Draw a picture of a volcano.", volcanoKnowledge[0]) } }; })
  });
}).then(function (volcano) {
  assert.strictEqual(calls.judge, 0);
  assert.strictEqual(calls.repair, 1);
  assert.strictEqual(volcano.applyAlignment.semanticJudgeUsed, false);
  assert.strictEqual(volcano.applyAlignment.deterministicStatus, "fail");
  reset();
  return run("English", "adjectives", "Year 3", adjectiveKnowledge, task("Sort the cards.", adjectiveKnowledge[0]), {
    judge: countingJudge({ ok: true, relationship: "apply", reason: "should not run", ms: 1 }),
    repair: countingRepair(function () { return { slots: { apply: task("Sort the cards.", adjectiveKnowledge[0]) } }; })
  });
}).then(function () {
  assert.strictEqual(calls.judge, 0);
  reset();
  return run("English", "adjectives", "Year 3", adjectiveKnowledge, task("What is an adjective?", adjectiveKnowledge[0]), {
    judge: countingJudge({ ok: true, relationship: "apply", reason: "should not run", ms: 1 }),
    repair: countingRepair(function () { return { slots: { apply: task("What is an adjective?", adjectiveKnowledge[0]) } }; })
  });
}).then(function () {
  assert.strictEqual(calls.judge, 0);
  reset();
  return run("English", "adjectives", "Year 3", adjectiveKnowledge, task("Choose a pupil to have a turn.", adjectiveKnowledge[0]), {
    judge: countingJudge({ ok: true, relationship: "apply", reason: "should not run", ms: 1 }),
    repair: countingRepair(function () { return { slots: { apply: task("Choose a pupil to have a turn.", adjectiveKnowledge[0]) } }; })
  });
}).then(function () {
  assert.strictEqual(calls.judge, 0);
  reset();
  return run("Science", "Earth", "Year 5", rotationKnowledge, task("Show which side of Earth has day when it faces the Sun.", rotationKnowledge[0]), {
    judge: countingJudge({ ok: true, relationship: "apply", reason: "should not run", ms: 1 }),
    repair: countingRepair(function () { return { slots: { apply: task("Show which side of Earth has day when it faces the Sun.", rotationKnowledge[0]) } }; })
  });
}).then(function (wrong) {
  assert.strictEqual(calls.judge, 0);
  assert.strictEqual(wrong.applyAlignment.deterministicStatus, "fail");
  reset();
  return run("Science", "Earth", "Year 5", dayKnowledge, task("Turn the globe and point to the lit half, the half that is in daylight.", dayKnowledge[0]), {
    judge: countingJudge({ ok: true, relationship: "apply", reason: "The lit half is selected from the taught day.", ms: 12 }),
    repair: countingRepair(function () { throw new Error("repair"); })
  });
}).then(function (paraphrase) {
  assert.strictEqual(calls.judge, 1);
  assert.strictEqual(calls.repair, 0);
  assert.strictEqual(paraphrase.ok, true, (paraphrase.issues || []).join("; "));
  assert.strictEqual(paraphrase.applyAlignment.deterministicStatus, "unresolved");
  assert.strictEqual(paraphrase.applyAlignment.semanticJudgeUsed, true);
  assert.strictEqual(paraphrase.applyAlignment.semanticRelationship, "apply");
  assert.strictEqual(paraphrase.applyAlignment.semanticOutcome, "semantic-pass");
  assert.strictEqual(paraphrase.applyAlignment.semanticMs, 12);
  reset();
  return run("Science", "Earth", "Year 5", dayKnowledge, task("Explain when one side of the Earth faces the Sun.", dayKnowledge[0]), {
    judge: countingJudge({ ok: true, relationship: "reproduce", reason: "The pupil gives back the named fact.", ms: 9 }),
    repair: countingRepair(function (accepted) {
      assert.ok((accepted.issues || []).join(" ").indexOf(REPRODUCE) !== -1);
      var repair = JSON.parse(Brain.slotRepairBrief(frameFor("Science", "Earth", "Year 5", dayKnowledge), accepted.slotIds, accepted.issues, accepted.previous).user);
      var applySpec = repair.slotsToRewrite.filter(function (spec) { return spec.slotType === "APPLY"; })[0];
      assert.ok(applySpec.failure.indexOf(REPRODUCE) !== -1);
      return { slots: { apply: task("Use the globe to show which side of Earth has day when it faces the Sun.", dayKnowledge[0]) } };
    })
  });
}).then(function (restated) {
  assert.strictEqual(calls.judge, 1);
  assert.strictEqual(calls.repair, 1);
  assert.strictEqual(restated.ok, true, (restated.issues || []).join("; "));
  assert.strictEqual(restated.applyAlignment.semanticRelationship, "reproduce");
  assert.strictEqual(restated.applyAlignment.semanticOutcome, "semantic-reproduce");
  assert.deepStrictEqual(restated.applyAlignment.semanticOutcomes, ["semantic-reproduce"]);
  reset();
  return run("Science", "Earth", "Year 5", dayKnowledge, task("Turn the globe and point to the lit half, the half that is in daylight.", dayKnowledge[0]), {
    judge: countingJudge({ ok: true, relationship: "unrelated", reason: "The action does not need the named fact.", ms: 8 }),
    repair: countingRepair(function (accepted) {
      assert.ok((accepted.issues || []).join(" ").indexOf(UNRELATED) !== -1);
      return { slots: { apply: task("Use the globe to show which side of Earth has day when it faces the Sun.", dayKnowledge[0]) } };
    })
  });
}).then(function (unrelated) {
  assert.strictEqual(calls.judge, 1);
  assert.strictEqual(calls.repair, 1);
  assert.strictEqual(unrelated.ok, true, (unrelated.issues || []).join("; "));
  assert.strictEqual(unrelated.applyAlignment.semanticOutcome, "semantic-unrelated");
  assert.strictEqual(unrelated.applyAlignment.semanticRelationship, "unrelated");
  reset();
  return run("Science", "Earth", "Year 5", dayKnowledge, task("Turn the globe and point to the lit half, the half that is in daylight.", dayKnowledge[0]), {
    judge: countingJudge({ ok: true, relationship: "maybe", reason: "malformed", ms: 4 }),
    repair: countingRepair(function () { throw new Error("repair"); })
  });
}).then(function (malformed) {
  assert.strictEqual(calls.judge, 1);
  assert.strictEqual(calls.repair, 0);
  assert.strictEqual(malformed.ok, false);
  assert.strictEqual(malformed.applyAlignment.semanticOutcome, "semantic-error");
  assert.ok((malformed.issues || []).join(" ").indexOf(SEMANTIC_OPEN) !== -1);
  reset();
  return run("Science", "Earth", "Year 5", dayKnowledge, task("Turn the globe and point to the lit half, the half that is in daylight.", dayKnowledge[0]), {
    judge: countingJudge({ ok: true, usesKnowledge: true, requestedProduct: "new_result", knowledgeRequired: true, reason: "The pupil is merely explaining the fact.", ms: 3 }),
    repair: countingRepair(function () { throw new Error("repair"); })
  });
}).then(function (booleanVerdict) {
  assert.strictEqual(calls.judge, 1);
  assert.strictEqual(calls.repair, 0);
  assert.strictEqual(booleanVerdict.ok, false);
  assert.strictEqual(booleanVerdict.applyAlignment.semanticOutcome, "semantic-error");
  assert.strictEqual(booleanVerdict.applyAlignment.semanticRelationship, null);
  reset();
  return run("Science", "Earth", "Year 5", dayKnowledge, task("Turn the globe and point to the lit half, the half that is in daylight.", dayKnowledge[0]), {
    judge: function () {
      calls.judge += 1;
      var error = new Error("slow");
      error.category = "timeout";
      throw error;
    },
    repair: countingRepair(function () { throw new Error("repair"); })
  });
}).then(function (timed) {
  assert.strictEqual(calls.judge, 1);
  assert.strictEqual(calls.repair, 0);
  assert.strictEqual(timed.ok, false);
  assert.strictEqual(timed.applyAlignment.semanticOutcome, "semantic-error");
  assert.strictEqual(timed.repairUsed, false);
  reset();
  var judgements = [
    { ok: true, relationship: "reproduce", reason: "Still a restatement.", ms: 5 },
    { ok: true, relationship: "unrelated", reason: "Still unresolved.", ms: 6 }
  ];
  return run("Science", "Earth", "Year 5", dayKnowledge, task("Turn the globe and point to the lit half, the half that is in daylight.", dayKnowledge[0]), {
    judge: function () {
      calls.judge += 1;
      return judgements[calls.judge - 1];
    },
    repair: countingRepair(function () {
      return { slots: { apply: task("Turn the globe and point to the lit half, the half that is in daylight.", dayKnowledge[0]) } };
    })
  });
}).then(function (once) {
  assert.strictEqual(calls.repair, 1);
  assert.strictEqual(calls.judge, 2);
  assert.strictEqual(once.ok, false);
  assert.strictEqual(once.repairUsed, true);
  assert.deepStrictEqual(once.applyAlignment.semanticOutcomes, ["semantic-reproduce", "semantic-unrelated"]);
  assert.strictEqual(once.applyAlignment.semanticOutcome, "semantic-unrelated");
  console.log("apply semantic tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
