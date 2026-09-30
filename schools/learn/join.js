/* Pupil join. No account, surname, email, or photo. */
(function () {
  "use strict";

  var Rooms = window.ClassRooms;
  var root = document.getElementById("joinRoot");
  var params = new URLSearchParams(location.search);
  var code = (params.get("code") || "").toUpperCase();
  var avatar = "fox";
  var remote = null;

  function escape(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function mine() {
    var saved = Rooms.self();
    if (!saved) return null;
    var session = Rooms.get(saved.code);
    if (session) {
      var person = null;
      session.participants.forEach(function (item) { if (item.id === saved.participantId) person = item; });
      if (person) return { session: session, participant: person };
    }
    if (remote && remote.code === saved.code) return { session: remote, participant: { id: saved.participantId, name: "Explorer" }, remote: true };
    return null;
  }

  function paint() {
    var here = mine();
    if (pendingTeam) root.innerHTML = viewTeams(pendingTeam);
    else if (!here) root.innerHTML = viewCode();
    else if (here.session.status === "completed" || here.session.phase === "completed") root.innerHTML = viewDone(here.session);
    else if (here.session.status === "waiting") root.innerHTML = viewWait(here);
    else root.innerHTML = viewLive(here);
    bind();
  }

  function viewCode() {
    return "<p class=\"class-kicker\">Wondii</p><h1>Join your adventure</h1>" +
      "<label for=\"joinCode\">Class code</label><input id=\"joinCode\" autocomplete=\"off\" value=\"" + escape(code) + "\" aria-label=\"Class code\" />" +
      "<button type=\"button\" class=\"class-btn\" id=\"joinGo\">Join</button>" +
      "<p id=\"joinNote\" class=\"class-lead\"></p>";
  }

  function viewWait(here) {
    return "<p class=\"class-kicker\">You're in</p><h1>Waiting for your teacher…</h1>" +
      "<p class=\"class-copy\">" + escape(here.session.title || "Your adventure") + "</p>" +
      "<p class=\"class-lead\">" + escape(here.participant.name) + "</p>" +
      "<p class=\"class-lead\">Look at the class screen. Your teacher will start the lesson.</p>";
  }

  var pendingTeam = null;

  function viewLive(here) {
    var session = here.session;
    var slides = Rooms.slidesOf ? Rooms.slidesOf(session) : Rooms.deck();
    var slide = slides[session.slide] || slides[0];
    if (slide.type === "question" && !session.reveal) {
      var q = Rooms.questionOf ? (Rooms.questionOf(slide) || Rooms.QUESTION) : Rooms.QUESTION;
      return "<p class=\"class-kicker\">Your answer</p><h1>" + escape(q.prompt) + "</h1><div class=\"class-choices\">" +
        q.choices.map(function (choice) {
          return "<button type=\"button\" class=\"class-choice\" data-choice=\"" + choice.id + "\"><b>" + choice.id + "</b><span>" + escape(choice.text) + "</span></button>";
        }).join("") + "</div><p id=\"joinNote\" class=\"class-lead\"></p>";
    }
    if (slide.type === "question" && session.reveal) {
      var revealed = Rooms.questionOf ? (Rooms.questionOf(slide) || Rooms.QUESTION) : Rooms.QUESTION;
      return "<p class=\"class-kicker\">Answer</p><h1>" + escape(revealed.explain) + "</h1><p class=\"class-lead\">Look at the class screen for the class result. Your own answer stays on your screen.</p>";
    }
    if (slide.type === "done") return viewDone(session);
    return "<p class=\"class-kicker\">Look at the class screen</p><h1>" + escape(slide.kicker || session.title) + "</h1><p class=\"class-lead\">Your teacher is moving the lesson on.</p>";
  }

  function viewTeams(info) {
    var buttons = "";
    for (var n = 1; n <= info.teams; n++) {
      buttons += "<button type=\"button\" class=\"class-choice\" data-team=\"" + n + "\"><b>" + n + "</b><span>Team " + n + "</span></button>";
    }
    return "<p class=\"class-kicker\">Your team</p><h1>" + escape(info.title || "Join your adventure") + "</h1><div class=\"class-choices\">" + buttons + "</div><p id=\"joinNote\" class=\"class-lead\"></p>";
  }

  function viewDone(session) {
    var electric = session && /electric/i.test(session.topic || "");
    if (electric) {
      return "<p class=\"class-kicker\">Complete</p><h1>You brought the lights back.</h1>" +
        "<p class=\"class-lead\">Today you explored electrical circuits, cells, bulbs, switches and complete paths.</p><p class=\"class-lead\">Great exploring.</p>";
    }
    return "<p class=\"class-kicker\">Complete</p><h1>You finished.</h1><p class=\"class-lead\">" + escape((session && session.title) || "Great exploring.") + "</p>";
  }

  function bind() {
    var go = document.getElementById("joinGo");
    if (go) go.addEventListener("click", function () {
      var input = document.getElementById("joinCode");
      var result = Rooms.join(input.value, { avatarId: avatar });
      var note = document.getElementById("joinNote");
      if (result.error) {
        if (note) note.textContent = result.error;
        return;
      }
      if (result.needsTeam) {
        pendingTeam = result;
        paint();
        return;
      }
      if (result.pending) {
        remote = { code: result.code, title: "Your adventure", status: "waiting", phase: "waiting", slide: 0, reveal: false, participants: [] };
        paint();
        return;
      }
      paint();
    });
    document.querySelectorAll("[data-team]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!pendingTeam) return;
        var result = Rooms.join(pendingTeam.code, { team: btn.getAttribute("data-team"), avatarId: avatar });
        var note = document.getElementById("joinNote");
        if (result.error) {
          if (note) note.textContent = result.error;
          return;
        }
        pendingTeam = null;
        paint();
      });
    });
    document.querySelectorAll("[data-choice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var saved = Rooms.self();
        if (!saved) return;
        var result = Rooms.answer(saved.code, saved.participantId, btn.getAttribute("data-choice"));
        if (result.error) {
          var note = document.getElementById("joinNote");
          if (note) note.textContent = result.error;
          return;
        }
        if (!result.session) {
          Rooms.connectCloud && sendAnswer(saved, btn.getAttribute("data-choice"));
        }
        paint();
      });
    });
  }

  function sendAnswer(saved, choice) {
    /* answer() already sends when the session is local. Remote answers go through the cloud from answer() only if local.
       If the session is not local, tell the teacher directly. */
    if (!Rooms.get(saved.code) && window.ClassRooms) {
      var channelNote = saved;
      try {
        sessionStorage.setItem("wondii-join-choice", choice);
      } catch (e) {}
      channelNote.choice = choice;
    }
  }

  Rooms.subscribe(function () {
    var saved = Rooms.self();
    if (saved && remote && Rooms.get(saved.code)) remote = null;
    paint();
  });
  Rooms.connectCloud(function (payload) {
    if (!payload || !payload.code) return;
    var saved = Rooms.self();
    if (payload.status && saved && payload.code === saved.code) {
      remote = payload;
      paint();
    }
  });
  paint();
  window.WondiiJoin = { reload: paint };
})();
