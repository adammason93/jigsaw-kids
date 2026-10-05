"use strict";

var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var Mechanics = require("../schools/learn/lesson-mechanics.js");
var Creator = require("../schools/learn/creator-core.js");

var STAGES = ["hook", "investigate", "teach", "apply", "check", "resolution", "recap"];

var fixtures = [
  {
    name: "A Y1 Science shark body",
    year: "Year 1", subject: "Science", minutes: 15, intent: "process",
    ask: "Teach children how a shark's body helps it swim.",
    goal: "Understand how a shark's body helps it swim.",
    map: [
      { id: "p1", knowledge: "A shark has a smooth, pointed body shape.", role: "feature", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "The smooth, pointed shape helps the shark slide through the water easily.", role: "function", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "A shark has a strong tail.", role: "feature", importance: "core", dependsOn: [] },
      { id: "p4", knowledge: "The tail swishes from side to side, which helps push the shark forward so it can swim.", role: "function", importance: "core", dependsOn: ["p3"] },
      { id: "p5", knowledge: "The tail moves side to side, which helps push the shark forward so it can swim.", role: "function", importance: "core", dependsOn: ["p3"] },
      { id: "p6", knowledge: "Fins help the shark steer and stay balanced as it swims.", role: "function", importance: "core", dependsOn: [] },
      { id: "p7", knowledge: "Sharks have rows of sharp teeth.", role: "feature", importance: "supporting", dependsOn: [] },
      { id: "p8", knowledge: "The body shape, the tail and the fins work together so the shark can swim well.", role: "connection", importance: "core", dependsOn: ["p2", "p4", "p6"] }
    ],
    rejected: ["The tail moves side to side, which helps push the shark forward so it can swim.", "Sharks have rows of sharp teeth."],
    chain: ["feature", "function"],
    leakWord: "teeth"
  },
  {
    name: "B Y2 Science plants",
    year: "Year 2", subject: "Science", minutes: 20, intent: "process",
    ask: "Teach children how plants get what they need to grow.",
    goal: "Understand how plants get what they need to grow.",
    map: [
      { id: "p1", knowledge: "Plants need water and light to grow.", role: "foundation", importance: "supporting", dependsOn: [] },
      { id: "p2", knowledge: "Roots grow down into the soil.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "Roots take in water from the soil, which helps the plant grow.", role: "function", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "The stem is like a straw that takes the water up to the leaves.", role: "function", importance: "core", dependsOn: ["p3"] },
      { id: "p5", knowledge: "Leaves are flat and face the light.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p6", knowledge: "Leaves use the light to make food, which helps the plant grow.", role: "cause", importance: "core", dependsOn: ["p5"] },
      { id: "p7", knowledge: "Flowers look bright in summer.", role: "feature", importance: "supporting", dependsOn: [] },
      { id: "p8", knowledge: "The roots, the stem and the leaves work together so the plant can grow.", role: "connection", importance: "core", dependsOn: ["p3", "p4", "p6"] }
    ],
    rejected: ["Flowers look bright in summer."],
    chain: ["feature", "function"],
    leakWord: "summer"
  },
  {
    name: "C Y3 English adjectives",
    year: "Year 3", subject: "English", minutes: 15, intent: "process",
    ask: "Teach children how adjectives make writing more descriptive.",
    goal: "Understand how adjectives make writing more descriptive.",
    map: [
      { id: "p1", knowledge: "A noun is a naming word for a person, place or thing.", role: "foundation", importance: "supporting", dependsOn: [] },
      { id: "p2", knowledge: "An adjective is a word that describes a noun.", role: "concept", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "An adjective has a usual place in a sentence.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p4", knowledge: "An adjective adds detail to a noun so that the writing tells the reader more.", role: "function", importance: "core", dependsOn: ["p2"] },
      { id: "p5", knowledge: "Adjectives add detail to nouns so that writing tells the reader more.", role: "function", importance: "core", dependsOn: ["p2"] },
      { id: "p6", knowledge: "A precise adjective changes the picture so that the writing paints a clearer scene.", role: "effect", importance: "core", dependsOn: ["p4"] },
      { id: "p10", knowledge: "Some adjectives name a feeling, as in a lonely road.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p11", knowledge: "A feeling adjective changes the mood so that the reader knows how the place feels.", role: "effect", importance: "core", dependsOn: ["p10"] },
      { id: "p7", knowledge: "It sits just before the noun, which changes the order of the words.", role: "effect", importance: "core", dependsOn: ["p3"] },
      { id: "p8", knowledge: "Verbs are doing words.", role: "concept", importance: "supporting", dependsOn: [] }
    ],
    rejected: ["Adjectives add detail to nouns so that writing tells the reader more.", "Verbs are doing words."],
    chain: ["function", "effect"],
    leakWord: "verbs"
  },
  {
    name: "D Y4 History Great Fire",
    year: "Year 4", subject: "History", minutes: 15, intent: "why",
    ask: "Teach children why the Great Fire of London spread so quickly and what changed afterwards.",
    goal: "Understand why the Great Fire of London spread so quickly and what changed afterwards.",
    map: [
      { id: "p1", knowledge: "In 1666 a fire started in a bakery on Pudding Lane.", role: "foundation", importance: "supporting", dependsOn: [] },
      { id: "p2", knowledge: "Wooden houses stood close together along narrow streets.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p2b", knowledge: "The fire spread quickly because the wooden houses stood close together.", role: "cause", importance: "core", dependsOn: ["p2"] },
      { id: "p3", knowledge: "A strong wind blew across London that night.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p3b", knowledge: "The wind carried the flames across the gaps, so that the fire reached the next street.", role: "cause", importance: "core", dependsOn: ["p3"] },
      { id: "p4", knowledge: "People had no fire engines that could stop a fire this large.", role: "feature", importance: "core", dependsOn: ["p1"] },
      { id: "p4b", knowledge: "The fire burned thousands of homes because nothing could put the flames out.", role: "cause", importance: "core", dependsOn: ["p4"] },
      { id: "p5", knowledge: "The fire spread fast because houses were wooden and close together.", role: "cause", importance: "core", dependsOn: ["p1"] },
      { id: "p7", knowledge: "London was rebuilt with brick and stone so that a fire could not spread as easily.", role: "effect", importance: "core", dependsOn: ["p4b"] },
      { id: "p8", knowledge: "London had a lot of churches.", role: "foundation", importance: "supporting", dependsOn: [] },
      { id: "p9", knowledge: "Close wooden houses, wind and no fire engines together explain why the fire spread so fast and why London was rebuilt in brick.", role: "connection", importance: "core", dependsOn: ["p2b", "p3b", "p4b"] }
    ],
    rejected: ["The fire spread fast because houses were wooden and close together.", "London had a lot of churches."],
    chain: ["cause", "effect"],
    leakWord: "churches"
  },
  {
    name: "E Y5 Geography rivers",
    year: "Year 5", subject: "Geography", minutes: 15, intent: "process",
    ask: "Teach children how rivers change the landscape.",
    goal: "Understand how rivers change the landscape.",
    map: [
      { id: "p1", knowledge: "A river flows downhill from its source to the sea.", role: "foundation", importance: "supporting", dependsOn: [] },
      { id: "p2", knowledge: "Fast water picks up stones and sand, and then it rubs them against the riverbed.", role: "process", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "This erosion wears away the rock, which changes the landscape by making the valley deeper.", role: "effect", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "The river carries the worn material downstream.", role: "process", importance: "core", dependsOn: ["p1"] },
      { id: "p5", knowledge: "Where the river slows down, it drops mud and sand, which changes the landscape by building new land.", role: "effect", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "On a bend the river wears away the outside bank and drops sand on the inside, which makes the meander grow.", role: "effect", importance: "supporting", dependsOn: ["p1"] },
      { id: "p7", knowledge: "Fish live in many rivers.", role: "foundation", importance: "supporting", dependsOn: [] },
      { id: "p8", knowledge: "Erosion, transport and deposition work together to change the landscape over time.", role: "connection", importance: "core", dependsOn: ["p3", "p4", "p5"] },
      { id: "p9", knowledge: "A deep river valley was carved by a river wearing away rock for thousands of years.", role: "example", importance: "supporting", dependsOn: ["p6"] }
    ],
    rejected: ["Fish live in many rivers."],
    chain: ["process", "effect"],
    leakWord: "fish"
  },
  {
    name: "F Y4 Maths column addition",
    year: "Year 4", subject: "Maths", minutes: 15, intent: "procedure",
    ask: "Teach children how to add two 3-digit numbers using column addition.",
    goal: "Pupils can add two 3-digit numbers using column addition and explain why they carry.",
    map: [
      { id: "p1", knowledge: "Each digit has a place value of hundreds, tens or ones.", role: "foundation", importance: "core", dependsOn: [] },
      { id: "p2", knowledge: "Write the numbers in columns so the ones, tens and hundreds line up.", role: "procedure", importance: "core", dependsOn: ["p1"] },
      { id: "p3", knowledge: "Add the ones column first.", role: "procedure", importance: "core", dependsOn: ["p2"] },
      { id: "p4", knowledge: "If the ones add up to ten or more, carry one ten into the tens column.", role: "procedure", importance: "core", dependsOn: ["p3"] },
      { id: "p5", knowledge: "Then add the tens, including any carried ten, and then the hundreds.", role: "procedure", importance: "core", dependsOn: ["p4"] },
      { id: "p6", knowledge: "We carry because ten ones make one ten, so the total stays the same.", role: "connection", importance: "core", dependsOn: ["p1", "p4"] },
      { id: "p7", knowledge: "For 247 add 135, 7 add 5 makes 12, so write 2 and carry 1 ten.", role: "example", importance: "supporting", dependsOn: ["p4", "p5"] },
      { id: "p8", knowledge: "People in ancient times used an abacus.", role: "foundation", importance: "supporting", dependsOn: [] }
    ],
    rejected: ["People in ancient times used an abacus."],
    chain: ["procedure", "procedure"],
    leakWord: "abacus"
  }
];

function ctxFor(fixture, extra) {
  return Object.assign({
    yearGroup: fixture.year,
    subject: fixture.subject,
    lessonText: fixture.ask,
    topic: fixture.goal,
    requestedMinutes: fixture.minutes,
    pupilCount: 4,
    depthRequired: true,
    lessonBrief: {
      intent: fixture.intent,
      rawRequest: fixture.ask,
      learningGoal: fixture.goal,
      teacherIntent: { ok: true, learningGoal: fixture.goal, requiredEvidence: "The pupil explains " + fixture.goal.replace(/^Understand /, "").replace(/\.$/, "") + "." }
    }
  }, extra || {});
}

function rawFor(fixture, map) {
  return {
    learningObjective: fixture.goal,
    subject: fixture.subject,
    topic: fixture.goal,
    yearGroup: fixture.year,
    learningMap: map || fixture.map,
    lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
  };
}

function slotOf(slots, id) {
  return slots.filter(function (slot) { return slot.id === id; })[0] || { beats: [] };
}

function itemFor(items, beat) {
  var ref = (beat.knowledgeRefs || [])[0];
  return items.filter(function (entry) { return entry.id === ref; })[0] || items[0];
}

function lastLongWord(text) {
  return String(text).split(/\s+/).filter(function (word) { return word.replace(/[^a-z]/gi, "").length >= 5; }).slice(-1)[0].toLowerCase().replace(/[^a-z0-9']/g, "");
}

function speak(beat, items) {
  var item = itemFor(items, beat);
  var known = String(item.text || "").replace(/[.?!]$/, "");
  var text = {
    notice: "Look at the scene and say what you can see.",
    predict: "Say what you think is happening before the explanation.",
    name: item.text,
    explain: "This matters because " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    exemplify: "For example, you can see it when " + known.charAt(0).toLowerCase() + known.slice(1) + ".",
    model: "First follow this step: " + known.charAt(0).toLowerCase() + known.slice(1) + ", then check what changed.",
    compare: "Look at both sides and say what is different.",
    connect: item.text,
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
      var questions = slot.beats.filter(function (beat) { return beat.move === "retrieve"; }).map(function (beat, index) {
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
      return { ok: true, coverage: verdictAt ? verdictAt(index) : "sufficient", reason: "Judged.", demonstratedEvidence: input.requiredEvidence, ms: 1 };
    },
    repair: function (failed) {
      repaired = (failed.slotIds || []).slice();
      return raw;
    }
  }).then(function (result) {
    return { result: result, seen: seen, repaired: repaired };
  });
}

function runFixture(fixture) {
  var tag = fixture.name + ": ";
  var ctx = ctxFor(fixture);
  var made = Brain.normalisePlan(rawFor(fixture), ctx);
  assert.strictEqual(made.ok, true, tag + (made.issues || []).join("; "));
  var plan = made.plan;
  var map = plan.learningMap;
  var budget = Brain.depthBudget(fixture.year, fixture.minutes);
  var ids = map.map(function (item) { return item.id; });
  var byId = {};
  map.forEach(function (item) { byId[item.id] = item; });

  assert.ok(map.length > 2, tag + "richer than two items");
  assert.ok(map.length <= budget.max, tag + "within the depth budget");
  assert.ok(map.filter(function (item) { return item.role !== "example"; }).length >= budget.floor, tag + "meets the depth floor");
  assert.deepStrictEqual(plan.keyKnowledge, map.map(function (item) { return item.knowledge; }), tag + "keyKnowledge mirrors the map");
  assert.deepStrictEqual(ids, map.map(function (item, index) { return "k" + (index + 1); }), tag + "engine ids");
  map.forEach(function (item, index) {
    assert.ok(item.knowledge && item.role && item.importance && Array.isArray(item.dependsOn), tag + item.id + " schema");
    item.dependsOn.forEach(function (dep) {
      assert.ok(ids.indexOf(dep) !== -1 && ids.indexOf(dep) < index, tag + item.id + " depends on an earlier admitted point " + dep);
    });
  });
  var linked = map.filter(function (item) { return item.dependsOn.length; });
  assert.ok(linked.length >= 2, tag + "points are connected, not a list");
  assert.ok(map.some(function (item) {
    return item.role === fixture.chain[1] && item.dependsOn.some(function (dep) { return byId[dep].role === fixture.chain[0]; });
  }), tag + fixture.chain.join(" -> ") + " link");
  fixture.rejected.forEach(function (text) {
    assert.strictEqual(plan.keyKnowledge.indexOf(text), -1, tag + "admitted " + text);
    assert.ok(plan.droppedKnowledge.indexOf(text) !== -1, tag + "not recorded as rejected: " + text);
  });
  assert.ok(plan.mapRejected.every(function (item) { return item.reason; }), tag + "rejections carry a reason");
  var published = Brain.publishPlan ? Brain.publishPlan(plan) : null;
  if (published) {
    assert.strictEqual(published.mapRejected, undefined, tag + "rejections stay internal");
    assert.strictEqual(published.droppedKnowledge, undefined, tag + "dropped knowledge stays internal");
  }

  var slots = Brain.planBeats(Brain.lessonSkeleton(plan, ctx), plan, fixture.year);
  var items = Brain.beatKnowledge(plan, fixture.year);
  assert.deepStrictEqual(slots.map(function (slot) { return slot.id; }), STAGES, tag + "seven stages");
  assert.deepStrictEqual(Brain.beatProblems(slots), [], tag + "beat order problems");
  assert.strictEqual(items.length, map.length, tag + "the whole map reaches the beats");

  var ledger = Brain.taughtLedger(slots);
  ids.forEach(function (id) {
    assert.ok(ledger.at[id], tag + id + " is taught");
    assert.strictEqual(ledger.at[id].stage, "teach", tag + id + " is taught on the teach stage");
  });
  assert.deepStrictEqual(ledger.taught, ids, tag + "teaching follows map order");
  var teach = slotOf(slots, "teach").beats;
  assert.ok(teach.length >= map.length, tag + "teach moves through the map");
  assert.ok(teach.some(function (beat) { return beat.move !== "name"; }), tag + "teaching is not one name per screen");

  var apply = slotOf(slots, "apply").beats;
  assert.strictEqual(apply.length, 1, tag + "one apply task");
  apply[0].knowledgeRefs.forEach(function (ref) {
    assert.ok(ledger.before.apply.indexOf(ref) !== -1, tag + "apply uses taught " + ref);
  });

  var check = slotOf(slots, "check").beats;
  assert.ok(check.length > 1, tag + "several questions");
  assert.ok(check.length <= budget.questions, tag + "question budget");
  check.forEach(function (beat) {
    assert.strictEqual(beat.move, "retrieve");
    assert.strictEqual(beat.knowledgeRefs.length, 1, tag + "one ref per question");
    var ref = beat.knowledgeRefs[0];
    assert.ok(ledger.before.check.indexOf(ref) !== -1, tag + "question checks taught " + ref);
    assert.notStrictEqual(byId[ref].role, "example", tag + "an example is not assessed");
  });
  var checkTexts = check.map(function (beat) { return byId[beat.knowledgeRefs[0]].knowledge; });
  assert.deepStrictEqual(slotOf(slots, "check").requiredKnowledge, checkTexts, tag + "check requires only its refs");

  var recapRefs = [];
  slotOf(slots, "recap").beats.forEach(function (beat) {
    assert.strictEqual(beat.move, "consolidate");
    beat.knowledgeRefs.forEach(function (ref) { recapRefs.push(ref); });
  });
  assert.deepStrictEqual(recapRefs, ledger.taught, tag + "recap covers every taught point in order");
  assert.ok(slotOf(slots, "recap").beats.length > 1, tag + "recap is not one sentence");

  var report = Brain.learningMapReport(plan, slots, ctx);
  if (process.env.MAP_DUMP) console.log(JSON.stringify({ fixture: fixture.name, map: report.learningMap, rejected: report.rejected, budget: report.depthBudget, beats: report.beats.map(function (beat) { return beat.beatId + " " + beat.move + " " + beat.refs.join(","); }) }, null, 1));
  assert.strictEqual(report.learningMapCount, map.length);
  assert.deepStrictEqual(report.learningMapIds, ids);
  assert.deepStrictEqual(report.taughtBeforeCheck, ledger.before.check);
  assert.deepStrictEqual(report.checkRefs, check.map(function (beat) { return beat.knowledgeRefs[0]; }));
  assert.deepStrictEqual(report.recapRefs, ledger.taught);
  assert.ok(report.rejected.length >= fixture.rejected.length, tag + "rejections reported");
  assert.strictEqual(report.depthBudget.max, budget.max);
  assert.deepStrictEqual(Object.keys(report).sort(), ["admitted", "applyRefs", "beats", "checkRefs", "depthBudget", "learningMap", "learningMapCount", "learningMapIds", "recapRefs", "rejected", "taughtBeforeApply", "taughtBeforeCheck", "teacherGoal"].sort(), tag + "bounded report keys");
  assert.ok(JSON.stringify(report).length < 8000, tag + "report stays bounded");

  var brief = Brain.contentBrief(frameFor(plan, ctx, slots), plan, null);
  var checkSchema = brief.schema.properties.slots.properties.check.properties.questions;
  assert.strictEqual(checkSchema.minItems, check.length);
  assert.strictEqual(checkSchema.maxItems, check.length);
  fixture.rejected.forEach(function (text) {
    assert.strictEqual(brief.user.indexOf(text), -1, tag + "rejected knowledge sent to the model");
  });

  var raw = { title: fixture.name, objectives: [fixture.goal], slots: bodyFor(slots, items) };
  var frame = frameFor(plan, ctx, slots);
  var verdicts = { applySemantic: { relationship: "apply", reason: "The task uses the idea." }, checkSemantics: check.map(function () { return { coverage: "sufficient" }; }) };
  var accepted = Brain.accept(raw, Object.assign({}, frame, verdicts));
  assert.strictEqual(accepted.ok, true, tag + (accepted.issues || []).join(" | "));
  var quiz = accepted.adventure.activities.filter(function (activity) { return activity.slotId === "check"; })[0];
  assert.deepStrictEqual(quiz.config.questions.map(function (item) { return item.knowledgeChecked; }), checkTexts, tag + "each question checks its ref");

  var client = Brain.accept(JSON.parse(JSON.stringify(accepted.adventure)), Brain.contextFrom({
    source: { text: fixture.ask }, year: fixture.year, subject: fixture.subject, topic: fixture.goal,
    title: "", goals: [], targetMinutes: fixture.minutes, playMode: "whole_class"
  }, { pupilCount: 4, availableMechanics: Creator.capabilities(Mechanics).map(function (item) { return item.id; }) }));
  var clientQuiz = (client.adventure || accepted.adventure).activities.filter(function (activity) { return activity.slotId === "check"; })[0];
  assert.strictEqual(clientQuiz.config.questions.length, check.length, tag + "client re-accept keeps every question");
  var slides = Creator.slidesFor({ activities: accepted.adventure.activities });
  assert.strictEqual(slides.filter(function (slide) { return slide.type === "question"; })[0].questions.length, check.length, tag + "player receives every question");

  var leaking = JSON.parse(JSON.stringify(raw));
  var lastQuestion = leaking.slots.check.questions[leaking.slots.check.questions.length - 1];
  lastQuestion.correct = "It is about " + fixture.leakWord + " in the lesson.";
  lastQuestion.choices = [lastQuestion.correct, "A different idea that was not part of this lesson."];
  var leaked = Brain.accept(leaking, Object.assign({}, frame, verdicts));
  assert.strictEqual(leaked.ok, false, tag + "rejected knowledge in a question must fail");
  assert.ok((leaked.issues || []).indexOf("The check scores knowledge that was not taught.") !== -1, tag + (leaked.issues || []).join(" | "));

  return judged(raw, frame).then(function (pass) {
    assert.strictEqual(pass.result.ok, true, tag + (pass.result.issues || []).join(" | "));
    assert.strictEqual(pass.seen.length, check.length, tag + "judge runs once per question");
    pass.seen.forEach(function (input, index) {
      assert.strictEqual(input.requiredEvidence, checkTexts[index], tag + "evidence follows ref " + index);
    });
    assert.strictEqual(pass.repaired, null, tag + "no repair on a passing check");
  });
}

var shark = fixtures[0];

var shallow = Brain.normalisePlan(rawFor(shark, shark.map.slice(2, 4)), ctxFor(shark));
assert.strictEqual(shallow.ok, false);
assert.ok((shallow.issues || []).indexOf("The learning map needs more connected learning points.") !== -1, (shallow.issues || []).join("; "));
var repairBrief = Brain.planRepairBrief(ctxFor(shark), shallow.issues, shallow.previous);
assert.ok(JSON.parse(repairBrief.user).relationshipRequired.join(" ").indexOf("depth:") === 0);
assert.ok(repairBrief.user.indexOf("about 5 to 6 points") !== -1);
var settled = Brain.normalisePlan(rawFor(shark, shark.map.slice(2, 4)), ctxFor(shark, { breadthSettled: true }));
assert.strictEqual(settled.ok, false, (settled.issues || []).join("; "));
assert.ok((settled.issues || []).indexOf("The learning map needs more connected learning points.") !== -1, (settled.issues || []).join("; "));

var wide = shark.map.concat([
  { id: "p9", knowledge: "A shark's skin is covered in tiny tooth-like scales that help water flow past so it can swim quietly.", role: "function", importance: "supporting", dependsOn: ["p1"] },
  { id: "p10", knowledge: "Some sharks must keep swimming to push water over their gills.", role: "example", importance: "supporting", dependsOn: ["p4"] }
]);
var tight = Brain.normalisePlan(rawFor(shark, wide), ctxFor(shark));
assert.strictEqual(tight.ok, true, (tight.issues || []).join("; "));
assert.ok(tight.plan.learningMap.length <= Brain.depthBudget("Year 1", 15).max);
assert.ok(tight.plan.mapRejected.some(function (item) { return item.reason === "over the depth budget"; }));
tight.plan.learningMap.forEach(function (item) {
  item.dependsOn.forEach(function (dep) {
    assert.ok(tight.plan.learningMap.some(function (other) { return other.id === dep; }), "dependency closure kept " + dep);
  });
});

var river = fixtures[4];
var quick = Brain.normalisePlan(rawFor(river), ctxFor(Object.assign({}, river, { minutes: 8 })));
assert.strictEqual(quick.ok, true, (quick.issues || []).join("; "));
assert.ok(quick.plan.learningMap.length <= Brain.depthBudget("Year 5", 8).max, "a short lesson is not overloaded");
assert.ok(quick.plan.learningMap.length < fixtures.length + 10);
var quickSlots = Brain.planBeats(Brain.lessonSkeleton(quick.plan, ctxFor(river)), quick.plan, "Year 5");
assert.strictEqual(slotOf(quickSlots, "check").beats.length, 1, "an eight minute lesson asks one question");
var long = Brain.normalisePlan(rawFor(river), ctxFor(Object.assign({}, river, { minutes: 25 })));
assert.ok(long.plan.learningMap.length >= quick.plan.learningMap.length);

assert.deepStrictEqual([1, 3, 5].map(function (year) {
  var budget = Brain.depthBudget("Year " + year, 15);
  return [budget.floor, budget.max];
}), [[5, 6], [6, 8], [7, 8]]);
assert.deepStrictEqual([2, 4, 6].map(function (year) { return Brain.depthBudget("Year " + year, 20).max; }), [7, 9, 10]);
assert.ok(Brain.depthBudget("Year 1", 6).max < Brain.depthBudget("Year 1", 15).max);

var cyclic = Brain.buildLearningMap({ learningMap: [
  { id: "a", knowledge: "Water flows downhill.", role: "foundation", dependsOn: ["b"] },
  { id: "b", knowledge: "A slope makes water flow faster.", role: "cause", dependsOn: ["a"] },
  { id: "c", knowledge: "Faster water carries more stones.", role: "effect", dependsOn: ["b"] }
] }, { yearGroup: "Year 3", requestedMinutes: 15, lessonBrief: { intent: "explain" } }, "Understand how water moves.");
assert.strictEqual(cyclic.items.length, 3, "a dependency cycle does not lose points");

var legacy = Brain.normalisePlan({
  learningObjective: "Know the names of the planets in order.",
  subject: "Science",
  topic: "planets",
  keyKnowledge: ["Mercury is the closest planet to the Sun.", "Neptune is the farthest planet from the Sun."],
  lessonArc: [{ purpose: "teach" }, { purpose: "check" }]
}, { yearGroup: "Year 3", subject: "Science", topic: "planets", lessonBrief: { intent: "explain" } });
assert.strictEqual(legacy.ok, true, (legacy.issues || []).join("; "));
assert.strictEqual(legacy.plan.learningMap.length, 2);

var briefText = Brain.planBrief({ lessonBrief: { learningGoal: shark.goal }, yearGroup: "Year 1", requestedMinutes: 15 }).system;
assert.ok(briefText.indexOf("about 5 to 6 points") !== -1);
assert.ok(briefText.indexOf("learningMap: [{ id, knowledge, role, importance, dependsOn }]") !== -1);
assert.strictEqual(briefText.indexOf("two in Year 1 and Year 2"), -1);
assert.ok(/shark/i.test(briefText) === false, "the plan brief carries no topic-specific facts");
var olderBrief = Brain.planBrief({ lessonBrief: { learningGoal: "x" }, yearGroup: "Year 6", requestedMinutes: 20 }).system;
assert.ok(olderBrief.indexOf("about 7 to 10 points") !== -1);

fixtures.reduce(function (chain, fixture) {
  return chain.then(function () { return runFixture(fixture); });
}, Promise.resolve()).then(function () {
  console.log("learning-map tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
