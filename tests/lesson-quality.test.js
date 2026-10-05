/* Development checks for lesson planning. These prompts are evaluation cases, not lesson templates. */
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Brain = require("../js/lesson-brain.js");
var Core = require("../schools/learn/creator-core.js");

var CASES = [
  ["Teach Year 2 children what gravity does for 10 minutes.", "Gravity", "2", 10, "Science"],
  ["Teach Year 4 equivalent fractions for 12 minutes.", "Equivalent Fractions", "4", 12, "Maths"],
  ["Teach Year 5 why volcanoes erupt for 15 minutes.", "Volcanoes Erupt", "5", 15, "Science"],
  ["Teach Year 3 how adjectives improve sentences for 10 minutes.", "Adjectives Improve Sentences", "3", 10, "English"],
  ["Teach Year 6 why the Romans invaded Britain for 15 minutes.", "Romans Invaded Britain", "6", 15, "History"]
];

function draftFor(sentence) {
  var draft = Core.blankDraft();
  draft.source = { type: "paste", filename: "", text: sentence, unsupported: false };
  Core.applyAnalysis(draft, Core.analyseSource(sentence));
  return draft;
}

CASES.forEach(function (row) {
  var draft = draftFor(row[0]);
  var ctx = Brain.contextFrom(draft, { pupilCount: 8, availableMechanics: Brain.MECHANICS });
  assert.strictEqual(ctx.lessonBrief.topic, row[1], row[0]);
  assert.strictEqual(ctx.yearGroup, "Year " + row[2], row[0]);
  assert.strictEqual(ctx.requestedMinutes, row[3], row[0]);
  assert.strictEqual(ctx.subject, row[4], row[0]);
  assert.strictEqual(ctx.yearAssumed, false);
  var plan = Brain.planBrief(ctx);
  var content = Brain.contentBrief(ctx, { learningObjective: "Teach " + row[1], lessonArc: [] });
  assert.ok(plan.system.indexOf("internal lesson plan") !== -1);
  var guide = { Maths: "worked example", English: "real sentences", History: "time order", Science: "notice something" };
  assert.ok(plan.system.indexOf(guide[row[4]]) !== -1, row[4]);
  assert.ok(content.system.indexOf("before the first scored quiz") !== -1);
  assert.ok(plan.user.indexOf("Year " + row[2]) !== -1);
  assert.strictEqual(content.system.indexOf("exactly these four"), -1);
});

var younger = Brain.planBrief(Brain.contextFrom(draftFor(CASES[0][0]), {}));
var older = Brain.planBrief(Brain.contextFrom(draftFor("Teach Year 5 children what gravity does for 10 minutes."), {}));
assert.ok(younger.user.indexOf("Year 2") !== -1);
assert.ok(older.user.indexOf("Year 5") !== -1);
assert.ok(younger.user !== older.user);

var unnamed = draftFor("Teach the class what shadows are for 10 minutes.");
var assumed = Brain.contextFrom(unnamed, {});
assert.strictEqual(assumed.yearGroup, "");
assert.strictEqual(assumed.yearAssumed, true);
assert.ok(assumed.yearAssumption.indexOf("Year 3") !== -1);
assert.ok(Brain.planBrief(assumed).user.indexOf("Year 3, about 7 to 8 years old") !== -1);

function taught() {
  return {
    subject: "Science",
    topic: "Gravity",
    yearGroup: "Year 2",
    title: "Gravity Adventure",
    objectives: ["Say that gravity pulls things down to the ground."],
    activities: [
      { mechanic: "story", title: "Watch a drop", purpose: "Teach what gravity does", minutes: 3, why: "The class sees the idea first.", config: { lines: ["When you let go of a teddy, gravity pulls it down to the ground."] } },
      { mechanic: "quiz", title: "Check", purpose: "Check the idea", minutes: 4, why: "See whether the class can use the idea.", config: { points: 1, questions: [{ prompt: "What happens to a ball when you drop it?", choices: ["It falls to the ground", "It floats up to the ceiling", "It stays where you let go"], correct: "It falls to the ground", explain: "Gravity pulls the ball down to the ground.", kind: "multiple" }] } },
      { mechanic: "mystery", title: "Remember", purpose: "Recap", minutes: 3, why: "Leave the class with the main fact.", config: { lines: ["Gravity pulls things down towards the ground."] } }
    ]
  };
}

var yearTwo = Brain.contextFrom(draftFor(CASES[0][0]), {});
var good = Brain.accept(taught(), yearTwo);
assert.strictEqual(good.ok, true, (good.issues || []).join("; "));
var checks = Brain.qualityChecklist(good.adventure, yearTwo);
assert.ok(checks.every(function (item) { return item.id !== "teach-first" || item.ok; }));
assert.ok(checks.filter(function (item) { return item.id === "teach-first"; })[0].ok);

var early = taught();
early.activities.unshift(early.activities.splice(1, 1)[0]);
var tooSoon = Brain.accept(early, yearTwo);
assert.strictEqual(tooSoon.ok, false);
assert.ok((tooSoon.issues || []).join(" ").indexOf("before the class has been taught") !== -1);

var joke = taught();
joke.activities[1].config.questions[0].choices[2] = "It turns into a bird";
var joked = Brain.accept(joke, yearTwo);
assert.strictEqual(joked.ok, false);
assert.ok((joked.issues || []).join(" ").indexOf("joke") !== -1);

var praise = taught();
praise.activities[1].config.questions[0].explain = "Correct!";
var praised = Brain.accept(praise, yearTwo);
assert.strictEqual(praised.ok, false);
assert.ok((praised.issues || []).join(" ").indexOf("explanation") !== -1);

var thinPlan = Brain.normalisePlan({ learningObjective: "Short" }, yearTwo);
assert.strictEqual(thinPlan.ok, false);
var fullPlan = Brain.normalisePlan({
  learningObjective: "Say that gravity pulls things down.",
  keyKnowledge: ["Gravity pulls things down.", "The pull is towards the ground."],
  lessonArc: [{ purpose: "teach", concept: "Gravity" }, { purpose: "recap", concept: "Gravity" }]
}, yearTwo);
assert.strictEqual(fullPlan.ok, true);
var arc = fullPlan.plan.lessonArc;
assert.deepStrictEqual(arc.map(function (stage) { return stage.purpose; }), ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"]);
assert.strictEqual(arc[0].mayRevealAnswer, false);
assert.deepStrictEqual(arc[0].requiredKnowledge, []);
assert.deepStrictEqual(arc[2].requiredKnowledge, ["Gravity pulls things down.", "The pull is towards the ground."]);
assert.strictEqual(arc[2].dependsOn, "investigate");
assert.strictEqual(arc[5].dependsOn, "check");
var contractBrief = Brain.contentBrief({ topic: "causes of earthquakes", yearGroup: "Year 1", requestedMinutes: 15, lessonBrief: { topic: "causes of earthquakes", rawRequest: "learn about causes of earthquakes" } }, fullPlan.plan, null);
assert.ok(contractBrief.user.indexOf("\"mayRevealAnswer\":false") !== -1);
assert.ok(contractBrief.system.indexOf("Do not turn the lesson into a lesson about stories") !== -1);
assert.strictEqual(Brain.repairClass(["The opening states the explanation before the class has investigated."]), "structural");
assert.strictEqual(Brain.repairClass(["The correct answer is the effect, not the cause."]), "local");
var structuralRepair = Brain.repairBrief({ lessonPlan: fullPlan.plan }, ["The opening states the explanation before the class has investigated."], { activities: [{ title: "old" }] });
assert.ok(structuralRepair.user.indexOf("\"previous\":null") !== -1);
var localRepair = Brain.repairBrief({ lessonPlan: fullPlan.plan }, ["The correct answer is the effect, not the cause."], { activities: [{ title: "old" }] });
assert.ok(localRepair.user.indexOf("old") !== -1);
var fallbackStory = Brain.storyFromPlan(fullPlan.plan, { yearGroup: "Year 1", topic: "Gravity" });
assert.ok(fallbackStory.narrativeArc[0].learning.indexOf("does not know the explanation") !== -1);
assert.ok(fallbackStory.narrativeArc[0].learning.indexOf("Gravity pulls") === -1);

var fractionsCtx = Brain.contextFrom(draftFor(CASES[1][0]), {});
var guided = Brain.accept({
  title: "Equivalent Fractions Adventure",
  topic: "Equivalent Fractions",
  objectives: ["See that different fractions can name the same amount."],
  activities: [
    { mechanic: "story", minutes: 4, purpose: "Teach", config: { lines: ["One half and two quarters are equivalent fractions because they name the same amount of the bar."] } },
    { mechanic: "guided_practice", minutes: 4, purpose: "Practice", title: "Try a pair", config: { lines: ["Shade one half of a bar, then shade two quarters, and see that the same amount is shaded."] } },
    { mechanic: "quiz", minutes: 4, purpose: "Check", config: { questions: [{ prompt: "Which pair shows equivalent fractions?", choices: ["1/2 and 2/4", "1/2 and 1/3", "1/4 and 3/4"], correct: "1/2 and 2/4", explain: "One half and two quarters cover the same amount of the whole.", kind: "multiple" }] } }
  ]
}, fractionsCtx);
assert.strictEqual(guided.ok, true, (guided.issues || []).join("; "));
assert.ok(guided.adventure.activities.some(function (activity) { return activity.mechanic === "story" && activity.title === "Try a pair"; }));

var weather = Brain.contextFrom(draftFor("teach the difference between weather and climate"), {});
assert.strictEqual(weather.lessonBrief.intent, "compare");
assert.strictEqual(weather.lessonBrief.relationship, "difference");
assert.deepStrictEqual(weather.lessonBrief.concepts, ["weather", "climate"]);
var dayReason = Brain.normalisePlan({
  learningObjective: "Explain why we have day and night.",
  keyKnowledge: ["Day and night happen because the Earth rotates once each day.", "The side facing the Sun is in daylight."],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, { topic: "day and night", lessonText: "teach why we have day and night", lessonBrief: { intent: "why" }, yearGroup: "Year 5" });
assert.strictEqual(dayReason.ok, true, (dayReason.issues || []).join("; "));
assert.ok(dayReason.plan.knowledge.some(function (item) { return item.knowledgeType === "reason" || item.knowledgeType === "cause" || item.knowledgeType === "process"; }));
var dayOutcome = Brain.normalisePlan({
  learningObjective: "Explain why we have day and night.",
  keyKnowledge: ["The sky gets light.", "People go to sleep."],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, { topic: "day and night", lessonText: "teach why we have day and night", lessonBrief: { intent: "why" }, yearGroup: "Year 5" });
assert.strictEqual(dayOutcome.ok, false);
assert.ok((dayOutcome.issues || []).join(" ").indexOf("outcome, not the reason") !== -1);
var labeledReason = Brain.normalisePlan({
  learningObjective: "Explain why the Romans came to Britain.",
  keyKnowledge: [{ text: "Rome wanted land, resources, and more power.", knowledgeType: "reason" }, "Britain already had farms and metal."],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, { topic: "Romans", lessonText: "teach why the Romans came to Britain", lessonBrief: { intent: "why" }, yearGroup: "Year 4" });
assert.strictEqual(labeledReason.ok, true, (labeledReason.issues || []).join("; "));
function stageLesson(skip) {
  var activities = [
    { mechanic: "story", title: "Hook", purpose: "Hook", minutes: 2, why: "Problem", scene: { beat: "beginning" }, config: { lines: ["The class can see a change and does not know the reason yet."] } },
    { mechanic: "story", title: "Look", purpose: "Investigate", minutes: 2, why: "Look", scene: { beat: "goal" }, config: { lines: ["The class looks closely and asks what is changing."] } },
    { mechanic: "story", title: "Teach", purpose: "Teach", minutes: 3, why: "Teach", scene: { beat: "discovery" }, config: { lines: ["Gravity pulls things down towards the Earth.", "The pull acts on objects even when nobody is holding them."] } },
    { mechanic: "story", title: "Apply", purpose: "Apply", minutes: 2, why: "Use it", scene: { beat: "application" }, config: { lines: ["The class uses gravity to predict that a rubber will fall."] } },
    { mechanic: "quiz", title: "Check", purpose: "Check", minutes: 3, why: "Check", config: { points: 1, questions: [{ prompt: "What pulls a rubber down?", choices: ["Gravity pulls it down", "The rubber floats", "A hand still holds it"], correct: "Gravity pulls it down", explain: "Gravity pulls the rubber down." }] } },
    { mechanic: "story", title: "Settled", purpose: "Resolution", minutes: 2, why: "End", scene: { beat: "resolution" }, config: { lines: ["The class uses the pull, and the question is settled."] } },
    { mechanic: "mystery", title: "Facts", purpose: "Recap", minutes: 2, why: "Facts", scene: { beat: "debrief" }, config: { lines: ["Gravity pulls things down towards the Earth."] } }
  ].filter(function (activity) { return activity.purpose !== skip; });
  return {
    subject: "Science",
    topic: "Gravity",
    yearGroup: "Year 4",
    title: "The drop",
    objectives: ["Explain that gravity pulls objects towards the Earth."],
    activities: activities
  };
}
var missingInvestigate = Brain.accept(stageLesson("Investigate"), {
  topic: "Gravity",
  yearGroup: "Year 4",
  requestedMinutes: 15,
  lessonBrief: { concepts: ["gravity"], intent: "explain" },
  lessonPlan: fullPlan.plan,
  storyPlan: Brain.storyFromPlan(fullPlan.plan, { yearGroup: "Year 4", topic: "Gravity" })
});
assert.strictEqual(missingInvestigate.ok, false);
assert.ok((missingInvestigate.issues || []).join(" ").indexOf("missing the investigate") !== -1);
var recall = Brain.accept({
  subject: "Science",
  topic: "Volcanoes",
  yearGroup: "Year 3",
  title: "Under the volcano",
  objectives: ["Say what is beneath a volcano."],
  activities: [
    { mechanic: "story", title: "Look", purpose: "Teach", minutes: 4, why: "Teach", config: { lines: ["A volcano has a magma chamber beneath it.", "Magma can rise when the chamber is under pressure."] } },
    { mechanic: "quiz", title: "Check", purpose: "Check", minutes: 4, why: "Recall", config: { points: 1, questions: [{ prompt: "What is beneath a volcano?", choices: ["A lake", "A magma chamber", "A mountain"], correct: "A magma chamber", explain: "A magma chamber sits beneath a volcano." }] } },
    { mechanic: "mystery", title: "Fact", purpose: "Recap", minutes: 4, why: "Fact", config: { lines: ["A magma chamber sits beneath a volcano."] } }
  ]
}, { topic: "Volcanoes", yearGroup: "Year 3", requestedMinutes: 12, lessonBrief: { concepts: ["volcano"], intent: "process" }, lessonText: "teach how volcanoes erupt" });
assert.strictEqual(recall.ok, true, (recall.issues || []).join("; "));
var bareApply = Brain.accept(stageLesson("Apply"), {
  topic: "Gravity",
  yearGroup: "Year 4",
  requestedMinutes: 15,
  lessonBrief: { concepts: ["gravity"], intent: "explain" },
  lessonPlan: fullPlan.plan,
  storyPlan: Brain.storyFromPlan(fullPlan.plan, { yearGroup: "Year 4", topic: "Gravity" })
});
bareApply = Brain.accept({
  subject: "Science",
  topic: "Gravity",
  yearGroup: "Year 4",
  title: "The drop",
  objectives: ["Explain that gravity pulls objects towards the Earth."],
  activities: stageLesson("").activities.map(function (activity) {
    if (activity.purpose !== "Apply") return activity;
    return { mechanic: "spin", title: "Apply", purpose: "Apply", minutes: 2, why: "Choose", scene: { beat: "application" }, config: { pool: "included", prompt: "Spin for a pupil." } };
  })
}, {
  topic: "Gravity",
  yearGroup: "Year 4",
  requestedMinutes: 15,
  lessonBrief: { concepts: ["gravity"], intent: "explain" },
  lessonPlan: fullPlan.plan,
  storyPlan: Brain.storyFromPlan(fullPlan.plan, { yearGroup: "Year 4", topic: "Gravity" })
});
assert.strictEqual(bareApply.ok, false);
assert.ok((bareApply.issues || []).join(" ").indexOf("does not use the new knowledge") !== -1);

var sciencePlan = Brain.normalisePlan({
  learningObjective: "Explain what causes an earthquake.",
  subject: "Science",
  topic: "causes of earthquakes",
  keyKnowledge: ["The Earth's surface is made of huge pieces.", "The pieces push, stick, and then slip."],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, { subject: "Science", topic: "causes of earthquakes", yearGroup: "Year 1", lessonText: "learn about causes of earthquakes", lessonBrief: { intent: "why", concepts: ["earthquakes"] }, requestedMinutes: 15, pupilCount: 4 }).plan;
var skeleton = Brain.lessonSkeleton(sciencePlan, { subject: "Science", topic: "causes of earthquakes", yearGroup: "Year 1", requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: ["earthquakes"], intent: "why" } });
assert.deepStrictEqual(skeleton.map(function (slot) { return slot.id; }), ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"]);
assert.strictEqual(skeleton[1].mechanic, "story");
assert.strictEqual(skeleton[1].learningInteraction ? skeleton[1].interactionIntent : skeleton[1].interactionIntent, "inspect");
assert.notStrictEqual(skeleton[1].mechanic, "spin");
assert.strictEqual(skeleton[3].mechanic, "story");
assert.strictEqual(skeleton[3].interactionIntent, "move");
assert.notStrictEqual(skeleton[3].mechanic, "spin");
assert.strictEqual(skeleton[1].participantSelection.mode, "random");
assert.notStrictEqual(skeleton[1].participantSelection.mode, skeleton[1].mechanic);
var forced = Brain.accept({
  activities: [
    { mechanic: "spin", purpose: "investigate", scene: { beat: "goal" }, config: { prompt: "Spin for a pupil." } },
    { mechanic: "apply", purpose: "apply", scene: { beat: "application" }, config: { prompt: "Spin for a pupil." } }
  ]
}, { subject: "Science", topic: "causes of earthquakes", yearGroup: "Year 1", requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: ["earthquakes"], intent: "why" }, lessonPlan: sciencePlan, lessonSkeleton: skeleton, storyPlan: Brain.storyFromPlan(sciencePlan, { yearGroup: "Year 1", topic: "causes of earthquakes" }) });
assert.strictEqual(forced.structuralOk, true, (forced.issues || []).join("; "));
assert.strictEqual(forced.previous.activities.length, 7);
assert.strictEqual(forced.previous.activities[1].mechanic, "story");
assert.strictEqual(forced.previous.activities[1].slotId, "investigate");
assert.strictEqual(forced.previous.activities[3].mechanic, "story");
assert.notStrictEqual(forced.previous.activities[3].mechanic, "quiz");
assert.strictEqual(forced.previous.activities.filter(function (activity) { return activity.mechanic === "quiz"; }).length, 1);
assert.ok(forced.previous.activities.findIndex(function (activity) { return activity.slotId === "resolution"; }) > forced.previous.activities.findIndex(function (activity) { return activity.slotId === "check"; }));
assert.ok(forced.previous.activities.findIndex(function (activity) { return activity.slotId === "recap"; }) > forced.previous.activities.findIndex(function (activity) { return activity.slotId === "resolution"; }));
var maths = Brain.lessonSkeleton({ subject: "Maths", topic: "equivalent fractions", keyKnowledge: ["One half matches two quarters.", "Equivalent fractions name the same amount."], lessonArc: [] }, { subject: "Maths", requestedMinutes: 15 });
assert.strictEqual(maths[1].interactionIntent, "compare");
assert.strictEqual(maths[3].interactionIntent, "match");
var budgetSum = skeleton.reduce(function (sum, slot) { return sum + slot.minutes; }, 0);
assert.ok(budgetSum >= 12 && budgetSum <= 18);
assert.strictEqual(skeleton[0].minimumParticipation, 1);
assert.ok(skeleton[2].contentDepth);
assert.ok(skeleton[3].requiredKnowledge.length >= 1);
var older = Brain.lessonSkeleton(sciencePlan, { subject: "Science", topic: "causes of earthquakes", yearGroup: "Year 4", requestedMinutes: 15, pupilCount: 4 });
assert.strictEqual(older[2].minimumParticipation, 2);

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
function acceptSlots(subject, topic, year, knowledge, apply, intent) {
  var plan = Brain.normalisePlan({
    learningObjective: knowledge[0],
    subject: subject,
    topic: topic,
    keyKnowledge: knowledge,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, { subject: subject, topic: topic, yearGroup: year, requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: [], intent: intent || "explain" }, lessonText: topic }).plan;
  var frame = { subject: subject, topic: topic, yearGroup: year, requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: [], intent: intent || "explain" }, lessonPlan: plan };
  frame.lessonSkeleton = Brain.lessonSkeleton(plan, frame);
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  return Brain.accept({ title: topic + " mission", objectives: [knowledge[0]], slots: filledSlots(knowledge, apply) }, frame);
}
var adjectiveKnowledge = ["Adjectives are words that describe nouns.", "Adjectives add detail to a sentence."];
var adjectivePass = acceptSlots("English", "adjectives", "Year 3", adjectiveKnowledge, {
  instruction: "Sort these words into adjectives and words that are not adjectives.",
  knowledgeUsed: "Adjectives describe nouns.",
  successCondition: "The adjectives are in one set and the other words are in the other set.",
  teachingConnection: "The sort uses the idea that adjectives describe nouns."
});
assert.strictEqual(adjectivePass.ok, true, (adjectivePass.issues || []).join("; "));
assert.strictEqual(adjectivePass.adventure.activities[3].learningInteraction.type, "sort");
var adjectiveFail = acceptSlots("English", "adjectives", "Year 3", adjectiveKnowledge, { instruction: "Sort the cards.", knowledgeUsed: "Sort the cards." });
assert.strictEqual(adjectiveFail.ok, false);
assert.strictEqual(adjectiveFail.structuralOk, true);
assert.ok((adjectiveFail.issues || []).join(" ").indexOf("does not use the taught knowledge") !== -1);
assert.ok((adjectiveFail.slotIds || []).indexOf("apply") !== -1);
var romanKnowledge = ["The Romans came to Britain because they wanted its metals and farmland.", "Those reasons explain why the Romans came to Britain."];
var romanFail = acceptSlots("History", "Romans", "Year 4", romanKnowledge, { instruction: "Put these events in order." }, "why");
assert.strictEqual(romanFail.structuralOk, true);
assert.ok((romanFail.issues || []).join(" ").indexOf("apply slot") !== -1);
var romanPass = acceptSlots("History", "Romans", "Year 4", romanKnowledge, {
  instruction: "Use the evidence to identify which reasons explain why the Romans wanted Britain.",
  knowledgeUsed: "Those reasons explain why the Romans came to Britain.",
  successCondition: "The pupil has chosen the reasons that explain why the Romans wanted Britain.",
  teachingConnection: "The task uses the reasons the class has just learned."
}, "why");
assert.strictEqual(romanPass.ok, true, (romanPass.issues || []).join("; "));
assert.strictEqual(romanPass.adventure.activities[3].learningInteraction.type, "sequence");
var weatherKnowledge = ["Weather is the day-to-day state of the atmosphere.", "Climate is the average weather over a long period."];
var weatherPass = acceptSlots("Geography", "weather and climate", "Year 2", weatherKnowledge, {
  instruction: "Sort these examples into weather or climate.",
  knowledgeUsed: "Weather is short term and climate is a long-term pattern.",
  successCondition: "Each example sits with weather or with climate.",
  teachingConnection: "The sort uses the difference between weather and climate."
}, "compare");
assert.strictEqual(weatherPass.ok, true, (weatherPass.issues || []).join("; "));
assert.strictEqual(weatherPass.adventure.activities[1].learningInteraction.type, "compare");
assert.strictEqual(weatherPass.adventure.activities[3].learningInteraction.type, "sort");
var weatherFail = acceptSlots("Geography", "weather and climate", "Year 2", weatherKnowledge, { instruction: "Sort the cards." }, "compare");
assert.strictEqual(weatherFail.ok, false);
assert.ok((weatherFail.slotIds || []).indexOf("apply") !== -1);
var platePass = acceptSlots("Science", "causes of earthquakes", "Year 1", ["Huge pieces called plates cause earthquakes.", "The plates push, stick, and then slip."], {
  instruction: "Move the plate model until the pieces stick and then slip.",
  knowledgeUsed: "The plates push, stick, and then slip.",
  successCondition: "The plates have slipped and the ground has shaken.",
  teachingConnection: "The move uses the plate idea just taught."
}, "why");
assert.strictEqual(platePass.ok, true, (platePass.issues || []).join("; "));
assert.strictEqual(platePass.adventure.activities[1].learningInteraction.type, "inspect");
assert.strictEqual(platePass.adventure.activities[3].learningInteraction.type, "move");
var fractionPass = acceptSlots("Maths", "equivalent fractions", "Year 4", ["One half matches two quarters.", "Equivalent fractions name the same amount."], {
  instruction: "Match the fractions that name the same amount.",
  knowledgeUsed: "Equivalent fractions name the same amount.",
  successCondition: "Each fraction is matched to one that names the same amount.",
  teachingConnection: "The match uses equivalent fractions."
});
assert.strictEqual(fractionPass.ok, true, (fractionPass.issues || []).join("; "));
assert.strictEqual(fractionPass.adventure.activities[1].learningInteraction.type, "compare");
assert.strictEqual(fractionPass.adventure.activities[3].learningInteraction.type, "match");
var shortPlan = Brain.normalisePlan({
  learningObjective: "Explain why the Romans came to Britain.",
  subject: "History",
  topic: "Romans",
  keyKnowledge: romanKnowledge,
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, { subject: "History", topic: "Romans", yearGroup: "Year 4", requestedMinutes: 15, pupilCount: 4, lessonBrief: { intent: "why", concepts: ["romans"] }, lessonText: "teach why the Romans came to Britain" }).plan;
var shortFrame = { subject: "History", topic: "Romans", yearGroup: "Year 4", requestedMinutes: 15, pupilCount: 4, lessonPlan: shortPlan, lessonBrief: { intent: "why", concepts: ["romans"] } };
shortFrame.lessonSkeleton = Brain.lessonSkeleton(shortPlan, shortFrame);
shortFrame.storyPlan = Brain.storyFromPlan(shortPlan, shortFrame);
var shortLesson = filledSlots(romanKnowledge, {
  instruction: "Use the evidence to identify which reasons explain why the Romans wanted Britain.",
  knowledgeUsed: "Those reasons explain why the Romans came to Britain.",
  successCondition: "The pupil has chosen the reasons that explain why the Romans wanted Britain.",
  teachingConnection: "The task uses the reasons the class has just learned."
});
shortLesson.teach = { lines: ["Romans."] };
var shortAccept = Brain.accept({ title: "Roman mission", objectives: [romanKnowledge[0]], slots: shortLesson }, shortFrame);
assert.strictEqual(shortAccept.ok, false);
assert.ok((shortAccept.slotIds || []).indexOf("teach") !== -1);
assert.ok((shortAccept.issues || []).join(" ").indexOf("enough participation") !== -1);
var repair = Brain.slotRepairBrief(shortFrame, ["apply"], ["The apply slot does not use the taught knowledge."], shortAccept.previous);
assert.ok(repair.user.indexOf("MUST require the pupil to use this knowledge") !== -1);
assert.ok(repair.user.indexOf("cannot change") !== -1);
assert.strictEqual(repair.user.indexOf("Activity 4"), -1);
var durationRepair = Brain.slotRepairBrief(shortFrame, ["teach"], ["The teach slot does not have enough participation for its time."], shortAccept.previous);
assert.ok(durationRepair.user.indexOf("minimumParticipation") !== -1);
assert.ok(durationRepair.user.indexOf("long paragraph") !== -1);
var applyRepairBrief = JSON.parse(repair.user);
var applySpec = applyRepairBrief.slotsToRewrite[0];
assert.strictEqual(applySpec.slotType, "APPLY");
assert.strictEqual(applySpec.subject, "History");
assert.strictEqual(applySpec.year, "Year 4");
assert.ok(applySpec.requiredKnowledge.length >= 1);
assert.strictEqual(applySpec.interactionFamily, "sequence");
assert.ok(applySpec.originalInstruction);
assert.ok(applySpec.failure.join(" ").indexOf("apply slot") !== -1);
assert.ok(applySpec.output.knowledgeUsed === "");
assert.ok(Object.prototype.hasOwnProperty.call(applySpec.output, "successCondition"));
assert.ok(Object.prototype.hasOwnProperty.call(applySpec.output, "teachingConnection"));
var kept = {
  title: "Kept mission",
  slots: {
    hook: { lines: ["The ground starts to rumble in the town."] },
    investigate: { lines: ["Look at the place where the pieces meet before anyone explains it."], instruction: "Look where the pieces meet." },
    teach: { lines: ["The Earth's surface is made of huge pieces called plates.", "The plates push, stick, and then slip."] },
    apply: { instruction: "Sort the cards.", knowledgeUsed: "Sort the cards." },
    check: { prompt: "Why does the ground shake?", choices: ["The plates slip.", "The wind blows."], correct: "The plates slip.", explain: "The plates slip after they were stuck." },
    resolution: { lines: ["The class can leave once the shaking is understood."] },
    recap: { lines: ["The plates push, stick, and then slip."] }
  }
};
var merged = Brain.mergeSlotContent(kept, { slots: { apply: { instruction: "Move the plates until they stick and then slip.", knowledgeUsed: "The plates push, stick, and then slip.", successCondition: "The plates have slipped.", teachingConnection: "The move uses the plate idea.", target: "model" } } });
["hook", "investigate", "teach", "check", "resolution", "recap"].forEach(function (id) {
  assert.deepStrictEqual(merged.slots[id].lines, kept.slots[id].lines || []);
  if (kept.slots[id].prompt) assert.strictEqual(merged.slots[id].prompt, kept.slots[id].prompt);
  if (kept.slots[id].correct) assert.strictEqual(merged.slots[id].correct, kept.slots[id].correct);
});
assert.strictEqual(merged.slots.apply.instruction, "Move the plates until they stick and then slip.");
assert.notStrictEqual(merged.slots.apply.instruction, kept.slots.apply.instruction);
var produced = acceptSlots("English", "adjectives", "Year 3", adjectiveKnowledge, {
  instruction: "Write three sentences using adjectives.",
  knowledgeUsed: "Adjectives add detail to a sentence.",
  successCondition: "Sentences include at least one adjective each.",
  teachingConnection: "This task uses adjectives to enhance sentences."
});
assert.strictEqual(produced.ok, true, (produced.issues || []).join("; "));
var drawn = acceptSlots("Science", "volcanoes", "Year 3", ["A volcano has a magma chamber, which holds molten rock.", "When pressure builds up, magma rises through the vent and erupts."], {
  instruction: "Draw a diagram that shows the magma chamber and the vent of a volcano.",
  knowledgeUsed: "A volcano has a magma chamber, which holds molten rock.",
  successCondition: "The diagram shows the magma chamber and vent clearly labeled.",
  teachingConnection: "This task uses the magma chamber just taught."
});
assert.strictEqual(drawn.ok, true, (drawn.issues || []).join("; "));
var created = acceptSlots("Maths", "equivalent fractions", "Year 4", ["Fractions represent parts of a whole.", "Equivalent fractions are different fractions that represent the same amount."], {
  instruction: "Create two equivalent fractions using numbers of your choice.",
  knowledgeUsed: "Equivalent fractions are different fractions that represent the same amount.",
  successCondition: "The pupil shows two fractions that are equivalent.",
  teachingConnection: "This task uses equivalent fractions."
});
assert.strictEqual(created.ok, true, (created.issues || []).join("; "));
var bareNamed = acceptSlots("English", "adjectives", "Year 3", adjectiveKnowledge, {
  instruction: "Sort the cards.",
  knowledgeUsed: "Adjectives describe nouns.",
  successCondition: "The cards have been sorted.",
  teachingConnection: "The sort follows the teaching."
});
assert.strictEqual(bareNamed.ok, false);
assert.ok((bareNamed.issues || []).join(" ").indexOf("does not use the taught knowledge") !== -1);
var recallApply = acceptSlots("English", "adjectives", "Year 3", adjectiveKnowledge, {
  instruction: "What is an adjective?",
  knowledgeUsed: "Adjectives describe nouns.",
  successCondition: "The pupil says the definition.",
  teachingConnection: "This recalls the definition."
});
assert.ok((recallApply.issues || []).join(" ").indexOf("asks for recall") !== -1);
var spinApply = acceptSlots("English", "adjectives", "Year 3", adjectiveKnowledge, {
  instruction: "Choose a pupil to have a turn.",
  knowledgeUsed: "Adjectives describe nouns.",
  successCondition: "A pupil is chosen.",
  teachingConnection: "A pupil is selected."
});
assert.ok((spinApply.issues || []).join(" ").indexOf("selects a pupil") !== -1);
var openingIssue = "The opening states the explanation before the class has investigated.";
var applyIssue = "The apply slot does not use the taught knowledge.";
var checkIssue = "The correct answer is the effect, not the cause.";
var routed = JSON.parse(Brain.slotRepairBrief(shortFrame, ["hook", "apply", "check"], [openingIssue, applyIssue, checkIssue], shortAccept.previous).user);
var routedHook = routed.slotsToRewrite.filter(function (spec) { return spec.slotType === "HOOK"; })[0];
var routedApply = routed.slotsToRewrite.filter(function (spec) { return spec.slotType === "APPLY"; })[0];
var routedCheck = routed.slotsToRewrite.filter(function (spec) { return spec.slotType === "CHECK"; })[0];
assert.deepStrictEqual(routedHook.failure, [openingIssue]);
assert.deepStrictEqual(routedApply.failure, [applyIssue]);
assert.deepStrictEqual(routedCheck.failure, [checkIssue]);
assert.ok(routed.instruction.indexOf("Those failure texts are the reason that slot must change.") !== -1);
assert.ok(openingIssue.indexOf("hook") === -1);
var spoiledSlots = filledSlots(romanKnowledge, {
  instruction: "Draw a picture of something the Romans wanted from Britain.",
  knowledgeUsed: "The Romans came to Britain because they wanted its metals and farmland.",
  successCondition: "The drawing shows metals or farmland.",
  teachingConnection: "The drawing uses a reason the Romans came."
});
spoiledSlots.hook = { lines: ["The Romans came to Britain because they wanted its metals and farmland."] };
var spoiledFrame = { subject: "History", topic: "Romans", yearGroup: "Year 4", requestedMinutes: 15, pupilCount: 4, lessonBrief: { concepts: ["romans"], intent: "why" }, lessonText: "teach why the Romans came to Britain", lessonPlan: shortPlan };
spoiledFrame.lessonSkeleton = Brain.lessonSkeleton(shortPlan, spoiledFrame);
spoiledFrame.storyPlan = Brain.storyFromPlan(shortPlan, spoiledFrame);
var spoiledAccept = Brain.accept({ title: "Roman mission", objectives: [romanKnowledge[0]], slots: spoiledSlots }, spoiledFrame);
assert.ok((spoiledAccept.slotIds || []).indexOf("hook") !== -1);
assert.ok((spoiledAccept.issues || []).indexOf(openingIssue) !== -1);
assert.ok((spoiledAccept.slotIssues.hook || []).indexOf(openingIssue) !== -1);
var spoiledRepair = JSON.parse(Brain.slotRepairBrief(spoiledFrame, spoiledAccept.slotIds, spoiledAccept.issues, spoiledAccept.previous).user);
var spoiledHook = spoiledRepair.slotsToRewrite.filter(function (spec) { return spec.slotType === "HOOK"; })[0];
assert.ok(spoiledHook);
assert.ok(spoiledHook.failure.indexOf(openingIssue) !== -1);
spoiledRepair.slotsToRewrite.forEach(function (spec) {
  if (spec.slotType !== "HOOK") assert.ok(spec.failure.indexOf(openingIssue) === -1);
});

var creator = fs.readFileSync(path.join(__dirname, "../schools/learn/creator.js"), "utf8");
assert.ok(creator.indexOf("Key knowledge.") !== -1);
assert.ok(creator.indexOf("yearAssumption") !== -1);
assert.ok(creator.indexOf("Objective.") !== -1);
assert.strictEqual(creator.indexOf("qualityChecklist"), -1);

console.log("lesson quality tests passed");
