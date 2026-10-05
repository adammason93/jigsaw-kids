/**
 * Access token for clever-service. The family password session already lives
 * in supabase-js (localStorage). Sends that user JWT as Authorization and keeps
 * the anon key only in the apikey header.
 *
 * Does not edit score-cloud.js. On the storybook page it reuses KidsScoreCloud
 * when that client is already loaded; otherwise it opens its own client against
 * the same project URL so the stored session is shared.
 */
(function (global) {
  "use strict";

  var SYNC_LIB =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  var client = null;
  var loadingLib = false;
  var loadWaiters = [];

  function cfg() {
    return global.SCORE_CONFIG || global.SCORE_SYNC || {};
  }

  function anonKey() {
    return cfg().supabaseAnonKey ? String(cfg().supabaseAnonKey) : "";
  }

  function loadSupabaseLib(cb) {
    if (global.supabase && global.supabase.createClient) {
      cb();
      return;
    }
    if (loadingLib) {
      loadWaiters.push(cb);
      return;
    }
    loadingLib = true;
    var s = document.createElement("script");
    s.src = SYNC_LIB;
    s.async = true;
    s.onload = function () {
      loadingLib = false;
      cb();
      loadWaiters.forEach(function (fn) {
        fn();
      });
      loadWaiters = [];
    };
    s.onerror = function () {
      loadingLib = false;
      loadWaiters = [];
      cb();
    };
    document.head.appendChild(s);
  }

  function ensureClient(done) {
    var c = cfg();
    if (!c.supabaseUrl || !c.supabaseAnonKey) {
      done(null);
      return;
    }
    if (client) {
      done(client);
      return;
    }
    loadSupabaseLib(function () {
      var supaMod = global.supabase;
      if (!supaMod || typeof supaMod.createClient !== "function") {
        done(null);
        return;
      }
      client = supaMod.createClient(c.supabaseUrl, c.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: global.localStorage,
        },
      });
      done(client);
    });
  }

  function sessionToken(session) {
    return session && session.access_token ? String(session.access_token) : "";
  }

  /**
   * cb(err, accessToken). err is set when nobody is signed in.
   * A grown-up message belongs in the caller.
   */
  function withAccessToken(cb) {
    if (global.KidsScoreCloud && typeof global.KidsScoreCloud.getSession === "function") {
      global.KidsScoreCloud.getSession(function (session, err) {
        var token = sessionToken(session);
        if (token) {
          cb(null, token);
          return;
        }
        cb(err || new Error("no_session"), "");
      });
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        cb(new Error("no_session"), "");
        return;
      }
      sb.auth
        .getSession()
        .then(function (res) {
          var sess = res.data && res.data.session;
          if (!sess || !sess.user) {
            cb(new Error("no_session"), "");
            return;
          }
          return sb.auth.refreshSession().then(function (r2) {
            var next = r2.data && r2.data.session;
            var token = sessionToken(next) || sessionToken(sess);
            if (!token) {
              cb(new Error("no_session"), "");
              return;
            }
            cb(null, token);
          });
        })
        .catch(function () {
          cb(new Error("no_session"), "");
        });
    });
  }

  function authHeaders(accessToken) {
    var key = anonKey();
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + String(accessToken || ""),
      apikey: key,
    };
  }

  global.EdgeSession = {
    anonKey: anonKey,
    withAccessToken: withAccessToken,
    authHeaders: authHeaders,
  };
})(typeof window !== "undefined" ? window : this);
