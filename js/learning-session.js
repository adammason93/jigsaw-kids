/* Authoritative classroom session. An adventure is the definition.
   A session is one play-through. Snapshot stores what was played.
   Scores, joiners, and progress stay on the session. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WondiiSessionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var RESPONSE_TYPES = {
    choice: 1, boolean: 1, text: 1, match: 1, sequence: 1,
    "word-found": 1, completion: 1, "teacher-awarded": 1
  };
  var TEAM_MODES = { none: 1, two: 1, multiple: 1, teacher_class: 1, custom: 1 };

  function uuid() {
    var cryptoObj = typeof crypto !== "undefined" ? crypto : null;
    if (cryptoObj && cryptoObj.randomUUID) return cryptoObj.randomUUID();
    var bytes = [];
    var i;
    for (i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = bytes.map(function (n) { return n.toString(16).padStart(2, "0"); }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }

  function isUuid(value) {
    return UUID.test(String(value || ""));
  }

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function done(state, changed) {
    return { ok: true, state: state, changed: changed !== false, error: "" };
  }

  function reject(state, error) {
    return { ok: false, state: state, changed: false, error: error };
  }

  function duplicate(state) {
    return { ok: true, state: state, changed: false, error: "", duplicate: true };
  }

  function stamp(state) {
    state.updatedAt = now();
    return state;
  }

  function remember(state, actionId) {
    if (!actionId) return false;
    if (state.actionIds[actionId]) return true;
    state.actionIds[actionId] = 1;
    return false;
  }

  function playSnapshot(adventure, rounds) {
    return {
      kind: "play",
      adventureId: adventure.id || null,
      title: adventure.title || "Learning adventure",
      version: adventure.version || null,
      yearGroup: adventure.yearGroup || "",
      subject: adventure.subject || "",
      topic: adventure.topic || "",
      rounds: rounds.map(function (round) {
        return { id: round.id, mechanic: round.mechanic, config: clone(round.config || {}) };
      })
    };
  }

  function normaliseRounds(adventure) {
    var source = adventure && adventure.rounds ? adventure.rounds : [];
    return source.map(function (round, index) {
      var mechanic = String(round.mechanic || round.type || "story");
      return {
        id: round.id || uuid(),
        mechanic: mechanic,
        config: clone(round.config || {}),
        status: "pending",
        mechanicComplete: false,
        index: index
      };
    });
  }

  function createSession(input) {
    input = input || {};
    var adventure = input.adventure || {};
    if (adventure.organisationId && input.organisationId && adventure.organisationId !== input.organisationId) {
      return reject(null, "other_organisation");
    }
    var rounds = normaliseRounds(adventure);
    var created = now();
    var state = {
      sessionId: input.sessionId || uuid(),
      sessionCode: input.sessionCode || "",
      organisationId: input.organisationId || null,
      classId: input.classId || null,
      adventureId: adventure.id || null,
      snapshot: null,
      mode: input.mode === "board" ? "board" : input.mode === "independent" ? "independent" : "live",
      allowNames: !!input.allowNames,
      status: "waiting",
      phase: "waiting",
      currentRound: 0,
      rounds: rounds,
      participants: [],
      teams: [],
      teamMode: "none",
      selectedParticipantId: null,
      responses: [],
      events: [],
      rewardTotal: 0,
      awardedReasons: {},
      actionIds: {},
      reveal: false,
      mechanicRuntime: null,
      demo: false,
      result: null,
      error: "",
      createdAt: created,
      startedAt: null,
      updatedAt: created,
      completedAt: null,
      endedAt: null
    };
    state.snapshot = playSnapshot(adventure, rounds);
    return done(state);
  }

  function roundAt(state, index) {
    return state.rounds[index] || null;
  }

  function currentRound(state) {
    return roundAt(state, state.currentRound);
  }

  function log(state, event) {
    var pupilId = event.pupilId || null;
    var teamId = event.teamId || null;
    var scope = event.scope;
    if (scope === "pupil" && !pupilId) scope = teamId ? "team" : "class";
    if (scope === "team" && !teamId) scope = "class";
    if (!scope) scope = pupilId ? "pupil" : teamId ? "team" : "class";
    if (scope === "class") {
      pupilId = null;
      teamId = null;
    }
    if (scope === "team") pupilId = null;
    state.events.push({
      id: uuid(),
      type: event.type,
      scope: scope,
      pupilId: pupilId,
      teamId: teamId,
      participantId: event.participantId || null,
      mechanic: event.mechanic || "session",
      points: Number(event.points) || 0,
      value: event.value == null ? "" : String(event.value),
      demo: !!event.demo,
      createdAt: now(),
      persisted: false
    });
    state.updatedAt = state.events[state.events.length - 1].createdAt;
  }

  function participantById(state, id) {
    var found = null;
    state.participants.forEach(function (person) {
      if (person.id === id) found = person;
    });
    return found;
  }

  function pupilScope(person) {
    if (person && person.identity === "pupil" && person.pupilId) {
      return { scope: "pupil", pupilId: person.pupilId, participantId: person.id };
    }
    return { scope: "class", pupilId: null, participantId: person ? person.id : null };
  }

  function live(state) {
    return state && (state.status === "active" || state.status === "paused");
  }

  function startSession(state) {
    if (!state || state.status !== "waiting") return reject(state, "invalid_transition");
    var next = clone(state);
    next.status = "active";
    next.phase = next.rounds.length ? "round" : "waiting";
    next.startedAt = now();
    next.reveal = false;
    if (next.rounds[0]) next.rounds[0].status = "active";
    log(next, { type: "session_started", scope: "class", mechanic: "session" });
    return done(stamp(next));
  }

  function pauseSession(state) {
    if (!state || state.status !== "active") return reject(state, "invalid_transition");
    var next = clone(state);
    next.status = "paused";
    log(next, { type: "session_paused", scope: "class", mechanic: "session" });
    return done(stamp(next));
  }

  function resumeSession(state) {
    if (!state || state.status !== "paused") return reject(state, "invalid_transition");
    var next = clone(state);
    next.status = "active";
    log(next, { type: "session_resumed", scope: "class", mechanic: "session" });
    return done(stamp(next));
  }

  function markFailed(state, reason) {
    if (!state || !live(state)) return reject(state, "invalid_transition");
    var next = clone(state);
    next.status = "recoverable_error";
    next.error = String(reason || "mechanic_failed").slice(0, 120);
    return done(stamp(next));
  }

  function addParticipant(state, person) {
    if (!state || state.status === "completed" || state.status === "ended") return reject(state, "invalid_transition");
    person = person || {};
    if (person.organisationId && state.organisationId && person.organisationId !== state.organisationId) {
      return reject(state, "other_organisation");
    }
    var identity = person.identity || "anonymous";
    if (identity !== "pupil" && identity !== "anonymous" && identity !== "teacher" && identity !== "team") {
      return reject(state, "bad_participant");
    }
    if (identity === "pupil") {
      if (!person.pupilId) return reject(state, "pupil_required");
      if (person.classId && state.classId && person.classId !== state.classId) return reject(state, "other_class");
    }
    if (person.teamId && !state.teams.some(function (team) { return team.id === person.teamId; })) {
      return reject(state, "other_session");
    }
    if (person.id && participantById(state, person.id)) return duplicate(state);
    var next = clone(state);
    var id = person.id || uuid();
    next.participants.push({
      id: id,
      pupilId: identity === "pupil" ? person.pupilId : null,
      displayName: String(person.displayName || "Explorer").slice(0, 40),
      identity: identity,
      teamId: person.teamId || null,
      claimed: identity === "team" ? !!person.claimed : true,
      demo: !!person.demo,
      joinedAt: now()
    });
    return done(stamp(next));
  }

  function removeParticipant(state, participantId) {
    if (!state || state.status !== "waiting") return reject(state, "invalid_transition");
    var next = clone(state);
    next.participants = next.participants.filter(function (person) { return person.id !== participantId; });
    next.responses = next.responses.filter(function (row) { return row.participantId !== participantId; });
    if (next.selectedParticipantId === participantId) next.selectedParticipantId = null;
    return done(stamp(next));
  }

  function seedDemo(state, people) {
    if (!state || state.status !== "waiting" || state.demo) return reject(state, "invalid_transition");
    var next = clone(state);
    next.demo = true;
    (people || []).forEach(function (person) {
      if (participantById(next, person.id)) return;
      next.participants.push({
        id: person.id,
        pupilId: null,
        displayName: person.displayName || "Explorer",
        identity: "anonymous",
        teamId: null,
        claimed: true,
        demo: true,
        joinedAt: now()
      });
      if (!person.response) return;
      var round = next.rounds.filter(function (item) { return item.mechanic === "quiz"; })[0];
      next.responses.push({
        id: uuid(),
        participantId: person.id,
        roundId: round ? round.id : "",
        responseType: "choice",
        value: person.response,
        correct: person.correct === true,
        demo: true,
        submittedAt: now()
      });
    });
    return done(stamp(next));
  }

  function claimTeam(state, index) {
    if (!state || state.status !== "waiting") return reject(state, "invalid_transition");
    var seats = state.participants.filter(function (person) { return person.identity === "team"; });
    var seat = seats[index];
    if (!seat) return reject(state, "bad_teams");
    if (seat.claimed) return reject(state, "team_taken");
    var next = clone(state);
    participantById(next, seat.id).claimed = true;
    participantById(next, seat.id).joinedAt = now();
    return done(stamp(next));
  }

  function createTeams(state, spec) {
    if (!state || state.status === "completed" || state.status === "ended") return reject(state, "invalid_transition");
    spec = spec || {};
    var mode = spec.mode || "none";
    if (!TEAM_MODES[mode]) return reject(state, "bad_teams");
    var names = spec.names ? spec.names.slice() : [];
    if (mode === "none") names = [];
    if (mode === "two" && names.length < 2) names = ["Red", "Blue"];
    if (mode === "teacher_class") names = ["Teacher", "Class"];
    if (mode === "multiple" && !names.length) {
      var count = Math.max(2, Math.min(8, Number(spec.count) || 2));
      var n;
      for (n = 1; n <= count; n++) names.push("Team " + n);
    }
    if (mode === "custom" && names.length < 2) return reject(state, "bad_teams");
    var next = clone(state);
    next.teamMode = mode;
    next.teams = names.map(function (name, index) {
      return {
        id: (spec.ids && spec.ids[index]) || uuid(),
        sessionId: next.sessionId,
        name: String(name || "Team").slice(0, 40),
        points: 0,
        sortOrder: index
      };
    });
    var known = {};
    next.teams.forEach(function (team) { known[team.id] = 1; });
    next.participants.forEach(function (person) {
      if (person.teamId && !known[person.teamId]) person.teamId = null;
    });
    if (spec.assign && next.teams.length) {
      var seat = 0;
      next.participants.forEach(function (person) {
        if (person.identity !== "pupil" && person.identity !== "anonymous") return;
        person.teamId = next.teams[seat % next.teams.length].id;
        seat += 1;
      });
    }
    return done(stamp(next));
  }

  function assignTeam(state, participantId, teamId) {
    if (!live(state) && state.status !== "waiting") return reject(state, "invalid_transition");
    var team = null;
    state.teams.forEach(function (item) { if (item.id === teamId) team = item; });
    if (!team || team.sessionId !== state.sessionId) return reject(state, "other_session");
    if (!participantById(state, participantId)) return reject(state, "missing_participant");
    var next = clone(state);
    participantById(next, participantId).teamId = teamId;
    return done(stamp(next));
  }

  function selectParticipant(state, participantId, actionId) {
    if (!live(state)) return reject(state, "invalid_transition");
    if (actionId && state.actionIds[actionId]) return duplicate(state);
    var person = participantById(state, participantId);
    if (!person) return reject(state, "missing_participant");
    var next = clone(state);
    if (remember(next, actionId)) return duplicate(state);
    next.selectedParticipantId = person.id;
    var scope = pupilScope(person);
    log(next, {
      type: "participant_selected",
      scope: scope.scope,
      pupilId: scope.pupilId,
      participantId: person.id,
      mechanic: (currentRound(next) || {}).mechanic || "session"
    });
    return done(next);
  }

  function selectedParticipant(state) {
    if (!state) return null;
    return participantById(state, state.selectedParticipantId);
  }

  function responseKey(response) {
    var once = response.responseType === "word-found" || response.responseType === "match";
    return response.participantId + "|" + response.roundId + "|" + response.responseType + (once ? "|" + response.value : "");
  }

  function recordResponse(state, response, actionId) {
    if (!state || state.status !== "active") return reject(state, "invalid_transition");
    if (state.reveal && response && response.responseType !== "teacher-awarded") return reject(state, "answers_closed");
    response = response || {};
    if (!RESPONSE_TYPES[response.responseType]) return reject(state, "bad_response");
    var person = participantById(state, response.participantId);
    if (!person) return reject(state, "missing_participant");
    if (person.identity === "anonymous" && person.pupilId) return reject(state, "anonymous_has_pupil");
    var round = currentRound(state);
    var roundId = response.roundId || (round && round.id);
    if (!roundId) return reject(state, "missing_round");
    var key = actionId || responseKey({
      participantId: person.id,
      roundId: roundId,
      responseType: response.responseType,
      value: response.value == null ? "" : String(response.value)
    });
    if (state.actionIds[key]) return duplicate(state);
    var next = clone(state);
    remember(next, key);
    var correct = response.correct === true ? true : response.correct === false ? false : null;
    next.responses.push({
      id: uuid(),
      participantId: person.id,
      roundId: roundId,
      responseType: response.responseType,
      value: response.value == null ? "" : String(response.value).slice(0, 200),
      correct: correct,
      demo: !!person.demo || !!response.demo,
      submittedAt: now()
    });
    if (!person.demo && !response.demo) {
      var scope = pupilScope(person);
      var mechanic = (round && round.mechanic) || "session";
      log(next, {
        type: "question_answered",
        scope: scope.scope,
        pupilId: scope.pupilId,
        participantId: person.id,
        mechanic: mechanic,
        value: response.responseType
      });
      if (correct === true || correct === false) {
        log(next, {
          type: correct ? "answer_correct" : "answer_incorrect",
          scope: scope.scope,
          pupilId: scope.pupilId,
          participantId: person.id,
          mechanic: mechanic,
          value: response.value == null ? "" : String(response.value).slice(0, 200)
        });
      }
    }
    return done(next);
  }

  function changePoints(state, teamId, amount, reason, direction, actionId) {
    if (!live(state)) return reject(state, "invalid_transition");
    amount = Math.round(Number(amount));
    if (!amount || amount < 0) return reject(state, "bad_points");
    var key = actionId || ((direction < 0 ? "remove:" : "award:") + (teamId || "class") + ":" + String(reason || ""));
    if (state.actionIds[key] || (reason && state.awardedReasons[key])) return duplicate(state);
    var next = clone(state);
    remember(next, key);
    next.awardedReasons[key] = 1;
    var team = null;
    if (teamId) {
      next.teams.forEach(function (item) { if (item.id === teamId) team = item; });
      if (!team || team.sessionId !== next.sessionId) return reject(state, "other_session");
      team.points = Math.max(0, team.points + direction * amount);
    } else {
      next.rewardTotal = Math.max(0, next.rewardTotal + direction * amount);
    }
    log(next, {
      type: direction < 0 ? "points_removed" : "points_awarded",
      scope: team ? "team" : "class",
      teamId: team ? team.id : null,
      mechanic: (currentRound(next) || {}).mechanic || "session",
      points: direction * amount,
      value: String(reason || "")
    });
    return done(next);
  }

  function awardPoints(state, teamId, amount, reason, actionId) {
    return changePoints(state, teamId, amount, reason, 1, actionId);
  }

  function removePoints(state, teamId, amount, reason, actionId) {
    return changePoints(state, teamId, amount, reason, -1, actionId);
  }

  function leaveRound(next, round, how) {
    if (!round || round.status === "complete" || round.status === "skipped") return;
    round.status = how === "skip" ? "skipped" : "complete";
    log(next, {
      type: how === "skip" ? "round_skipped" : "round_completed",
      scope: "class",
      mechanic: round.mechanic
    });
  }

  function goToRound(state, index, options) {
    options = options || {};
    var allowed = state && (state.status === "active" || state.status === "paused" || state.status === "recoverable_error");
    if (!allowed) return reject(state, "invalid_transition");
    index = Number(index);
    if (index < 0 || index >= state.rounds.length) return reject(state, "bad_round");
    var token = options.actionId || "";
    if (token && state.actionIds[token]) return duplicate(state);
    if (index === state.currentRound && !!options.reveal === state.reveal && !options.skip) {
      return duplicate(state);
    }
    var next = clone(state);
    if (token) remember(next, token);
    if (next.status === "recoverable_error") {
      next.status = "active";
      next.error = "";
    }
    var leaving = currentRound(next);
    if (index !== next.currentRound) leaveRound(next, leaving, options.skip ? "skip" : "complete");
    next.currentRound = index;
    var arrived = currentRound(next);
    if (arrived && arrived.status === "pending") arrived.status = "active";
    next.reveal = !!options.reveal;
    next.phase = next.reveal ? "reveal" : "round";
    return done(stamp(next));
  }

  function nextRound(state, actionId) {
    if (!state) return reject(state, "invalid_transition");
    return goToRound(state, state.currentRound + 1, { actionId: actionId });
  }

  function skipRound(state, actionId) {
    if (!state) return reject(state, "invalid_transition");
    if (state.currentRound >= state.rounds.length - 1) {
      var allowed = state.status === "active" || state.status === "paused" || state.status === "recoverable_error";
      if (!allowed) return reject(state, "invalid_transition");
      if (actionId && state.actionIds[actionId]) return duplicate(state);
      var next = clone(state);
      if (actionId) remember(next, actionId);
      leaveRound(next, currentRound(next), "skip");
      if (next.status === "recoverable_error") {
        next.status = "paused";
        next.error = "";
      }
      return done(stamp(next));
    }
    return goToRound(state, state.currentRound + 1, { skip: true, actionId: actionId });
  }

  function setCurrentMechanic(state, index) {
    return goToRound(state, index, {});
  }

  function revealAnswer(state) {
    if (!state || state.status !== "active") return reject(state, "invalid_transition");
    if (state.reveal) return duplicate(state);
    var next = clone(state);
    next.reveal = true;
    next.phase = "reveal";
    return done(stamp(next));
  }

  function hideAnswer(state) {
    if (!state || state.status !== "active") return reject(state, "invalid_transition");
    if (!state.reveal) return duplicate(state);
    var next = clone(state);
    next.reveal = false;
    next.phase = "round";
    return done(stamp(next));
  }

  function completeMechanic(state, actionId) {
    if (!state || state.status !== "active") return reject(state, "invalid_transition");
    var round = currentRound(state);
    if (!round) return reject(state, "missing_round");
    if (actionId && state.actionIds[actionId]) return duplicate(state);
    if (round.mechanicComplete) return duplicate(state);
    var next = clone(state);
    if (actionId) remember(next, actionId);
    currentRound(next).mechanicComplete = true;
    log(next, { type: "mechanic_completed", scope: "class", mechanic: round.mechanic });
    return done(next);
  }

  function buildResult(state, status) {
    var joined = state.participants.filter(function (person) {
      return person.identity !== "team" || person.claimed;
    }).length;
    var known = state.participants.filter(function (person) { return person.identity === "pupil"; }).length;
    var anonymous = state.participants.filter(function (person) { return person.identity === "anonymous"; }).length;
    var correct = 0;
    var incorrect = 0;
    state.responses.forEach(function (row) {
      if (row.demo) return;
      if (row.correct === true) correct += 1;
      if (row.correct === false) incorrect += 1;
    });
    var completed = 0;
    var skipped = 0;
    state.rounds.forEach(function (round) {
      if (round.status === "complete") completed += 1;
      if (round.status === "skipped") skipped += 1;
    });
    var started = Date.parse(state.startedAt || state.createdAt);
    var finished = Date.parse(state.completedAt || state.endedAt || now());
    return {
      sessionId: state.sessionId,
      adventureId: state.adventureId,
      classId: state.classId,
      status: status,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      endedAt: state.endedAt,
      durationMs: isNaN(started) || isNaN(finished) ? 0 : Math.max(0, finished - started),
      roundsTotal: state.rounds.length,
      roundsCompleted: completed,
      roundsSkipped: skipped,
      mechanics: state.rounds.map(function (round) {
        return { mechanic: round.mechanic, status: round.status, mechanicComplete: !!round.mechanicComplete };
      }),
      teamScores: state.teams.map(function (team) {
        return { id: team.id, name: team.name, points: team.points };
      }),
      classReward: state.rewardTotal,
      participation: { joined: joined, knownPupils: known, anonymousJoiners: anonymous },
      responses: { recorded: state.responses.filter(function (row) { return !row.demo; }).length, correct: correct, incorrect: incorrect }
    };
  }

  function finish(state, status) {
    var next = clone(state);
    var moment = now();
    if (status === "completed") next.completedAt = moment;
    if (status === "ended") next.endedAt = moment;
    next.status = status;
    next.phase = status === "completed" ? "completed" : "ended";
    next.reveal = false;
    next.error = "";
    var open = currentRound(next);
    if (open && open.status === "active") open.status = status === "completed" ? "complete" : "skipped";
    next.result = buildResult(next, status);
    log(next, {
      type: status === "completed" ? "session_completed" : "session_ended",
      scope: "class",
      mechanic: "session"
    });
    return done(next);
  }

  function completeSession(state, actionId) {
    if (!state) return reject(state, "invalid_transition");
    if (state.status === "completed") return duplicate(state);
    if (state.status !== "active" && state.status !== "paused") return reject(state, "invalid_transition");
    if (actionId && state.actionIds[actionId]) return duplicate(state);
    var next = clone(state);
    if (actionId) remember(next, actionId);
    return finish(next, "completed");
  }

  function endSession(state, actionId) {
    if (!state) return reject(state, "invalid_transition");
    if (state.status === "ended") return duplicate(state);
    if (state.status === "completed") return reject(state, "invalid_transition");
    if (actionId && state.actionIds[actionId]) return duplicate(state);
    var next = clone(state);
    if (actionId) remember(next, actionId);
    return finish(next, "ended");
  }

  function recoverSession(input) {
    if (!input) return reject(null, "nothing_to_recover");
    if (input.status === "recoverable_error" && input.sessionId && input.rounds) {
      var next = clone(input);
      next.status = "paused";
      next.error = "";
      log(next, { type: "session_resumed", scope: "class", mechanic: "session" });
      return done(next);
    }
    if (input.snapshot && input.snapshot.kind === "play" && input.sessionId) {
      var restored = clone(input);
      restored.error = restored.error || "";
      return done(restored, false);
    }
    return reject(input, "nothing_to_recover");
  }

  function canResume(state) {
    if (!state) return false;
    return state.status === "paused" || state.status === "active" || state.status === "recoverable_error";
  }

  function mechanicContext(state) {
    if (!state) return null;
    var round = currentRound(state);
    return {
      sessionId: state.sessionId,
      classId: state.classId,
      adventureId: state.adventureId,
      status: state.status,
      roundIndex: state.currentRound,
      round: round ? { id: round.id, mechanic: round.mechanic, config: clone(round.config || {}) } : null,
      participants: state.participants.map(function (person) {
        return {
          id: person.id,
          displayName: person.displayName,
          identity: person.identity,
          pupilId: person.pupilId,
          teamId: person.teamId
        };
      }),
      teams: state.teams.map(function (team) {
        return { id: team.id, name: team.name, points: team.points };
      }),
      selectedParticipant: selectedParticipant(state),
      learningContent: round ? clone(round.config || {}) : null
    };
  }

  function applyMechanicResult(state, emission) {
    emission = emission || {};
    var current = state;
    var step;
    if (emission.response) {
      step = recordResponse(current, emission.response, emission.actionId && emission.actionId + ":response");
      if (!step.ok) return step;
      current = step.state;
    }
    if (emission.score) {
      step = awardPoints(current, emission.score.teamId || null, emission.score.amount, emission.score.reason, emission.actionId && emission.actionId + ":score");
      if (!step.ok && !step.duplicate) return step;
      if (step.ok) current = step.state;
    }
    if (emission.participantId) {
      step = selectParticipant(current, emission.participantId, emission.actionId && emission.actionId + ":who");
      if (!step.ok && !step.duplicate) return step;
      if (step.ok) current = step.state;
    }
    if (emission.completion === "mechanic") {
      step = completeMechanic(current, emission.actionId && emission.actionId + ":mechanic");
      if (!step.ok && !step.duplicate) return step;
      if (step.ok) current = step.state;
    }
    if (emission.completion === "round") {
      step = nextRound(current, emission.actionId && emission.actionId + ":round");
      if (!step.ok && !step.duplicate) return step;
      if (step.ok) current = step.state;
    }
    return done(current, true);
  }

  function keepMechanic(state, runtime) {
    if (!state) return reject(state, "missing");
    var next = clone(state);
    next.mechanicRuntime = runtime ? clone(runtime) : null;
    return done(next);
  }

  function joinedCount(state) {
    if (!state) return 0;
    return state.participants.filter(function (person) {
      if (person.demo) return false;
      if (person.identity === "team") return !!person.claimed;
      return person.identity === "pupil" || person.identity === "anonymous";
    }).length;
  }

  function ingestRemote(state, bundle) {
    if (!state) return reject(state, "missing");
    bundle = bundle || {};
    var next = clone(state);
    var changed = false;
    (bundle.participants || []).forEach(function (row) {
      if (participantById(next, row.id)) return;
      var identity = row.pupil_id ? "pupil" : "anonymous";
      if (row.kind === "team") identity = "team";
      if (row.kind === "class") identity = "teacher";
      next.participants.push({
        id: row.id,
        pupilId: identity === "pupil" ? row.pupil_id : null,
        displayName: row.display_name || "Explorer",
        identity: identity,
        teamId: row.team_id || null,
        claimed: true,
        demo: false,
        joinedAt: row.created_at || now()
      });
      changed = true;
    });
    var seen = {};
    next.events.forEach(function (event) { seen[event.id] = 1; });
    next.responses.forEach(function (row) { if (row.eventId) seen[row.eventId] = 1; });
    (bundle.events || []).forEach(function (row) {
      if (seen[row.id]) return;
      seen[row.id] = 1;
      var packed = unpackResult(row.result);
      if (row.mechanic === "question" && /^[ABC]$/.test(packed.type)) {
        if (!next.responses.some(function (item) { return item.eventId === row.id; })) {
          var round = currentRound(next);
          next.responses.push({
            id: row.id,
            eventId: row.id,
            participantId: row.participant_id,
            roundId: round ? round.id : "",
            responseType: "choice",
            value: packed.type,
            correct: null,
            demo: !!row.demo,
            submittedAt: row.created_at || now()
          });
          changed = true;
        }
        return;
      }
      next.events.push({
        id: row.id,
        type: packed.type,
        scope: row.scope,
        pupilId: row.pupil_id,
        teamId: row.team_id,
        participantId: row.participant_id,
        mechanic: row.mechanic || "session",
        points: row.points || 0,
        value: packed.value,
        demo: !!row.demo,
        createdAt: row.created_at || now(),
        persisted: true
      });
      changed = true;
    });
    return done(next, changed);
  }

  function unpackResult(result) {
    var text = String(result || "");
    var cut = text.indexOf("|");
    if (cut === -1) return { type: text, value: "" };
    return { type: text.slice(0, cut), value: text.slice(cut + 1) };
  }

  function packResult(event) {
    if (event.value) return event.type + "|" + event.value;
    return event.type;
  }

  function dbKind(identity) {
    if (identity === "team") return "team";
    if (identity === "teacher") return "class";
    return "pupil";
  }

  function toRows(state) {
    if (!state) return null;
    var selected = selectedParticipant(state);
    return {
      session: {
        id: state.sessionId,
        organisation_id: state.organisationId,
        class_id: state.classId,
        adventure_id: isUuid(state.adventureId) ? state.adventureId : null,
        code: state.sessionCode,
        mode: state.mode,
        status: state.status,
        phase: state.phase,
        slide_index: state.currentRound,
        selected_pupil_id: selected && selected.pupilId ? selected.pupilId : null,
        reward_total: state.rewardTotal,
        demo: !!state.demo,
        snapshot: state.snapshot,
        started_at: state.startedAt,
        completed_at: state.completedAt || state.endedAt
      },
      teams: state.teams.filter(function (team) { return isUuid(team.id); }).map(function (team) {
        return {
          id: team.id,
          organisation_id: state.organisationId,
          session_id: state.sessionId,
          name: team.name,
          sort_order: team.sortOrder || 0,
          points: team.points
        };
      }),
      participants: state.participants.filter(function (person) { return isUuid(person.id); }).map(function (person) {
        return {
          id: person.id,
          organisation_id: state.organisationId,
          session_id: state.sessionId,
          pupil_id: person.identity === "pupil" ? person.pupilId : null,
          team_id: person.teamId && isUuid(person.teamId) ? person.teamId : null,
          display_name: person.displayName,
          kind: dbKind(person.identity)
        };
      }),
      events: state.events.filter(function (event) {
        return !event.persisted && !event.demo && isUuid(event.id);
      }).map(function (event) {
        return {
          id: event.id,
          organisation_id: state.organisationId,
          session_id: state.sessionId,
          class_id: state.classId,
          adventure_id: isUuid(state.adventureId) ? state.adventureId : null,
          scope: event.scope,
          team_id: event.scope === "team" ? event.teamId : null,
          pupil_id: event.scope === "pupil" ? event.pupilId : null,
          participant_id: event.participantId && isUuid(event.participantId) ? event.participantId : null,
          mechanic: event.mechanic || "session",
          result: packResult(event),
          points: event.points || 0,
          demo: false
        };
      })
    };
  }

  function rehydrate(bundle) {
    bundle = bundle || {};
    var row = bundle.session || {};
    var snap = row.snapshot || bundle.snapshot || { kind: "play", rounds: [] };
    var created = createSession({
      sessionId: row.id,
      sessionCode: row.code,
      organisationId: row.organisation_id,
      classId: row.class_id,
      adventure: {
        id: row.adventure_id,
        title: snap.title,
        version: snap.version,
        yearGroup: snap.yearGroup,
        subject: snap.subject,
        topic: snap.topic,
        rounds: snap.rounds || []
      }
    });
    if (!created.ok) return created;
    var state = created.state;
    state.status = row.status || "waiting";
    state.phase = row.phase || "waiting";
    state.currentRound = Number(row.slide_index) || 0;
    state.rewardTotal = Number(row.reward_total) || 0;
    state.startedAt = row.started_at || null;
    state.completedAt = row.status === "completed" ? row.completed_at : null;
    state.endedAt = row.status === "ended" ? row.completed_at : null;
    state.reveal = state.phase === "reveal";
    state.demo = !!row.demo;
    state.teams = (bundle.teams || []).map(function (team) {
      return {
        id: team.id,
        sessionId: state.sessionId,
        name: team.name,
        points: Number(team.points) || 0,
        sortOrder: team.sort_order || 0
      };
    });
    state.teamMode = state.teams.length ? "custom" : "none";
    var remote = ingestRemote(state, bundle);
    state = remote.state;
    if (row.selected_pupil_id) {
      state.participants.forEach(function (person) {
        if (person.pupilId === row.selected_pupil_id) state.selectedParticipantId = person.id;
      });
    }
    state.rounds.forEach(function (round, index) {
      if (state.status === "waiting") round.status = "pending";
      else if (index < state.currentRound) round.status = "complete";
      else if (index === state.currentRound) round.status = "active";
      else round.status = "pending";
    });
    var mechanicHits = {};
    (bundle.events || []).forEach(function (event) {
      var packed = unpackResult(event.result);
      if (packed.type === "mechanic_completed") {
        var seen = mechanicHits[event.mechanic] || 0;
        var match = null;
        state.rounds.forEach(function (round) {
          if (!match && round.mechanic === event.mechanic && !round.mechanicComplete) match = round;
        });
        if (match) match.mechanicComplete = true;
        mechanicHits[event.mechanic] = seen + 1;
      }
      if (packed.type === "participant_selected" && event.participant_id) {
        state.selectedParticipantId = event.participant_id;
      }
    });
    return done(state, false);
  }

  function questionId(round) {
    var config = round && round.config;
    if (!config) return round ? round.id : "";
    if (config.question && config.question.id) return config.question.id;
    if (config.id && (round.mechanic === "quiz" || config.type === "question")) return config.id;
    return round.id;
  }

  function toPresenter(state) {
    if (!state) return null;
    var slides = state.rounds.map(function (round) {
      var slide = clone(round.config || {});
      if (!slide.type) {
        slide.type = round.mechanic === "quiz" ? "question" : round.mechanic === "complete" ? "done" : round.mechanic;
      }
      return slide;
    });
    var people = state.participants.map(function (person) {
      return {
        id: person.id,
        name: person.displayName,
        avatarId: "fox",
        demo: !!person.demo,
        claimed: person.identity === "team" ? !!person.claimed : true,
        joinedAt: person.joinedAt,
        completedAt: state.completedAt || state.endedAt,
        pupilId: person.pupilId || null,
        identity: person.identity,
        teamId: person.teamId
      };
    });
    var responses = state.responses.map(function (row) {
      var round = null;
      state.rounds.forEach(function (item) { if (item.id === row.roundId) round = item; });
      return {
        id: row.id,
        participantId: row.participantId,
        questionId: questionId(round),
        response: row.value,
        isCorrect: row.correct === true,
        submittedAt: row.submittedAt,
        demo: !!row.demo,
        responseType: row.responseType
      };
    });
    var status = state.status;
    if (state.mode === "board" && (status === "waiting" || status === "active" || status === "paused")) status = "playing";
    var board = state.mechanicRuntime ? clone(state.mechanicRuntime) : null;
    if (board) board.reward = state.rewardTotal;
    return {
      id: state.sessionId,
      code: state.sessionCode,
      journeyId: state.adventureId,
      classId: state.classId || "",
      title: state.snapshot.title,
      yearGroup: state.snapshot.yearGroup || "",
      subject: state.snapshot.subject || "",
      topic: state.snapshot.topic || "",
      organisationId: state.organisationId,
      mode: state.mode,
      status: status,
      engineStatus: state.status,
      phase: state.phase,
      slide: state.currentRound,
      reveal: state.reveal,
      allowNames: state.allowNames,
      groupCount: state.teamMode === "none" ? 0 : state.teams.length,
      slides: slides,
      participants: people,
      responses: responses,
      demo: state.demo,
      board: board,
      createdAt: state.createdAt,
      startedAt: state.startedAt,
      endedAt: state.completedAt || state.endedAt,
      canResume: canResume(state),
      result: state.result,
      selectedParticipantId: state.selectedParticipantId,
      engine: state
    };
  }

  function adoptPresenter(view) {
    if (!view) return reject(null, "missing");
    if (view.engine && view.engine.sessionId) return done(view.engine, false);
    var rounds = (view.slides || []).map(function (slide) {
      var mechanic = slide.type === "question" ? "quiz" : (slide.type || "story");
      return { mechanic: mechanic, config: slide };
    });
    var created = createSession({
      sessionId: isUuid(view.id) ? view.id : uuid(),
      sessionCode: view.code,
      organisationId: view.organisationId || null,
      classId: view.classId || null,
      adventure: {
        id: view.journeyId,
        title: view.title,
        yearGroup: view.yearGroup,
        subject: view.subject,
        topic: view.topic,
        rounds: rounds
      },
      mode: view.mode,
      allowNames: view.allowNames
    });
    if (!created.ok) return created;
    var state = created.state;
    if (view.status === "active" || view.status === "playing") {
      var started = startSession(state);
      if (started.ok) state = started.state;
    }
    if (view.status === "completed") state.status = "completed";
    state.currentRound = Number(view.slide) || 0;
    state.reveal = !!view.reveal;
    state.demo = !!view.demo;
    if (view.board && view.board.reward) state.rewardTotal = Number(view.board.reward) || 0;
    state.createdAt = view.createdAt || state.createdAt;
    state.startedAt = view.startedAt || state.startedAt;
    state.mechanicRuntime = view.board || null;
    (view.participants || []).forEach(function (person) {
      var added = addParticipant(state, {
        id: person.id,
        displayName: person.name,
        identity: person.pupilId ? "pupil" : person.claimed === false ? "team" : "anonymous",
        pupilId: person.pupilId || null,
        demo: person.demo
      });
      if (added.ok) state = added.state;
    });
    return done(state, false);
  }

  return {
    createSession: createSession,
    startSession: startSession,
    pauseSession: pauseSession,
    resumeSession: resumeSession,
    markFailed: markFailed,
    addParticipant: addParticipant,
    removeParticipant: removeParticipant,
    claimTeam: claimTeam,
    seedDemo: seedDemo,
    createTeams: createTeams,
    assignTeam: assignTeam,
    selectParticipant: selectParticipant,
    selectedParticipant: selectedParticipant,
    recordResponse: recordResponse,
    awardPoints: awardPoints,
    removePoints: removePoints,
    setCurrentMechanic: setCurrentMechanic,
    nextRound: nextRound,
    skipRound: skipRound,
    revealAnswer: revealAnswer,
    hideAnswer: hideAnswer,
    completeMechanic: completeMechanic,
    completeSession: completeSession,
    endSession: endSession,
    recoverSession: recoverSession,
    canResume: canResume,
    mechanicContext: mechanicContext,
    applyMechanicResult: applyMechanicResult,
    keepMechanic: keepMechanic,
    joinedCount: joinedCount,
    ingestRemote: ingestRemote,
    toRows: toRows,
    rehydrate: rehydrate,
    toPresenter: toPresenter,
    adoptPresenter: adoptPresenter,
    isUuid: isUuid,
    uuid: uuid
  };
});
