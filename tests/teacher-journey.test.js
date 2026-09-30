"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
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
  return { id: id, firstName: name, presentation: presentation || "", hair: "brown", length: "short" };
}

function room() {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Year 2",
    yearLabel: "Year 2",
    organisationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    pupils: [
      pupil("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "Amelia", "girl"),
      pupil("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "Noah", "boy"),
      pupil("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3", "Sofia", "girl"),
      pupil("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4", "Jack", "boy")
    ]
  };
}

var year2 = room();
var draft = Core.blankDraft();
draft.title = "2 times table";
draft.subject = "Maths";
draft.year = "Year 2";
draft.yearSource = "teacher";
Core.setClass(draft, year2);
assert.strictEqual(draft.classId, year2.id);
assert.strictEqual(draft.className, "Year 2");
assert.strictEqual(draft.classYear, "Year 2");
assert.strictEqual(Core.takingPart(draft, year2).length, 4);
assert.strictEqual(year2.pupils.length, 4);

var saved = Core.toAdventure(draft, year2.organisationId);
assert.strictEqual(saved.classId, year2.id);
assert.strictEqual(saved.className, "Year 2");
assert.strictEqual(saved.creator, "v2");
assert.strictEqual(saved.organisationId, year2.organisationId);

draft.playMode = "two";
Core.ensureTeams(draft, Core.takingPart(draft, year2));
var teamsBefore = JSON.stringify(draft.teams);
var classBefore = JSON.stringify(year2);
Core.excludePupil(draft, year2.pupils[3].id, true);
assert.strictEqual(Core.takingPart(draft, year2).length, 3);
assert.strictEqual(JSON.stringify(draft.teams), teamsBefore);
assert.strictEqual(JSON.stringify(year2), classBefore);
var plan = Core.sessionPlan(draft, year2);
assert.strictEqual(JSON.stringify(draft.teams), teamsBefore);
assert.ok(plan.pupils.every(function (pupilRow) { return pupilRow.id !== year2.pupils[3].id; }));
assert.ok((plan.assignments || []).every(function (row) { return row.id !== year2.pupils[3].id; }));
assert.strictEqual(plan.classId, year2.id);
assert.strictEqual(plan.playMode, "two");

Core.addGuest(draft, "Sam Visitor");
var withGuest = Core.sessionPlan(draft, year2);
assert.ok(withGuest.guests.some(function (guest) { return guest.firstName === "Sam" && guest.temporary === true; }));
assert.ok(!year2.pupils.some(function (pupilRow) { return pupilRow.firstName === "Sam"; }));
assert.strictEqual(JSON.stringify(year2), classBefore);

var reloaded = Core.fromAdventure(Core.toAdventure(draft, year2.organisationId));
assert.strictEqual(reloaded.playMode, "two");
assert.ok(reloaded.teams.length >= 2);

Core.addActivity(draft, "spin", Mechanics);
Core.addActivity(draft, "quiz", Mechanics);
var quiz = draft.activities[draft.activities.length - 1];
quiz.config.prompt = "What is 6 × 2?";
quiz.config.choices = ["10", "12", "14", "16"];
quiz.config.correct = "12";
quiz.config.points = 1;
quiz.config.participation = "selected_pupil";
var slides = Core.slidesFor(draft);
var quizSlide = slides.filter(function (slide) { return slide.type === "question"; }).pop();
assert.strictEqual(quizSlide.participation, "selected_pupil");
var roundTrip = Core.fromAdventure(Core.toAdventure(draft, year2.organisationId));
var keptQuiz = roundTrip.activities.filter(function (activity) { return activity.mechanic === "quiz"; }).pop();
assert.strictEqual(Core.participationOf(keptQuiz), "selected_pupil");

var school = year2.organisationId;
var created = Engine.createSession({
  organisationId: school,
  classId: year2.id,
  sessionCode: "TIMES-01",
  mode: "board",
  adventure: { id: saved.id, organisationId: school, title: "2 times table", rounds: [{ mechanic: "spin", config: {} }, { mechanic: "quiz", config: quizSlide }] }
});
assert.strictEqual(created.ok, true);
var state = created.state;
year2.pupils.slice(0, 3).forEach(function (pupilRow) {
  var added = Engine.addParticipant(state, {
    id: pupilRow.id,
    displayName: pupilRow.firstName,
    identity: "pupil",
    pupilId: pupilRow.id,
    organisationId: school,
    classId: year2.id
  });
  assert.strictEqual(added.ok, true);
  state = added.state;
});
var teamed = Engine.createTeams(state, { mode: "two", names: ["Red", "Blue"], assign: true });
assert.strictEqual(teamed.ok, true);
state = teamed.state;
var started = Engine.startSession(state);
assert.strictEqual(started.ok, true);
state = started.state;
var amelia = state.participants.filter(function (person) { return person.displayName === "Amelia"; })[0];
var picked = Engine.selectParticipant(state, amelia.id);
assert.strictEqual(picked.ok, true);
state = picked.state;
var target = Mechanics.scoreTarget(state, "selected_pupil");
assert.strictEqual(target.kind, "team");
assert.strictEqual(target.teamId, amelia.teamId);
var outcome = Mechanics.quizOutcome({ participation: "selected_pupil", question: { kind: "multiple", prompt: "What is 6 × 2?", choices: ["10", "12", "14", "16"], correct: "12", points: 1 } }, "B", {
  selected: state.participants.filter(function (person) { return person.id === state.selectedParticipantId; })[0],
  teams: state.teams,
  teamMode: state.teamMode,
  participation: "selected_pupil",
  roundId: "quiz-1"
});
assert.strictEqual(outcome.correct, true);
assert.strictEqual(outcome.response.participantId, amelia.id);
assert.strictEqual(outcome.score.teamId, amelia.teamId);
var awarded = Engine.awardPoints(state, outcome.score.teamId, outcome.score.amount, outcome.score.reason);
assert.strictEqual(awarded.ok, true);
state = awarded.state;
var redPoints = state.teams.filter(function (team) { return team.id === amelia.teamId; })[0].points;
assert.strictEqual(redPoints, 1);
var moved = Engine.nextRound(state);
assert.strictEqual(moved.ok, true);
assert.strictEqual(moved.state.teams.filter(function (team) { return team.id === amelia.teamId; })[0].points, 1);

var alone = Engine.createSession({
  organisationId: school,
  classId: year2.id,
  sessionCode: "TIMES-02",
  mode: "board",
  adventure: { id: saved.id, title: "2 times table", rounds: [{ mechanic: "quiz", config: {} }] }
});
var solo = Engine.addParticipant(alone.state, { id: amelia.id, displayName: "Amelia", identity: "pupil", pupilId: amelia.id, organisationId: school, classId: year2.id });
var soloStart = Engine.startSession(solo.state);
var classScore = Mechanics.scoreTarget(soloStart.state, "selected_pupil");
assert.strictEqual(classScore.kind, "class");
assert.strictEqual(classScore.teamId, null);
var classAward = Engine.awardPoints(soloStart.state, null, 1, "class-reward");
assert.strictEqual(classAward.state.rewardTotal, 1);
assert.ok(!classAward.state.teams.length);

var finished = Engine.completeSession(state);
assert.strictEqual(finished.ok, true);
assert.strictEqual(finished.state.result.sessionId, state.sessionId);
var replay = Engine.createSession({
  organisationId: school,
  classId: year2.id,
  sessionCode: "TIMES-03",
  mode: "board",
  adventure: { id: saved.id, title: "2 times table", rounds: [{ mechanic: "quiz", config: {} }] }
});
assert.notStrictEqual(replay.state.sessionId, finished.state.sessionId);

var legacy = {
  id: "legacy-adventure",
  creator: "legacy",
  title: "Old lesson",
  plan: {
    activities: [{ mechanic: "matching", title: "Matching game", config: {} }, { mechanic: "quiz", title: "Pop quiz", config: { prompt: "2 x 2", choices: ["4", "5"], correct: "4", points: 1 } }],
    slides: [{ type: "matching" }]
  }
};
assert.strictEqual(Core.isCurrent(legacy), false);
assert.deepStrictEqual(Core.libraryActions(legacy), ["Update this adventure"]);
var updated = Core.fromAdventure(legacy);
assert.notStrictEqual(updated.id, legacy.id);
assert.ok(!updated.activities.some(function (activity) { return activity.mechanic === "matching"; }));
assert.strictEqual(legacy.plan.activities[0].mechanic, "matching");
var currentActions = Core.libraryActions(Core.toAdventure(draft, school));
["Groups or devices", "Share with teacher", "Use next year", "Favourited", "Teacher preview"].forEach(function (label) {
  assert.strictEqual(currentActions.indexOf(label), -1);
});
assert.ok(currentActions.indexOf("Start") !== -1);

var home = fs.readFileSync(path.join(__dirname, "../schools/learn/home.js"), "utf8");
var roomJs = fs.readFileSync(path.join(__dirname, "../schools/learn/class-room.js"), "utf8");
assert.ok(home.indexOf("Continue lesson") !== -1);
assert.ok(home.indexOf("present.html?session=") !== -1);
assert.ok(home.indexOf("Start adventure") !== -1);
assert.ok(roomJs.indexOf("Continue lesson") !== -1);
assert.ok(roomJs.indexOf("create.html?quick=1&class=") !== -1);
assert.strictEqual(roomJs.indexOf("present.html?example=lights"), -1);

global.WondiiOrg = { get: function () { return { organisationId: school }; } };
global.WondiiLearn.upsertLibrary(Core.toAdventure(draft, school));
var other = Core.toAdventure(Core.blankDraft(), "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
other.title = "Other school adventure";
var list = JSON.parse(localStorage.getItem("wondii-learning-adventures"));
list.push(other);
localStorage.setItem("wondii-learning-adventures", JSON.stringify(list));
var visible = global.WondiiLearn.visibleLibrary();
assert.ok(visible.every(function (item) { return item.organisationId === school; }));
assert.ok(!visible.some(function (item) { return item.title === "Other school adventure"; }));

var guess = Mechanics.scoreTarget({ teams: [{ id: "red", name: "Red" }, { id: "blue", name: "Blue" }], teamMode: "two", participants: [], selectedParticipantId: null, activeTeamId: "" }, "team_turn");
assert.strictEqual(guess.kind, "none");

var createHtml = fs.readFileSync(path.join(__dirname, "../schools/learn/create.html"), "utf8");
var creatorJs = fs.readFileSync(path.join(__dirname, "../schools/learn/creator.js"), "utf8");
var worker = fs.readFileSync(path.join(__dirname, "../workers-site/index.ts"), "utf8");
var sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
assert.strictEqual(createHtml.indexOf("flow.js"), -1);
assert.strictEqual(createHtml.indexOf("create.js"), -1);
assert.ok(createHtml.indexOf("creator.js?v=8") !== -1);
assert.ok(creatorJs.indexOf("What are we learning today?") !== -1);
assert.ok(creatorJs.indexOf("Tell Wondii what you would like your class to learn.") !== -1);
assert.strictEqual(creatorJs.indexOf("Groups or devices"), -1);
assert.strictEqual(creatorJs.indexOf("Quick create"), -1);
assert.ok(worker.indexOf("learnDocument") !== -1);
assert.ok(sw.indexOf("jigsaw-kids-v372") !== -1);
["Groups or devices", "Share with teacher", "Use next year", "Saved in this browser.", "Quick create", "Guided create", "Use with my class does not copy the adventure"].forEach(function (label) {
  assert.strictEqual(createHtml.indexOf(label), -1);
});

console.log("teacher-journey.test.js ok");
