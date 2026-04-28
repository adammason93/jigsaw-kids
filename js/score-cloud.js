/**
 * Cloud score sync via Supabase (magic-link email). Configure keys in score-config.js.
 * Loads @supabase/supabase-js UMD when settings open or when a session restores.
 */
(function (global) {
  "use strict";

  var SCORE_KEYS = [
    "memoryScorecardV1",
    "tttScorecardV1",
    "jigsawScorecardV1",
    "runnerScorecardV1",
    "snakesScorecardV1",
    "snapScorecardV1",
    "colouringScorecardV1",
    "c4ScorecardV1",
    "wordSearchScorecardV1",
    "mathRaceScorecardV1",
  ];

  var SYNC_LIB =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";

  /** @type {ReturnType<typeof import("@supabase/supabase-js").createClient>|null} */
  var client = null;
  var loadingLib = false;
  var loadWaiters = [];
  var pushTimer = null;
  var settingsPatched = false;

  function cfg() {
    return global.SCORE_SYNC || {};
  }

  function isConfigured() {
    var c = cfg();
    return !!(c.supabaseUrl && c.supabaseAnonKey);
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
    };
    document.head.appendChild(s);
  }

  function ensureClient(done) {
    if (!isConfigured()) {
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
      var c = cfg();
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

  function collectNestedPayload() {
    /** @type {Record<string, unknown>} */
    var nested = {};
    for (var i = 0; i < SCORE_KEYS.length; i++) {
      var k = SCORE_KEYS[i];
      try {
        var raw = global.localStorage.getItem(k);
        if (raw != null && raw !== "") {
          nested[k] = JSON.parse(raw);
        }
      } catch (e) {}
    }
    return nested;
  }

  function schedulePush() {
    if (!isConfigured()) {
      return;
    }
    if (pushTimer) {
      global.clearTimeout(pushTimer);
    }
    pushTimer = global.setTimeout(function () {
      pushTimer = null;
      pushBundle();
    }, 1600);
  }

  function pushBundle() {
    if (!isConfigured()) {
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        return;
      }
      sb.auth.getSession().then(function (res) {
        var sess = res.data && res.data.session;
        if (!sess || !sess.user) {
          return;
        }
        var user = sess.user;
        var nested = collectNestedPayload();
        sb.from("score_bundles")
          .upsert(
            {
              user_id: user.id,
              payload: nested,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          )
          .then(function () {});
      });
    });
  }

  function pullAndApply(onDone) {
    ensureClient(function (sb) {
      if (!sb) {
        if (onDone) {
          onDone(false);
        }
        return;
      }
      sb.auth.getSession().then(function (res) {
        var sess = res.data && res.data.session;
        if (!sess || !sess.user) {
          if (onDone) {
            onDone(false);
          }
          return;
        }
        sb.from("score_bundles")
          .select("payload")
          .eq("user_id", sess.user.id)
          .maybeSingle()
          .then(function (rowRes) {
            var row = rowRes.data;
            if (!row || !row.payload || typeof row.payload !== "object") {
              if (onDone) {
                onDone(false);
              }
              return;
            }
            var changed = false;
            var pk = Object.keys(row.payload);
            var i;
            for (i = 0; i < pk.length; i++) {
              var key = pk[i];
              if (SCORE_KEYS.indexOf(key) === -1) {
                continue;
              }
              try {
                global.localStorage.setItem(
                  key,
                  JSON.stringify(row.payload[key])
                );
                changed = true;
              } catch (e) {}
            }
            if (onDone) {
              onDone(changed);
            }
          })
          .catch(function () {
            if (onDone) {
              onDone(false);
            }
          });
      });
    });
  }

  function refreshOpenScoreUis() {
    try {
      global.dispatchEvent(new CustomEvent("kids-scorecard-refresh"));
    } catch (e) {}
  }

  var COLOURING_BUCKET = "colouring_room";

  function colouringObjectPath(uid) {
    return uid + "/colouring/session.json";
  }

  /**
   * Latest colouring session JSON (parsed), or null if missing / offline / anon.
   * @param {(err: Error|null, data: object|null) => void} cb
   */
  function downloadColouringSession(cb) {
    if (!isConfigured()) {
      cb(null, null);
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        cb(null, null);
        return;
      }
      sb.auth.getSession().then(function (res) {
        var sess = res.data && res.data.session;
        if (!sess || !sess.user) {
          cb(null, null);
          return;
        }
        var path = colouringObjectPath(sess.user.id);
        sb.storage
          .from(COLOURING_BUCKET)
          .download(path)
          .then(function (result) {
            if (result.error || !result.data) {
              cb(null, null);
              return;
            }
            var blob = result.data;
            function parseText(t) {
              try {
                cb(null, JSON.parse(t));
              } catch (e) {
                cb(e, null);
              }
            }
            if (blob.text && typeof blob.text === "function") {
              blob.text().then(parseText).catch(function () {
                cb(null, null);
              });
            } else {
              var fr = new global.FileReader();
              fr.onload = function () {
                parseText(String(fr.result));
              };
              fr.onerror = function () {
                cb(null, null);
              };
              fr.readAsText(blob);
            }
          })
          .catch(function () {
            cb(null, null);
          });
      });
    });
  }

  var colouringUploadTimer = null;

  /** Debounced upload of raw session JSON string (same as localStorage value). */
  function scheduleColouringUpload(rawJsonString) {
    if (!isConfigured() || !rawJsonString) {
      return;
    }
    if (colouringUploadTimer) {
      global.clearTimeout(colouringUploadTimer);
    }
    colouringUploadTimer = global.setTimeout(function () {
      colouringUploadTimer = null;
      uploadColouringSession(rawJsonString, function () {});
    }, 3500);
  }

  /** @param {string} rawJsonString - full serialized session */
  function uploadColouringSession(rawJsonString, cb) {
    cb = cb || function () {};
    if (!isConfigured() || !rawJsonString) {
      cb(null);
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        cb(new Error("sync"));
        return;
      }
      sb.auth.getSession().then(function (res) {
        var sess = res.data && res.data.session;
        if (!sess || !sess.user) {
          cb(null);
          return;
        }
        var path = colouringObjectPath(sess.user.id);
        var blob = new global.Blob([rawJsonString], {
          type: "application/json",
        });
        sb.storage
          .from(COLOURING_BUCKET)
          .upload(path, blob, {
            upsert: true,
            contentType: "application/json",
          })
          .then(function (up) {
            cb(up.error || null);
          })
          .catch(function (e) {
            cb(e);
          });
      });
    });
  }

  function setStatus(el, text) {
    if (el) {
      el.textContent = text;
    }
  }

  function patchSettingsUi() {
    var K = global.KidsCore;
    if (!K || settingsPatched) {
      return;
    }
    settingsPatched = true;
    var orig = K.openSettings;
    K.openSettings = function () {
      orig.apply(K, arguments);
      var d = global.document.getElementById("kidsSettingsDialog");
      if (!d || d.querySelector("[data-score-sync]")) {
        return;
      }
      if (!isConfigured()) {
        return;
      }
      var panel = d.querySelector(".kids-settings__panel");
      if (!panel) {
        return;
      }
      var hr = panel.querySelector("hr");
      var zone = global.document.createElement("div");
      zone.setAttribute("data-score-sync", "1");
      zone.className = "kids-settings__sync";
      zone.innerHTML =
        '<h3 class="kids-settings__sync-title">Sync scores (optional)</h3>' +
        '<p class="kids-settings__sync-lead">Use one grown-up email on each device. Tap the link in your email — then scores and colouring pictures (when saved) stay in sync in the background.</p>' +
        '<p class="kids-settings__sync-status" id="kidsSyncStatus" role="status"></p>' +
        '<label class="kids-settings__row kids-settings__row--email"><span class="kids-settings__sync-label">Email</span><input type="email" id="kidsSyncEmail" class="kids-settings__sync-input" autocomplete="email" placeholder="you@example.com" /></label>' +
        '<button type="button" class="kids-settings__sync-btn" id="kidsSyncSend">Email me a sign-in link</button>' +
        '<button type="button" class="kids-settings__sync-btn kids-settings__sync-btn--ghost" id="kidsSyncPull">Pull scores from cloud now</button>' +
        '<button type="button" class="kids-settings__sync-btn kids-settings__sync-btn--ghost" id="kidsSyncOut">Sign out</button>';
      if (hr) {
        panel.insertBefore(zone, hr);
      } else {
        panel.appendChild(zone);
      }

      var statusEl = zone.querySelector("#kidsSyncStatus");
      var emailEl = zone.querySelector("#kidsSyncEmail");
      var btnSend = zone.querySelector("#kidsSyncSend");
      var btnPull = zone.querySelector("#kidsSyncPull");
      var btnOut = zone.querySelector("#kidsSyncOut");

      function refreshAuthUi() {
        ensureClient(function (sb) {
          if (!sb) {
            setStatus(statusEl, "Could not load sync.");
            return;
          }
          sb.auth.getSession().then(function (res) {
            var sess = res.data && res.data.session;
            if (sess && sess.user && sess.user.email) {
              setStatus(
                statusEl,
                "Signed in as " +
                  sess.user.email +
                  " — scores can sync automatically."
              );
              btnOut.style.display = "";
            } else {
              setStatus(
                statusEl,
                "Not signed in yet — enter an email below to link this device."
              );
              btnOut.style.display = "none";
            }
          });
        });
      }

      refreshAuthUi();

      if (btnSend) {
        btnSend.addEventListener("click", function () {
          var em = emailEl ? String(emailEl.value || "").trim() : "";
          if (!em || em.indexOf("@") < 0) {
            setStatus(statusEl, "Enter a valid email address.");
            return;
          }
          ensureClient(function (sb) {
            if (!sb) {
              setStatus(statusEl, "Sync library failed to load.");
              return;
            }
            sb.auth
              .signInWithOtp({
                email: em,
                options: {
                  emailRedirectTo: global.location.href,
                },
              })
              .then(function (r) {
                if (r.error) {
                  setStatus(
                    statusEl,
                    r.error.message || "Could not send email."
                  );
                  return;
                }
                setStatus(
                  statusEl,
                  "Check your email — tap the magic link. You can leave this tab open."
                );
              });
          });
        });
      }

      if (btnPull) {
        btnPull.addEventListener("click", function () {
          setStatus(statusEl, "Fetching…");
          pullAndApply(function (changed) {
            if (changed) {
              setStatus(statusEl, "Merged scores from cloud — refreshing…");
              refreshOpenScoreUis();
              global.setTimeout(function () {
                global.location.reload();
              }, 450);
            } else {
              setStatus(
                statusEl,
                "Nothing new from the cloud, or sign in isn’t finished yet."
              );
            }
          });
        });
      }

      if (btnOut) {
        btnOut.addEventListener("click", function () {
          ensureClient(function (sb) {
            if (!sb) {
              return;
            }
            sb.auth.signOut().then(function () {
              refreshAuthUi();
              setStatus(statusEl, "Signed out on this device.");
            });
          });
        });
      }
    };
  }

  function subscribeAuth() {
    ensureClient(function (sb) {
      if (!sb) {
        return;
      }
      sb.auth.onAuthStateChange(function (event, session) {
        if (session && session.user && event === "SIGNED_IN") {
          pullAndApply(function (changed) {
            if (changed) {
              refreshOpenScoreUis();
              global.location.reload();
            } else {
              pushBundle();
            }
          });
        }
      });
      sb.auth.getSession().then(function (res) {
        var sess = res.data && res.data.session;
        if (sess && sess.user) {
          pullAndApply(function (changed) {
            if (changed) {
              refreshOpenScoreUis();
            }
          });
        }
      });
    });
  }

  global.KidsScoreCloud = {
    onScoreSaved: function () {
      schedulePush();
    },
    isConfigured: isConfigured,
    downloadColouringSession: downloadColouringSession,
    uploadColouringSession: uploadColouringSession,
    scheduleColouringUpload: scheduleColouringUpload,
  };

  global.addEventListener("DOMContentLoaded", function () {
    patchSettingsUi();
    if (isConfigured()) {
      subscribeAuth();
    }
  });
})(typeof window !== "undefined" ? window : this);
