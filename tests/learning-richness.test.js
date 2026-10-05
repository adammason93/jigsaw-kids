"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var Mechanics = require("../schools/learn/lesson-mechanics.js");
var Creator = require("../schools/learn/creator-core.js");

function ctxFor(year, subject, ask, goal, extra) {
  return Object.assign({
    yearGroup: year,
    subject: subject,
    lessonText: ask,
    topic: goal,
    requestedMinutes: 15,
    pupilCount: 4,
    lessonBrief: {
      intent: "process",
      rawRequest: ask,
      learningGoal: goal,
      teacherIntent: { ok: true, learningGoal: goal, requiredEvidence: "The pupil explains " + goal.replace(/^Understand /, "").replace(/\.$/, "") + "." }
    }
  }, extra || {});
}

function normalised(year, subject, ask, goal, knowledge, extra) {
  return Brain.normalisePlan({
    learningObjective: goal,
    subject: subject,
    topic: goal,
    keyKnowledge: knowledge,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  }, ctxFor(year, subject, ask, goal, extra));
}

function slotOf(slots, id) {
  return slots.filter(function (slot) { return slot.id === id; })[0] || { beats: [] };
}

function itemFor(items, beat) {
  var ref = (beat.knowledgeRefs || [])[0];
  return items.filter(function (entry) { return entry.id === ref; })[0] || items[0];
}

function speak(beat, items) {
  var item = itemFor(items, beat);
  var known = String(item.text || "").replace(/[.?!]$/, "");
  var text = {
    notice: "Look at the scene and say what you can see.",
    predict: "Say what you think is happening before the explanation.",
    name: "The class gives this idea its own name now.",
    explain: item.text,
    exemplify: "For example, you can see it when " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    model: "First follow this step: " + known.charAt(0).toLowerCase() + known.slice(1) + ", then check what changed.",
    compare: "Look at both sides and say what is different.",
    connect: "These two ideas belong together in this lesson.",
    practise: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    apply: "Show a new case where " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    reveal: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    consolidate: "So, " + known.charAt(0).toLowerCase() + known.slice(1) + "."
  }[beat.move];
  return { id: beat.id, cue: "", text: text };
}

function bodyFor(slots, items) {
  var body = {};
  slots.forEach(function (slot) {
    var beats = (slot.beats || []).map(function (beat) { return speak(beat, items); });
    if (slot.id === "apply") {
      body.apply = { beats: beats, instruction: beats[0].text, target: "scene", successCondition: "The pupil has used the taught idea in the task.", teachingConnection: "The task follows the idea the class just learned." };
    } else if (slot.id === "check") {
      var retrieves = slot.beats.filter(function (beat) { return beat.move === "retrieve"; });
      var questions = retrieves.map(function (beat, index) {
        var answer = itemFor(items, beat).text;
        return {
          id: beat.id,
          prompt: "Which sentence matches taught idea number " + (index + 1) + "?",
          choices: [answer, "A different idea that was not part of this lesson."],
          correct: answer,
          explain: "That sentence matches the idea the class has just learned.",
          successEvidence: "The pupil chose the taught idea.",
          teachingConnection: "The question follows the taught idea."
        };
      });
      body.check = questions.length > 1 ? { beats: beats, questions: questions } : Object.assign({ beats: beats }, questions[0]);
    } else body[slot.id] = { beats: beats };
  });
  return body;
}

function frameFor(plan, ctx, slots) {
  var frame = Object.assign({}, ctx, { lessonPlan: plan, lessonSkeleton: slots });
  frame.storyPlan = Brain.storyFromPlan(plan, frame);
  return frame;
}

function judged(raw, frame, verdictAt) {
  var seen = [];
  var repaired = null;
  return Brain.resolveLessonContent(raw, frame, {
    judge: function () { return { ok: true, relationship: "apply", reason: "The task uses the idea.", ms: 1 }; },
    checkJudge: function (input) {
      var index = seen.length;
      seen.push(input);
      var coverage = verdictAt ? verdictAt(index) : "sufficient";
      return { ok: true, coverage: coverage, reason: "Judged.", demonstratedEvidence: input.requiredEvidence, ms: 1 };
    },
    repair: function (failed) {
      repaired = (failed.slotIds || []).slice();
      return raw;
    }
  }).then(function (result) {
    return { result: result, seen: seen, repaired: repaired };
  });
}

var fixtures = [
  {
    name: "Y1 Science sharks",
    year: "Year 1", subject: "Science",
    ask: "How do sharks' bodies help them swim?",
    goal: "Understand how sharks' bodies help them swim.",
    knowledge: [
      "Sharks have rows of sharp teeth.",
      "A shark's streamlined body reduces water resistance, helping it swim more easily.",
      "A shark's streamlined shape reduces drag, helping it swim faster.",
      "A shark's tail pushes backwards, helping it swim forward."
    ],
    budget: 2,
    peripheral: ["Sharks have rows of sharp teeth.", "A shark's streamlined shape reduces drag, helping it swim faster."],
    leakWord: "teeth"
  },
  {
    name: "Y2 Science plants",
    year: "Year 2", subject: "Science",
    ask: "How do plants get what they need to grow?",
    goal: "Understand how plants get what they need to grow.",
    knowledge: [
      "Flowers look bright in summer.",
      "Roots take in water, which helps a plant grow.",
      "Leaves take in light, which helps a plant grow."
    ],
    budget: 2,
    peripheral: ["Flowers look bright in summer."],
    leakWord: "summer"
  },
  {
    name: "Y3 English adjectives",
    year: "Year 3", subject: "English",
    ask: "How do adjectives make writing more descriptive?",
    goal: "Understand how adjectives make writing more descriptive.",
    knowledge: [
      "A noun is a naming word.",
      "An adjective adds detail to a noun so that the writing tells the reader more.",
      "A precise adjective changes the picture so that the writing shows a clearer scene.",
      "Using two adjectives changes the writing so that it describes more than one feature."
    ],
    budget: 3,
    peripheral: ["A noun is a naming word."],
    leakWord: "naming"
  },
  {
    name: "Y4 History Great Fire",
    year: "Year 4", subject: "History",
    ask: "Why did the Great Fire of London spread so quickly?",
    goal: "Understand why the Great Fire of London spread so quickly.",
    knowledge: [
      "The Great Fire happened in 1666.",
      "The fire spread quickly because the wooden houses stood close together.",
      "The fire spread quickly because a strong wind carried the flames.",
      "The fire spread quickly because the streets were very narrow."
    ],
    budget: 3,
    peripheral: ["The Great Fire happened in 1666."],
    leakWord: "1666"
  },
  {
    name: "Y5 Geography rivers",
    year: "Year 5", subject: "Geography",
    ask: "How do rivers change the landscape?",
    goal: "Understand how rivers change the landscape.",
    knowledge: [
      "Fish live in many rivers.",
      "A fast river cuts into the rock, which makes the landscape deeper.",
      "A river carries stones away, which changes the landscape.",
      "A slow river drops mud, which makes the landscape wider.",
      "A flooding river spreads water, which changes the landscape beside it."
    ],
    budget: 4,
    peripheral: ["Fish live in many rivers."],
    leakWord: "fish"
  },
  {
    name: "Y6 Science circulation",
    year: "Year 6", subject: "Science",
    ask: "How does the circulatory system transport materials around the body?",
    goal: "Understand how the circulatory system transports materials around the body.",
    knowledge: [
      "The heart is found in the chest.",
      "The heart pumps blood so that materials move around the body.",
      "Blood carries oxygen so that the body receives materials.",
      "Blood vessels carry materials around the body because they are the routes.",
      "Blood takes waste away so that the body does not keep harmful materials."
    ],
    budget: 4,
    peripheral: ["The heart is found in the chest."],
    leakWord: "chest"
  }
];

function runFixture(fixture) {
  var ctx = ctxFor(fixture.year, fixture.subject, fixture.ask, fixture.goal);
  var made = normalised(fixture.year, fixture.subject, fixture.ask, fixture.goal, fixture.knowledge);
  assert.strictEqual(made.ok, true, fixture.name + ": " + (made.issues || []).join("; "));
  var plan = made.plan;
  var tag = fixture.name + ": ";

  assert.strictEqual(plan.keyKnowledge.length, fixture.budget, tag + "relationship budget");
  assert.strictEqual(plan.learningMap.length, fixture.budget, tag + "flat knowledge becomes a learning map");
  fixture.peripheral.forEach(function (text) {
    assert.strictEqual(plan.keyKnowledge.indexOf(text), -1, tag + "peripheral or paraphrase admitted: " + text);
    assert.ok(plan.droppedKnowledge.indexOf(text) !== -1, tag + "peripheral or paraphrase not dropped: " + text);
  });
  var lowered = plan.keyKnowledge.map(function (text) { return text.toLowerCase(); });
  assert.strictEqual(new Set(lowered).size, lowered.length, tag + "duplicate knowledge");

  var slots = Brain.planBeats(Brain.lessonSkeleton(plan, ctx), plan, fixture.year);
  var items = Brain.beatKnowledge(plan, fixture.year);
  assert.deepStrictEqual(slots.map(function (slot) { return slot.id; }), ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"], tag + "seven stages");
  assert.deepStrictEqual(Brain.beatProblems(slots), [], tag + "beat order problems");

  var teach = slotOf(slots, "teach").beats;
  var explained = {};
  items.forEach(function (item) {
    var nameAt = -1;
    var explainAt = -1;
    teach.forEach(function (beat, index) {
      if (beat.knowledgeRefs[0] !== item.id) return;
      if (beat.move === "name" && nameAt === -1) nameAt = index;
      if (beat.move === "explain" && explainAt === -1) explainAt = index;
    });
    assert.ok(nameAt !== -1 && explainAt > nameAt, tag + item.id + " needs name then explain");
    explained[item.id] = true;
  });
  assert.ok(teach.length <= fixture.budget * 2, tag + "teach beat budget");

  var apply = slotOf(slots, "apply").beats;
  assert.strictEqual(apply.length, 1, tag + "one apply task");
  assert.strictEqual(apply[0].knowledgeRefs.length, 1, tag + "apply uses one relationship");
  assert.ok(explained[apply[0].knowledgeRefs[0]], tag + "apply uses a taught relationship");

  var check = slotOf(slots, "check").beats;
  assert.strictEqual(check.length, fixture.budget, tag + "question budget");
  check.forEach(function (beat) {
    assert.strictEqual(beat.move, "retrieve");
    assert.strictEqual(beat.knowledgeRefs.length, 1, tag + "one ref per question");
    assert.ok(explained[beat.knowledgeRefs[0]], tag + "question ref was taught");
  });
  assert.deepStrictEqual(check.map(function (beat) { return beat.knowledgeRefs[0]; }), items.map(function (item) { return item.id; }), tag + "every relationship assessed");

  var recapRefs = [];
  slotOf(slots, "recap").beats.forEach(function (beat) {
    assert.strictEqual(beat.move, "consolidate");
    beat.knowledgeRefs.forEach(function (ref) { recapRefs.push(ref); });
  });
  recapRefs.forEach(function (ref) { assert.ok(explained[ref], tag + "recap ref was taught"); });
  assert.deepStrictEqual(recapRefs.slice().sort(), Object.keys(explained).sort(), tag + "recap covers every taught relationship");
  var yearNumber = Number(fixture.year.replace(/\D/g, ""));
  assert.strictEqual(slotOf(slots, "recap").beats.length, yearNumber >= 4 ? 1 : fixture.budget, tag + "recap shape for year");

  var brief = Brain.contentBrief(frameFor(plan, ctx, slots), plan, null);
  var checkSchema = brief.schema.properties.slots.properties.check.properties.questions;
  assert.ok(checkSchema, tag + "check schema asks for a question list");
  assert.strictEqual(checkSchema.minItems, fixture.budget);
  assert.strictEqual(checkSchema.maxItems, fixture.budget);
  fixture.peripheral.forEach(function (text) {
    assert.strictEqual(brief.user.indexOf(text), -1, tag + "dropped knowledge sent to the model");
  });

  var raw = { title: fixture.name, objectives: [fixture.goal], slots: bodyFor(slots, items) };
  var frame = frameFor(plan, ctx, slots);
  var accepted = Brain.accept(raw, Object.assign({}, frame, { applySemantic: { relationship: "apply", reason: "The task uses the idea." }, checkSemantics: check.map(function () { return { coverage: "sufficient" }; }) }));
  assert.strictEqual(accepted.ok, true, tag + (accepted.issues || []).join(" | "));
  var quiz = accepted.adventure.activities.filter(function (activity) { return activity.slotId === "check"; })[0];
  assert.strictEqual(quiz.config.questions.length, fixture.budget, tag + "every question materialised");
  assert.deepStrictEqual(quiz.config.questions.map(function (item) { return item.id; }), check.map(function (beat) { return beat.id; }), tag + "question ids follow planned beats");
  assert.deepStrictEqual(quiz.config.questions.map(function (item) { return item.knowledgeChecked; }), items.map(function (item) { return item.text; }), tag + "each question checks its ref");
  assert.ok(quiz.minutes >= fixture.budget, tag + "check minutes grow with its questions");

  var recapLines = accepted.adventure.activities.filter(function (activity) { return activity.slotId === "recap"; })[0].config.lines.join(" ").toLowerCase();
  plan.droppedKnowledge.forEach(function (text) {
    assert.strictEqual(recapLines.indexOf(text.toLowerCase()), -1, tag + "recap repeats dropped knowledge");
  });

  var client = Brain.accept(JSON.parse(JSON.stringify(accepted.adventure)), Brain.contextFrom({
    source: { text: fixture.ask }, year: fixture.year, subject: fixture.subject, topic: fixture.goal,
    title: "", goals: [], targetMinutes: 15, playMode: "whole_class"
  }, { pupilCount: 4, availableMechanics: Creator.capabilities(Mechanics).map(function (item) { return item.id; }) }));
  var clientQuiz = (client.adventure || accepted.adventure).activities.filter(function (activity) { return activity.slotId === "check"; })[0];
  assert.strictEqual(clientQuiz.config.questions.length, fixture.budget, tag + "client re-accept keeps every question");
  var slides = Creator.slidesFor({ activities: accepted.adventure.activities });
  var quizSlide = slides.filter(function (slide) { return slide.type === "question"; })[0];
  assert.strictEqual(quizSlide.questions.length, fixture.budget, tag + "player receives every question");

  var leaking = JSON.parse(JSON.stringify(raw));
  var lastQuestion = leaking.slots.check.questions[leaking.slots.check.questions.length - 1];
  lastQuestion.correct = "It is about " + fixture.leakWord + " in the lesson.";
  lastQuestion.choices = [lastQuestion.correct, "A different idea that was not part of this lesson."];
  var leaked = Brain.accept(leaking, Object.assign({}, frame, { applySemantic: { relationship: "apply", reason: "The task uses the idea." }, checkSemantics: check.map(function () { return { coverage: "sufficient" }; }) }));
  assert.strictEqual(leaked.ok, false, tag + "dropped knowledge in the last question must fail");
  assert.ok((leaked.issues || []).indexOf("The check scores knowledge that was not taught.") !== -1, tag + (leaked.issues || []).join(" | "));

  return judged(raw, frame).then(function (pass) {
    assert.strictEqual(pass.result.ok, true, tag + (pass.result.issues || []).join(" | "));
    assert.strictEqual(pass.seen.length, fixture.budget, tag + "judge runs once per question");
    pass.seen.forEach(function (input, index) {
      assert.strictEqual(input.prompt, raw.slots.check.questions[index].prompt, tag + "judge saw question " + index);
      assert.ok(input.correct && raw.slots.check.questions[index].correct.indexOf(input.correct) === 0, tag + "judge saw answer " + index);
      assert.strictEqual(input.requiredEvidence, items[index].text, tag + "evidence follows ref " + index);
    });
    assert.strictEqual(pass.repaired, null, tag + "no repair on a passing check");
    var last = fixture.budget - 1;
    return judged(raw, frame, function (index) { return index === last ? "unrelated" : "sufficient"; });
  }).then(function (fail) {
    assert.ok(fail.seen.length >= fixture.budget, tag + "every question judged before deciding");
    assert.deepStrictEqual(fail.repaired, ["check"], tag + "a failing last question repairs only the check slot");
  });
}

var shallow = normalised("Year 1", "Science", "How do sharks' bodies help them swim?", "Understand how sharks' bodies help them swim.", [
  "A shark's streamlined body reduces water resistance, helping it swim more easily.",
  "A shark's streamlined shape reduces drag, helping it swim faster.",
  "Sharks have rows of sharp teeth."
]);
assert.strictEqual(shallow.ok, false);
assert.ok((shallow.issues || []).indexOf("The lesson plan needs the key knowledge.") !== -1);

var settled = normalised("Year 1", "Science", "How do sharks' bodies help them swim?", "Understand how sharks' bodies help them swim.", [
  "A shark's streamlined body reduces water resistance, helping it swim more easily.",
  "A shark's streamlined shape reduces drag, helping it swim faster.",
  "Sharks have rows of sharp teeth."
], { breadthSettled: true });
assert.strictEqual(settled.ok, true, (settled.issues || []).join("; "));
assert.deepStrictEqual(settled.plan.keyKnowledge, ["A shark's streamlined body reduces water resistance, helping it swim more easily."]);
assert.ok(settled.plan.droppedKnowledge.indexOf("Sharks have rows of sharp teeth.") !== -1);
var settledSlots = Brain.planBeats(Brain.lessonSkeleton(settled.plan, { yearGroup: "Year 1" }), settled.plan, "Year 1");
assert.strictEqual(slotOf(settledSlots, "check").beats.length, 1);

var settledNone = normalised("Year 1", "Science", "How do sharks' bodies help them swim?", "Understand how sharks' bodies help them swim.", [
  "Sharks have rows of sharp teeth.",
  "Sharks live in the sea."
], { breadthSettled: true });
assert.strictEqual(settledNone.ok, false);

var narrow = normalised("Year 2", "Science", "Teach children how a plant's roots help it drink.", "Understand how a plant's roots help it drink.", [
  "Leaves are green.",
  "Roots take in water, which helps the plant drink."
]);
assert.strictEqual(narrow.ok, true, (narrow.issues || []).join("; "));
assert.deepStrictEqual(narrow.plan.keyKnowledge, ["Roots take in water, which helps the plant drink."]);

var plain = Brain.normalisePlan({
  learningObjective: "Know the names of the planets in order.",
  subject: "Science",
  topic: "planets",
  keyKnowledge: ["Mercury is the closest planet to the Sun.", "Neptune is the farthest planet from the Sun."],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, { yearGroup: "Year 3", subject: "Science", topic: "planets", lessonBrief: { intent: "explain" } });
assert.strictEqual(plain.ok, true, (plain.issues || []).join("; "));
var plainSlots = Brain.planBeats(Brain.lessonSkeleton(plain.plan, { yearGroup: "Year 3" }), plain.plan, "Year 3");
assert.deepStrictEqual(slotOf(plainSlots, "check").beats.map(function (beat) { return beat.knowledgeRefs[0]; }), ["k1", "k2"]);

var briefText = Brain.planBrief({ lessonBrief: { learningGoal: "Understand how sharks' bodies help them swim." }, yearGroup: "Year 1" }).system;
assert.strictEqual(briefText.indexOf("may use one concise sentence"), -1);
assert.strictEqual(briefText.indexOf("two in Year 1 and Year 2"), -1);
assert.ok(briefText.indexOf("about 5 to 6 points") !== -1);

fixtures.reduce(function (chain, fixture) {
  return chain.then(function () { return runFixture(fixture); });
}, Promise.resolve()).then(function () {
  console.log("learning-richness tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
