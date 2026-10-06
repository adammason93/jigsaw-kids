/* Local provisional preview only (copied to sg/join-local.js by player.js buildSite).
   Stands in for join-cloud.js, whose Supabase RPCs are not available offline. It reads the
   class session that present.html keeps in this browser's localStorage and returns the same
   pupil view as private.school_join_view: the question (prompt and lettered choices) while a
   question slide is open, the explanation on reveal, otherwise "look at the class screen".
   Differences from production, stated so nobody mistakes this for the real path:
   - it follows the quiz's current question (mechanic index); the SQL view reads slide.question,
     which is the first question of a multi-question slide;
   - string choices are lettered A, B, C here; the SQL view expects {id, text} choices;
   - join and answer do not write into the teacher's session (answers are not counted). */
(function (global) {
  "use strict";
  var KEY = "wondii-class-sessions";
  var SELF = "wondii-join-self";
  var LETTERS = ["A", "B", "C", "D"];
  // The preview binds a local account scope, so the session book may sit under wondii-u:<scope>:KEY.
  function all() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k !== KEY && k.slice(-(KEY.length + 1)) !== ":" + KEY) continue;
      try { out = out.concat(JSON.parse(localStorage.getItem(k) || "[]") || []); } catch (e) {}
    }
    return out;
  }
  function find(code) { var want = String(code || "").trim().toUpperCase(); return all().filter(function (s) { return s.code === want; })[0] || null; }
  function self() { try { return JSON.parse(sessionStorage.getItem(SELF) || "null"); } catch (e) { return null; } }
  function view(s) {
    var slides = s.slides || [];
    var index = Math.max(0, Math.min(Number(s.slide) || 0, slides.length - 1));
    var slide = slides[index] || null;
    var round = s.engine && s.engine.rounds ? s.engine.rounds[index] : null;
    var saved = round && s.engine.mechanicStore ? s.engine.mechanicStore[round.id] : null;
    var qIndex = saved && saved.index ? Number(saved.index) : 0;
    var answered = !!(saved && saved.answers && saved.answers[String(qIndex)]);
    var list = slide && slide.questions && slide.questions.length ? slide.questions : (slide && slide.question ? [slide.question] : []);
    var q = list[Math.min(qIndex, list.length - 1)] || null;
    var reveal = !!s.reveal || answered;
    var question = null;
    if (slide && slide.type === "question" && q && !reveal) question = { prompt: q.prompt || "", choices: (q.choices || []).map(function (c, i) { return typeof c === "string" ? { id: LETTERS[i], text: c } : { id: c.id, text: c.text }; }) };
    return { code: s.code, title: s.title || "Your adventure", status: s.status, phase: s.phase || "", slide: index, reveal: reveal, groupCount: s.groupCount || 0, question: question, explain: slide && slide.type === "question" && q && reveal ? (q.explain || "") : null };
  }
  function lookup(code) { var s = find(code); return Promise.resolve(s ? { session: view(s) } : { error: "That code is not open. Check it with your teacher." }); }
  function join(code, name) {
    var s = find(code);
    if (!s || s.status !== "waiting") return Promise.resolve({ error: "That code is not open. Check it with your teacher." });
    var display = String(name || "").replace(/[^A-Za-z '\-]/g, "").trim().split(" ")[0] || "Explorer";
    var id = "local-" + Date.now().toString(36);
    try { sessionStorage.setItem(SELF, JSON.stringify({ code: s.code, participantId: id, name: display })); } catch (e) {}
    return Promise.resolve({ session: view(s), participant: { id: id, name: display } });
  }
  function answer(code) { var s = find(code); return Promise.resolve(s ? { session: view(s), error: "Preview: answer shown here only, not counted." } : { error: "That answer did not reach the class. Try again." }); }
  global.WondiiJoinCloud = { lookup: lookup, join: join, answer: answer, self: self, preview: true };
})(window);
