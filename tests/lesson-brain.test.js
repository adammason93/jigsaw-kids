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
assert.ok(brief.system.indexOf("lessonSkeleton is already decided") !== -1);
assert.strictEqual(brief.system.indexOf("exactly these four"), -1);
assert.ok(brief.user.indexOf("Gravity") !== -1);
assert.ok(brief.user.indexOf("Year 4") !== -1);
assert.strictEqual(brief.user.indexOf("org-1"), -1);
assert.strictEqual(JSON.stringify(Brain.forModel(gravityCtx)).indexOf("Alice"), -1);
var planOnly = Brain.planBrief(gravityCtx);
assert.ok(planOnly.system.indexOf("internal lesson plan") !== -1);
assert.ok(planOnly.system.indexOf("Do not write pupil activities") !== -1);

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
var unusedSource = Brain.accept(planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] }), sourced);
assert.strictEqual(unusedSource.ok, true, (unusedSource.issues || []).join("; "));
assert.ok((unusedSource.issues || []).join(" ").indexOf("The teacher's source material was not used.") === -1);
var withSource = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
withSource.activities[0].config.lines.push("The class compares the idea with aqueducts from the sheet.");
assert.strictEqual(Brain.accept(withSource, sourced).ok, true);

var tagged = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
tagged.activities[0].config.lines[0] = "<script>alert(1)</script>" + explain("Gravity", "4");
var stripped = Brain.accept(tagged, gravityCtx);
assert.strictEqual(stripped.ok, true);
assert.strictEqual(JSON.stringify(stripped.adventure).indexOf("<script"), -1);

function samplePlan() {
  return {
    title: "Gravity",
    subject: "Science",
    topic: "Gravity",
    yearGroup: "Year 4",
    learningObjective: "Explain that gravity pulls objects towards the Earth.",
    keyKnowledge: ["Gravity pulls things down towards the Earth.", "The pull acts on objects even when nobody is holding them."],
    lessonArc: [
      { purpose: "teach", learningRole: "Explain the pull", concept: "Gravity" },
      { purpose: "check", learningRole: "Check the idea", concept: "Gravity" }
    ]
  };
}

function sampleStory() {
  return {
    enabled: true,
    structure: "investigation",
    title: "The playground drop",
    premise: "The class finds out why a ball comes back down.",
    setting: "the school playground",
    tone: "clear",
    mission: "Find out why the ball falls back to the ground.",
    characters: [{ id: "guide", label: "Guide", visualRole: "young fictional explorer" }],
    narrativeArc: [
      { beat: "beginning", learning: "Gravity pulls things down towards the Earth." },
      { beat: "development", learning: "The pull acts even when nobody is holding the object." },
      { beat: "application", learning: "Explain that gravity pulls objects towards the Earth." },
      { beat: "resolution", learning: "The ball lands because gravity pulls it." },
      { beat: "debrief", learning: "Gravity pulls things down towards the Earth." }
    ],
    learningIntegration: "The falling ball teaches the pull.",
    ending: "The class can say why the ball lands.",
    continuity: { setting: "the school playground", mission: "Find out why the ball falls back to the ground.", discovered: [], objects: ["ball"], roles: ["guide"] }
  };
}

function contentSample() {
  return {
    subject: "Science",
    topic: "Gravity",
    yearGroup: "Year 4",
    title: "The playground drop",
    objectives: ["Explain that gravity pulls objects towards the Earth."],
    activities: [
      { mechanic: "story", title: "The drop", purpose: "Hook", minutes: 3, why: "The class sees a problem.", scene: { beat: "beginning", kind: "arrival" }, config: { lines: ["A ball has landed on the playground and the class does not yet know what brought it down."] } },
      { mechanic: "story", title: "Look again", purpose: "Investigate", minutes: 3, why: "The class looks before the explanation.", scene: { beat: "goal", kind: "challenge" }, config: { lines: ["The class watches a second ball and asks what brings it back down."] } },
      { mechanic: "story", title: "The pull", purpose: "Teach", minutes: 4, why: "The class hears the facts.", scene: { beat: "discovery", kind: "teach" }, config: { lines: ["Gravity pulls things down towards the Earth.", "The pull acts on objects even when nobody is holding them."] } },
      { mechanic: "story", title: "Use the pull", purpose: "Apply", minutes: 3, why: "The class uses gravity.", scene: { beat: "application", kind: "challenge" }, config: { lines: ["The class uses gravity to predict that a book will fall down towards the Earth."] } },
      { mechanic: "quiz", title: "Check", purpose: "Check", minutes: 4, why: "The class checks the idea.", config: { points: 1, questions: [{ prompt: "What pulls a dropped ball down?", choices: ["Gravity pulls it towards the Earth", "The ball decides to stop", "Somebody keeps holding it"], correct: "Gravity pulls it towards the Earth", explain: "Gravity pulls the ball down towards the Earth." }] } },
      { mechanic: "story", title: "Settled", purpose: "Resolution", minutes: 3, why: "The mission settles.", scene: { beat: "resolution", kind: "resolution" }, config: { lines: ["The class can now say that gravity pulled the ball down, so the playground mystery is settled."] } },
      { mechanic: "mystery", title: "What we discovered", purpose: "Debrief", minutes: 3, why: "The class names the fact.", scene: { beat: "debrief", kind: "debrief" }, config: { lines: ["Gravity pulls things down towards the Earth."] } }
    ]
  };
}

function sentenceFor(beat) {
  var lines = {
    notice: "Look at the ball and say what you can see.",
    predict: "Say what you think will happen to the ball.",
    name: beat.knowledgeRefs && beat.knowledgeRefs[0] === "k1" ? "Gravity pulls things down towards the Earth." : "The class gives this pull its own name.",
    explain: "The pull acts on objects even when nobody is holding them.",
    model: "First watch the ball drop, then say how gravity pulls it down.",
    connect: "These two ideas about the pull belong together.",
    exemplify: "A dropped book is one example of gravity pulling an object down.",
    practise: "Show where gravity pulls the next dropped ball.",
    apply: "Show what happens to an object when nobody is holding it.",
    retrieve: "Which sentence matches the pull you just learned?",
    reveal: "Gravity pulled the ball down, so the playground mystery is settled.",
    consolidate: "So gravity pulls objects down towards the Earth."
  };
  return lines[beat.move] || "The class keeps hold of the idea they just learned.";
}

function contentFromBrief(brief) {
  var payload = {};
  try { payload = JSON.parse(brief && brief.user || "{}"); } catch (e) { payload = {}; }
  var skeleton = payload.lessonSkeleton || [];
  if (Array.isArray(payload.slotsToRewrite) && payload.slotsToRewrite.length) {
    skeleton = payload.slotsToRewrite.map(function (spec) {
      return { id: String(spec.slotType || "").toLowerCase(), beats: spec.teachingBeats || [] };
    });
  }
  if (!skeleton.some(function (slot) { return slot.beats && slot.beats.length; })) return contentSample();
  var slots = {};
  skeleton.forEach(function (slot) {
    var beats = (slot.beats || []).map(function (beat) {
      return { id: beat.id, cue: "", text: sentenceFor(beat) };
    });
    slots[slot.id] = { beats: beats };
    if (slot.id === "apply") {
      slots.apply.instruction = "Show what happens to an object when nobody is holding it.";
      slots.apply.target = "scene";
      slots.apply.successCondition = "The pupil has used the pull to make a prediction.";
      slots.apply.teachingConnection = "The task follows the explanation of the pull.";
    }
    if (slot.id === "check") {
      slots.check.prompt = "What pulls a dropped ball down?";
      slots.check.choices = ["Gravity pulls it towards the Earth", "The ball decides to stop", "Somebody keeps holding it"];
      slots.check.correct = "Gravity pulls it towards the Earth";
      slots.check.explain = "Gravity pulls the ball down towards the Earth.";
      slots.check.successEvidence = "The pupil named the pull.";
      slots.check.teachingConnection = "The question follows the taught pull.";
    }
  });
  return {
    title: "The playground drop",
    objectives: ["Explain that gravity pulls objects towards the Earth."],
    slots: slots
  };
}

function fake(good) {
  var calls = 0;
  function callModel(brief) {
    calls += 1;
    var planning = brief && brief.system && brief.system.indexOf("Do not write pupil activities") !== -1;
    var story = brief && brief.system && brief.system.indexOf("internal story plan") !== -1;
    if (planning) return calls === 1 && !good ? { title: "" } : samplePlan();
    if (story) return sampleStory();
    return contentFromBrief(brief);
  }
  callModel.calls = function () { return calls; };
  return callModel;
}

var openStory = Brain.normaliseStory({
  title: "A drop",
  setting: "the playground",
  mission: "Find out why the ball comes down.",
  narrativeArc: [{ beat: "beginning", learning: "Gravity pulls things down towards the Earth." }]
}, { lessonPlan: samplePlan(), topic: "Gravity" });
assert.strictEqual(openStory.ok, false);
assert.ok(openStory.issues.join(" ").indexOf("resolution") !== -1);

var unfair = Brain.normaliseStory(sampleStory(), { lessonPlan: samplePlan(), topic: "Gravity" });
unfair = Brain.normaliseStory({
  title: "A drop",
  setting: "the playground",
  mission: "Find out why the ball comes down.",
  characters: [{ id: "villain", label: "The villain", visualRole: "a fictional foe" }],
  narrativeArc: [
    { beat: "beginning", learning: "Gravity pulls things down towards the Earth." },
    { beat: "resolution", learning: "Gravity pulls things down towards the Earth." }
  ]
}, { lessonPlan: samplePlan(), topic: "Gravity" });
assert.strictEqual(unfair.ok, true);
assert.ok(!unfair.story.characters.some(function (role) { return /villain/i.test(role.label); }));
var stamped = Brain.normaliseStory(sampleStory(), { lessonPlan: samplePlan(), topic: "Gravity" });
assert.strictEqual(stamped.ok, true);
assert.strictEqual(stamped.story.characters[0].characterId, "CHARACTER_A");
assert.strictEqual(JSON.stringify(stamped.story).indexOf("Amelia"), -1);

var missingEnd = Brain.accept(planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] }), Object.assign({}, gravityCtx, { lessonPlan: samplePlan(), storyPlan: Brain.storyFromPlan(samplePlan(), gravityCtx) }));
assert.strictEqual(missingEnd.ok, false);
assert.ok((missingEnd.issues || []).join(" ").indexOf("resolution") !== -1 || (missingEnd.issues || []).join(" ").indexOf("debrief") !== -1);
var echoPlan = planned({ topic: "Gravity", year: "4", subject: "Science", words: ["GRAVITY", "EARTH", "FORCE", "WEIGHT"] });
echoPlan.activities[0].why = "learn about gravity";
echoPlan.title = "learn about gravity";
var echoStory = Brain.normaliseStory(Object.assign(sampleStory(), {
  characters: [{ id: "learner", label: "learn about gravity", visualRole: "young fictional explorer" }],
  mission: "Find out why the ball falls after we learn about gravity."
}), { lessonPlan: samplePlan(), topic: "Gravity", lessonText: "learn about gravity" });
assert.strictEqual(echoStory.ok, true);
assert.strictEqual(echoStory.story.characters[0].label, "Explorer");
assert.ok(echoStory.story.mission.toLowerCase().indexOf("learn about gravity") === -1);
var echoed = Brain.accept(echoPlan, Object.assign({}, gravityCtx, {
  lessonText: "learn about gravity",
  teacherInstructions: "learn about gravity",
  topic: "Gravity",
  lessonPlan: samplePlan(),
  storyPlan: echoStory.story
}));
assert.ok((echoed.issues || []).join(" ").indexOf("repeated the teacher's request") === -1);
if (echoed.adventure) assert.ok(JSON.stringify(echoed.adventure.activities).toLowerCase().indexOf("learn about gravity") === -1);
assert.ok(!missingEnd.adventure);

var cast = Core.castRoles(
  [{ id: "a", firstName: "Amelia" }, { id: "b", firstName: "Noah" }],
  [{ id: "guide", label: "Guide" }, { id: "villain", label: "The villain" }],
  "ELEC-1001"
);
assert.ok(cast.guide && cast.guide.name);
assert.ok(!cast.villain);
var sameCast = Core.castRoles(
  [{ id: "a", firstName: "Amelia" }, { id: "b", firstName: "Noah" }],
  [{ id: "guide", label: "Guide" }],
  "ELEC-1001"
);
assert.strictEqual(sameCast.guide.name, cast.guide.name);
assert.strictEqual(Core.speakStory("{{guide}} watches the ball.", cast), cast.guide.name + " watches the ball.");
assert.strictEqual(Core.speakStory("{{guide}} watches the ball.", { guide: { label: "Guide", name: "" } }), "Guide watches the ball.");

Brain.runPipeline(gravityCtx, fake(true)).then(function (ok) {
  assert.strictEqual(ok.ok, true, (ok.issues || []).join("; "));
  assert.strictEqual(ok.adventure.meta.repairUsed, false);
  assert.strictEqual(ok.adventure.meta.fallbackUsed, false);
  assert.strictEqual(ok.adventure.storyPlan.fallback, false);
  assert.ok(ok.adventure.storyPlan.mission.length > 12);
  assert.ok(ok.adventure.activities.some(function (activity) { return activity.scene && activity.scene.beat === "resolution"; }));
  assert.ok(JSON.stringify(ok.adventure).indexOf("Sarah") === -1);
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
  var quakeCtx = ctxFor("learn about causes of earthquakes", { topic: "causes of earthquakes", year: "Year 5", subject: "Geography" });
  quakeCtx.lessonPlan = { learningObjective: "Explain what causes an earthquake.", keyKnowledge: ["Tectonic plates can become stuck.", "Stress builds until the plates move suddenly."] };
  var shallow = Brain.accept({
    subject: "Geography",
    topic: "causes of earthquakes",
    yearGroup: "Year 5",
    title: "The shaking village",
    objectives: ["Explain what causes an earthquake."],
    activities: [
      { mechanic: "story", title: "Arrival", purpose: "Hook", minutes: 3, why: "The ground shakes", scene: { beat: "beginning" }, config: { lines: ["The village path cracks and nobody knows why yet.", "The class has to find the cause."] } },
      { mechanic: "story", title: "The crust", purpose: "Teach", minutes: 4, why: "Teach plates", scene: { beat: "discovery" }, config: { lines: ["Earth's crust is broken into tectonic plates that usually creep.", "When a boundary stays stuck, stress builds until the plates jerk."] } },
      { mechanic: "quiz", title: "Check", purpose: "Check", minutes: 3, config: { points: 1, questions: [{ prompt: "What happens during an earthquake?", choices: ["The ground shakes", "It rains", "The sun shines"], correct: "The ground shakes", explain: "The ground moves when energy reaches the surface from a sudden plate movement." }] } },
      { mechanic: "story", title: "Settled", purpose: "Resolve", minutes: 2, why: "End", scene: { beat: "resolution" }, config: { lines: ["The village understands the shaking came from a sudden plate movement."] } },
      { mechanic: "mystery", title: "Facts", purpose: "Debrief", minutes: 2, config: { lines: ["Tectonic plates can become stuck and then move suddenly."] } }
    ]
  }, quakeCtx);
  assert.strictEqual(shallow.ok, false);
  assert.ok((shallow.issues || []).join(" ").indexOf("unrelated") !== -1);
  var spoiled = Brain.accept({
    subject: "Geography",
    topic: "causes of earthquakes",
    yearGroup: "Year 5",
    title: "The shaking village",
    objectives: ["Explain what causes an earthquake."],
    activities: [
      { mechanic: "story", title: "Arrival", purpose: "Hook", minutes: 3, why: "Hook", scene: { beat: "beginning" }, config: { lines: ["Earthquakes happen because of movements in the Earth's crust."] } },
      { mechanic: "story", title: "The crust", purpose: "Teach", minutes: 4, why: "Teach plates", scene: { beat: "discovery" }, config: { lines: ["Tectonic plates can become stuck.", "Stress builds until the plates move suddenly."] } },
      { mechanic: "quiz", title: "Check", purpose: "Check", minutes: 3, config: { points: 1, questions: [{ prompt: "Why can the ground shake after plates have been stuck?", choices: ["Stress is released when they suddenly move", "Only volcanoes can shake the ground", "Earthquakes only happen in one country"], correct: "Stress is released when they suddenly move", explain: "While the plates stay stuck, stress builds, and a sudden movement releases it." }] } },
      { mechanic: "story", title: "Settled", purpose: "Resolve", minutes: 2, why: "End", scene: { beat: "resolution" }, config: { lines: ["The village understands that the shaking came from a sudden plate movement."] } },
      { mechanic: "mystery", title: "Facts", purpose: "Debrief", minutes: 2, config: { lines: ["Tectonic plates can become stuck and then move suddenly."] } }
    ]
  }, quakeCtx);
  assert.strictEqual(spoiled.ok, false);
  assert.ok((spoiled.issues || []).join(" ").indexOf("opening states") !== -1);
  var reversed = Brain.accept({
    subject: "Science",
    topic: "causes of earthquakes",
    yearGroup: "Year 1",
    title: "The shaking village",
    objectives: ["Explain what causes an earthquake."],
    activities: [
      { mechanic: "story", title: "Arrival", purpose: "Hook", minutes: 3, why: "The ground is shaking", scene: { beat: "beginning" }, config: { lines: ["The village path is shaking and nobody knows why yet.", "The class has to find the cause before anyone can feel safe."] } },
      { mechanic: "story", title: "The mission settles", purpose: "Resolve the mission", minutes: 2, why: "End", scene: { beat: "resolution" }, config: { lines: ["The young scientists celebrate. Earthquakes happen when the ground shakes."] } },
      { mechanic: "quiz", title: "Check", purpose: "Check", minutes: 4, config: { points: 1, questions: [{ prompt: "What happens during an earthquake?", choices: ["The ground shakes", "It rains", "The sun shines"], correct: "The ground shakes", explain: "The ground moves when energy reaches the surface from a sudden plate movement." }] } },
      { mechanic: "story", title: "The pieces", purpose: "Teach", minutes: 4, why: "Teach the cause", scene: { beat: "discovery" }, config: { lines: ["The Earth's outer layer is made of huge pieces called plates.", "The pieces move very slowly, and a sudden move makes the ground shake."] } },
      { mechanic: "mystery", title: "Facts", purpose: "Debrief", minutes: 2, config: { lines: ["Huge pieces of the Earth can get stuck.", "A sudden movement makes the ground shake."] } }
    ]
  }, Object.assign({}, quakeCtx, { yearGroup: "Year 1", pupilCount: 4, requestedMinutes: 15 }));
  assert.strictEqual(reversed.ok, false);
  assert.ok((reversed.issues || []).join(" ").indexOf("what happens") !== -1);
  assert.ok((reversed.issues || []).join(" ").indexOf("mission ends before") === -1);
  var lived = Brain.accept({
    subject: "Science",
    topic: "causes of earthquakes",
    yearGroup: "Year 1",
    title: "Under our feet",
    objectives: ["Explain what causes an earthquake."],
    activities: [
      { mechanic: "story", title: "Arrival", purpose: "Show the problem", minutes: 3, why: "The class feels the effect first", scene: { beat: "beginning" }, config: { lines: ["The ground shakes and nobody knows why yet, so the class looks beneath their feet."] } },
      { mechanic: "story", title: "Look more closely", purpose: "Teach the cause", minutes: 4, why: "The class learns the cause", scene: { beat: "discovery", kind: "teach" }, config: { lines: ["The Earth's surface is made from huge pieces called tectonic plates.", "The pieces push until they slip, and that sudden movement can cause earthquakes."] } },
      { mechanic: "quiz", title: "Check", purpose: "Check the cause", minutes: 4, why: "The class uses the idea", config: { points: 1, questions: [{ prompt: "Why does the ground shake?", choices: ["Huge pieces suddenly slip", "People jump", "The pieces never move"], correct: "Huge pieces suddenly slip", explain: "The pieces slip suddenly and energy travels through the ground." }] } },
      { mechanic: "story", title: "Back at base", purpose: "Use the idea", minutes: 2, why: "The mission settles", scene: { beat: "resolution" }, config: { lines: ["We can tell the class that a sudden slip can cause earthquakes."] } },
      { mechanic: "mystery", title: "What we discovered", purpose: "Name the fact", minutes: 2, why: "The class names the cause", scene: { beat: "debrief" }, config: { lines: ["Huge pieces called plates can slip and cause earthquakes."] } }
    ]
  }, Object.assign({}, quakeCtx, { yearGroup: "Year 1", pupilCount: 4, requestedMinutes: 15, lessonPlan: { learningObjective: "Explain what causes an earthquake.", topic: "causes of earthquakes", keyKnowledge: ["The Earth's surface is made from huge pieces called tectonic plates.", "The pieces push, stick, and then slip.", "A sudden slip makes the ground shake."], misconceptions: ["The ground shakes because people jump."] }, storyPlan: Brain.storyFromPlan({ learningObjective: "Explain what causes an earthquake.", topic: "causes of earthquakes", keyKnowledge: ["The Earth's surface is made from huge pieces called tectonic plates.", "A sudden slip makes the ground shake."] }, { yearGroup: "Year 1", topic: "causes of earthquakes" }) }));
  assert.strictEqual(lived.ok, true, (lived.issues || []).join("; "));
  var livedBlob = JSON.stringify(lived.adventure.activities);
  assert.ok(livedBlob.indexOf("\"type\":\"shake\"") !== -1 || livedBlob.indexOf("\"type\": \"shake\"") !== -1);
  assert.ok(livedBlob.indexOf("\"type\":\"move\"") !== -1 || livedBlob.indexOf("\"type\": \"move\"") !== -1);
  assert.ok(livedBlob.indexOf("\"type\":\"hotspot\"") !== -1 || livedBlob.indexOf("\"type\": \"hotspot\"") !== -1);
  assert.ok(lived.adventure.storyPlan.missionLabel.split(/\s+/).length <= 8);
  assert.ok(Brain.contentBrief(quakeCtx, quakeCtx.lessonPlan, null).system.indexOf("worldEffect") !== -1);
  var keyedEffect = JSON.parse(JSON.stringify(lived.adventure ? {
    subject: "Science",
    topic: "causes of earthquakes",
    yearGroup: "Year 1",
    title: "Under our feet",
    objectives: ["Explain what causes an earthquake."],
    activities: [
      { mechanic: "story", title: "Arrival", purpose: "Show the problem", minutes: 3, why: "The class feels the effect first", scene: { beat: "beginning" }, config: { lines: ["The ground shakes and nobody knows why yet, so the class looks beneath their feet."] } },
      { mechanic: "story", title: "Look more closely", purpose: "Teach the cause", minutes: 4, why: "The class learns the cause", scene: { beat: "discovery", kind: "teach" }, config: { lines: ["The Earth's surface is made from huge pieces called tectonic plates.", "The pieces push until they slip, and that sudden movement can cause earthquakes."] } },
      { mechanic: "quiz", title: "Check", purpose: "Check the cause", minutes: 4, why: "The class uses the idea", config: { points: 1, questions: [{ prompt: "Why does the ground shake?", choices: ["The ground shakes", "Huge pieces suddenly slip", "People jump"], correct: "The ground shakes", explain: "The ground shakes when the pieces move." }] } },
      { mechanic: "story", title: "Back at base", purpose: "Use the idea", minutes: 2, why: "The mission settles", scene: { beat: "resolution" }, config: { lines: ["We can tell the class that a sudden slip can cause earthquakes."] } },
      { mechanic: "mystery", title: "What we discovered", purpose: "Name the fact", minutes: 2, why: "The class names the cause", scene: { beat: "debrief" }, config: { lines: ["Huge pieces called plates can slip and cause earthquakes."] } }
    ]
  } : {}));
  var repairedCause = Brain.accept(keyedEffect, Object.assign({}, quakeCtx, { yearGroup: "Year 1", pupilCount: 4, requestedMinutes: 15, lessonPlan: { learningObjective: "Explain what causes an earthquake.", topic: "causes of earthquakes", keyKnowledge: ["The Earth's surface is made from huge pieces called tectonic plates.", "The pieces push, stick, and then slip.", "A sudden slip makes the ground shake."], misconceptions: ["The ground shakes because people jump."] }, storyPlan: Brain.storyFromPlan({ learningObjective: "Explain what causes an earthquake.", topic: "causes of earthquakes", keyKnowledge: ["The Earth's surface is made from huge pieces called tectonic plates.", "A sudden slip makes the ground shake."] }, { yearGroup: "Year 1", topic: "causes of earthquakes" }) }));
  assert.strictEqual(repairedCause.ok, true, (repairedCause.issues || []).join("; "));
  var repairedQuiz = repairedCause.adventure.activities.filter(function (item) { return item.mechanic === "quiz"; })[0];
  assert.strictEqual(repairedQuiz.config.correct, "Huge pieces suddenly slip");
  assert.ok((repairedCause.issues || []).join(" ").indexOf("effect, not the cause") === -1);
  var spoiled = Brain.accept({
    subject: "Science",
    topic: "causes of earthquakes",
    yearGroup: "Year 1",
    title: "Under our feet",
    objectives: ["Explain what causes an earthquake."],
    activities: [
      { mechanic: "story", title: "Arrival", purpose: "Show the problem", minutes: 4, why: "The class arrives", scene: { beat: "beginning" }, config: { lines: ["The Earth's surface is made from huge pieces called tectonic plates, and those pieces push until they slip."] } },
      { mechanic: "quiz", title: "Check", purpose: "Check the cause", minutes: 4, why: "The class uses the idea", config: { points: 1, questions: [{ prompt: "Why does the ground shake?", choices: ["Huge pieces suddenly slip", "People jump", "The pieces never move"], correct: "Huge pieces suddenly slip", explain: "The pieces slip suddenly and energy travels through the ground." }] } },
      { mechanic: "story", title: "Back at base", purpose: "Use the idea", minutes: 3, why: "The mission settles", scene: { beat: "resolution" }, config: { lines: ["We can tell the class that a sudden slip can cause earthquakes."] } },
      { mechanic: "mystery", title: "What we discovered", purpose: "Name the fact", minutes: 2, why: "The class names the cause", scene: { beat: "resolution" }, config: { lines: ["Huge pieces called plates can slip and cause earthquakes."] } }
    ]
  }, Object.assign({}, quakeCtx, { yearGroup: "Year 1", pupilCount: 4, requestedMinutes: 15, lessonPlan: { learningObjective: "Explain what causes an earthquake.", topic: "causes of earthquakes", keyKnowledge: ["The Earth's surface is made from huge pieces called tectonic plates.", "The pieces push, stick, and then slip."], misconceptions: ["People jumping makes the ground shake."] }, storyPlan: Brain.storyFromPlan({ learningObjective: "Explain what causes an earthquake.", topic: "causes of earthquakes", keyKnowledge: ["The Earth's surface is made from huge pieces called tectonic plates."] }, { yearGroup: "Year 1", topic: "causes of earthquakes" }) }));
  assert.strictEqual(spoiled.ok, false);
  assert.ok((spoiled.issues || []).join(" ").indexOf("opening states") !== -1);
  var shortScene = Brain.accept({
    subject: "Science",
    topic: "causes of earthquakes",
    yearGroup: "Year 1",
    title: "Under our feet",
    objectives: ["Explain what causes an earthquake."],
    activities: [
      { mechanic: "story", title: "Arrival", purpose: "Show the problem", minutes: 3, why: "The class feels the effect first", scene: { beat: "beginning" }, config: { lines: ["The ground shakes and nobody knows why yet, so the class looks beneath their feet."] } },
      { mechanic: "story", title: "A short scene", purpose: "Teach", minutes: 3, why: "Too short", scene: { beat: "goal" }, config: { lines: ["Look here."] } },
      { mechanic: "quiz", title: "Check", purpose: "Check the cause", minutes: 4, why: "The class uses the idea", config: { points: 1, questions: [{ prompt: "Why does the ground shake?", choices: ["Huge pieces suddenly slip", "People jump", "The pieces never move"], correct: "Huge pieces suddenly slip", explain: "The pieces slip suddenly and energy travels through the ground." }] } },
      { mechanic: "story", title: "Back at base", purpose: "Use the idea", minutes: 2, why: "The mission settles", scene: { beat: "resolution" }, config: { lines: ["We can tell the class that a sudden slip can cause earthquakes."] } },
      { mechanic: "mystery", title: "What we discovered", purpose: "Name the fact", minutes: 2, why: "The class names the cause", scene: { beat: "debrief" }, config: { lines: ["Huge pieces called plates can slip and cause earthquakes."] } }
    ]
  }, Object.assign({}, quakeCtx, { yearGroup: "Year 1", pupilCount: 4, requestedMinutes: 15, lessonPlan: { learningObjective: "Explain what causes an earthquake.", topic: "causes of earthquakes", keyKnowledge: ["The Earth's surface is made from huge pieces called tectonic plates.", "The pieces push, stick, and then slip."], misconceptions: ["People jumping makes the ground shake."] }, storyPlan: Brain.storyFromPlan({ learningObjective: "Explain what causes an earthquake.", topic: "causes of earthquakes", keyKnowledge: ["The Earth's surface is made from huge pieces called tectonic plates."] }, { yearGroup: "Year 1", topic: "causes of earthquakes" }) }));
  assert.strictEqual(shortScene.ok, false);
  var goal = shortScene.previous.activities.filter(function (item) { return item.title === "A short scene"; })[0];
  assert.strictEqual(goal.config.lines.join(" "), "Look here.");
  console.log("lesson-brain tests passed");
}).catch(function (error) {
  console.error(error);
  process.exit(1);
});
