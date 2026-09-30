/* Pupil join. No account. The class code loads one session, not the teacher's browser book. */
(function () {
  "use strict";

  var Cloud = window.WondiiJoinCloud;
  var root = document.getElementById("joinRoot");
  var params = new URLSearchParams(location.search);
  var code = (params.get("code") || "").toUpperCase();
  var here = null;
  var noteText = "";

  function escape(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch];
    });
  }

  function paint() {
    if (!here) root.innerHTML = viewCode();
    else if (here.session.status === "completed" || here.session.phase === "completed") root.innerHTML = viewDone(here.session);
    else if (here.session.status === "waiting") root.innerHTML = viewWait(here);
    else root.innerHTML = viewLive(here);
    bind();
  }

  function viewCode() {
    return "<p class=\"class-kicker\">Wondii</p><h1>Join your adventure</h1>" +
      "<label for=\"joinCode\">Class code</label><input id=\"joinCode\" autocomplete=\"off\" value=\"" + escape(code) + "\" aria-label=\"Class code\" />" +
      "<label for=\"joinName\">First name</label><input id=\"joinName\" autocomplete=\"given-name\" maxlength=\"40\" aria-label=\"First name\" />" +
      "<button type=\"button\" class=\"class-btn\" id=\"joinGo\">Join</button>" +
      "<p id=\"joinNote\" class=\"class-lead\">" + escape(noteText) + "</p>";
  }

  function viewWait(current) {
    return "<p class=\"class-kicker\">You're in</p><h1>Waiting for your teacher…</h1>" +
      "<p class=\"class-copy\">" + escape(current.session.title || "Your adventure") + "</p>" +
      "<p class=\"class-lead\">" + escape(current.participant.name) + "</p>" +
      "<p class=\"class-lead\">Look at the class screen. Your teacher will start the lesson.</p>";
  }

  function viewLive(current) {
    var session = current.session;
    if (session.question && !session.reveal) {
      var q = session.question;
      return "<p class=\"class-kicker\">Your answer</p><h1>" + escape(q.prompt) + "</h1><div class=\"class-choices\">" +
        (q.choices || []).map(function (choice) {
          return "<button type=\"button\" class=\"class-choice\" data-choice=\"" + escape(choice.id) + "\"><b>" + escape(choice.id) + "</b><span>" + escape(choice.text) + "</span></button>";
        }).join("") + "</div><p id=\"joinNote\" class=\"class-lead\">" + escape(noteText) + "</p>";
    }
    if (session.reveal && session.explain) {
      return "<p class=\"class-kicker\">Answer</p><h1>" + escape(session.explain) + "</h1><p class=\"class-lead\">Look at the class screen for the class result.</p>";
    }
    return "<p class=\"class-kicker\">Look at the class screen</p><h1>" + escape(session.title || "Your adventure") + "</h1><p class=\"class-lead\">Your teacher is moving the lesson on.</p>";
  }

  function viewDone(session) {
    return "<p class=\"class-kicker\">Complete</p><h1>You finished.</h1><p class=\"class-lead\">" + escape((session && session.title) || "Great exploring.") + "</p>";
  }

  function refresh() {
    var saved = Cloud.self();
    if (!saved || !saved.code) return;
    Cloud.lookup(saved.code).then(function (result) {
      if (result.error || !result.session) return;
      here = { session: result.session, participant: { id: saved.participantId, name: saved.name || "Explorer" } };
      noteText = "";
      paint();
    });
  }

  function bind() {
    var go = document.getElementById("joinGo");
    if (go) go.addEventListener("click", function () {
      var input = document.getElementById("joinCode");
      var name = document.getElementById("joinName");
      code = input ? input.value : code;
      Cloud.join(code, name ? name.value : "").then(function (result) {
        if (result.error) {
          noteText = result.error;
          here = null;
          paint();
          return;
        }
        here = result;
        noteText = "";
        paint();
      });
    });
    document.querySelectorAll("[data-choice]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var saved = Cloud.self();
        if (!saved) return;
        Cloud.answer(saved.code, saved.participantId, btn.getAttribute("data-choice")).then(function (result) {
          noteText = result.error || "Answer sent.";
          if (result.session) here = { session: result.session, participant: here.participant };
          paint();
        });
      });
    });
  }

  refresh();
  paint();
  window.setInterval(refresh, 4000);
  window.WondiiJoin = { reload: paint };
})();
