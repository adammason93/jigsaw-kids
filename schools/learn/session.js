/* Classroom sessions are separate from the saved Learning Adventure.
   This pilot keeps the live session in the browser that started it, and
   echoes a public snapshot when Supabase Realtime is reachable.
   Demonstration pupils are marked demo:true and are not real children. */
(function (global) {
  "use strict";

  var KEY = "wondii-class-sessions";
  var FAIL_KEY = "wondii-join-fails";
  var SELF_KEY = "wondii-join-self";
  var WORDS = ["FOX", "STAR", "LAMP", "GLOW", "WIRE", "CELL", "BOLT", "MOON"];
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
    for (var i = 0; i < 20; i++) {
      next = WORDS[Math.floor(Math.random() * WORDS.length)] + "-" + String(100 + Math.floor(Math.random() * 900));
      if (!taken[next]) return next;
    }
    return "LAMP-" + String(Date.now()).slice(-3);
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

  function createSession(journey, mode, allowNames, options) {
    options = options || {};
    var meta = journeyMeta(journey);
    var stamp = new Date().toISOString();
    var slides = journey.plan && journey.plan.slides && journey.plan.slides.length
      ? JSON.parse(JSON.stringify(journey.plan.slides))
      : (journey.demoElectricity ? deck() : []);
    if (journey.questionEdits) {
      slides.forEach(function (slide) {
        var question = questionOf(slide);
        var edit = question && journey.questionEdits[question.id];
        if (!edit) return;
        slide.question = JSON.parse(JSON.stringify(question));
        if (edit.prompt) slide.question.prompt = edit.prompt;
        if (edit.explain) slide.question.explain = edit.explain;
        if (edit.correct) slide.question.correct = edit.correct;
        if (edit.choices) slide.question.choices = edit.choices;
      });
    }
    var session = {
      id: "ses_" + Date.now().toString(36),
      code: code(),
      journeyId: meta.journeyId,
      title: meta.title,
      yearGroup: meta.yearGroup,
      subject: meta.subject,
      topic: meta.topic,
      organisationId: meta.organisationId,
      mode: mode === "board" ? "board" : mode === "independent" ? "independent" : "live",
      status: mode === "board" ? "playing" : "waiting",
      board: options.board || null,
      phase: "waiting",
      slide: 0,
      reveal: false,
      allowNames: !!allowNames,
      groupCount: options.groups || 0,
      slides: slides,
      participants: [],
      responses: [],
      demo: false,
      createdAt: stamp,
      startedAt: null,
      endedAt: null,
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    };
    if (session.groupCount) {
      for (var team = 1; team <= session.groupCount; team++) {
        session.participants.push({
          id: "team_" + team,
          name: "Team " + team,
          avatarId: "fox",
          demo: false,
          claimed: false,
          joinedAt: null,
          completedAt: null
        });
      }
    }
    var list = readAll();
    list.unshift(session);
    writeAll(list);
    publish(session);
    return session;
  }

  function replace(session) {
    var list = readAll().map(function (item) { return item.code === session.code ? session : item; });
    if (!list.some(function (item) { return item.code === session.code; })) list.unshift(session);
    writeAll(list);
    publish(session);
    return session;
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
      var teamPerson = session.participants[index];
      if (!teamPerson) return { error: "Choose a team from the list." };
      if (teamPerson.claimed) return { error: "That team is already in." };
      teamPerson.claimed = true;
      teamPerson.joinedAt = new Date().toISOString();
      replace(session);
      clearFails();
      try { sessionStorage.setItem(SELF_KEY, JSON.stringify({ code: session.code, participantId: teamPerson.id })); } catch (e) {}
      sendCloud({ type: "join", code: session.code, participant: teamPerson });
      return { session: session, participant: teamPerson };
    }
    if (!open(session) || session.status !== "waiting") {
      if (session && session.status === "active") return { error: "That class has already started." };
      noteFail();
      return { error: "That code is not open. Check it with your teacher." };
    }
    var name = session.allowNames ? cleanName(options && options.name) : "";
    if (session.allowNames && options && options.name && !name) return { error: "Use a short first name, with letters only." };
    var person = {
      id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: name || generatedName(session),
      avatarId: (options && options.avatarId) || "fox",
      demo: false,
      joinedAt: new Date().toISOString(),
      completedAt: null
    };
    session.participants.push(person);
    replace(session);
    clearFails();
    try {
      sessionStorage.setItem(SELF_KEY, JSON.stringify({ code: session.code, participantId: person.id }));
    } catch (e) {}
    sendCloud({ type: "join", code: session.code, participant: person });
    return { session: session, participant: person };
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
    if (session.status !== "active" || session.reveal) return { error: "Answers are closed." };
    var slide = slidesOf(session)[session.slide];
    var question = questionOf(slide);
    if (!question) return { error: "There is no question on the class screen yet." };
    var known = { A: 1, B: 1, C: 1 };
    if (!known[choice]) return { error: "Choose A, B or C." };
    var already = session.responses.some(function (row) {
      return row.participantId === participantId && row.questionId === question.id;
    });
    if (already) return { error: "You have already answered.", session: session };
    session.responses.push({
      id: "r_" + Date.now().toString(36),
      participantId: participantId,
      questionId: question.id,
      response: choice,
      isCorrect: choice === question.correct,
      submittedAt: new Date().toISOString(),
      demo: false
    });
    replace(session);
    sendCloud({ type: "answer", code: session.code, participantId: participantId, choice: choice });
    return { session: session };
  }

  function addDemoClass(joinCode) {
    var session = get(joinCode);
    if (!session || session.status !== "waiting" || session.demo) return session;
    session.demo = true;
    var firstQuestion = QUESTION;
    slidesOf(session).some(function (slide) {
      var question = questionOf(slide);
      if (!question) return false;
      firstQuestion = question;
      return true;
    });
    var plan = [17, 4, 3];
    var letters = ["A", "B", "C"];
    var made = 0;
    letters.forEach(function (letter, index) {
      for (var n = 0; n < plan[index]; n++) {
        made += 1;
        var person = {
          id: "demo_" + letter + "_" + n,
          name: "Explorer " + made,
          avatarId: made % 2 ? "fox" : "alex",
          demo: true,
          joinedAt: new Date().toISOString(),
          completedAt: null
        };
        session.participants.push(person);
        session.responses.push({
          id: "demo_r_" + person.id,
          participantId: person.id,
          questionId: firstQuestion.id,
          response: letter,
          isCorrect: letter === firstQuestion.correct,
          submittedAt: new Date().toISOString(),
          demo: true
        });
      }
    });
    for (var extra = 0; extra < 4; extra++) {
      made += 1;
      session.participants.push({
        id: "demo_wait_" + extra,
        name: "Explorer " + made,
        avatarId: "alex",
        demo: true,
        joinedAt: new Date().toISOString(),
        completedAt: null
      });
    }
    return replace(session);
  }

  function removeParticipant(joinCode, participantId) {
    var session = get(joinCode);
    if (!session || session.status !== "waiting") return session;
    session.participants = session.participants.filter(function (person) { return person.id !== participantId; });
    session.responses = session.responses.filter(function (row) { return row.participantId !== participantId; });
    return replace(session);
  }

  function start(joinCode) {
    var session = get(joinCode);
    if (!session) return null;
    session.status = "active";
    session.phase = "story";
    session.slide = 0;
    session.reveal = false;
    session.startedAt = new Date().toISOString();
    return replace(session);
  }

  function setSlide(joinCode, slide, reveal) {
    var session = get(joinCode);
    if (!session || (session.status !== "active" && session.status !== "playing")) return session;
    var slides = slidesOf(session);
    session.slide = Math.max(0, Math.min(slides.length - 1, slide));
    session.reveal = !!reveal;
    var current = slides[session.slide];
    session.phase = current.type === "question" ? (session.reveal ? "results" : "question") : "story";
    return replace(session);
  }

  function end(joinCode) {
    var session = get(joinCode);
    if (!session) return null;
    session.status = "completed";
    session.phase = "completed";
    session.endedAt = new Date().toISOString();
    session.participants.forEach(function (person) {
      if (!person.completedAt) person.completedAt = session.endedAt;
    });
    return replace(session);
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
    var bus = null;
    try {
      if (global.BroadcastChannel) {
        bus = new BroadcastChannel("wondii-class");
        bus.onmessage = run;
      }
    } catch (e) {}
    return function () {
      global.removeEventListener("storage", run);
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
