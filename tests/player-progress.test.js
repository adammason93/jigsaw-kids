"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Engine = require("../js/learning-session.js");
var Core = require("../schools/learn/mechanic-core.js");
var Shell = require("../schools/learn/lesson-shell.js");

var question = {
  type: "question",
  beat: "development",
  kicker: "Henry the 8th's Importance",
  participation: "whole_class",
  question: {
    kind: "multiple",
    points: 1,
    prompt: "What were some important things Henry the 8th did?",
    choices: ["He changed the church in England.", "He built many castles.", "He was a famous artist."],
    correct: "He changed the church in England.",
    explain: "Henry the 8th made the Church of England separate from the Catholic Church."
  }
};
question.questions = [question.question];

var slides = [
  { type: "story", beat: "beginning", kicker: "Arrival", lines: ["The class arrives."] },
  { type: "story", beat: "goal", kicker: "Mission", lines: ["Look and ask."], interaction: { type: "inspect", instruction: "Look more closely" } },
  { type: "story", beat: "discovery", kicker: "Discovery", lines: ["Henry ruled England."] },
  { type: "story", beat: "application", kicker: "Try it", lines: ["Use the idea."], interaction: { type: "move", instruction: "Move the model." } },
  question,
  { type: "story", beat: "resolution", kicker: "Home", lines: ["The mission is complete."] },
  { type: "mystery", beat: "debrief", kicker: "Recap", lines: ["Henry changed the church in England."] }
];

function sessionAt(index) {
  var created = Engine.createSession({
    mode: "board",
    adventure: {
      id: "henry",
      title: "Henry the 8th Adventure",
      rounds: slides.map(function (slide) {
        var mechanic = slide.type === "question" ? "quiz" : slide.type;
        return { mechanic: mechanic, config: slide };
      })
    }
  });
  var state = Engine.startSession(created.state).state;
  if (index) state = Engine.setCurrentMechanic(state, index).state;
  return state;
}

function progress(state) {
  var view = Engine.toPresenter(state);
  return Shell.primaryLabel(view.slides[view.slide], { index: view.slide, step: 0, slipped: false, revealed: false }, view.slide, view.slides.length, quizOf(view));
}

function quizOf(view) {
  var slide = view.slides[view.slide];
  var round = view.engine.rounds[view.slide];
  var saved = view.engine.mechanicStore[round.id];
  var answered = !!(saved && saved.answers && saved.answers["0"]);
  return { answered: answered, index: 0, count: 1 };
}

function answer(state, choiceId) {
  var view = Engine.toPresenter(state);
  var round = view.engine.rounds[view.slide];
  var outcome = Core.quizOutcome(view.slides[view.slide], choiceId, {
    participation: "whole_class",
    teams: view.engine.teams,
    teamMode: view.engine.teamMode,
    roundId: round.id
  });
  assert.strictEqual(outcome.ok, true);
  var committed = Core.commitMechanic(Engine, state, {
    roundId: round.id,
    mechanicState: {
      kind: "quiz",
      index: 0,
      answers: { "0": { choice: choiceId, correct: outcome.correct } },
      choice: choiceId,
      correct: outcome.correct
    },
    emission: { response: outcome.response, score: outcome.score, actionId: "quiz-" + round.id + "-" + choiceId },
    reveal: outcome.correct
  });
  assert.strictEqual(committed.ok, true, committed.error);
  return committed.state;
}

var check = sessionAt(4);
var before = Engine.toPresenter(check);
assert.strictEqual(before.slides[4].type, "question");
assert.strictEqual(before.slides[4].question.correct, "He changed the church in England.");
assert.strictEqual(progress(check), "");
assert.strictEqual(before.reveal, false);

var wrong = answer(check, "C");
var wrongView = Engine.toPresenter(wrong);
assert.strictEqual(wrongView.reveal, false);
assert.strictEqual(progress(wrong), "Next");
assert.strictEqual(wrongView.engine.mechanicStore[wrongView.engine.rounds[4].id].answers["0"].correct, false);

var right = answer(check, "A");
var rightView = Engine.toPresenter(right);
assert.strictEqual(rightView.reveal, true);
assert.strictEqual(progress(right), "Next");
assert.strictEqual(rightView.engine.mechanicStore[rightView.engine.rounds[4].id].answers["0"].correct, true);
assert.strictEqual(rightView.slide, 4);

var story = sessionAt(2);
assert.strictEqual(progress(story), "Next");

var apply = sessionAt(3);
var applyView = Engine.toPresenter(apply);
assert.strictEqual(Shell.primaryLabel(applyView.slides[3], { index: 3, slipped: false, revealed: false }, 3, 7, { answered: false, index: 0, count: 1 }), "");
assert.strictEqual(Shell.primaryLabel(applyView.slides[3], { index: 3, slipped: true, revealed: false }, 3, 7, { answered: false, index: 0, count: 1 }), "Next");

var freshCheck = sessionAt(4);
assert.strictEqual(progress(freshCheck), "");
assert.strictEqual(Engine.toPresenter(freshCheck).engine.mechanicStore[Engine.toPresenter(freshCheck).engine.rounds[4].id] || null, null);

var walked = [];
var cursor = sessionAt(0);
while (Engine.toPresenter(cursor).slide < slides.length) {
  var view = Engine.toPresenter(cursor);
  walked.push(view.slides[view.slide].beat);
  if (view.slides[view.slide].type === "question") {
    assert.strictEqual(progress(cursor), "");
    cursor = answer(cursor, "A");
    assert.strictEqual(progress(cursor), "Next");
  }
  var nextIndex = view.slide + 1;
  if (nextIndex >= slides.length) break;
  var moved = Engine.setCurrentMechanic(Engine.toPresenter(cursor).engine, nextIndex);
  assert.strictEqual(moved.ok, true);
  cursor = moved.state;
}
assert.deepStrictEqual(walked, ["beginning", "goal", "discovery", "application", "development", "resolution", "debrief"]);
var finished = Engine.completeSession(cursor);
assert.strictEqual(finished.ok, true);
assert.strictEqual(finished.state.status, "completed");

var css = fs.readFileSync(path.join(__dirname, "../schools/learn/lesson-shell.css"), "utf8");
assert.ok(css.indexOf("100dvh") >= 0);
assert.ok(css.indexOf("min-height: 68vh") < 0);
assert.ok(fs.readFileSync(path.join(__dirname, "../js/lesson-brain.js"), "utf8").indexOf("function planRepairBrief") >= 0);

console.log("player-progress tests passed");
