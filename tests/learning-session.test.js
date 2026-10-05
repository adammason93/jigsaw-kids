"use strict";

var assert = require("assert");
var Engine = require("../js/learning-session.js");

var schoolA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
var schoolB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
var classA = "11111111-1111-4111-8111-111111111111";
var classB = "22222222-2222-4222-8222-222222222222";
var adventureId = "33333333-3333-4333-8333-333333333333";
var ameliaId = "44444444-4444-4444-8444-444444444444";
var otherPupil = "55555555-5555-4555-8555-555555555555";

function volcano() {
  return {
    id: adventureId,
    organisationId: schoolA,
    title: "Volcano Adventure",
    version: "2026-09-30",
    rounds: [
      { mechanic: "story", config: { title: "The mountain" } },
      { mechanic: "spin", config: { pick: "one" } },
      { mechanic: "quiz", config: { prompt: "What is magma?", choices: ["Rock", "Molten rock", "Ash"], correct: "Molten rock" } },
      { mechanic: "word-search", config: { words: ["magma", "ash"] } },
      { mechanic: "mystery", config: { prompt: "Which rock cooled fastest?" } }
    ]
  };
}

function open() {
  var created = Engine.createSession({
    organisationId: schoolA,
    classId: classA,
    sessionCode: "VOLC-ANO1",
    adventure: volcano()
  });
  assert.strictEqual(created.ok, true);
  assert.strictEqual(created.state.status, "waiting");
  assert.strictEqual(created.state.snapshot.kind, "play");
  assert.strictEqual(created.state.snapshot.rounds.length, 5);
  assert.strictEqual(created.state.snapshot.rounds[3].mechanic, "word-search");
  return created.state;
}

var blocked = Engine.createSession({
  organisationId: schoolA,
  adventure: { id: adventureId, organisationId: schoolB, rounds: [{ mechanic: "story", config: {} }] }
});
assert.strictEqual(blocked.ok, false);
assert.strictEqual(blocked.error, "other_organisation");

var state = open();
var snap = JSON.stringify(state.snapshot);

var amelia = Engine.addParticipant(state, {
  id: ameliaId,
  displayName: "Amelia",
  identity: "pupil",
  pupilId: ameliaId,
  organisationId: schoolA,
  classId: classA
});
assert.strictEqual(amelia.ok, true);
state = amelia.state;

var foreign = Engine.addParticipant(state, {
  displayName: "Other",
  identity: "pupil",
  pupilId: otherPupil,
  organisationId: schoolB,
  classId: classB
});
assert.strictEqual(foreign.ok, false);
assert.strictEqual(foreign.error, "other_organisation");
assert.strictEqual(state.participants.length, 1);

var anon = Engine.addParticipant(state, { displayName: "Explorer", identity: "anonymous", pupilId: otherPupil });
assert.strictEqual(anon.ok, true);
assert.strictEqual(anon.state.participants[1].pupilId, null);
assert.strictEqual(anon.state.participants[1].identity, "anonymous");
state = anon.state;

var teams = Engine.createTeams(state, { mode: "two", assign: true });
assert.strictEqual(teams.ok, true);
assert.deepStrictEqual(teams.state.teams.map(function (team) { return team.name; }), ["Red", "Blue"]);
state = teams.state;
assert.strictEqual(state.participants[0].teamId, state.teams[0].id);
assert.strictEqual(state.participants[1].teamId, state.teams[1].id);

var custom = Engine.createTeams(open(), { mode: "custom", names: ["Owls", "Foxes", "Bears"] });
assert.strictEqual(custom.state.teams.length, 3);
var teacherClass = Engine.createTeams(open(), { mode: "teacher_class" });
assert.deepStrictEqual(teacherClass.state.teams.map(function (team) { return team.name; }), ["Teacher", "Class"]);
var none = Engine.createTeams(state, { mode: "none" });
assert.strictEqual(none.state.teams.length, 0);
assert.strictEqual(none.state.participants[0].teamId, null);
state = Engine.createTeams(none.state, { mode: "two", assign: true }).state;

var otherTeam = Engine.assignTeam(state, ameliaId, "99999999-9999-4999-8999-999999999999");
assert.strictEqual(otherTeam.ok, false);
assert.strictEqual(otherTeam.error, "other_session");

var tooSoon = Engine.awardPoints(state, state.teams[0].id, 1, "early");
assert.strictEqual(tooSoon.ok, false);

var started = Engine.startSession(state);
assert.strictEqual(started.ok, true);
assert.strictEqual(started.state.status, "active");
assert.ok(started.state.events.some(function (event) { return event.type === "session_started"; }));
state = started.state;
assert.strictEqual(Engine.startSession(state).ok, false);

var paused = Engine.pauseSession(state);
assert.strictEqual(paused.state.status, "paused");
var resumed = Engine.resumeSession(paused.state);
assert.strictEqual(resumed.state.status, "active");
state = resumed.state;

var picked = Engine.selectParticipant(state, ameliaId);
assert.strictEqual(picked.ok, true);
assert.strictEqual(Engine.selectedParticipant(picked.state).displayName, "Amelia");
assert.strictEqual(picked.state.events.filter(function (event) { return event.type === "participant_selected"; })[0].scope, "pupil");
state = picked.state;
var pickedAnon = Engine.selectParticipant(state, state.participants[1].id);
assert.strictEqual(pickedAnon.state.events.filter(function (event) {
  return event.type === "participant_selected" && event.participantId === state.participants[1].id;
})[0].scope, "class");
state = pickedAnon.state;

state = Engine.setCurrentMechanic(state, 2).state;
var red = state.teams[0].id;
var blue = state.teams[1].id;
state = Engine.awardPoints(state, red, 3, "quiz").state;
state = Engine.awardPoints(state, blue, 2, "quiz").state;
assert.strictEqual(Engine.awardPoints(state, red, 3, "quiz").changed, false);
assert.strictEqual(state.teams[0].points, 3);
assert.strictEqual(state.teams[1].points, 2);

var answer = Engine.recordResponse(state, {
  participantId: ameliaId,
  responseType: "choice",
  value: "Molten rock",
  correct: true
});
assert.strictEqual(answer.ok, true);
var pupilEvent = answer.state.events.filter(function (event) { return event.type === "answer_correct"; })[0];
assert.strictEqual(pupilEvent.scope, "pupil");
assert.strictEqual(pupilEvent.pupilId, ameliaId);
state = answer.state;
assert.strictEqual(Engine.recordResponse(state, {
  participantId: ameliaId,
  responseType: "choice",
  value: "Ash",
  correct: false
}).changed, false);

var anonAnswer = Engine.recordResponse(state, {
  participantId: state.participants[1].id,
  responseType: "text",
  value: "hot rock",
  correct: false
});
assert.strictEqual(anonAnswer.ok, true);
var anonEvent = anonAnswer.state.events.filter(function (event) { return event.type === "answer_incorrect" && event.value === "hot rock"; })[0];
assert.strictEqual(anonEvent.scope, "class");
assert.strictEqual(anonEvent.pupilId, null);
state = anonAnswer.state;

var word = Engine.recordResponse(state, {
  participantId: state.participants[1].id,
  roundId: state.rounds[3].id,
  responseType: "word-found",
  value: "magma"
});
assert.strictEqual(word.ok, true);
state = word.state;

state = Engine.nextRound(state, "nav-1").state;
assert.strictEqual(state.currentRound, 3);
assert.strictEqual(state.rounds[2].status, "complete");
assert.strictEqual(state.teams[0].points, 3);
assert.strictEqual(state.teams[1].points, 2);
assert.strictEqual(Engine.nextRound(state, "nav-1").changed, false);
assert.strictEqual(state.currentRound, 3);

var mechanic = Engine.completeMechanic(state);
assert.strictEqual(mechanic.ok, true);
assert.strictEqual(mechanic.state.rounds[3].mechanicComplete, true);
assert.strictEqual(mechanic.state.rounds[3].status, "active");
assert.strictEqual(mechanic.state.status, "active");
state = mechanic.state;
assert.strictEqual(Engine.completeMechanic(state).changed, false);

state = Engine.nextRound(state).state;
assert.strictEqual(state.rounds[3].status, "complete");
assert.strictEqual(state.currentRound, 4);
state = Engine.awardPoints(state, red, 2, "mystery").state;
assert.strictEqual(state.teams[0].points, 5);
assert.strictEqual(state.teams[1].points, 2);
assert.strictEqual(JSON.stringify(state.snapshot), snap);

var removed = Engine.removePoints(state, blue, 1, "adjust");
assert.strictEqual(removed.state.teams[1].points, 1);
assert.strictEqual(Engine.removePoints(removed.state, blue, 1, "adjust").changed, false);
state = removed.state;

var context = Engine.mechanicContext(state);
assert.strictEqual(context.round.mechanic, "mystery");
assert.strictEqual(context.selectedParticipant.displayName, "Explorer");
var applied = Engine.applyMechanicResult(state, {
  completion: "mechanic",
  actionId: "mystery-done"
});
assert.strictEqual(applied.state.rounds[4].mechanicComplete, true);
assert.notStrictEqual(applied.state.status, "completed");
state = applied.state;

var finished = Engine.completeSession(state);
assert.strictEqual(finished.state.status, "completed");
assert.strictEqual(finished.state.result.status, "completed");
assert.strictEqual(finished.state.result.teamScores[0].points, 5);
assert.strictEqual(finished.state.result.participation.knownPupils, 1);
assert.strictEqual(finished.state.result.participation.anonymousJoiners, 1);
assert.ok(finished.state.result.mechanics.some(function (item) { return item.mechanic === "word-search"; }));
assert.strictEqual(finished.state.result.attainment, undefined);
assert.strictEqual(Engine.completeSession(finished.state).changed, false);
assert.strictEqual(finished.state.events.filter(function (event) { return event.type === "session_completed"; }).length, 1);

var held = Engine.addParticipant(Engine.startSession(open()).state, { id: "66666666-6666-4666-8666-666666666666", displayName: "Noah", identity: "anonymous" }).state;
held = Engine.awardPoints(held, null, 1, "class-token").state;
var stopped = Engine.endSession(held);
assert.strictEqual(stopped.ok, true);
assert.strictEqual(stopped.state.status, "ended");
assert.strictEqual(stopped.state.rewardTotal, 1);
assert.strictEqual(stopped.state.result.status, "ended");
assert.ok(stopped.state.events.some(function (event) { return event.type === "session_ended"; }));
assert.notStrictEqual(stopped.state.sessionId, finished.state.sessionId);
assert.strictEqual(stopped.state.adventureId, finished.state.adventureId);

var second = Engine.createSession({
  organisationId: schoolA,
  classId: classA,
  adventure: volcano()
}).state;
assert.notStrictEqual(second.sessionId, state.sessionId);
assert.strictEqual(second.teams.length, 0);
assert.strictEqual(second.snapshot.adventureId, state.snapshot.adventureId);

var again = JSON.parse(JSON.stringify(held));
var recovered = Engine.recoverSession(again);
assert.strictEqual(recovered.ok, true);
assert.strictEqual(recovered.state.rewardTotal, 1);
assert.strictEqual(recovered.state.currentRound, 0);
assert.strictEqual(recovered.state.snapshot.rounds[3].mechanic, "word-search");

var failed = Engine.markFailed(Engine.startSession(open()).state, "spin broke");
assert.strictEqual(failed.state.status, "recoverable_error");
assert.strictEqual(failed.state.snapshot.rounds.length, 5);
var retried = Engine.recoverSession(failed.state);
assert.strictEqual(retried.state.status, "paused");
var skipped = Engine.skipRound(retried.state);
assert.strictEqual(skipped.ok, true);
assert.strictEqual(skipped.state.rounds[0].status, "skipped");

var rows = Engine.toRows(anonAnswer.state);
assert.ok(rows.events.some(function (event) { return event.scope === "pupil" && event.pupil_id === ameliaId; }));
assert.ok(rows.events.some(function (event) { return event.scope === "class" && event.pupil_id === null && event.result.indexOf("answer_incorrect") === 0; }));
assert.ok(!rows.events.some(function (event) { return event.pupil_id === otherPupil; }));
assert.strictEqual(rows.session.snapshot.kind, "play");
assert.strictEqual(rows.session.snapshot.responses, undefined);

var remote = Engine.ingestRemote(Engine.startSession(open()).state, {
  participants: [{ id: "77777777-7777-4777-8777-777777777777", display_name: "Priya", pupil_id: null, kind: "pupil" }],
  events: [{ id: "88888888-8888-4888-8888-888888888888", scope: "class", participant_id: "77777777-7777-4777-8777-777777777777", mechanic: "question", result: "B", points: 0, demo: false }]
});
assert.strictEqual(Engine.joinedCount(remote.state), 1);
assert.strictEqual(remote.state.responses[0].value, "B");
assert.strictEqual(remote.state.responses[0].responseType, "choice");
assert.strictEqual(remote.state.participants[0].identity, "anonymous");

var board = Engine.toPresenter(Engine.createSession({
  organisationId: schoolA,
  mode: "board",
  adventure: volcano()
}).state);
assert.strictEqual(board.status, "playing");
assert.strictEqual(board.engineStatus, "waiting");
assert.strictEqual(board.canResume, false);

console.log("learning-session tests passed");
