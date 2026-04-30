/**
 * Cloud sync: family password (signInWithPassword). See score-config.example.js.
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
    return !!(
      c.supabaseUrl &&
      c.supabaseAnonKey &&
      c.syncLoginEmail &&
      String(c.syncLoginEmail).trim().length > 0
    );
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
                onDone(true); // Return true even if no score bundles, to ensure storage buckets still sync
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
              var nextJson = JSON.stringify(row.payload[key]);
              var prevJson = null;
              try {
                prevJson = global.localStorage.getItem(key);
              } catch (ePrev) {}
              if (prevJson === nextJson) {
                continue;
              }
              try {
                global.localStorage.setItem(key, nextJson);
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

  var COLOURING_BUCKET = "colouring_room";
  var STORYBOOK_BUCKET = "storybook_room";
  /** Must match games/storybook.js SHELF_STORAGE_KEY */
  var STORYBOOK_SHELF_KEY = "jigsawKids_storybookShelf_v1";
  var STORYBOOK_SHELF_MAX = 14;

  function refreshOpenScoreUis() {
    try {
      global.dispatchEvent(new CustomEvent("kids-scorecard-refresh"));
    } catch (e) {}
    mergeStorybookShelfFromCloud();
  }

  function colouringObjectPath(uid) {
    return uid + "/colouring/session.json";
  }

  function storybookObjectPath(uid) {
    return uid + "/storybook/shelf.json";
  }

  /**
   * Latest storybook shelf JSON (parsed), or null if missing / offline / anon.
   * @param {(err: Error|null, data: object|null) => void} cb
   */
  function downloadStorybookLibrary(cb) {
    console.log("[score-cloud] downloadStorybookLibrary starting...");
    if (!isConfigured()) {
      console.warn("[score-cloud] Not configured");
      cb(null, null);
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        console.error("[score-cloud] No supabase client");
        cb(null, null);
        return;
      }
      sb.auth.getSession().then(function (res) {
        var sess = res.data && res.data.session;
        if (!sess || !sess.user) {
          console.warn("[score-cloud] No active session or user");
          cb(null, null);
          return;
        }
        var path = storybookObjectPath(sess.user.id);
        console.log("[score-cloud] Downloading from path:", path);
        sb.storage
          .from(STORYBOOK_BUCKET)
          .download(path)
          .then(function (result) {
            if (result.error || !result.data) {
              console.warn("[score-cloud] Download result error or no data:", result.error);
              cb(null, null);
              return;
            }
            console.log("[score-cloud] Download success, parsing blob...");
            var blob = result.data;
            function parseText(t) {
              try {
                var json = JSON.parse(t);
                console.log("[score-cloud] Successfully parsed downloaded library, items:", Array.isArray(json) ? json.length : 0);
                cb(null, json);
              } catch (e) {
                console.error("[score-cloud] JSON parse error:", e);
                cb(e, null);
              }
            }
            if (blob.text && typeof blob.text === "function") {
              blob.text().then(parseText).catch(function (err) {
                console.error("[score-cloud] Blob text error:", err);
                cb(null, null);
              });
            } else {
              var fr = new global.FileReader();
              fr.onload = function () {
                parseText(String(fr.result));
              };
              fr.onerror = function (err) {
                console.error("[score-cloud] FileReader error:", err);
                cb(null, null);
              };
              fr.readAsText(blob);
            }
          })
          .catch(function (err) {
            console.error("[score-cloud] Download catch error:", err);
            cb(null, null);
          });
      });
    });
  }

  /** Upload shelf JSON right after save so leaving the page doesn’t skip sync. */
  function scheduleStorybookUpload(rawJsonString) {
    console.log("[score-cloud] scheduleStorybookUpload called, isConfigured:", isConfigured(), "raw length:", rawJsonString ? rawJsonString.length : 0);
    if (!isConfigured() || !rawJsonString) {
      return;
    }
    console.log("[score-cloud] uploadStorybookLibrary (immediate)…");
    uploadStorybookLibrary(rawJsonString, function (err) {
      if (err) console.error("[score-cloud] uploadStorybookLibrary error:", err);
      else console.log("[score-cloud] uploadStorybookLibrary success!");
    });
  }

  /** @param {string} rawJsonString - full serialized shelf */
  function uploadStorybookLibrary(rawJsonString, cb) {
    cb = cb || function () {};
    console.log("[score-cloud] uploadStorybookLibrary starting...");
    if (!isConfigured() || !rawJsonString) {
      console.warn("[score-cloud] Not configured or no data");
      cb(null);
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        console.error("[score-cloud] No supabase client");
        cb(new Error("sync"));
        return;
      }
      sb.auth.getSession().then(function (res) {
        var sess = res.data && res.data.session;
        if (!sess || !sess.user) {
          console.warn(
            "[score-cloud] No active session — storybook shelf not uploaded. Sign in under ⚙️ Sync, then shelve a book again."
          );
          setStorybookShelfSyncState(
            "Not signed in — your story library did not upload. Use Sync below, then tap “Put on my shelf” once more.",
            "warn"
          );
          cb(null);
          return;
        }
        var path = storybookObjectPath(sess.user.id);
        console.log("[score-cloud] Uploading to path:", path);
        var blob = new global.Blob([rawJsonString], {
          type: "application/json",
        });
        sb.storage
          .from(STORYBOOK_BUCKET)
          .upload(path, blob, {
            upsert: true,
            contentType: "application/json",
          })
          .then(function (up) {
            if (up.error) {
              var errMsg = formatStorageErr(up.error);
              console.error("[score-cloud] Upload error (storybook_room):", up.error);
              setStorybookShelfSyncState(
                "Story upload failed — " + errMsg + " (check Storage policies / bucket storybook_room).",
                "err"
              );
              cb(up.error);
              return;
            }
            console.log("[score-cloud] uploadStorybookLibrary success! path:", path);
            setStorybookShelfSyncState(
              "Story library uploaded — you should see folder " +
                String(sess.user.id).slice(0, 8) +
                "…/storybook/shelf.json in bucket storybook_room.",
              "ok"
            );
            cb(null);
          })
          .catch(function (e) {
            cb(e);
          });
      });
    });
  }

  function normalizedCloudShelf(data) {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.books)) {
      return data.books;
    }
    if (data && Array.isArray(data.shelf)) {
      return data.shelf;
    }
    return [];
  }

  function loadLocalStorybookShelf() {
    try {
      var raw = global.localStorage.getItem(STORYBOOK_SHELF_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /** Download cloud shelf into localStorage (any page) and push when this device has extra books. */
  function mergeStorybookShelfFromCloud() {
    if (!isConfigured()) {
      return;
    }
    downloadStorybookLibrary(function (err, data) {
      var cloudBooks = normalizedCloudShelf(data);
      var local = loadLocalStorybookShelf();
      var changedLocal = false;
      var needsUpload = false;
      var mapLocal = Object.create(null);
      var mapCloud = Object.create(null);
      var i;
      for (i = 0; i < local.length; i++) {
        if (local[i] && local[i].id) {
          mapLocal[local[i].id] = true;
        }
      }
      for (i = 0; i < cloudBooks.length; i++) {
        if (cloudBooks[i] && cloudBooks[i].id) {
          mapCloud[cloudBooks[i].id] = true;
        }
      }
      for (i = 0; i < cloudBooks.length; i++) {
        var b = cloudBooks[i];
        if (b && b.id && !mapLocal[b.id]) {
          local.push(b);
          mapLocal[b.id] = true;
          changedLocal = true;
        }
      }
      for (i = 0; i < local.length; i++) {
        if (local[i] && local[i].id && !mapCloud[local[i].id]) {
          needsUpload = true;
          break;
        }
      }
      if (changedLocal) {
        local.sort(function (a, c) {
          return String(c.id).localeCompare(String(a.id), undefined, { numeric: true });
        });
        while (local.length > STORYBOOK_SHELF_MAX) {
          local.pop();
        }
        try {
          global.localStorage.setItem(STORYBOOK_SHELF_KEY, JSON.stringify(local));
        } catch (e) {}
      }
      if (needsUpload) {
        try {
          var payload = changedLocal ? JSON.stringify(local) : JSON.stringify(loadLocalStorybookShelf());
          uploadStorybookLibrary(payload, function (err) {
            if (err) {
              console.error("[score-cloud] mergeStorybookShelfFromCloud upload:", formatStorageErr(err));
            }
          });
        } catch (e2) {}
      }
    });
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

  function formatStorageErr(err) {
    if (err == null) {
      return "Unknown error";
    }
    if (typeof err === "string") {
      return err;
    }
    if (err.message) {
      return String(err.message);
    }
    if (err.error && typeof err.error === "string") {
      return err.error;
    }
    try {
      return JSON.stringify(err);
    } catch (e) {
      return String(err);
    }
  }

  var storybookShelfSyncState = { text: "", kind: "neutral", updatedAt: 0 };

  function setStorybookShelfSyncState(text, kind) {
    storybookShelfSyncState.text = text || "";
    storybookShelfSyncState.kind = kind || "neutral";
    storybookShelfSyncState.updatedAt = Date.now();
    var shelfEl = global.document.getElementById("kidsStorybookShelfLine");
    paintStorybookShelfLineEl(shelfEl);
  }

  function paintStorybookShelfLineEl(el) {
    if (!el) {
      return;
    }
    var k = storybookShelfSyncState.kind;
    var base = "kids-settings__sync-storybook";
    el.className = base + (k && k !== "neutral" ? " is-" + k : "");
    el.textContent = storybookShelfSyncState.text;
  }

  function refreshStorybookShelfHintLine(sess) {
    var shelfEl = global.document.getElementById("kidsStorybookShelfLine");
    if (!shelfEl) {
      return;
    }
    var recent =
      storybookShelfSyncState.updatedAt &&
      Date.now() - storybookShelfSyncState.updatedAt < 120000 &&
      storybookShelfSyncState.text;
    if (recent) {
      paintStorybookShelfLineEl(shelfEl);
      return;
    }
    if (sess && sess.user) {
      storybookShelfSyncState.text =
        "Storybooks: when you shelve a book, this device uploads shelf.json to Storage (storybook_room). If the bucket is empty, this browser was probably not signed in when you saved.";
      storybookShelfSyncState.kind = "neutral";
    } else {
      storybookShelfSyncState.text =
        "Storybooks: sign in below first — saves only reach Supabase after that.";
      storybookShelfSyncState.kind = "warn";
    }
    storybookShelfSyncState.updatedAt = 0;
    paintStorybookShelfLineEl(shelfEl);
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
        '<h3 class="kids-settings__sync-title">Sync (optional)</h3>' +
        '<p class="kids-settings__sync-lead">A grown-up sets this up once in Supabase (one login email + password that match your site config). Here you only type the <strong>family password</strong>—no email.</p>' +
        '<p class="kids-settings__sync-status" id="kidsSyncStatus" role="status"></p>' +
        '<p class="kids-settings__sync-storybook" id="kidsStorybookShelfLine" role="status" aria-live="polite"></p>' +
        '<label class="kids-settings__row kids-settings__row--email"><span class="kids-settings__sync-label">Family password</span><input type="password" id="kidsSyncPassword" class="kids-settings__sync-input" autocomplete="current-password" placeholder="Family password" /></label>' +
        '<label class="kids-settings__show-pass"><input type="checkbox" id="kidsSyncShowPass" checked /> Show password while typing</label>' +
        '<button type="button" class="kids-settings__sync-btn" id="kidsSyncSignIn">Sign in for cloud sync</button>' +
        '<button type="button" class="kids-settings__sync-btn kids-settings__sync-btn--ghost" id="kidsSyncPull">Pull scores from cloud now</button>' +
        '<button type="button" class="kids-settings__sync-btn kids-settings__sync-btn--ghost" id="kidsSyncOut">Sign out</button>';
      if (hr) {
        panel.insertBefore(zone, hr);
      } else {
        panel.appendChild(zone);
      }

      var statusEl = zone.querySelector("#kidsSyncStatus");
      var passEl = zone.querySelector("#kidsSyncPassword");
      var showPassEl = zone.querySelector("#kidsSyncShowPass");
      var btnSignIn = zone.querySelector("#kidsSyncSignIn");
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
            if (sess && sess.user) {
              setStatus(
                statusEl,
                "Cloud sync is on — scores and colouring can stay in sync on this tablet."
              );
              btnOut.style.display = "";
            } else {
              setStatus(
                statusEl,
                "Sign in with the family password to turn on sync."
              );
              btnOut.style.display = "none";
            }
            refreshStorybookShelfHintLine(sess && sess.user ? sess : null);
          });
        });
      }

      refreshAuthUi();

      if (showPassEl && passEl) {
        passEl.type = showPassEl.checked ? "text" : "password";
        showPassEl.addEventListener("change", function () {
          passEl.type = showPassEl.checked ? "text" : "password";
        });
      }

      if (btnSignIn) {
        btnSignIn.addEventListener("click", function () {
          var pwd = passEl ? String(passEl.value || "") : "";
          var c = cfg();
          var loginEmail =
            (c.syncLoginEmail && String(c.syncLoginEmail).trim()) || "";
          if (!loginEmail) {
            setStatus(statusEl, "Configure syncLoginEmail in score-config.js.");
            return;
          }
          if (pwd.length < 6) {
            setStatus(statusEl, "Enter the family password (at least 6 characters).");
            return;
          }
          ensureClient(function (sb) {
            if (!sb) {
              setStatus(statusEl, "Sync library failed to load.");
              return;
            }
            sb.auth
              .signInWithPassword({
                email: loginEmail,
                password: pwd,
              })
              .then(function (r) {
                if (r.error) {
                  var m = r.error.message || "Could not sign in.";
                  if (/Invalid login|invalid/i.test(m)) {
                    setStatus(statusEl, "Wrong password — try again or ask a grown-up.");
                  } else {
                    setStatus(statusEl, m);
                  }
                  return;
                }
              if (passEl) {
                passEl.value = "";
              }
              setStatus(statusEl, "Signed in — syncing…");
              refreshAuthUi();
              pullAndApply(function (changed) {
                refreshOpenScoreUis(); // Always trigger refresh to sync storage buckets
                if (!changed) {
                  pushBundle();
                }
              });
              });
          });
        });
      }

      if (btnPull) {
        btnPull.addEventListener("click", function () {
          setStatus(statusEl, "Fetching…");
          pullAndApply(function (changed) {
            refreshOpenScoreUis(); // Always trigger refresh to sync storage buckets
            if (changed) {
              setStatus(statusEl, "Merged scores from cloud.");
            } else {
              setStatus(
                statusEl,
                "No new scores from the cloud. Story library still checked — open Build your book to see synced books."
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
        // do not reload here — listener can repeat
        if (session && session.user && event === "SIGNED_IN") {
          pullAndApply(function (changed) {
            refreshOpenScoreUis(); // Always trigger refresh to sync storage buckets
            if (!changed) {
              pushBundle();
            }
          });
        }
      });
      sb.auth.getSession().then(function (res) {
        var sess = res.data && res.data.session;
        if (sess && sess.user) {
          pullAndApply(function (changed) {
            refreshOpenScoreUis(); // Always trigger refresh to sync storage buckets (storybook/colouring) even if score_bundles didn't change
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
    downloadStorybookLibrary: downloadStorybookLibrary,
    uploadStorybookLibrary: uploadStorybookLibrary,
    scheduleStorybookUpload: scheduleStorybookUpload,
    getStorybookShelfSyncState: function () {
      return {
        text: storybookShelfSyncState.text,
        kind: storybookShelfSyncState.kind,
        updatedAt: storybookShelfSyncState.updatedAt,
      };
    },
  };

  global.addEventListener("DOMContentLoaded", function () {
    patchSettingsUi();
    if (isConfigured()) {
      subscribeAuth();
    }
  });
})(typeof window !== "undefined" ? window : this);
