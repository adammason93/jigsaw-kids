var assert = require("assert");
var Engine = require("../js/learning-session.js");
var Core = require("../schools/learn/creator-core.js");
var Mechanics = require("../schools/learn/mechanic-core.js");

var store = {};
global.localStorage = {
  getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  setItem: function (key, value) { store[key] = String(value); },
  removeItem: function (key) { delete store[key]; }
};
global.document = { createElement: function () { return {}; }, head: { appendChild: function () {} } };
global.window = global;
global.WondiiSessionEngine = Engine;
require("../schools/learn/model.js");
require("../schools/learn/session.js");

function pupil(id, name, presentation) {
  return { id: id, firstName: name, presentation: presentation || "", hair: "blonde", length: "long" };
}

function room() {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Year 1",
    yearLabel: "Year 1",
    pupils: [
      pupil("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "Amelia", "girl"),
      pupil("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "Noah", "boy"),
      pupil("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3", "Sofia", "girl"),
      pupil("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", "Jack", "boy")
    ]
  };
}

var text = "Year 4 science\nElectricity\nLearning objective:\nIdentify whether a lamp will light.\nKey vocabulary:\nCircuit, Battery, Switch, Current";
var analysis = Core.analyseSource(text);
assert.strictEqual(analysis.yearStated, true);
assert.strictEqual(analysis.year, "Year 4");
assert.strictEqual(analysis.subject, "Science");
assert.ok(analysis.vocabulary.indexOf("CIRCUIT") !== -1);

var draft = Core.blankDraft();
Core.applyAnalysis(draft, analysis);
var year1 = room();
Core.setClass(draft, year1);
assert.strictEqual(draft.classId, year1.id);
assert.strictEqual(draft.classYear, "Year 1");
assert.strictEqual(draft.year, "Year 4");
assert.strictEqual(draft.yearSource, "stated");
Core.setLearningYear(draft, "Year 3");
assert.strictEqual(year1.yearLabel, "Year 1");
assert.strictEqual(draft.year, "Year 3");

var plain = Core.blankDraft();
Core.setClass(plain, year1);
assert.strictEqual(plain.year, "Year 1");
assert.strictEqual(plain.yearSource, "class");
assert.strictEqual(Core.takingPart(plain, year1).length, 4);
Core.excludePupil(plain, year1.pupils[3].id, true);
assert.strictEqual(Core.takingPart(plain, year1).length, 3);
assert.strictEqual(year1.pupils.length, 4);
var beforeClass = JSON.stringify(year1);
Core.addGuest(plain, "Visitor");
assert.strictEqual(JSON.stringify(year1), beforeClass);
assert.strictEqual(plain.guests[0].temporary, true);

assert.strictEqual(Core.playMode("two").engine, "two");
assert.strictEqual(Core.playMode("teacher_class").engine, "teacher_class");
assert.strictEqual(Core.playMode("individual").engine, "none");
plain.playMode = "two";
Core.ensureTeams(plain, Core.takingPart(plain, year1));
var assigned = {};
plain.teams.forEach(function (team) {
  team.pupilIds.forEach(function (id) {
    assert.ok(!assigned[id]);
    assigned[id] = team.name;
  });
});
assert.strictEqual(Object.keys(assigned).length, 3);
assert.ok(!assigned[year1.pupils[3].id]);

var other = room();
other.id = "22222222-2222-4222-8222-222222222222";
other.pupils = [pupil("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", "Maya", "girl")];
Core.setClass(plain, other);
assert.strictEqual(plain.classId, other.id);
assert.deepStrictEqual(plain.teams, []);
assert.ok(JSON.stringify(plain).indexOf(year1.pupils[0].id) === -1);

var caps = Core.capabilities(Mechanics).map(function (item) { return item.id; });
assert.deepStrictEqual(caps, ["quiz", "spin", "word_search", "story", "mystery", "doors"]);
assert.strictEqual(Core.capability("matching", Mechanics), null);

Core.recommend(draft);
assert.ok(draft.activities.some(function (item) { return item.mechanic === "quiz"; }));
assert.ok(draft.activities.some(function (item) { return item.mechanic === "spin"; }));
assert.ok(draft.activities.some(function (item) { return item.mechanic === "word_search"; }));
assert.ok(!draft.activities.some(function (item) { return item.mechanic === "matching"; }));
var spin = draft.activities.filter(function (item) { return item.mechanic === "spin"; })[0];
assert.strictEqual(spin.config.avoidRepeat, true);
assert.ok(!spin.config.seed);

var quiz = draft.activities.filter(function (item) { return item.mechanic === "quiz"; })[0];
quiz.config.correct = "";
assert.strictEqual(Core.activityIssue(quiz, Mechanics), "This quiz needs a correct answer.");
quiz.config.correct = quiz.config.choices[0];
assert.strictEqual(Core.activityIssue(quiz, Mechanics), "");

var hunt = draft.activities.filter(function (item) { return item.mechanic === "word_search"; })[0];
hunt.config.words = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN"];
assert.strictEqual(Core.activityIssue(hunt, Mechanics), "A word search can hold up to 12 words.");
hunt.config.words = ["CIRCUIT", "BATTERY", "SWITCH", "CURRENT"];
assert.strictEqual(Core.activityIssue(hunt, Mechanics), "");

var order = draft.activities.map(function (item) { return item.id; });
Core.moveActivity(draft, 0, 1);
assert.strictEqual(draft.activities[1].id, order[0]);
var before = draft.activities.length;
Core.duplicateActivity(draft, 0);
assert.strictEqual(draft.activities.length, before + 1);
assert.notStrictEqual(draft.activities[0].id, draft.activities[1].id);
Core.removeActivity(draft, 0);
assert.strictEqual(draft.activities.length, before);

var saved = Core.toAdventure(draft, "org-a");
assert.strictEqual(saved.organisationId, "org-a");
assert.ok(!saved.away);
assert.ok(saved.plan.slides.length);
saved.plan.slides.forEach(function (slide) {
  assert.ok(["question", "spin", "word_search", "story", "mystery", "doors"].indexOf(slide.type) !== -1);
});

var copy = Core.fromAdventure(saved);
assert.notStrictEqual(copy.id, saved.id);
assert.strictEqual(copy.adaptedFrom, saved.id);
copy.activities[0].title = "Changed";
assert.notStrictEqual(saved.plan.activities[0].title, "Changed");

var originalAway = plain.away.slice();
var adventure = Core.toAdventure(plain, "org-a");
plain.away = [other.pupils[0].id];
assert.ok(!adventure.away);

global.WondiiOrg = { get: function () { return { organisationId: "org-a" }; } };
global.WondiiLearn.upsertLibrary(Core.toAdventure(Core.blankDraft(), "org-a"));
var hidden = Core.toAdventure(Core.blankDraft(), "org-b");
hidden.title = "Other school";
var list = JSON.parse(localStorage.getItem("wondii-learning-adventures"));
list.push(hidden);
localStorage.setItem("wondii-learning-adventures", JSON.stringify(list));
var visible = global.WondiiLearn.visibleLibrary();
assert.ok(visible.every(function (item) { return item.organisationId === "org-a"; }));
assert.ok(!visible.some(function (item) { return item.title === "Other school"; }));

var startDraft = Core.blankDraft();
Core.applyAnalysis(startDraft, analysis);
Core.setClass(startDraft, year1);
Core.excludePupil(startDraft, year1.pupils[1].id, true);
startDraft.playMode = "two";
Core.recommend(startDraft);
var plan = Core.sessionPlan(startDraft, year1);
var created = Engine.createSession({
  sessionCode: "ABCDEF",
  organisationId: "org-a",
  classId: plan.classId,
  mode: "board",
  adventure: { id: "adv", title: "Electricity", rounds: [{ mechanic: "quiz", config: {} }] }
});
assert.strictEqual(created.ok, true);
var state = created.state;
plan.pupils.concat(plan.guests || []).forEach(function (pupil) {
  var pupilId = !pupil.temporary && Engine.isUuid(pupil.id) ? pupil.id : null;
  var added = Engine.addParticipant(state, {
    id: pupil.id,
    displayName: pupil.firstName,
    identity: pupil.temporary ? "anonymous" : "pupil",
    pupilId: pupilId,
    classId: plan.classId
  });
  if (added.ok) state = added.state;
});
var teams = Engine.createTeams(state, { mode: plan.teamMode, names: plan.teamNames, assign: false });
assert.strictEqual(teams.ok, true);
state = teams.state;
plan.assignments.forEach(function (row) {
  var team = state.teams[row.teamIndex];
  var assigned = Engine.assignTeam(state, row.id, team.id);
  if (assigned.ok) state = assigned.state;
});
var started = Engine.startSession(state);
assert.strictEqual(started.ok, true);
var names = started.state.participants.map(function (person) { return person.displayName; });
assert.ok(names.indexOf("Amelia") !== -1);
assert.ok(names.indexOf("Noah") === -1);
assert.strictEqual(year1.pupils.length, 4);
var pizza = Core.blankDraft();
pizza.source.text = "20 minute fractions recap using pizzas.";
Core.setClass(pizza, year1);
Core.applyAnalysis(pizza, Core.analyseSource(pizza.source.text));
assert.strictEqual(pizza.year, "Year 1");
assert.strictEqual(pizza.classId, year1.id);
assert.strictEqual(pizza.targetMinutes, 20);
Core.recommend(pizza);
assert.strictEqual(pizza.generationError, "");
assert.ok(pizza.minutes >= 16 && pizza.minutes <= 24);
assert.ok(pizza.minutes !== pizza.targetMinutes || pizza.activities.length > 1);
assert.strictEqual(Core.validateAdventure(pizza, Mechanics).length, 0);
var pizzaBlob = JSON.stringify(pizza.activities).toLowerCase();
["question not written yet", "this quiz needs a question", "question goes here", "add question", "tbc", "todo"].forEach(function (label) {
  assert.strictEqual(pizzaBlob.indexOf(label), -1);
});
var pizzaQuizzes = pizza.activities.filter(function (item) { return item.mechanic === "quiz"; });
assert.ok(pizzaQuizzes.length >= 2);
pizzaQuizzes.forEach(function (item) {
  assert.ok(String(item.config.prompt).length > 8);
  assert.ok(item.config.choices.indexOf(item.config.correct) !== -1);
  assert.ok(/half|quarter|pizza/i.test(item.config.prompt + " " + item.title));
});
var pizzaWords = pizza.activities.filter(function (item) { return item.mechanic === "word_search"; })[0];
assert.ok(pizzaWords);
assert.ok(pizzaWords.config.words.indexOf("HALF") !== -1);
assert.strictEqual(pizza.classId, year1.id);

var phonics = Core.blankDraft();
phonics.source.text = "10 minute phonics recap on sh and ch.";
Core.setClass(phonics, year1);
Core.applyAnalysis(phonics, Core.analyseSource(phonics.source.text));
assert.strictEqual(phonics.targetMinutes, 10);
assert.strictEqual(phonics.topic, "Phonics");
Core.recommend(phonics);
assert.ok(phonics.minutes >= 8 && phonics.minutes <= 12);
assert.strictEqual(Core.issues(phonics, Mechanics).length, 0);
assert.ok(JSON.stringify(phonics.activities).toLowerCase().indexOf("pizza") === -1);
assert.ok(/sh|ch/i.test(JSON.stringify(phonics.activities)));

var waterRoom = room();
waterRoom.yearLabel = "Year 3";
waterRoom.name = "Year 3";
var water = Core.blankDraft();
water.source.text = "30 minute Year 3 lesson on the water cycle.";
Core.setClass(water, waterRoom);
Core.applyAnalysis(water, Core.analyseSource(water.source.text));
assert.strictEqual(water.year, "Year 3");
assert.strictEqual(water.targetMinutes, 30);
Core.recommend(water);
assert.ok(water.minutes >= 24 && water.minutes <= 36);
assert.strictEqual(Core.issues(water, Mechanics).length, 0);
assert.ok(/evaporation|condensation|precipitation|cloud/i.test(JSON.stringify(water.activities)));
assert.notStrictEqual(water.activities[0].title, pizza.activities[0].title);

var emptyQuiz = Core.quizFrom ? null : Core.blankDraft();
emptyQuiz.activities = [{ mechanic: "quiz", title: "Quiz", minutes: 4, config: { kind: "multiple", prompt: "", choices: ["Yes", "No"], correct: "", points: 1 } }];
assert.ok(Core.validateActivity(emptyQuiz.activities[0], Mechanics).ok === false);
assert.ok(Core.validateAdventure(emptyQuiz, Mechanics).length > 0);
emptyQuiz.activities[0].config.prompt = "Question not written yet";
emptyQuiz.activities[0].config.correct = "Yes";
assert.ok(Core.activityIssue(emptyQuiz.activities[0], Mechanics));

var beforeMinutes = pizza.minutes;
var firstId = pizza.activities[0].id;
var firstPrompt = pizza.activities[0].config && pizza.activities[0].config.prompt;
Core.moveActivity(pizza, 0, 1);
assert.strictEqual(pizza.activities[1].id, firstId);
if (firstPrompt) assert.strictEqual(pizza.activities[1].config.prompt, firstPrompt);
var countBefore = pizza.activities.length;
Core.duplicateActivity(pizza, 1);
assert.strictEqual(pizza.activities.length, countBefore + 1);
assert.notStrictEqual(pizza.activities[1].id, pizza.activities[2].id);
assert.strictEqual(pizza.activities[2].config.prompt, pizza.activities[1].config.prompt);
Core.removeActivity(pizza, 2);
assert.strictEqual(pizza.activities.length, countBefore);
assert.ok(pizza.minutes < beforeMinutes + pizza.activities[1].minutes);
assert.strictEqual(pizza.targetMinutes, 20);

var seen = {};
started.state.participants.forEach(function (person) {
  if (person.identity !== "pupil") return;
  assert.ok(person.teamId);
  assert.ok(!seen[person.id]);
  seen[person.id] = 1;
});
assert.strictEqual(Object.keys(seen).length, 3);

var session = global.ClassRooms.createSession(Core.toAdventure(startDraft, "org-a"), "board", false, plan);
assert.ok(session);
assert.strictEqual(session.engine.status, "active");
assert.ok(session.engine.participants.some(function (person) { return person.displayName === "Amelia"; }));
assert.ok(!session.engine.participants.some(function (person) { return person.displayName === "Noah"; }));

console.log("adventure creator tests passed");
