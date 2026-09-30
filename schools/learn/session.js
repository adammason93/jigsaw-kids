/* Classroom sessions delegate to WondiiSessionEngine.
   The saved adventure stays untouched. This file keeps the existing presenter shape.
   Demonstration pupils are marked demo:true and are not real children. */
(function (global) {
  "use strict";

  var KEY = "wondii-class-sessions";
  var FAIL_KEY = "wondii-join-fails";
  var SELF_KEY = "wondii-join-self";
  var QUESTION = {
    id: "gap",
    objective: "Complete circuits",
    prompt: "Why won't the bulb light?",
    choices: [
      { id: "A", text: "The circuit has a gap" },
      { id: "B", text: "The bulb is too small" },
      { id: "C", text: "The wire is blue" }
    ],
    correct: "A",
    explain: "Electricity needs a complete path around the circuit."
  };

  function slidesOf(session) {
    if (session && session.slides && session.slides.length) return session.slides;
    return deck();
  }

  function questionOf(slide) {
    if (!slide || slide.type !== "question") return null;
    return slide.question || QUESTION;
  }

  function engineApi() {
    return global.WondiiSessionEngine;
  }

  function saveEngine(state) {
    var view = engineApi().toPresenter(state);
    var list = readAll().map(function (item) { return item.code === view.code ? view : item; });
    if (!list.some(function (item) { return item.code === view.code; })) list.unshift(view);
    writeAll(list);
    publish(view);
    watchLive(view);
    return view;
  }

  function withEngine(session) {
    if (!session || !engineApi()) return null;
    var stored = null;
    readAll().forEach(function (item) { if (item.code === session.code) stored = item; });
    var latest = stored && stored.engine && stored.engine.sessionId ? stored.engine : null;
    var inline = session.engine && session.engine.sessionId ? session.engine : null;
    if (latest && inline) return latest.updatedAt > inline.updatedAt ? latest : inline;
    if (latest || inline) return latest || inline;
    var adopted = engineApi().adoptPresenter(session);
    return adopted.ok ? adopted.state : null;
  }

  function watchLive(view) {
    var data = global.WondiiSchoolData;
    if (!data || !data.watchSession || !view || !view.engine) return;
    if (view.engineStatus !== "active" && view.engine.status !== "active") {
      if (data.stopWatch) data.stopWatch();
      return;
    }
    data.watchSession(view.engine.sessionId, function (bundle) {
      var current = get(view.code);
      var state = current && withEngine(current);
      if (!state) return;
      var merged = engineApi().ingestRemote(state, bundle);
      if (merged.ok && merged.changed) saveEngine(merged.state);
    });
  }

  function deck() {
    var img = "../../games/images/schools/demo/";
    return [
      { type: "story", kicker: "The problem", image: img + "lights-click-900.webp", alt: "Alex and Fox as the town lights go out", lines: ["Evening was settling over Wondii Town. Alex and Fox waited for the lamps to twinkle on.", "CLICK! Every light went out."] },
      { type: "story", kicker: "The first clue", image: img + "lights-clue-760.webp", alt: "A dark bulb, a cell and a coil of wire", lines: ["On a cottage step sat a lamp that would not light.", "Beside it lay a cell, a wire and a bulb."] },
      { type: "story", kicker: "A complete circuit", image: img + "lights-glows-760.webp", alt: "Alex holds a glowing bulb joined to a cell", lines: ["Alex joined the pieces. Cell. Wire. Bulb. Wire. Back to the cell.", "GLOWS! The path was whole."] },
      { type: "question", id: "gap" },
      { type: "story", kicker: "The switch", image: img + "lights-switch-760.webp", alt: "Alex reaches for a switch on a lamp post", lines: ["An open switch leaves a gap. A closed switch joins the path again."] },
      { type: "story", kicker: "The town lights up", image: img + "lights-whoosh-900.webp", alt: "The street lamps glow and Fox runs beside Alex", lines: ["Alex closed the town’s circuit. WHOOSH! The lights came back."] },
      { type: "done" }
    ];
  }

  function readAll() {
    try {
      var list = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    if (global.WondiiSchoolData) global.WondiiSchoolData.syncSessions(list);
    try { global.dispatchEvent(new Event("wondii-session")); } catch (e) {}
    try {
      if (global.BroadcastChannel) {
        var bus = new BroadcastChannel("wondii-class");
        bus.postMessage({ type: "sessions" });
        bus.close();
      }
    } catch (e) {}
  }

  function code() {
    var taken = {};
    readAll().forEach(function (item) { taken[item.code] = true; });
    var next = "";
    var i;
    for (i = 0; i < 8; i++) {
      next = global.WondiiSchoolDomain && global.WondiiSchoolDomain.classroomCode
        ? global.WondiiSchoolDomain.classroomCode()
        : "WOND-" + String(1000 + Math.floor(Math.random() * 9000));
      if (!taken[next]) return next;
    }
    return next;
  }

  function journeyMeta(journey) {
    var map = journey.learningMap || {};
    var plan = journey.plan || {};
    return {
      journeyId: journey.id,
      title: plan.title || map.topic || "Learning adventure",
      yearGroup: map.yearGroup || "",
      subject: map.subject || "",
      topic: map.topic || "",
      organisationId: journey.organisationId || null
    };
  }

  function roundsFromSlides(slides) {
    return slides.map(function (slide) {
      var type = slide.type || "story";
      var mechanic = type;
      if (type === "question" || type === "quiz" || type === "boolean" || type === "true_false") mechanic = "quiz";
      if (type === "word-search" || type === "word_search") mechanic = "word_search";
      return { mechanic: mechanic, config: slide };
    });
  }

  function applyMechanic(code, packet) {
    var state = withEngine(get(code));
    if (!state) return null;
    var Eng = engineApi();
    var Core = global.WondiiMechanicCore;
    var committed = Core && Core.commitMechanic
      ? Core.commitMechanic(Eng, state, packet || {})
      : { ok: false, state: state };
    if (!committed.ok) return null;
    saveEngine(committed.state);
    return Eng.toPresenter(committed.state);
  }

  function failRound(code) {
    var state = withEngine(get(code));
    if (!state) return null;
    var failed = engineApi().markFailed(state, "This activity could not start.");
    if (!failed.ok) return null;
    saveEngine(failed.state);
    return engineApi().toPresenter(failed.state);
  }

  function createSession(journey, mode, allowNames, options) {
    options = options || {};
    var meta = journeyMeta(journey);
    var slides = journey.plan && journey.plan.slides && journey.plan.slides.length
      ? JSON.parse(JSON.stringify(journey.plan.slides))
      : (journey.demoElectricity ? deck() : []);
    slides.forEach(function (slide) {
      if (slide.type !== "question") return;
      var question = JSON.parse(JSON.stringify(questionOf(slide)));
      var edit = journey.questionEdits && journey.questionEdits[question.id];
      if (edit) {
        if (edit.prompt) question.prompt = edit.prompt;
        if (edit.explain) question.explain = edit.explain;
        if (edit.correct) question.correct = edit.correct;
        if (edit.choices) question.choices = edit.choices;
      }
      slide.question = question;
    });
    var Eng = engineApi();
    var created = Eng.createSession({
      sessionCode: code(),
      organisationId: meta.organisationId,
      classId: journey.classId || options.classId || null,
      mode: mode,
      allowNames: !!allowNames,
      adventure: {
        id: meta.journeyId,
        organisationId: meta.organisationId,
        title: meta.title,
        version: journey.updatedAt || null,
        yearGroup: meta.yearGroup,
        subject: meta.subject,
        topic: meta.topic,
        rounds: roundsFromSlides(slides)
      }
    });
    if (!created.ok) return null;
    var state = created.state;
    var board = options.board || null;
    var people = options.pupils || (board && board.roster) || [];
    people.concat(options.guests || []).forEach(function (pupil) {
      var pupilId = !pupil.temporary && Eng.isUuid(pupil.id) ? pupil.id : null;
      var added = Eng.addParticipant(state, {
        id: pupil.id || pupilId || Eng.uuid(),
        displayName: pupil.firstName || pupil.name || "Explorer",
        identity: pupil.temporary ? "anonymous" : (pupilId ? "pupil" : "anonymous"),
        pupilId: pupilId,
        organisationId: state.organisationId,
        classId: state.classId
      });
      if (added.ok) state = added.state;
    });
    if (options.teamMode && options.teamMode !== "none") {
      var named = Eng.createTeams(state, {
        mode: options.teamMode,
        names: options.teamNames,
        ids: options.teamIds,
        assign: !options.assignments
      });
      if (named.ok) state = named.state;
      (options.assignments || []).forEach(function (row) {
        var team = state.teams[row.teamIndex];
        if (!team) return;
        var assigned = Eng.assignTeam(state, row.id, team.id);
        if (assigned.ok) state = assigned.state;
      });
    }
    if (options.begin) {
      var begun = Eng.startSession(state);
      if (begun.ok) state = begun.state;
    }
    var groupCount = options.teamMode ? 0 : (options.groups || (board && board.teams ? board.teams.length : 0));
    if (groupCount) {
      var names = [];
      var n;
      for (n = 1; n <= groupCount; n++) {
        names.push(board && board.teams && board.teams[n - 1] ? board.teams[n - 1].name : "Team " + n);
      }
      var teams = Eng.createTeams(state, {
        mode: groupCount === 2 ? "two" : "multiple",
        names: names,
        assign: !!(board && board.teams && board.teams.length)
      });
      if (teams.ok) state = teams.state;
      if (!board) {
        state.teams.forEach(function (team) {
          var seat = Eng.addParticipant(state, {
            id: team.id,
            displayName: team.name,
            identity: "team",
            teamId: team.id,
            claimed: false
          });
          if (seat.ok) state = seat.state;
        });
      }
    }
    if (board) {
      var kept = Eng.keepMechanic(state, board);
      if (kept.ok) state = kept.state;
    }
    return saveEngine(state);
  }

  function replace(session) {
    var state = withEngine(session);
    if (!state) return session;
    var Eng = engineApi();
    if (session.board && session.board.phase === "play" && state.status === "waiting" && state.mode === "board") {
      var started = Eng.startSession(state);
      if (started.ok) state = started.state;
    }
    if (session.reveal && !state.reveal) {
      var shown = Eng.revealAnswer(state);
      if (shown.ok) state = shown.state;
    }
    if (!session.reveal && state.reveal) {
      var hidden = Eng.hideAnswer(state);
      if (hidden.ok) state = hidden.state;
    }
    if (session.board && session.board.currentId && session.board.currentId !== state.selectedParticipantId) {
      var picked = state.participants.filter(function (person) { return person.id === session.board.currentId; })[0];
      if (picked) {
        var selected = Eng.selectParticipant(state, picked.id);
        if (selected.ok) state = selected.state;
      }
    }
    if (session.board) {
      var kept = Eng.keepMechanic(state, session.board);
      if (kept.ok) state = kept.state;
    }
    return saveEngine(state);
  }

  function get(joinCode) {
    var want = String(joinCode || "").trim().toUpperCase();
    var found = null;
    readAll().forEach(function (item) { if (item.code === want) found = item; });
    return found;
  }

  function forJourney(journeyId) {
    return readAll().filter(function (item) { return item.journeyId === journeyId; });
  }

  function open(session) {
    if (!session) return false;
    if (session.status === "closed" || session.status === "completed") return false;
    if (session.expiresAt && Date.parse(session.expiresAt) < Date.now()) return false;
    return session.status === "waiting" || session.status === "active";
  }

  function noteFail() {
    var now = Date.now();
    var recent = [];
    try { recent = JSON.parse(sessionStorage.getItem(FAIL_KEY) || "[]"); } catch (e) {}
    recent = recent.filter(function (t) { return now - t < 60000; });
    recent.push(now);
    sessionStorage.setItem(FAIL_KEY, JSON.stringify(recent));
    return recent.length;
  }

  function blocked() {
    var now = Date.now();
    var recent = [];
    try { recent = JSON.parse(sessionStorage.getItem(FAIL_KEY) || "[]"); } catch (e) {}
    return recent.filter(function (t) { return now - t < 60000; }).length >= 8;
  }

  function clearFails() {
    sessionStorage.removeItem(FAIL_KEY);
  }

  function generatedName(session) {
    return "Explorer " + (session.participants.length + 1);
  }

  function cleanName(value) {
    var name = String(value || "").replace(/[^A-Za-z '\-]/g, "").replace(/\s+/g, " ").trim();
    if (name.length < 2 || name.length > 16) return "";
    if (name.indexOf("@") !== -1) return "";
    return name;
  }

  function join(joinCode, options) {
    if (blocked()) return { error: "Too many tries. Wait a minute, then check the code with your teacher." };
    var session = get(joinCode);
    if (!session) {
      var remote = {
        id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name: cleanName(options && options.name) || "Explorer",
        avatarId: (options && options.avatarId) || "fox",
        demo: false,
        joinedAt: new Date().toISOString(),
        completedAt: null
      };
      try { sessionStorage.setItem(SELF_KEY, JSON.stringify({ code: String(joinCode || "").trim().toUpperCase(), participantId: remote.id, pending: true })); } catch (e) {}
      sendCloud({ type: "join", code: String(joinCode || "").trim().toUpperCase(), participant: remote });
      return { pending: true, participant: remote, code: String(joinCode || "").trim().toUpperCase() };
    }
    if (session.groupCount && open(session) && session.status === "waiting") {
      if (!options || !options.team) {
        return { needsTeam: true, teams: session.groupCount, title: session.title, code: session.code, yearGroup: session.yearGroup, subject: session.subject, topic: session.topic };
      }
      var index = Number(options.team) - 1;
      var claimed = engineApi().claimTeam(withEngine(session), index);
      if (!claimed.ok) return { error: claimed.error === "team_taken" ? "That team is already in." : "Choose a team from the list." };
      var view = saveEngine(claimed.state);
      var teamPerson = view.participants[index];
      clearFails();
      try { sessionStorage.setItem(SELF_KEY, JSON.stringify({ code: view.code, participantId: teamPerson.id })); } catch (e) {}
      sendCloud({ type: "join", code: view.code, participant: teamPerson });
      return { session: view, participant: teamPerson };
    }
    if (!open(session) || session.status !== "waiting") {
      if (session && session.status === "active") return { error: "That class has already started." };
      noteFail();
      return { error: "That code is not open. Check it with your teacher." };
    }
    var name = session.allowNames ? cleanName(options && options.name) : "";
    if (session.allowNames && options && options.name && !name) return { error: "Use a short first name, with letters only." };
    var added = engineApi().addParticipant(withEngine(session), {
      displayName: name || generatedName(session),
      identity: "anonymous"
    });
    if (!added.ok) return { error: "That code is not open. Check it with your teacher." };
    var view = saveEngine(added.state);
    var person = view.participants[view.participants.length - 1];
    clearFails();
    try {
      sessionStorage.setItem(SELF_KEY, JSON.stringify({ code: view.code, participantId: person.id }));
    } catch (e) {}
    sendCloud({ type: "join", code: view.code, participant: person });
    return { session: view, participant: person };
  }

  function self() {
    try { return JSON.parse(sessionStorage.getItem(SELF_KEY) || "null"); } catch (e) { return null; }
  }

  function answer(joinCode, participantId, choice) {
    var session = get(joinCode);
    if (!session) {
      sendCloud({ type: "answer", code: String(joinCode || "").trim().toUpperCase(), participantId: participantId, choice: choice });
      return { pending: true };
    }
    if (session.engineStatus !== "active" && session.status !== "active") return { error: "Answers are closed." };
    if (session.reveal) return { error: "Answers are closed." };
    var slide = slidesOf(session)[session.slide];
    var question = questionOf(slide);
    if (!question) return { error: "There is no question on the class screen yet." };
    var known = { A: 1, B: 1, C: 1 };
    if (!known[choice]) return { error: "Choose A, B or C." };
    var recorded = engineApi().recordResponse(withEngine(session), {
      participantId: participantId,
      responseType: "choice",
      value: choice,
      correct: choice === question.correct
    });
    if (!recorded.ok || recorded.duplicate) return { error: "You have already answered.", session: session };
    var view = saveEngine(recorded.state);
    sendCloud({ type: "answer", code: view.code, participantId: participantId, choice: choice });
    return { session: view };
  }

  function addDemoClass(joinCode) {
    var session = get(joinCode);
    if (!session || (session.engineStatus !== "waiting" && session.status !== "waiting") || session.demo) return session;
    var firstQuestion = QUESTION;
    slidesOf(session).some(function (slide) {
      var question = questionOf(slide);
      if (!question) return false;
      firstQuestion = question;
      return true;
    });
    var plan = [17, 4, 3];
    var letters = ["A", "B", "C"];
    var people = [];
    var made = 0;
    letters.forEach(function (letter, index) {
      for (var n = 0; n < plan[index]; n++) {
        made += 1;
        people.push({
          id: "demo_" + letter + "_" + n,
          displayName: "Explorer " + made,
          response: letter,
          correct: letter === firstQuestion.correct
        });
      }
    });
    for (var extra = 0; extra < 4; extra++) {
      made += 1;
      people.push({ id: "demo_wait_" + extra, displayName: "Explorer " + made });
    }
    var seeded = engineApi().seedDemo(withEngine(session), people);
    if (!seeded.ok) return session;
    return saveEngine(seeded.state);
  }

  function removeParticipant(joinCode, participantId) {
    var session = get(joinCode);
    if (!session) return session;
    var removed = engineApi().removeParticipant(withEngine(session), participantId);
    if (!removed.ok) return session;
    return saveEngine(removed.state);
  }

  function start(joinCode) {
    var session = get(joinCode);
    if (!session) return null;
    var started = engineApi().startSession(withEngine(session));
    if (!started.ok) return session;
    return saveEngine(started.state);
  }

  function setSlide(joinCode, slide, reveal) {
    var session = get(joinCode);
    if (!session || (session.status !== "active" && session.status !== "playing")) return session;
    var slides = slidesOf(session);
    var index = Math.max(0, Math.min(slides.length - 1, slide));
    var moved = engineApi().setCurrentMechanic(withEngine(session), index);
    if (!moved.ok && !moved.duplicate) return session;
    var state = moved.state;
    if (reveal) {
      var shown = engineApi().revealAnswer(state);
      if (shown.ok) state = shown.state;
    }
    return saveEngine(state);
  }

  function complete(joinCode) {
    var session = get(joinCode);
    if (!session) return null;
    var finished = engineApi().completeSession(withEngine(session));
    if (!finished.ok) return session;
    return saveEngine(finished.state);
  }

  function end(joinCode) {
    var session = get(joinCode);
    if (!session) return null;
    var finished = engineApi().endSession(withEngine(session));
    if (!finished.ok) return session;
    return saveEngine(finished.state);
  }

  function award(joinCode, teamId, amount, reason) {
    var session = get(joinCode);
    if (!session) return null;
    var given = engineApi().awardPoints(withEngine(session), teamId, amount, reason);
    if (!given.ok) return session;
    return saveEngine(given.state);
  }

  function chooseParticipant(joinCode, participantId) {
    var session = get(joinCode);
    if (!session) return null;
    var picked = engineApi().selectParticipant(withEngine(session), participantId);
    if (!picked.ok) return session;
    return saveEngine(picked.state);
  }

  function applyEngine(joinCode, fn) {
    var session = get(joinCode);
    if (!session) return null;
    var result = fn(withEngine(session));
    if (!result || !result.ok || result.changed === false) return session;
    return saveEngine(result.state);
  }

  function pause(joinCode) {
    return applyEngine(joinCode, function (state) { return engineApi().pauseSession(state); });
  }

  function resume(joinCode) {
    return applyEngine(joinCode, function (state) { return engineApi().resumeSession(state); });
  }

  function skipRound(joinCode) {
    return applyEngine(joinCode, function (state) { return engineApi().skipRound(state); });
  }

  function takePoints(joinCode, teamId, amount, reason) {
    return applyEngine(joinCode, function (state) { return engineApi().removePoints(state, teamId, amount, reason); });
  }

  function recover(joinCode) {
    return applyEngine(joinCode, function (state) { return engineApi().recoverSession(state); });
  }

  function totals(session, questionId) {
    var id = questionId || QUESTION.id;
    var counts = { A: 0, B: 0, C: 0 };
    (session.responses || []).forEach(function (row) {
      if (row.questionId === id && counts[row.response] != null) counts[row.response] += 1;
    });
    return counts;
  }

  function answered(session, questionId) {
    var id = questionId || QUESTION.id;
    return (session.responses || []).filter(function (row) { return row.questionId === id; }).length;
  }

  function summary(session) {
    var seen = {};
    var objectives = [];
    slidesOf(session).forEach(function (slide) {
      var question = questionOf(slide);
      if (!question || seen[question.id]) return;
      seen[question.id] = true;
      var counts = totals(session, question.id);
      var total = answered(session, question.id);
      var correct = counts[question.correct] || 0;
      objectives.push({
        id: question.id,
        label: question.objective || question.prompt,
        percent: total ? Math.round((correct / total) * 100) : null,
        answered: total,
        counts: counts
      });
    });
    var first = objectives[0] || { percent: 0, answered: 0, counts: { A: 0, B: 0, C: 0 } };
    var joined = session.groupCount
      ? session.participants.filter(function (person) { return person.claimed || person.demo; }).length
      : session.participants.length;
    return {
      joined: joined,
      completed: session.status === "completed" ? joined : 0,
      answered: first.answered || 0,
      correct: first.counts ? (first.counts[QUESTION.correct] || 0) : 0,
      percent: first.percent || 0,
      counts: first.counts || { A: 0, B: 0, C: 0 },
      objectives: objectives
    };
  }

  function subscribe(fn) {
    function run() { fn(); }
    global.addEventListener("storage", run);
    global.addEventListener("wondii-session", run);
    var bus = null;
    try {
      if (global.BroadcastChannel) {
        bus = new BroadcastChannel("wondii-class");
        bus.onmessage = run;
      }
    } catch (e) {}
    return function () {
      global.removeEventListener("storage", run);
      global.removeEventListener("wondii-session", run);
      if (bus) bus.close();
    };
  }

  var cloud = null;
  var cloudReady = false;

  function publish(session) {
    if (!cloudReady || !cloud || !session) return;
    cloud.send({
      type: "broadcast",
      event: "snap",
      payload: {
        code: session.code,
        title: session.title,
        yearGroup: session.yearGroup,
        subject: session.subject,
        topic: session.topic,
        status: session.status,
        phase: session.phase,
        slide: session.slide,
        reveal: session.reveal,
        allowNames: session.allowNames,
        participants: session.participants.map(function (person) {
          return { id: person.id, name: person.name, avatarId: person.avatarId, demo: !!person.demo };
        }),
        answered: answered(session),
        totals: session.reveal ? totals(session) : null
      }
    });
  }

  function sendCloud(message) {
    if (!cloudReady || !cloud) return;
    cloud.send({ type: "broadcast", event: "pupil", payload: message });
  }

  function applyCloud(message) {
    if (!message || !message.code) return;
    var session = get(message.code);
    if (!session) return;
    if (message.type === "join" && message.participant && session.status === "waiting") {
      if (!session.participants.some(function (person) { return person.id === message.participant.id; })) {
        session.participants.push(message.participant);
        replace(session);
      }
    }
    if (message.type === "answer" && session.status === "active" && !session.reveal) {
      answer(session.code, message.participantId, message.choice);
    }
    if (message.type === "hello") publish(session);
  }

  function connectCloud(onPupil) {
    var cfg = global.SCORE_SYNC || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
    function start(client) {
      cloud = client.channel("learn-class", { config: { broadcast: { self: false } } });
      cloud.on("broadcast", { event: "pupil" }, function (msg) {
        applyCloud(msg.payload);
        if (onPupil) onPupil(msg.payload);
      });
      cloud.on("broadcast", { event: "snap" }, function (msg) {
        if (onPupil) onPupil(msg.payload);
      });
      cloud.subscribe(function (status) {
        cloudReady = status === "SUBSCRIBED";
      });
    }
    if (global.supabase) {
      start(global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey));
      return;
    }
    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
    script.onload = function () {
      if (global.supabase) start(global.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey));
    };
    document.head.appendChild(script);
  }

  function joinUrl(joinCode) {
    var host = global.location.hostname;
    var path = host === "wondii.co.uk" || host.endsWith(".workers.dev") ? "/join" : "/schools/learn/join.html";
    return global.location.origin + path + "?code=" + encodeURIComponent(joinCode);
  }

  function qrSvg(text) {
    if (typeof global.qrcode !== "function") return "";
    var qr = global.qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag(6, 2);
  }

  global.ClassRooms = {
    QUESTION: QUESTION,
    deck: deck,
    slidesOf: slidesOf,
    questionOf: questionOf,
    createSession: createSession,
    get: get,
    forJourney: forJourney,
    open: open,
    join: join,
    self: self,
    answer: answer,
    addDemoClass: addDemoClass,
    removeParticipant: removeParticipant,
    start: start,
    setSlide: setSlide,
    end: end,
    complete: complete,
    award: award,
    takePoints: takePoints,
    chooseParticipant: chooseParticipant,
    pause: pause,
    resume: resume,
    skipRound: skipRound,
    applyMechanic: applyMechanic,
    failRound: failRound,
    recover: recover,
    totals: totals,
    answered: answered,
    summary: summary,
    subscribe: subscribe,
    connectCloud: connectCloud,
    publish: publish,
    joinUrl: joinUrl,
    qrSvg: qrSvg,
    blocked: blocked
  };
})(window);
