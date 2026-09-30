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
    return "<div class=\"w-join\"><p class=\"w-kicker\">Wondii</p><h1 class=\"w-title\">Join your adventure</h1>" +
      "<label class=\"w-field\" for=\"joinCode\">Class code<input id=\"joinCode\" class=\"w-input--code\" autocomplete=\"off\" value=\"" + escape(code) + "\" aria-label=\"Class code\" /></label>" +
      "<label class=\"w-field\" for=\"joinName\">First name<input id=\"joinName\" autocomplete=\"given-name\" maxlength=\"40\" aria-label=\"First name\" /></label>" +
      "<button type=\"button\" class=\"w-btn w-btn--primary w-btn--block\" id=\"joinGo\">Join</button>" +
      "<p id=\"joinNote\" class=\"w-note" + (noteText ? " w-note--again" : "") + "\">" + escape(noteText) + "</p></div>";
  }

  function viewWait(current) {
    return "<div class=\"w-join\"><p class=\"w-kicker\">You're in</p><h1 class=\"w-title\">Waiting for your teacher…</h1>" +
      "<p class=\"w-lead\">" + escape(current.session.title || "Your adventure") + "</p>" +
      "<p class=\"w-h3\">" + escape(current.participant.name) + "</p>" +
      "<p class=\"w-note w-note--info\">Look at the class screen. Your teacher will start the lesson.</p></div>";
  }

  function viewLive(current) {
    var session = current.session;
    if (session.question && !session.reveal) {
      var q = session.question;
      return "<div class=\"w-join\" data-w-context=\"room\"><p class=\"w-kicker\">Your answer</p><h1 class=\"w-display\">" + escape(q.prompt) + "</h1><div class=\"w-choices\">" +
        (q.choices || []).map(function (choice) {
          return "<button type=\"button\" class=\"w-choice\" data-choice=\"" + escape(choice.id) + "\"><b>" + escape(choice.id) + "</b><span>" + escape(choice.text) + "</span></button>";
        }).join("") + "</div><p id=\"joinNote\" class=\"w-note w-note--info\">" + escape(noteText) + "</p></div>";
    }
    if (session.reveal && session.explain) {
      return "<div class=\"w-join\"><p class=\"w-kicker\">Answer</p><h1 class=\"w-title\">" + escape(session.explain) + "</h1><p class=\"w-note w-note--correct\">Look at the class screen for the class result.</p></div>";
    }
    return "<div class=\"w-join\"><p class=\"w-kicker\">Look at the class screen</p><h1 class=\"w-title\">" + escape(session.title || "Your adventure") + "</h1><p class=\"w-note w-note--info\">Your teacher is moving the lesson on.</p></div>";
  }

  function viewDone(session) {
    return "<div class=\"w-join\"><p class=\"w-kicker\">Complete</p><h1 class=\"w-title\">You finished.</h1><p class=\"w-note w-note--success\">" + escape((session && session.title) || "Great exploring.") + "</p></div>";
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
