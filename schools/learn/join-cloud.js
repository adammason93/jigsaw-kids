/* Anonymous join. Looks up one code. Does not read the teacher's session book. */
(function (global) {
  "use strict";

  var sb = null;
  var SELF = "wondii-join-self";

  function cfg() {
    return global.SCORE_SYNC || {};
  }

  function client() {
    var c = cfg();
    if (!c.supabaseUrl || !c.supabaseAnonKey || !global.supabase || !global.supabase.createClient) return null;
    if (!sb) sb = global.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey);
    return sb;
  }

  function self() {
    try { return JSON.parse(sessionStorage.getItem(SELF) || "null"); } catch (e) { return null; }
  }

  function remember(code, participantId, name) {
    try {
      sessionStorage.setItem(SELF, JSON.stringify({ code: code, participantId: participantId, name: name || "" }));
    } catch (e) {}
  }

  function lookup(code) {
    var db = client();
    if (!db) return Promise.resolve({ error: "Joining is not available right now. Ask your teacher." });
    return db.rpc("school_join_lookup", { p_code: String(code || "").trim() }).then(function (res) {
      if (res.error || !res.data) return { error: "That code is not open. Check it with your teacher." };
      return { session: res.data };
    });
  }

  function join(code, name) {
    var db = client();
    if (!db) return Promise.resolve({ error: "Joining is not available right now. Ask your teacher." });
    return db.rpc("school_join", { p_code: String(code || "").trim(), p_name: name || "" }).then(function (res) {
      if (res.error || !res.data) return { error: "That code is not open. Check it with your teacher." };
      if (res.data.error) return { error: res.data.error };
      remember(res.data.session.code, res.data.participantId, res.data.name);
      return { session: res.data.session, participant: { id: res.data.participantId, name: res.data.name } };
    });
  }

  function answer(code, participantId, choice) {
    var db = client();
    if (!db) return Promise.resolve({ error: "Joining is not available right now. Ask your teacher." });
    return db.rpc("school_join_answer", {
      p_code: code,
      p_participant: participantId,
      p_choice: choice
    }).then(function (res) {
      if (res.error || !res.data) return { error: "That answer did not reach the class. Try again." };
      if (res.data.error) return { error: res.data.error };
      return { session: res.data.session };
    });
  }

  global.WondiiJoinCloud = { lookup: lookup, join: join, answer: answer, self: self };
})(window);
