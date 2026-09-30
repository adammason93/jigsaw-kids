/* Lesson brain checks. The model is a function passed in. No live provider. */
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var Core = require("../schools/learn/creator-core.js");
var Mechanics = require("../schools/learn/mechanic-core.js");

function explain(topic, year) {
  return "Year " + year + " pupils can see how " + topic + " works by watching one clear example, naming what happens, and saying why it happens before they try a challenge.";
}

function questions(topic, count) {
  var list = [];
  var n;
  for (n = 1; n <= count; n++) {
    list.push({
      prompt: "Which idea matches " + topic + " in check " + n + "?",
      choices: [topic + " is the lesson idea", "A different school idea", "Another classroom idea", "A further idea"],
      correct: topic + " is the lesson idea",
      explain: "This checks " + topic + " at step " + n + ".",
      kind: "multiple"
    });
  }
  return list;
}

function planned(opts) {
  var topic = opts.topic;
  var year = opts.year;
  var bank = questions(topic, opts.count || 8);
  return {
    subject: opts.subject,
    topic: topic,
    yearGroup: "Year " + year,
    title: topic + " adventure",
    objectives: ["Understand " + topic],
    vocabulary: opts.vocabulary || [],
    activities: [
      { mechanic: "story", title: topic + " together", purpose: "Explain the idea", minutes: 4, why: topic, visualContext: opts.visual || null, config: { lines: [explain(topic, year), "The class then uses " + topic + " in a practical challenge."] } },
      { mechanic: "quiz", title: topic + " challenge", purpose: "Check understanding", minutes: 8, config: { participation: "whole_class", points: 1, questions: bank.slice(0, 5) } },
      { mechanic: "word_search", title: topic + " words", purpose: "Vocabulary", minutes: 6, config: { words: opts.words, instruction: "Find the " + topic + " words." } },
      { mechanic: "spin", title: "Choose someone", purpose: "Choose a pupil for a turn", minutes: 1, config: { pool: "included" } },
      { mechanic: "quiz", title: "Your turn", purpose: "One pupil applies the idea", minutes: 6, config: { participation: "selected_pupil", points: 1, questions: bank.slice(5, 8) } }
    ]
  };
}

function ctxFor(sentence, fields) {
  var draft = Core.blankDraft();
  draft.source = { type: "paste", filename: "", text: sentence, unsupported: false };
  Core.applyAnalysis(draft, Core.analyseSource(sentence));
  if (fields && fields.year) {
    draft.year = fields.year;
    draft.yearSource = "class";
  }
  if (fields && fields.topic) draft.topic = fields.topic;
  if (fields && fields.subject) draft.subject = fields.subject;
  var ctx = Brain.contextFrom(draft, { organisationId: "org-1", pupilCount: 28, availableMechanics: Brain.MECHANICS });
  if (fields && fields.sourceText) ctx.sourceText = fields.sourceText;
  return ctx;
}

var PROMPTS = [
  ["fractions", "20 minute Year 1 fractions recap using pizzas.", "Fractions", "1", ["HALF", "QUARTER", "EQUAL", "WHOLE"]],
  ["gravity", "30 minute Year 4 lesson introducing gravity. Make it practical and fun.", "Gravity", "4", ["GRAVITY", "EARTH", "FORCE", "WEIGHT"]],
  ["phonics", "15 minute Year 2 phonics recap on sh and ch.", "sh and ch", "2", ["SHIP", "SHOP", "CHIP", "CHAT"]],
  ["water", "30 minute Year 3 lesson on the water cycle.", "Water cycle", "3", ["EVAPORATION", "CLOUD", "RAIN", "WATER"]],
  ["roman", "25 minute Year 5 history lesson on Roman Britain.", "Roman Britain", "5", ["ROMAN", "BRITAIN", "ROAD", "VILLA"]],
  ["writing", "20 minute Year 6 lesson on persuasive writing.", "persuasive writing", "6", ["PERSUADE", "REASON", "POINT", "VIEW"]],
  ["times", "15 minute Year 3 maths lesson on the 4 times table.", "4 times table", "3", ["FOUR", "TIMES", "TABLE", "GROUP"]],
  ["volcano", "25 minute Year 4 geography lesson about volcanoes.", "volcanoes", "4", ["VOLCANO", "MAGMA", "CRATER", "LAVA"]],
  ["day", "20 minute Year 5 science lesson explaining why we have day and night.", "day and night", "5", ["EARTH", "NIGHT", "ORBIT", "LIGHT"]],
  ["florence", "20 minute Year 2 lesson about Florence Nightingale.", "Florence Nightingale", "2", ["NURSE", "HOSPITAL", "CARE", "WARD"]],
  ["bridge", "20 minute Year 4 introduction to how suspension bridges work.", "suspension bridges", "4", ["BRIDGE", "CABLE", "TOWER", "DECK"]]
];

PROMPTS.forEach(function (row) {
  var ctx = ctxFor(row[1], { topic: row[2], year: "Year " + row[3], subject: "Lesson" });
  ctx.requestedMinutes = 25;
  var result = Brain.accept(planned({ topic: row[2], year: row[3], subject: "Lesson", words: row[4] }), ctx);
  assert.strictEqual(result.ok, true, row[0] + " " + (result.issues || []).join("; "));
  assert.strictEqual(result.adventure.yearGroup, "Year " + row[3]);
  assert.ok(result.adventure.estimateMinutes >= 16 && result.adventure.estimateMinutes <= 36);
  var slides = Core.slidesFor({ activities: result.adventure.activities });
  assert.strictEqual(Core.slidesPlayable(slides), true, row[0]);
  assert.strictEqual(Core.validateAdventure({ activities: result.adventure.activities }, Mechanics).length, 0, row[0]);
});

var gravityCtx = ctxFor("30 minute Year 4 lesson introducing gravity. Make it practical and fun.", { topic: "Gravity", year: "Year 4", subject: "Science" });
gravityCtx.requestedMinutes = 25;
var gravity = Brain.accept(planned({
  topic: "Gravity",
  year: "4",
  subject: "Science",
  words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"],
  visual: { useful: true, concept: "gravity pulls objects towards Earth", suggestedScene: "classroom objects being dropped", importantObjects: ["Earth", "falling objects"], interactionIdea: "predict which direction the object moves" }
}), gravityCtx);
assert.strictEqual(gravity.ok, true);
assert.ok(gravity.adventure.activities.some(function (item) { return item.visualContext && item.visualContext.concept.indexOf("gravity") !== -1; }));
var gravityBlob = JSON.stringify(gravity.adventure.activities).toLowerCase();
assert.strictEqual(gravityBlob.indexOf("fraction"), -1);
assert.strictEqual(gravityBlob.indexOf("quarter"), -1);
assert.ok(gravityBlob.indexOf("gravity") !== -1);

var drifted = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
drifted.activities[1].config.questions[0].prompt = "A pizza cut into quarters gives each person a half?";
drifted.activities[1].config.questions[0].choices = ["A half", "A quarter", "A whole", "Nothing"];
drifted.activities[1].config.questions[0].correct = "A quarter";
var drift = Brain.accept(drifted, gravityCtx);
assert.strictEqual(drift.ok, false);
assert.ok(drift.issues.join(" ").indexOf("fractions") !== -1);

var brief = Brain.modelBrief(gravityCtx);
assert.ok(brief.system.indexOf("Do not return HTML") !== -1);
assert.ok(brief.user.indexOf("Gravity") !== -1);
assert.ok(brief.user.indexOf("Year 4") !== -1);
assert.strictEqual(brief.user.indexOf("org-1"), -1);
assert.strictEqual(JSON.stringify(Brain.forModel(gravityCtx)).indexOf("Alice"), -1);

var malformed = Brain.accept("this is not json", gravityCtx);
assert.strictEqual(malformed.ok, false);

var unsupported = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
unsupported.activities.push({ mechanic: "rocket_race", title: "Race", minutes: 2, config: {} });
assert.strictEqual(Brain.accept(unsupported, gravityCtx).ok, false);

var missingPrompt = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
missingPrompt.activities[1].config.questions.forEach(function (item) { item.prompt = ""; });
missingPrompt.activities[1].config.prompt = "";
missingPrompt.activities[4].config.questions.forEach(function (item) { item.prompt = ""; });
assert.strictEqual(Brain.accept(missingPrompt, gravityCtx).ok, false);

var missingChoices = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
missingChoices.activities[1].config.questions[1].choices = ["Only one"];
missingChoices.activities[1].config.questions[1].correct = "Only one";
assert.strictEqual(Brain.accept(missingChoices, gravityCtx).ok, false);

var wrongCorrect = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
wrongCorrect.activities[1].config.questions[1].correct = "Not in the list";
assert.strictEqual(Brain.accept(wrongCorrect, gravityCtx).ok, false);

var duplicate = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
duplicate.activities[1].config.questions[2].prompt = duplicate.activities[1].config.questions[0].prompt;
assert.strictEqual(Brain.accept(duplicate, gravityCtx).ok, false);

var placeholder = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
placeholder.activities[1].config.questions[0].prompt = "Example question";
assert.strictEqual(Brain.accept(placeholder, gravityCtx).ok, false);

var wrongYear = planned({ topic: "Gravity", year: "1", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
wrongYear.yearGroup = "Year 1";
assert.strictEqual(Brain.accept(wrongYear, gravityCtx).ok, false);

var short = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
short.activities = short.activities.slice(0, 2);
short.activities[0].minutes = 2;
short.activities[1].minutes = 3;
short.activities[1].config.questions = short.activities[1].config.questions.slice(0, 1);
var shortCtx = JSON.parse(JSON.stringify(gravityCtx));
shortCtx.requestedMinutes = 30;
assert.strictEqual(Brain.accept(short, shortCtx).ok, false);

var sourced = JSON.parse(JSON.stringify(gravityCtx));
sourced.sourceText = "The worksheet studies aqueducts, hypocausts and centurions in the town.";
sourced.topic = "Gravity";
assert.ok(Brain.accept(planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] }), sourced).issues.join(" ").indexOf("source") !== -1);
var withSource = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
withSource.activities[0].config.lines.push("The class compares the idea with aqueducts from the sheet.");
assert.strictEqual(Brain.accept(withSource, sourced).ok, true);

var tagged = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
tagged.activities[0].config.lines[0] = "<script>alert(1)</script>" + explain("Gravity", "4");
var stripped = Brain.accept(tagged, gravityCtx);
assert.strictEqual(stripped.ok, true);
assert.strictEqual(JSON.stringify(stripped.adventure).indexOf("<script"), -1);

function fake(good) {
  var calls = 0;
  function callModel() {
    calls += 1;
    if (calls === 1) return good ? planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] }) : { activities: [] };
    return planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
  }
  callModel.calls = function () { return calls; };
  return callModel;
}

Brain.runPipeline(gravityCtx, fake(true)).then(function (ok) {
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.adventure.meta.repairUsed, false);
  assert.strictEqual(ok.adventure.meta.fallbackUsed, false);
  return Brain.runPipeline(gravityCtx, fake(false));
}).then(function (repaired) {
  assert.strictEqual(repaired.ok, true);
  assert.strictEqual(repaired.adventure.meta.repairUsed, true);
  function alwaysBad() { return { activities: [{ mechanic: "quiz", minutes: 2, config: { prompt: "TBC", choices: ["A"], correct: "B" } }] }; }
  return Brain.runPipeline(gravityCtx, alwaysBad);
}).then(function (failed) {
  assert.strictEqual(failed.ok, false);
  assert.strictEqual(failed.category, "invalid");
  assert.strictEqual(failed.fallbackUsed, true);
  assert.strictEqual(failed.repairUsed, true);
  function timeout() {
    var error = new Error("slow");
    error.category = "timeout";
    throw error;
  }
  return Brain.runPipeline(gravityCtx, timeout);
}).then(function (timed) {
  assert.strictEqual(timed.ok, false);
  assert.strictEqual(timed.category, "timeout");
  assert.strictEqual(timed.fallbackUsed, true);
  function provider() {
    var error = new Error("down");
    error.category = "provider";
    throw error;
  }
  return Brain.runPipeline(gravityCtx, provider);
}).then(function (down) {
  assert.strictEqual(down.ok, false);
  assert.strictEqual(down.category, "provider");
  var fractions = Core.blankDraft();
  fractions.source = { type: "paste", text: "20 minute Year 1 fractions recap using pizzas.", filename: "", unsupported: false };
  Core.applyAnalysis(fractions, Core.analyseSource(fractions.source.text));
  Core.setClass(fractions, { id: "class-1", name: "Year 1", yearLabel: "Year 1", pupils: [] });
  Core.recommend(fractions);
  assert.strictEqual(fractions.generationError, "");
  assert.ok(fractions.activities.some(function (item) { return item.mechanic === "quiz"; }));
  var creator = require("fs").readFileSync(require("path").join(__dirname, "../schools/learn/creator.js"), "utf8");
  assert.ok(creator.indexOf("Wondii couldn't finish this adventure.") !== -1);
  assert.ok(creator.indexOf("Build manually") !== -1);
  assert.ok(creator.indexOf("Try again") !== -1);
  assert.ok(creator.indexOf("Edit lesson") !== -1);
  assert.ok(creator.indexOf("useLibrary") !== -1);
  console.log("lesson-brain tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
