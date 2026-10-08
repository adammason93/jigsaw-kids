/* One Supabase client for the signed-in portal.
   Other pages must use this client. A second client refreshes the same
   login and can sign the account out. */
(function (global) {
  "use strict";

  var LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  var state = { status: "initialising", session: null, error: "" };
  var client = null;
  var listeners = [];
  var waiters = [];
  var starting = false;
  var settled = false;
  var epoch = 0;

  function cfg() {
    return global.SCORE_SYNC || {};
  }

  function snapshot() {
    var session = state.session;
    return {
      status: state.status,
      session: session,
      userId: session && session.user ? session.user.id : "",
      error: state.error || ""
    };
  }

  function emit() {
    var view = snapshot();
    listeners.forEach(function (fn) {
      try { fn(view); } catch (e) {}
    });
    try { global.document.dispatchEvent(new CustomEvent("wondii-session")); } catch (e2) {}
  }

  function setState(next) {
    state = next;
    emit();
  }

  function applySession(session, error, ticket) {
    if (ticket !== epoch) return;
    settled = true;
    if (error) {
      setState({ status: "error", session: state.session, error: "Couldn’t restore the sign-in. Check your connection and try again." });
      return;
    }
    if (session && session.user) setState({ status: "authenticated", session: session, error: "" });
    else setState({ status: "unauthenticated", session: null, error: "" });
  }

  function watch(sb) {
    sb.auth.onAuthStateChange(function (event, session) {
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        if (session && session.user) state.session = session;
        return;
      }
      if (event === "PASSWORD_RECOVERY") {
        if (session && session.user) state.session = session;
        return;
      }
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
        applySession(event === "SIGNED_OUT" ? null : session, null, ++epoch);
      }
    });
    global.setTimeout(function () {
      if (settled) return;
      var ticket = ++epoch;
      sb.auth.getSession().then(function (res) {
        applySession(res && res.data && res.data.session, res && res.error, ticket);
      }).catch(function () {
        applySession(null, new Error("session"), ticket);
      });
    }, 8000);
  }

  function finish(sb) {
    client = sb;
    var pending = waiters.slice();
    waiters = [];
    pending.forEach(function (fn) { fn(sb); });
  }

  function start() {
    if (client || starting) return;
    var c = cfg();
    if (!c.supabaseUrl || !c.supabaseAnonKey || !global.supabase || !global.supabase.createClient) return;
    starting = true;
    var sb = global.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: global.localStorage
      }
    });
    watch(sb);
    finish(sb);
  }

  function ensureLib(done) {
    if (global.supabase && global.supabase.createClient) {
      done();
      return;
    }
    var script = global.document.createElement("script");
    script.src = LIB;
    script.onload = function () { done(); };
    script.onerror = function () { done(); };
    global.document.head.appendChild(script);
  }

  function clientAsync(done) {
    if (client) {
      done(client);
      return;
    }
    waiters.push(done);
    if (!global.document) return;
    ensureLib(function () {
      start();
      if (!client) {
        waiters = waiters.filter(function (fn) { return fn !== done; });
        done(null);
      }
    });
  }

  function retry() {
    settled = false;
    setState({ status: "initialising", session: state.session, error: "" });
    if (!client) {
      starting = false;
      ensureLib(function () { start(); });
      return;
    }
    var ticket = ++epoch;
    client.auth.getSession().then(function (res) {
      applySession(res && res.data && res.data.session, res && res.error, ticket);
    }).catch(function () {
      applySession(null, new Error("session"), ticket);
    });
  }

  global.WondiiSession = {
    get: snapshot,
    current: function () { return client; },
    client: clientAsync,
    subscribe: function (fn) {
      listeners.push(fn);
      try { fn(snapshot()); } catch (e) {}
    },
    retry: retry
  };

  if (global.document) {
    ensureLib(function () {
      start();
      if (!client && !settled) applySession(null, new Error("session"), ++epoch);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
