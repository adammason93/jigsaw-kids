/* Opens an adventure in WondiiLessonShell. The shell paints. The session engine decides. */
(function () {
  "use strict";

  var Rooms = window.ClassRooms;
  var Shell = window.WondiiLessonShell;
  var root = document.getElementById("classRoot");
  var params = new URLSearchParams(location.search);
  var journeyId = params.get("journey") || "";
  var memoryJourney = null;
  if (!journeyId && params.get("example") === "lights") {
    location.replace("create.html?example=lights");
  }
  if (!journeyId && params.get("example") === "mechanics" && window.WondiiMechanicCore) {
    memoryJourney = {
      id: "fixture-mechanics",
      plan: { title: "Electricity Adventure", slides: WondiiMechanicCore.fixtureSlides() },
      learningMap: { yearGroup: "Year 4", subject: "Science", topic: "Electricity" }
    };
    journeyId = memoryJourney.id;
  }
  if (params.get("journey") && params.get("preview") !== "1" && params.get("edit") !== "1" && params.get("example") !== "mechanics" && !params.get("session")) {
    location.replace("create.html?start=" + encodeURIComponent(params.get("journey")) + (params.get("class") ? "&class=" + encodeURIComponent(params.get("class")) : ""));
  }
  var sessionCode = (params.get("session") || "").toUpperCase();
  var journey = null;
  var previous = null;

  function escape(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function findJourney() {
    if (!window.WondiiLearn) return null;
    var list = WondiiLearn.allJourneys ? WondiiLearn.allJourneys() : WondiiLearn.visibleLibrary();
    for (var i = 0; i < list.length; i++) if (list[i].id === journeyId) return list[i];
    var draft = WondiiLearn.loadDraft && WondiiLearn.loadDraft();
    if (draft && draft.id === journeyId && draft.plan) return draft;
    if (memoryJourney && memoryJourney.id === journeyId) return memoryJourney;
    return null;
  }

  function session() {
    return sessionCode ? Rooms.get(sessionCode) : null;
  }

  function slidesNow(current) {
    if (current && current.slides && current.slides.length) return current.slides;
    if (journey && journey.plan && journey.plan.slides && journey.plan.slides.length) return journey.plan.slides;
    if (journey && journey.demoElectricity) return Rooms.deck();
    return [];
  }

  function liveQuestion(slide) {
    var question = (slide && Rooms.questionOf(slide)) || Rooms.QUESTION;
    var edits = journey && journey.questionEdits && journey.questionEdits[question.id];
    if (!edits || (slide && slide.question)) return question;
    var copy = JSON.parse(JSON.stringify(question));
    if (edits.prompt) copy.prompt = edits.prompt;
    if (edits.explain) copy.explain = edits.explain;
    if (edits.correct) copy.correct = edits.correct;
    if (edits.choices) copy.choices = edits.choices;
    return copy;
  }

  function classPupils() {
    var classId = params.get("class") || (journey && journey.classId) || "";
    if (!classId) return [];
    try {
      var book = JSON.parse(localStorage.getItem("wondii-school-classes") || "null");
      if (!book || !Array.isArray(book.classes)) return [];
      var room = null;
      book.classes.forEach(function (item) { if (item.id === classId) room = item; });
      if (!room) return [];
      return (room.pupils || []).map(function (pupil) {
        var hair = /^(brown|black|blonde|auburn)$/.test(pupil.hair) ? pupil.hair : "brown";
        var who = pupil.presentation === "girl" || pupil.presentation === "boy" ? pupil.presentation : "";
        var length = who === "girl" ? "long" : "short";
        if (!who && pupil.length === "long") length = "long";
        var yearText = String(room.yearLabel || room.name || "").toLowerCase();
        var yearMatch = yearText.match(/\b(?:year|yr|y)\s*([1-6])(?!\d)/);
        var year = /\breception\b/.test(yearText) ? 0 : (yearMatch ? Number(yearMatch[1]) : null);
        var prefix = year === null || year === 4 ? "" : (year <= 1 ? "5-" : (year <= 3 ? "6-" : "10-"));
        return {
          id: pupil.id || "",
          firstName: pupil.firstName,
          portrait: "../../games/images/schools/room/kid-" + prefix + hair + "-" + length + ".webp"
        };
      });
    } catch (e) {
      return [];
    }
  }

  function portraits(pupils) {
    var map = {};
    (pupils || []).forEach(function (pupil) { if (pupil.id) map[pupil.id] = pupil.portrait; });
    return map;
  }

  function orgBits() {
    var org = window.WondiiOrg && WondiiOrg.get ? WondiiOrg.get() : {};
    return { name: org.organisationName || "", logo: org.logoUrl || "" };
  }

  function goSession(created) {
    if (!created) return;
    sessionCode = created.code;
    location.href = "present.html?session=" + created.code + (params.get("class") ? "&class=" + encodeURIComponent(params.get("class")) : "");
  }

  function boardFrom(spec) {
    var C = window.Classroom;
    var topic = journey && journey.learningMap ? journey.learningMap.topic : "";
    var board = C.blankBoard(topic, (journey && journey.playfulness) || "playful");
    (spec.pupils || []).forEach(function (pupil) {
      if (!pupil.here) return;
      var added = C.addPupil(board, pupil.firstName);
      if (!added) return;
      if (pupil.id) added.id = pupil.id;
      added.here = true;
      added.inWheel = true;
      added.portrait = pupil.portrait || "";
    });
    board.phase = "gate";
    return board;
  }

  function currentSlide(current) {
    var slides = slidesNow(current);
    var index = current ? current.slide || 0 : Number(params.get("slide") || "0");
    return slides[index] || null;
  }

  function paint() {
    journey = findJourney();
    var current = session();
    if (params.get("edit") === "1" && !current) {
      root.innerHTML = viewPreview();
      bindPreview();
      return;
    }
    if (current && previous && current.code === previous.code) Shell.noteScore(current, previous);
    var pupils = classPupils();
    var org = orgBits();
    var slide = currentSlide(current);
    var question = slide && (slide.type === "question" || slide.type === "quiz") ? liveQuestion(slide) : null;
    var map = journey && journey.learningMap ? journey.learningMap : {};
    var fresh = params.get("fresh") === "1";
    if (fresh) {
      params.delete("fresh");
      history.replaceState(null, "", location.pathname + "?" + params.toString());
    }
    Shell.render(root, {
      title: (current && current.title) || (journey && journey.plan && journey.plan.title) || map.topic || "Today's adventure",
      year: (current && current.yearGroup) || map.yearGroup || "",
      orgName: org.name,
      orgLogo: org.logo,
      view: current,
      slides: slidesNow(current),
      slideIndex: Number(params.get("slide") || "0"),
      preview: params.get("preview") === "1" && !current,
      fresh: fresh,
      pupils: pupils,
      portraits: portraits(pupils),
      joined: current && current.engine && window.WondiiSessionEngine ? WondiiSessionEngine.joinedCount(current.engine) : (current ? current.participants.length : 0),
      question: question,
      pick: params.get("pick") || "",
      reveal: params.get("reveal") === "1",
      mysteryOpen: params.get("mystery") === "1",
      mysteryText: map.keyVocabulary && map.keyVocabulary[0] ? "A word from today: " + map.keyVocabulary[0] + "." : "Keep the idea you have just learned.",
      door: params.get("door") || "",
      doorText: (map.learningObjectives || [])[Number(params.get("door") || 1) - 1] || "Today's idea stays with the class.",
      againHref: "present.html?journey=" + encodeURIComponent(journeyId) + (params.get("class") ? "&class=" + encodeURIComponent(params.get("class")) : ""),
      classHref: params.get("class") ? "class.html?id=" + encodeURIComponent(params.get("class")) : "../../portal.html#classes",
      actions: actions
    });
    previous = current;
  }

  var actions = {
    startBoard: function (spec) {
      if (!journey || !window.Classroom) return;
      var created = Rooms.createSession(journey, "board", false, {
        board: boardFrom(spec),
        classId: params.get("class") || journey.classId || null,
        teamMode: spec.teamMode || "none"
      });
      goSession(created);
    },
    startJoin: function () {
      if (!journey) return;
      var created = Rooms.createSession(journey, "live", false, { classId: params.get("class") || journey.classId || null });
      goSession(created);
    },
    begin: function () {
      var current = session();
      if (current && current.board) {
        current.board.phase = "play";
        Rooms.replace(current);
      }
      paint();
    },
    startLiveSession: function () {
      Rooms.start(sessionCode);
      paint();
    },
    reveal: function () {
      var current = session();
      if (!current) {
        params.set("reveal", "1");
        history.replaceState(null, "", location.pathname + "?" + params.toString());
        paint();
        return;
      }
      Rooms.setSlide(current.code, current.slide, true);
      paint();
    },
    pick: function (choice) {
      var current = session();
      params.set("pick", choice);
      params.set("reveal", "1");
      var slide = currentSlide(current);
      var question = slide ? liveQuestion(slide) : null;
      if (!current) {
        history.replaceState(null, "", location.pathname + "?" + params.toString());
        paint();
        return;
      }
      Rooms.setSlide(current.code, current.slide, true);
      if (question && choice === question.correct) {
        var engine = current.engine;
        var teamId = null;
        if (engine && engine.selectedParticipantId && engine.teamMode && engine.teamMode !== "none") {
          engine.participants.forEach(function (person) {
            if (person.id === engine.selectedParticipantId) teamId = person.teamId;
          });
        }
        var awarded = Rooms.award(current.code, teamId, 1, "q-" + current.slide);
        var teamName = "";
        if (awarded && awarded.engine && teamId) {
          awarded.engine.teams.forEach(function (team) { if (team.id === teamId) teamName = team.name; });
        }
        Shell.noteFeedback("yes", "Great work!", teamName ? "+1 " + teamName + " team" : "");
      } else Shell.noteFeedback("again", "Nearly! Let's have another look.", "");
      paint();
    },
    tryAgain: function () {
      params.delete("pick");
      params.delete("reveal");
      Shell.clearFeedback();
      var current = session();
      if (current) {
        current.reveal = false;
        Rooms.replace(current);
      } else history.replaceState(null, "", location.pathname + "?" + params.toString());
      paint();
    },
    spin: function () {
      var current = session();
      if (!current || !current.board || !window.Classroom) return;
      window.Classroom.take(current.board);
      Rooms.replace(current);
      paint();
    },
    mystery: function () {
      params.set("mystery", "1");
      var current = session();
      if (current) Rooms.award(current.code, null, 1, "mystery");
      else history.replaceState(null, "", location.pathname + "?" + params.toString());
      paint();
    },
    door: function (n) {
      params.set("door", n);
      var current = session();
      if (current) Rooms.award(current.code, null, 1, "door");
      else history.replaceState(null, "", location.pathname + "?" + params.toString());
      paint();
    },
    goTo: function (index) {
      Shell.clearFeedback();
      var current = session();
      if (!current) return;
      Rooms.setSlide(current.code, index, false);
      paint();
    },
    previewNext: function (index) {
      var slides = slidesNow(null);
      var next = index + 1;
      if (next >= slides.length) {
        location.href = "create.html?library=1";
        return;
      }
      params.set("slide", String(next));
      params.delete("reveal");
      params.delete("pick");
      history.replaceState(null, "", location.pathname + "?" + params.toString());
      paint();
    },
    pause: function () { Rooms.pause(sessionCode); paint(); },
    resume: function () { Rooms.resume(sessionCode); paint(); },
    skip: function () { Rooms.skipRound(sessionCode); Shell.clearFeedback(); paint(); },
    retry: function () { Rooms.recover(sessionCode); Rooms.resume(sessionCode); paint(); },
    end: function () { Rooms.end(sessionCode); paint(); },
    complete: function () { Rooms.complete(sessionCode); paint(); },
    choose: function (id) { Rooms.chooseParticipant(sessionCode, id); paint(); },
    adjust: function (teamId, delta) {
      var reason = "teacher-" + Date.now();
      if (delta > 0) Rooms.award(sessionCode, teamId || null, 1, reason);
      else Rooms.takePoints(sessionCode, teamId || null, 1, reason);
      paint();
    },
    play: function (packet) {
      var current = session();
      if (!current) return;
      Rooms.applyMechanic(current.code, packet || {});
      if (packet && packet.clearFeedback) Shell.clearFeedback();
      if (packet && packet.feedback) Shell.noteFeedback(packet.feedback.kind, packet.feedback.text, packet.feedback.extra || "");
      if (packet && packet.done) {
        var latest = session();
        if (latest && latest.slide < (latest.slides || []).length - 1) Shell.queueTransition();
      }
      paint();
    },
    fail: function () { Rooms.failRound(sessionCode); paint(); },
    fullscreen: function () {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        var req = document.documentElement.requestFullscreen();
        if (req && req.catch) req.catch(function () {});
      } else if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  function viewPreview() {
    var slides = slidesNow(null);
    var blocks = slides.map(function (slide) {
      if (slide.type !== "question") {
        return "<section class=\"class-card\"><h2>" + escape(slide.kicker || "Activity") + "</h2>" + (slide.lines || []).map(function (line) { return "<p>" + escape(line) + "</p>"; }).join("") + "</section>";
      }
      var q = liveQuestion(slide);
      return "<section class=\"class-card\" data-qid=\"" + escape(q.id) + "\"><h2>Teacher answers</h2><label>Question<input class=\"class-field\" data-edit=\"prompt\" value=\"" + escape(q.prompt) + "\" /></label>" +
        q.choices.map(function (choice) {
          return "<label>" + choice.id + "<input class=\"class-field\" data-choice=\"" + choice.id + "\" value=\"" + escape(choice.text) + "\" /></label>";
        }).join("") +
        "<p>Correct: " + escape(q.correct) + "</p><label>Explanation<input class=\"class-field\" data-edit=\"explain\" value=\"" + escape(q.explain) + "\" /></label></section>";
    }).join("");
    return "<section class=\"class-sheet\"><p class=\"class-kicker\">Teacher preview</p><h1>Check the questions</h1>" + blocks +
      "<button type=\"button\" class=\"class-btn\" id=\"saveEdits\">Save edits</button></section>";
  }

  function bindPreview() {
    var saveEdits = document.getElementById("saveEdits");
    if (!saveEdits) return;
    saveEdits.addEventListener("click", function () {
      if (!journey || !window.WondiiLearn) return;
      journey.questionEdits = journey.questionEdits || {};
      document.querySelectorAll("[data-qid]").forEach(function (card) {
        var id = card.getAttribute("data-qid");
        var prompt = card.querySelector("[data-edit=\"prompt\"]");
        var explain = card.querySelector("[data-edit=\"explain\"]");
        var choices = [];
        card.querySelectorAll("[data-choice]").forEach(function (input) {
          choices.push({ id: input.getAttribute("data-choice"), text: input.value });
        });
        journey.questionEdits[id] = { prompt: prompt ? prompt.value : "", explain: explain ? explain.value : "", choices: choices };
      });
      WondiiLearn.upsertLibrary(journey);
      WondiiLearn.saveDraft(journey);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var open = document.querySelector(".lesson-overlay, .lesson-panel");
    if (!open) return;
    Shell.resetFlow();
    paint();
  });

  Rooms.subscribe(paint);
  Rooms.connectCloud(function () { paint(); });
  paint();
  window.WondiiPresent = { reload: paint };
})();
