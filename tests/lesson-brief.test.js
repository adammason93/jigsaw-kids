/* Lesson briefs and the rejection of template nonsense. No live model. */
var assert = require("assert");
var Core = require("../schools/learn/creator-core.js");
var Brain = require("../js/lesson-brain.js");

function brief(text) {
  return Core.interpretLesson(text);
}

assert.deepStrictEqual(
  [brief("learn about gravity 11 mins").topic, brief("learn about gravity 11 mins").minutes, brief("learn about gravity 11 mins").title],
  ["Gravity", 11, "Gravity Adventure"]
);
assert.deepStrictEqual(
  [brief("10 mins on fractions").topic, brief("10 mins on fractions").minutes],
  ["Fractions", 10]
);
assert.deepStrictEqual(
  [brief("teach volcanoes for 15 minutes").topic, brief("teach volcanoes for 15 minutes").minutes],
  ["Volcanoes", 15]
);
assert.strictEqual(brief("quick recap of adjectives").topic, "Adjectives");
assert.deepStrictEqual(
  [brief("20 minute lesson about the Romans").topic, brief("20 minute lesson about the Romans").minutes],
  ["Romans", 20]
);
assert.strictEqual(brief("15 mins learning about volcanoes").topic, "Volcanoes");
assert.strictEqual(brief("10 minute lesson on fractions").topic, "Fractions");

function draftFrom(text) {
  var draft = Core.blankDraft();
  draft.source.text = text;
  Core.applyAnalysis(draft, Core.analyseSource(text));
  return draft;
}

var gravity = draftFrom("learn about gravity 11 mins");
assert.strictEqual(gravity.topic, "Gravity");
assert.strictEqual(gravity.title, "Gravity Adventure");
assert.strictEqual(gravity.targetMinutes, 11);
Core.recommend(gravity);
assert.strictEqual(gravity.generationError, "");
assert.ok(gravity.activities.some(function (item) { return item.purpose === "Hook" || /begins/.test(item.title || ""); }));
assert.ok(gravity.activities.some(function (item) { return item.mechanic === "quiz" && item.config.participation === "whole_class"; }));
assert.ok(gravity.activities.some(function (item) { return item.mechanic === "word_search"; }));
assert.ok(gravity.activities.some(function (item) { return item.mechanic === "spin"; }));
assert.ok(gravity.activities.some(function (item) { return item.mechanic === "quiz" && item.config.participation === "selected_pupil"; }));
assert.ok(gravity.activities.some(function (item) { return item.title === "Today we learned"; }));
var gravityBlob = JSON.stringify(gravity.activities).toLowerCase();
assert.ok(gravityBlob.indexOf("playtime") === -1);
assert.ok(gravityBlob.indexOf("home time") === -1);
assert.ok(gravityBlob.indexOf("the register") === -1);
assert.ok(gravityBlob.indexOf("gravity") !== -1);
assert.strictEqual(Core.brokenLesson(gravity), "");

var volcanoes = draftFrom("15 mins learning about volcanoes");
assert.strictEqual(volcanoes.topic, "Volcanoes");
assert.strictEqual(volcanoes.title, "Volcanoes Adventure");
Core.recommend(volcanoes);
assert.strictEqual(volcanoes.generationError, "");
var volcanoBlob = JSON.stringify(volcanoes.activities).toLowerCase();
assert.ok(volcanoBlob.indexOf("magma") !== -1);
assert.ok(volcanoBlob.indexOf("lava") !== -1);
assert.ok(volcanoBlob.indexOf("playtime") === -1);
assert.ok(volcanoes.activities.some(function (item) { return item.title === "Today we learned"; }));
assert.strictEqual(Core.brokenLesson(volcanoes), "");

var romans = draftFrom("20 minute lesson about the Romans");
Core.recommend(romans);
assert.strictEqual(romans.generationError, "");
var romanBlob = JSON.stringify(romans.activities).toLowerCase();
assert.ok(romanBlob.indexOf("rome") !== -1);
assert.ok(romanBlob.indexOf("britain") !== -1);
assert.ok(romanBlob.indexOf("playtime") === -1);
assert.strictEqual(Core.brokenLesson(romans), "");

var fractions = draftFrom("10 minute lesson on fractions");
assert.strictEqual(fractions.topic, "Fractions");
assert.strictEqual(fractions.title, "Fractions Adventure");
assert.strictEqual(fractions.targetMinutes, 10);
Core.recommend(fractions);
assert.strictEqual(fractions.generationError, "");
assert.ok(fractions.activities.some(function (item) { return item.mechanic === "quiz"; }));
assert.strictEqual(Core.brokenLesson(fractions), "");
assert.ok(JSON.stringify(fractions.activities).toLowerCase().indexOf("playtime") === -1);
assert.ok(fractions.minutes < gravity.targetMinutes + 8);

var bad = Core.blankDraft();
bad.title = "learn about gravity 11 mins adventure";
bad.topic = "learn about gravity 11 mins";
bad.goals = ["Understand gravity"];
bad.source.text = "learn about gravity 11 mins";
bad.activities = [{
  mechanic: "quiz",
  title: "learn about gravity 11 mins challenge",
  minutes: 2,
  config: {
    kind: "multiple",
    prompt: "Which idea belongs with learn about gravity 11 mins?",
    choices: ["learn about gravity 11 mins", "Playtime", "Home time", "The register"],
    correct: "learn about gravity 11 mins",
    questions: [{
      prompt: "Which idea belongs with learn about gravity 11 mins?",
      choices: ["learn about gravity 11 mins", "Playtime", "Home time", "The register"],
      correct: "learn about gravity 11 mins",
      kind: "multiple"
    }]
  }
}, {
  mechanic: "doors",
  title: "Choose one",
  minutes: 2,
  config: { lines: ["Door 1", "Door 2", "Door 3"] }
}];
assert.ok(Core.brokenLesson(bad));

function shortLesson(topic, minutes) {
  return {
    subject: "Lesson",
    topic: topic,
    yearGroup: "Year 4",
    title: topic + " Adventure",
    objectives: ["Understand the main idea of " + topic],
    activities: [
      {
        mechanic: "story",
        title: "Teach the idea",
        purpose: "Teach",
        minutes: 2,
        why: "The class hears the idea before any scored question.",
        config: { lines: [
          "The class hears one clear explanation of " + topic + " before anyone is asked a scored question.",
          "They use that explanation of " + topic + " to decide what the idea means."
        ] }
      },
      {
        mechanic: "quiz",
        title: "Discover",
        minutes: 4,
        config: {
          participation: "whole_class",
          questions: [{
            prompt: "Which idea belongs in a lesson about " + topic + "?",
            choices: [topic + " is the idea to learn", "A different classroom idea", "Another school idea"],
            correct: topic + " is the idea to learn",
            explain: topic + " is what the class is learning.",
            kind: "multiple"
          }]
        }
      },
      {
        mechanic: "spin",
        title: "Choose someone",
        minutes: 1,
        config: { prompt: "Can you name something else we should notice about " + topic + "?" }
      },
      {
        mechanic: "mystery",
        title: "Remember this",
        minutes: 2,
        config: { lines: [topic + " is the idea the class should remember from this lesson."] }
      },
      {
        mechanic: "doors",
        title: "Choose one",
        minutes: 2,
        config: {
          prompt: "Which example of " + topic + " should the class look at?",
          choices: ["Example one of " + topic, "Example two of " + topic, "Example three of " + topic],
          reveals: [
            "This example shows " + topic + " in one way.",
            "This example shows " + topic + " in another way.",
            "This example shows " + topic + " in a third way."
          ]
        }
      }
    ]
  };
}

var eleven = Brain.contextFrom(draftFrom("learn about gravity 11 mins"), { pupilCount: 4, availableMechanics: Brain.MECHANICS });
assert.strictEqual(eleven.lessonBrief.topic, "Gravity");
assert.strictEqual(eleven.lessonBrief.durationMinutes, 11);
assert.strictEqual(eleven.lessonBrief.rawRequest, "learn about gravity 11 mins");
assert.ok(eleven.lessonBrief.title.indexOf("learn about gravity 11 mins") === -1);
var accepted = Brain.accept(shortLesson("Gravity", 11), eleven);
assert.strictEqual(accepted.ok, true, (accepted.issues || []).join("; "));
assert.strictEqual(accepted.adventure.title, "Gravity Adventure");
assert.ok(accepted.adventure.estimateMinutes >= 8 && accepted.adventure.estimateMinutes <= 14);
var slides = Core.slidesFor({ activities: accepted.adventure.activities });
var door = slides.filter(function (slide) { return slide.type === "doors"; })[0];
assert.ok(door.choices[0].indexOf("Gravity") !== -1);
assert.ok(door.reveals[0].indexOf("Gravity") !== -1);
var spin = slides.filter(function (slide) { return slide.type === "spin"; })[0];
assert.ok(spin.lines[0].indexOf("?") !== -1);

var longer = JSON.parse(JSON.stringify(eleven));
longer.requestedMinutes = 30;
longer.topic = "Gravity";
var tooShort = Brain.accept(shortLesson("Gravity", 30), longer);
assert.strictEqual(tooShort.ok, false);

var volcanoDraft = draftFrom("15 mins learning about volcanoes");
var volcanoCtx = Brain.contextFrom(volcanoDraft, { pupilCount: 4, availableMechanics: Brain.MECHANICS });
var volcanoLesson = shortLesson("Volcanoes", 15);
volcanoLesson.activities[0].minutes = 6;
volcanoLesson.activities[2].minutes = 3;
volcanoLesson.activities[3].minutes = 3;
var volcanoAccepted = Brain.accept(volcanoLesson, volcanoCtx);
assert.strictEqual(volcanoAccepted.ok, true, (volcanoAccepted.issues || []).join("; "));
assert.strictEqual(volcanoAccepted.adventure.title, "Volcanoes Adventure");
assert.ok(volcanoAccepted.adventure.estimateMinutes > accepted.adventure.estimateMinutes);

var mismatched = {
  subject: "Science",
  topic: "Gravity",
  title: "Gravity Adventure",
  learningObjective: "Understand that gravity is a force that pulls objects towards the Earth",
  activities: [
    { mechanic: "story", minutes: 2, purpose: "Teach", config: { lines: ["When you let go of a ball, gravity pulls it down towards the Earth."] } },
    {
      mechanic: "quiz",
      minutes: 2,
      config: {
        questions: [{
          prompt: "What happens when you let go of a ball?",
          choices: [
            { text: "It falls towards the ground" },
            { text: "It floats upwards" },
            { text: "It stays in the air" },
            { text: "The ground pushes it away" }
          ],
          correctAnswer: "It falls towards the ground.",
          explanation: "Gravity pulls the ball towards Earth."
        }]
      }
    },
    { mechanic: "spin", minutes: 1, why: "Can you name something else that falls because of gravity?" },
    { mechanic: "mystery", minutes: 1, why: "Gravity is a force that pulls objects towards Earth." },
    { mechanic: "word_search", minutes: 6, config: { words: ["GRAVITY", "FORCE", "EARTH"] } },
    {
      mechanic: "doors",
      minutes: 2,
      config: {
        prompt: "Which object should we investigate?",
        choices: [
          { label: "A feather", reveal: "A feather still falls, but air can slow it down." },
          { label: "A football", reveal: "A football falls quickly towards the ground." },
          { label: "A pencil", reveal: "A pencil falls because gravity pulls it towards Earth." }
        ]
      }
    }
  ]
};
var recovered = Brain.accept(mismatched, eleven);
assert.strictEqual(recovered.ok, true, (recovered.issues || []).join("; "));
assert.strictEqual(recovered.adventure.title, "Gravity Adventure");
assert.ok(recovered.adventure.objectives[0].indexOf("gravity") !== -1);
var recoveredBlob = JSON.stringify(recovered.adventure.activities).toLowerCase();
assert.ok(recoveredBlob.indexOf("playtime") === -1);
assert.ok(recoveredBlob.indexOf("word_search") === -1);
assert.ok(recoveredBlob.indexOf("feather") !== -1);
assert.ok(recoveredBlob.indexOf("learn about gravity 11 mins") === -1);
assert.ok(recovered.adventure.estimateMinutes >= 8 && recovered.adventure.estimateMinutes <= 14);

var nonsense = JSON.parse(JSON.stringify(mismatched));
nonsense.activities[1].config.questions[0].choices = ["Playtime", "Home time", "The register", "It falls towards the ground"];
nonsense.activities[1].config.questions[0].correctAnswer = "Playtime";
var rejected = Brain.accept(nonsense, eleven);
assert.strictEqual(rejected.ok, false);
assert.ok((rejected.issues || []).join(" ").indexOf("Playtime") !== -1);

var creator = require("fs").readFileSync(require("path").join(__dirname, "../schools/learn/creator.js"), "utf8");
var brain = require("fs").readFileSync(require("path").join(__dirname, "../js/lesson-brain.js"), "utf8");
assert.ok(creator.indexOf(">Try again</button>") !== -1);
assert.ok(creator.indexOf("build.addEventListener(\"click\", beginBuild)") !== -1);
assert.ok(creator.indexOf("++generationToken") !== -1);
assert.ok(brain.indexOf("attemptId: freshId(\"try\")") !== -1);
assert.ok(creator.indexOf("Brain.request(ctx)") !== -1);

var followed = Core.blankDraft();
followed.activities = [
  { id: "s", mechanic: "spin", title: "Choose someone", minutes: 1, config: { prompt: "" } },
  { id: "q", mechanic: "quiz", title: "Your turn", minutes: 2, config: { participation: "selected_pupil", prompt: "What happens when you let go of a ball?", choices: ["It falls"], correct: "It falls", questions: [{ prompt: "What happens when you let go of a ball?", choices: ["It falls"], correct: "It falls", explain: "Gravity pulls the ball towards Earth.", kind: "multiple" }] } }
];
var followedSlides = Core.slidesFor(followed);
assert.strictEqual(followedSlides[0].prompt, "What happens when you let go of a ball?");
assert.ok(followedSlides[0].reveal.indexOf("Gravity") !== -1);

console.log("lesson brief tests passed");
