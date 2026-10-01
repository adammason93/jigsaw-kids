"use strict";

var assert = require("assert");
var Engine = require("../js/learning-session.js");
var Core = require("../schools/learn/mechanic-core.js");
var Mechanics = require("../schools/learn/lesson-mechanics.js");
var Shell = require("../schools/learn/lesson-shell.js");

var school = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
var room = "11111111-1111-4111-8111-111111111111";
var adventure = "33333333-3333-4333-8333-333333333333";
var amelia = "44444444-4444-4444-8444-444444444444";
var noah = "55555555-5555-4555-8555-555555555555";

function roundsFrom(slides) {
  return slides.map(function (slide) {
    var type = slide.type || "story";
    var mechanic = type === "question" ? "quiz" : type === "word-search" ? "word_search" : type;
    return { mechanic: mechanic, config: slide };
  });
}

function session(slides, mode) {
  var created = Engine.createSession({
    organisationId: school,
    classId: room,
    sessionCode: "ELEC-1001",
    mode: "board",
    adventure: { id: adventure, organisationId: school, title: "Electricity Adventure", yearGroup: "Year 4", rounds: roundsFrom(slides) }
  });
  assert.strictEqual(created.ok, true);
  var state = created.state;
  [amelia, noah].forEach(function (id, index) {
    var added = Engine.addParticipant(state, {
      id: id,
      displayName: index === 0 ? "Amelia" : "Noah",
      identity: "pupil",
      pupilId: id,
      organisationId: school,
      classId: room
    });
    assert.strictEqual(added.ok, true);
    state = added.state;
  });
  if (mode === "two") {
    var teams = Engine.createTeams(state, { mode: "two", assign: true });
    assert.strictEqual(teams.ok, true);
    state = teams.state;
  }
  var started = Engine.startSession(state);
  assert.strictEqual(started.ok, true);
  return started.state;
}

assert.strictEqual(Core.resolve("quiz").canonical, true);
assert.strictEqual(Core.resolve("question").id, "quiz");
assert.strictEqual(Core.resolve("word-search").id, "word_search");
assert.strictEqual(Core.resolve("story").adapter, true);
assert.strictEqual(Core.resolve("treasure").unknown, true);
assert.strictEqual(Mechanics.render({ type: "treasure" }, {}).invalid, true);

var two = Core.normaliseQuiz({ question: { prompt: "Yes?", choices: ["Yes", "No"], correct: "Yes" } });
var three = Core.normaliseQuiz({ question: { prompt: "Path?", choices: ["Gap", "Metal", "Colour"], correct: "Gap" } });
var four = Core.normaliseQuiz(Core.fixtureSlides()[0]);
assert.strictEqual(two.choices.length, 2);
assert.strictEqual(three.choices.length, 3);
assert.strictEqual(four.choices.length, 4);
assert.strictEqual(four.correct, "B");
var boolQuiz = Core.normaliseQuiz(Core.fixtureSlides()[2]);
assert.strictEqual(boolQuiz.kind, "boolean");
assert.deepStrictEqual(boolQuiz.choices.map(function (choice) { return choice.text; }), ["True", "False"]);

var alone = session([Core.fixtureSlides()[0]], "none");
var picked = Core.quizOutcome(Core.fixtureSlides()[0], "B", { selected: alone.participants[0], teams: [], roundId: alone.rounds[0].id });
assert.strictEqual(picked.correct, true);
assert.strictEqual(picked.response.participantId, amelia);
assert.strictEqual(picked.response.responseType, "choice");
assert.ok(picked.score);
assert.strictEqual(picked.score.teamId, null);
var committed = Core.commitMechanic(Engine, alone, {
  roundId: alone.rounds[0].id,
  emission: { response: picked.response, score: picked.score, actionId: "quiz-test" },
  reveal: true
});
assert.strictEqual(committed.ok, true);
assert.strictEqual(committed.state.rewardTotal, 1);
assert.strictEqual(committed.state.responses[0].correct, true);
assert.strictEqual(committed.state.events.some(function (event) { return event.scope === "pupil" && event.pupilId === amelia; }), true);
assert.strictEqual(committed.state.reveal, true);

var wrong = Core.quizOutcome(Core.fixtureSlides()[0], "A", { selected: alone.participants[0], teams: [], roundId: "r" });
assert.strictEqual(wrong.correct, false);
assert.strictEqual(wrong.score, null);

var paused = Engine.pauseSession(committed.state);
assert.strictEqual(Core.allowsInput(paused.state.status), false);
assert.strictEqual(Engine.recordResponse(paused.state, {
  participantId: amelia,
  responseType: "choice",
  value: "C",
  correct: false
}).ok, false);

var classOnly = session([Core.fixtureSlides()[2]], "none");
var voice = Core.quizOutcome(Core.fixtureSlides()[2], "true", { selected: null, teams: [], roundId: classOnly.rounds[0].id });
assert.strictEqual(voice.response.classVoice, true);
var voiced = Core.commitMechanic(Engine, classOnly, {
  roundId: classOnly.rounds[0].id,
  emission: { response: voice.response, score: voice.score, actionId: "bool" },
  reveal: true
});
assert.strictEqual(voiced.ok, true);
assert.strictEqual(voiced.state.events.some(function (event) { return event.type === "answer_correct" && event.scope === "pupil"; }), false);

var spinState = session([{ type: "spin", kicker: "Spin" }], "none");
var firstSpin = Core.spinNext(spinState.participants, {}, spinState.sessionId, {});
assert.strictEqual(firstSpin.ok, true);
assert.ok(firstSpin.id === amelia || firstSpin.id === noah);
var secondSpin = Core.spinNext(spinState.participants, firstSpin.state, spinState.sessionId, {});
assert.notStrictEqual(secondSpin.id, firstSpin.id);
var chosen = Engine.selectParticipant(spinState, firstSpin.id);
assert.strictEqual(chosen.ok, true);
assert.strictEqual(Engine.mechanicContext(chosen.state).selectedParticipant.id, firstSpin.id);

var many = Engine.createSession({
  organisationId: school,
  classId: room,
  mode: "board",
  adventure: { id: adventure, organisationId: school, title: "Spin", rounds: [{ mechanic: "spin", config: { type: "spin" } }] }
}).state;
var names = [];
var n;
for (n = 0; n < 30; n++) {
  var id = "66666666-6666-4666-8666-" + String(100000000000 + n);
  names.push(id);
  many = Engine.addParticipant(many, { id: id, displayName: n === 7 ? "Alexandria-Jane" : "Pupil " + (n + 1), identity: "pupil", pupilId: id, organisationId: school, classId: room }).state;
}
many = Engine.startSession(many).state;
var bag = {};
var seen = {};
var last = "";
for (n = 0; n < 30; n++) {
  var turn = Core.spinNext(many.participants, bag, "class-30", { avoidRepeat: true });
  assert.strictEqual(turn.ok, true);
  assert.ok(!seen[turn.id]);
  if (last) assert.notStrictEqual(turn.id, last);
  seen[turn.id] = 1;
  last = turn.id;
  bag = turn.state;
}
assert.strictEqual(Object.keys(seen).length, 30);
var again = Core.spinNext(many.participants, bag, "class-30", { avoidRepeat: true });
assert.notStrictEqual(again.id, last);
assert.strictEqual(Core.spinWindow(many.participants, bag.order, last).length, 5);

var restored = Engine.saveMechanicState(many, many.rounds[0].id, bag);
assert.deepStrictEqual(Engine.readMechanicState(restored.state, many.rounds[0].id).picked.length, 30);

var words = ["CIRCUIT", "BATTERY", "SWITCH", "CURRENT"];
var puzzleA = Core.generateWordSearch({ words: words }, "same-seed");
var puzzleB = Core.generateWordSearch({ words: words }, "same-seed");
assert.strictEqual(puzzleA.ok, true);
assert.deepStrictEqual(puzzleA.grid, puzzleB.grid);
words.forEach(function (word) {
  assert.ok(puzzleA.words.indexOf(word) !== -1);
  var place = puzzleA.placements.filter(function (item) { return item.word === word; })[0];
  assert.ok(place);
  var spelled = place.cells.map(function (cell) { return puzzleA.grid[cell.r][cell.c]; }).join("");
  assert.strictEqual(spelled, word);
});
var hit = Core.checkPath(puzzleA, puzzleA.placements[0].cells);
assert.strictEqual(hit.word, puzzleA.placements[0].word);
assert.strictEqual(Core.checkPath(puzzleA, [{ r: 0, c: 0 }, { r: 0, c: 1 }]), null);
var kept = JSON.parse(JSON.stringify(puzzleA));
kept.found = [hit.word];
var recovered = Core.generateWordSearch({ words: words }, "same-seed");
assert.deepStrictEqual(recovered.grid, puzzleA.grid);
assert.deepStrictEqual(kept.found, [hit.word]);
assert.strictEqual(Core.generateWordSearch({ words: ["THISWORDISTOOLONGFORAGRID"] }, "x").ok, false);
assert.strictEqual(Core.generateWordSearch({ words: ["CAT", "DOG", "HAT", "BAT", "RAT", "MAT", "SIT", "CUP", "PEN", "BOX", "SUN", "MOON", "STAR"] }, "x").error, "too_many_words");

var searchSlides = [Core.fixtureSlides()[3]];
var searching = session(searchSlides, "none");
var made = Core.generateWordSearch(searchSlides[0], searching.sessionId + ":" + searching.rounds[0].id);
var award = Core.wordAward(searchSlides[0], made.placements[0].word, { selected: searching.participants[0], teams: [], roundId: searching.rounds[0].id });
var found = Core.commitMechanic(Engine, searching, {
  roundId: searching.rounds[0].id,
  mechanicState: made,
  emission: {
    response: Core.wordResponse(made.placements[0].word, { selected: searching.participants[0] }),
    score: award,
    completion: made.words.length === 1 ? "mechanic" : "",
    actionId: "word-1"
  }
});
assert.strictEqual(found.ok, true);
assert.strictEqual(found.state.rewardTotal, 1);
assert.strictEqual(found.state.responses[0].responseType, "word-found");
assert.deepStrictEqual(Engine.readMechanicState(found.state, searching.rounds[0].id).grid, made.grid);

var chainSlides = Core.fixtureSlides();
var chain = session(chainSlides, "two");
var red = chain.teams[0];
var blue = chain.teams[1];
var ameliaPerson = chain.participants.filter(function (person) { return person.id === amelia; })[0];
var noahPerson = chain.participants.filter(function (person) { return person.id === noah; })[0];
assert.ok(ameliaPerson.teamId);
var quizPick = Core.quizOutcome(chainSlides[0], "B", { selected: ameliaPerson, teams: chain.teams, roundId: chain.rounds[0].id });
chain = Core.commitMechanic(Engine, chain, {
  roundId: chain.rounds[0].id,
  emission: { response: quizPick.response, score: quizPick.score, actionId: "q1" },
  reveal: true
}).state;
assert.strictEqual(chain.teams.filter(function (team) { return team.id === ameliaPerson.teamId; })[0].points, 1);
chain = Engine.nextRound(chain).state;
var spinPlan = null;
var guard = 0;
while (guard < 6) {
  spinPlan = Core.spinNext(chain.participants, spinPlan ? spinPlan.state : {}, chain.sessionId, {});
  if (spinPlan.id === amelia) break;
  guard += 1;
}
assert.strictEqual(spinPlan.id, amelia);
chain = Core.commitMechanic(Engine, chain, {
  roundId: chain.rounds[1].id,
  mechanicState: spinPlan.state,
  emission: { participantId: amelia, actionId: "spin-amelia" }
}).state;
assert.strictEqual(chain.selectedParticipantId, amelia);
chain = Engine.nextRound(chain).state;
assert.strictEqual(Engine.mechanicContext(chain).selectedParticipant.id, amelia);
assert.strictEqual(chain.rounds[2].mechanic, "quiz");
chain = Engine.nextRound(chain).state;
var grid = Core.generateWordSearch(chainSlides[3], chain.sessionId + ":" + chain.rounds[3].id);
var blueAward = Core.wordAward(chainSlides[3], grid.placements[0].word, {
  selected: noahPerson,
  teams: chain.teams,
  activeTeamId: noahPerson.teamId,
  roundId: chain.rounds[3].id
});
var beforeRed = chain.teams.filter(function (team) { return team.id === ameliaPerson.teamId; })[0].points;
chain = Core.commitMechanic(Engine, chain, {
  roundId: chain.rounds[3].id,
  mechanicState: grid,
  emission: {
    response: Core.wordResponse(grid.placements[0].word, { selected: noahPerson }),
    score: blueAward,
    actionId: "word-blue"
  }
}).state;
assert.strictEqual(chain.teams.filter(function (team) { return team.id === ameliaPerson.teamId; })[0].points, beforeRed);
assert.strictEqual(chain.teams.filter(function (team) { return team.id === noahPerson.teamId; })[0].points, 1);
assert.notStrictEqual(ameliaPerson.teamId, noahPerson.teamId);
assert.ok(red && blue);
var finished = Engine.completeSession(chain);
assert.strictEqual(finished.ok, true);
assert.strictEqual(finished.state.result.teamScores.length, 2);
var skipped = Engine.skipRound(session(chainSlides, "none"));
assert.strictEqual(skipped.ok, true);

var button = {
  getAttribute: function () { return "B"; },
  listeners: [],
  addEventListener: function (type, fn) { this.listeners.push(fn); },
  removeEventListener: function (type, fn) { this.listeners = this.listeners.filter(function (item) { return item !== fn; }); }
};
var host = {
  innerHTML: "",
  classList: { add: function () {}, remove: function () {} },
  querySelectorAll: function (sel) { return sel === "[data-choice]" ? [button] : []; },
  querySelector: function () { return null; },
  addEventListener: function () {},
  removeEventListener: function () {}
};
var view = Engine.toPresenter(session([Core.fixtureSlides()[0]], "none"));
var handle = Mechanics.mount(host, {
  mechanic: "quiz",
  slide: Core.fixtureSlides()[0],
  view: view,
  roundId: view.engine.rounds[0].id,
  actions: {}
});
assert.ok(host.innerHTML.indexOf("Which material conducts electricity?") !== -1);
assert.ok(host.innerHTML.indexOf(">D<") !== -1 || host.innerHTML.indexOf(">D</b>") !== -1);
assert.strictEqual(button.listeners.length, 1);
handle.destroy();
assert.strictEqual(button.listeners.length, 0);

var pausedView = Engine.toPresenter(Engine.pauseSession(view.engine).state);
var pausedHost = {
  innerHTML: "",
  classList: { add: function () {}, remove: function () {} },
  querySelectorAll: function () { return []; },
  querySelector: function () { return null; },
  addEventListener: function () {},
  removeEventListener: function () {}
};
Mechanics.mount(pausedHost, { mechanic: "quiz", slide: Core.fixtureSlides()[0], view: pausedView, paused: true, roundId: pausedView.engine.rounds[0].id, actions: {} });
assert.ok(pausedHost.innerHTML.indexOf("disabled") !== -1);

var spinTimer = 0;
var oldSet = global.setTimeout;
var oldClear = global.clearTimeout;
global.setTimeout = function () { spinTimer = 99; return 99; };
global.clearTimeout = function (id) { if (id === 99) spinTimer = 0; };
var spinButton = {
  getAttribute: function () { return ""; },
  listeners: [],
  addEventListener: function (type, fn) { this.listeners.push(fn); },
  removeEventListener: function (type, fn) { this.listeners = this.listeners.filter(function (item) { return item !== fn; }); }
};
var spinHost = {
  innerHTML: "",
  className: "",
  classList: { add: function () { this.spinning = true; }, remove: function () {} },
  querySelectorAll: function () { return []; },
  querySelector: function (sel) { return sel === "#lessonSpin" ? spinButton : { innerHTML: "" }; },
  addEventListener: function () {},
  removeEventListener: function () {}
};
var spinView = Engine.toPresenter(session([{ type: "spin" }], "none"));
var spinHandle = Mechanics.mount(spinHost, {
  mechanic: "spin",
  slide: { type: "spin", kicker: "Spin a pupil" },
  view: spinView,
  roundId: spinView.engine.rounds[0].id,
  actions: { play: function () {} }
});
assert.ok(spinHost.innerHTML.indexOf("Spin") !== -1);
assert.ok(spinHost.innerHTML.indexOf("2 pupils today") !== -1);
spinButton.listeners[0]();
spinHandle.destroy();
assert.strictEqual(spinTimer, 0);
global.setTimeout = oldSet;
global.clearTimeout = oldClear;

var spinSlide = {
  type: "spin",
  kicker: "Choose someone",
  prompt: "Can you name something in this classroom that gravity is pulling towards Earth?",
  role: "Gravity Scientist",
  reveal: "Gravity pulls objects towards Earth.",
  lines: ["Can you name something in this classroom that gravity is pulling towards Earth?"]
};
var spun = Engine.selectParticipant(session([spinSlide], "none"), amelia, "spin-task");
assert.strictEqual(spun.ok, true);
var spunView = Engine.toPresenter(spun.state);
var pickedHost = {
  innerHTML: "",
  className: "",
  classList: { add: function () {}, remove: function () {} },
  querySelectorAll: function () { return []; },
  querySelector: function () { return null; },
  addEventListener: function () {},
  removeEventListener: function () {}
};
Mechanics.mount(pickedHost, {
  mechanic: "spin",
  slide: spinSlide,
  view: spunView,
  roundId: spunView.engine.rounds[0].id,
  actions: {}
});
assert.ok(pickedHost.innerHTML.indexOf("Mission control has chosen...") !== -1);
assert.ok(pickedHost.innerHTML.indexOf("Amelia") !== -1);
assert.ok(pickedHost.innerHTML.indexOf("Gravity Scientist") !== -1);
assert.ok(pickedHost.innerHTML.indexOf("Can you name something in this classroom that gravity is pulling towards Earth?") !== -1);
assert.ok(pickedHost.innerHTML.indexOf("Show the idea") !== -1);
assert.strictEqual(pickedHost.innerHTML.indexOf("You're up!"), -1);

Shell.resetFlow();
Shell.enter();
var taskHost = {
  innerHTML: "",
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};
Shell.render(taskHost, { title: "Gravity Adventure", view: spunView, actions: {} });
assert.ok(taskHost.innerHTML.indexOf("Mission control has chosen...") !== -1);
assert.ok(taskHost.innerHTML.indexOf("Amelia") !== -1);
assert.ok(taskHost.innerHTML.indexOf("Gravity Scientist") !== -1);
assert.ok(taskHost.innerHTML.indexOf("Can you name something in this classroom that gravity is pulling towards Earth?") !== -1);
assert.strictEqual(taskHost.innerHTML.indexOf("You're up!"), -1);

var bare = Engine.selectParticipant(session([{ type: "spin", kicker: "Choose someone", lines: ["Spin for a pupil."] }], "none"), amelia, "spin-bare");
Shell.resetFlow();
Shell.enter();
var bareHost = { innerHTML: "", querySelector: function () { return null; }, querySelectorAll: function () { return []; } };
Shell.render(bareHost, { title: "Gravity Adventure", view: Engine.toPresenter(bare.state), actions: {} });
assert.strictEqual(bareHost.innerHTML.indexOf("You're up!"), -1);
assert.strictEqual(bareHost.innerHTML.indexOf("lesson-moment"), -1);

var shellHost = {
  innerHTML: "",
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};
var shellView = Engine.toPresenter(session(Core.fixtureSlides(), "none"));
shellView.startedAt = "";
Shell.enter();
Shell.render(shellHost, { title: "Electricity Adventure", view: shellView, actions: {} });
assert.ok(shellHost.innerHTML.indexOf("lessonMechanic") !== -1);
assert.ok(shellHost.innerHTML.indexOf("Which material conducts electricity?") === -1);

var immersed = Mechanics.render({
  type: "story",
  beat: "discovery",
  mission: "Discover what causes earthquakes and how the ground moves.",
  kicker: "Look more closely",
  speaker: "Sofia",
  role: "Earth Explorer",
  lines: [
    "Discover what causes earthquakes and how the ground moves.",
    "The Earth's outer layer is made of huge pieces that move very slowly."
  ]
}, { immersed: true });
assert.ok(immersed.html.indexOf("lesson-act--inspect") !== -1);
assert.ok(immersed.html.indexOf("Sofia") !== -1);
assert.ok(immersed.html.indexOf("Earth Explorer") !== -1);
assert.strictEqual(immersed.html.indexOf("Discover what causes earthquakes and how the ground moves."), -1);
assert.ok(immersed.html.indexOf("huge pieces") !== -1);
var focused = Mechanics.render({
  type: "story",
  beat: "discovery",
  speaker: "Jack",
  role: "Earth Explorer",
  characterId: "CHARACTER_A",
  focusLook: "a yellow field jacket · a notebook",
  lines: ["You're our Earth Explorer. Which part should we investigate?"]
}, { immersed: true });
assert.ok(focused.html.indexOf("lesson-focus") !== -1);
assert.ok(focused.html.indexOf("yellow field jacket") !== -1);
assert.ok(focused.html.indexOf("lesson-swatch") !== -1);
assert.strictEqual(focused.html.indexOf("<img"), -1);
assert.ok(focused.html.indexOf("Jack, you're our Earth Explorer") !== -1);
assert.ok(focused.html.indexOf("Jack · Earth Explorer") !== -1);
var moveLayer = Mechanics.layerHtml({
  interaction: {
    type: "move",
    instruction: "Can you move the plate?",
    teachingReveal: "The plates moved suddenly.",
    responseEffect: { type: "shake", educationalPurpose: "A sudden slip makes the ground shake." }
  }
}, { step: 0, stuck: false, slipped: false });
assert.ok(moveLayer.indexOf("lesson-move") !== -1);
assert.ok(moveLayer.indexOf("lesson-push") !== -1);
assert.strictEqual(moveLayer.indexOf("Emma"), -1);
var slipped = Mechanics.layerHtml({
  interaction: {
    type: "move",
    instruction: "Can you move the plate?",
    responseEffect: { type: "shake", educationalPurpose: "A sudden slip makes the ground shake." }
  }
}, { step: 0, stuck: true, slipped: true });
assert.ok(slipped.indexOf("is-slip") !== -1);
assert.ok(slipped.indexOf("lesson-dust") !== -1);
var spot = Mechanics.layerHtml({ interaction: { type: "hotspot", instruction: "Look more closely" } }, { step: 0 });
assert.ok(spot.indexOf("data-world=\"spot\"") !== -1);
assert.strictEqual(Mechanics.actionOf({ type: "question" }).type, "predict");
assert.strictEqual(Mechanics.actionOf({ beat: "resolution" }).type, "reveal");

var css = require("fs").readFileSync(require("path").join(__dirname, "../schools/learn/lesson-shell.css"), "utf8");
assert.ok(css.indexOf("min(68ch, 72vw)") !== -1);
assert.ok(css.indexOf(".lesson.has-world .lesson-go") !== -1);
assert.ok(css.indexOf("color: #fff;") !== -1);

console.log("classroom mechanics tests passed");
