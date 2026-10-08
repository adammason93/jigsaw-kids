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

  /** Small progress that is saved on the signed-in account and restored on login. */
  var ACCOUNT_SYNC_KEYS = SCORE_KEYS.concat([
    "portalFavourites",
    "kidsStatsV1",
    "kidsProfileV1",
    "jigsawPieces",
    "jigsawPictureGuide",
    "runnerBest",
    "runnerName",
    "runnerEnv",
    "runnerChar",
    "rpsScoreV1",
    "snakeArcadeHighV1",
    "threeStarCatcherBest",
    "linkGridCurrentLevel",
    "linkGridCompletedLevels",
    "sbReaderArtLayout",
    "sbIllustrationStyle",
    "sbStoryTextMode",
    "sbStoryLength",
    "tttCharPickV1",
    "c4CharacterPickV1",
    "snapCharPickV1",
  ]);

  /** Private on this device per account. Cloud copies already live in that account's storage folder. */
  var ACCOUNT_LOCAL_KEYS = [
    "jigsawKidsColouringV1",
    "jigsawKidsColouringAutoSaveV1",
    "jigsawKids_storybookShelf_v1",
    "wondii-learning-draft",
    "wondii-learning-adventures",
    "wondii-teach-prefs",
    "wondii-teach-favs",
    "wondii-teach-recent",
    "wondii-teach-feedback",
    "wondii-teach-seen",
    "wondii-class-sessions",
    "wondii-board-names",
    "wondii-school-classes",
    "wondii-school-pending",
    "wondii-school-pending-adventures",
    "wondii-school-pending-sessions",
  ];

  var ACCOUNT_PREFIXES = ["wondii-fave:"];
  var accountUid = "";
  var applyingCloud = false;
  var nativeGet = global.localStorage.getItem.bind(global.localStorage);
  var nativeSet = global.localStorage.setItem.bind(global.localStorage);
  var nativeRemove = global.localStorage.removeItem.bind(global.localStorage);

  function isAccountKey(key) {
    var k = String(key || "");
    var i;
    for (i = 0; i < ACCOUNT_SYNC_KEYS.length; i++) {
      if (ACCOUNT_SYNC_KEYS[i] === k) return true;
    }
    for (i = 0; i < ACCOUNT_LOCAL_KEYS.length; i++) {
      if (ACCOUNT_LOCAL_KEYS[i] === k) return true;
    }
    for (i = 0; i < ACCOUNT_PREFIXES.length; i++) {
      if (k.indexOf(ACCOUNT_PREFIXES[i]) === 0) return true;
    }
    return false;
  }

  function isSyncKey(key) {
    var k = String(key || "");
    var i;
    for (i = 0; i < ACCOUNT_SYNC_KEYS.length; i++) {
      if (ACCOUNT_SYNC_KEYS[i] === k) return true;
    }
    for (i = 0; i < ACCOUNT_PREFIXES.length; i++) {
      if (k.indexOf(ACCOUNT_PREFIXES[i]) === 0) return true;
    }
    return false;
  }

  function scopedStorageKey(uid, key) {
    return "wondii-u:" + uid + ":" + key;
  }

  function bindAccountScope(uid) {
    accountUid = uid ? String(uid) : "";
  }

  global.localStorage.getItem = function (key) {
    if (isAccountKey(key)) {
      if (!accountUid) return null;
      return nativeGet(scopedStorageKey(accountUid, key));
    }
    return nativeGet(key);
  };
  global.localStorage.setItem = function (key, value) {
    if (isAccountKey(key)) {
      if (!accountUid) return;
      nativeSet(scopedStorageKey(accountUid, key), String(value));
      if (!applyingCloud && isSyncKey(key)) {
        try {
          schedulePush();
        } catch (ePush) {}
      }
      return;
    }
    nativeSet(key, String(value));
  };
  global.localStorage.removeItem = function (key) {
    if (isAccountKey(key)) {
      if (!accountUid) return;
      nativeRemove(scopedStorageKey(accountUid, key));
      return;
    }
    nativeRemove(key);
  };

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
    if (global.WondiiSession) {
      global.WondiiSession.client(function (sb) {
        client = sb;
        done(sb);
      });
      return;
    }
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

  function clearScoreKeys() {
    if (!accountUid) return;
    var prefix = "wondii-u:" + accountUid + ":";
    var drop = [];
    var i;
    for (i = 0; i < global.localStorage.length; i++) {
      var storageKey = global.localStorage.key(i);
      if (!storageKey || storageKey.indexOf(prefix) !== 0) continue;
      if (isSyncKey(storageKey.slice(prefix.length))) drop.push(storageKey);
    }
    for (i = 0; i < drop.length; i++) nativeRemove(drop[i]);
  }

  function adoptLegacyIfSameAccount(uid, payload) {
    var overlap = false;
    var mismatch = false;
    var i;
    for (i = 0; i < SCORE_KEYS.length; i++) {
      var scoreKey = SCORE_KEYS[i];
      var legacyScore = nativeGet(scoreKey);
      if (legacyScore == null || payload[scoreKey] == null) continue;
      if (legacyScore === encodeStored(payload[scoreKey])) overlap = true;
      else mismatch = true;
    }
    if (!overlap || mismatch) return;
    function copyIfEmpty(logical) {
      if (!isAccountKey(logical)) return;
      var scoped = scopedStorageKey(uid, logical);
      if (nativeGet(scoped) != null) return;
      var legacy = nativeGet(logical);
      if (legacy == null || legacy === "") return;
      nativeSet(scoped, legacy);
    }
    var pending = ACCOUNT_SYNC_KEYS.concat(ACCOUNT_LOCAL_KEYS);
    for (i = 0; i < global.localStorage.length; i++) {
      var storageKey = global.localStorage.key(i);
      if (storageKey && storageKey.indexOf("wondii-fave:") === 0) pending.push(storageKey);
    }
    for (i = 0; i < pending.length; i++) copyIfEmpty(pending[i]);
  }

  function accountReady() {
    global.__wondiiAccountReady = true;
    try { global.dispatchEvent(new CustomEvent("wondii-account-scope")); } catch (e) {}
  }

  function bindShelfUser(uid) {
    bindAccountScope(uid);
    accountReady();
    var st = global.StorybookShelfStore;
    if (st && typeof st.bindUser === "function") {
      st.bindUser(uid || null);
    }
  }

  function clearAccountScope() {
    bindShelfUser(null);
    clearScoreKeys();
    try {
      global.sessionStorage.removeItem("wondii-active-uid");
    } catch (e) {}
    try {
      global.localStorage.removeItem("portalCastCache");
    } catch (e2) {}
    try {
      global.dispatchEvent(new CustomEvent("wondii-account-cleared"));
    } catch (e3) {}
    try {
      global.dispatchEvent(new CustomEvent("kids-scorecard-refresh"));
    } catch (e4) {}
  }

  function decodeStored(raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return raw;
    }
  }

  function encodeStored(value) {
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  function collectNestedPayload() {
    /** @type {Record<string, unknown>} */
    var nested = {};
    if (!accountUid) return nested;
    var prefix = "wondii-u:" + accountUid + ":";
    var i;
    for (i = 0; i < global.localStorage.length; i++) {
      var storageKey = global.localStorage.key(i);
      if (!storageKey || storageKey.indexOf(prefix) !== 0) continue;
      var logical = storageKey.slice(prefix.length);
      if (!isSyncKey(logical)) continue;
      var raw = nativeGet(storageKey);
      if (raw == null || raw === "") continue;
      nested[logical] = decodeStored(raw);
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
            var previousUid = "";
            try {
              previousUid = global.sessionStorage.getItem("wondii-active-uid") || "";
            } catch (ePrevUid) {}
            var switched = previousUid !== sess.user.id;
            try {
              global.sessionStorage.setItem("wondii-active-uid", sess.user.id);
            } catch (eUid) {}
            if (!row || !row.payload || typeof row.payload !== "object") {
              if (switched) {
                clearScoreKeys();
              }
              if (onDone) {
                onDone(true);
              }
              return;
            }
            adoptLegacyIfSameAccount(sess.user.id, row.payload);
            var changed = false;
            var pk = Object.keys(row.payload);
            var i;
            applyingCloud = true;
            try {
              for (i = 0; i < pk.length; i++) {
                var key = pk[i];
                if (!isSyncKey(key)) continue;
                var nextJson = encodeStored(row.payload[key]);
                var prevJson = null;
                try {
                  prevJson = global.localStorage.getItem(key);
                } catch (ePrev) {}
                if (prevJson === nextJson) continue;
                try {
                  global.localStorage.setItem(key, nextJson);
                  changed = true;
                } catch (e) {}
              }
              if (switched) {
                var present = {};
                for (i = 0; i < pk.length; i++) present[pk[i]] = true;
                for (i = 0; i < ACCOUNT_SYNC_KEYS.length; i++) {
                  if (!present[ACCOUNT_SYNC_KEYS[i]]) {
                    try {
                      global.localStorage.removeItem(ACCOUNT_SYNC_KEYS[i]);
                    } catch (eDrop) {}
                  }
                }
              }
            } finally {
              applyingCloud = false;
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
  function refreshOpenScoreUis() {
    mergeStorybookShelfFromCloud(function (err) {
      if (err) {
        try {
          global.dispatchEvent(
            new CustomEvent("kids-storybook-merge-failed", {
              detail: { message: formatStorageErr(err) },
            }),
          );
        } catch (e) {}
      }
      try {
        global.dispatchEvent(new CustomEvent("kids-scorecard-refresh"));
      } catch (e) {}
    });
  }

  function colouringObjectPath(uid) {
    return uid + "/colouring/session.json";
  }

  function storybookObjectPath(uid) {
    return uid + "/storybook/shelf.json";
  }

  /* Read the session the shared client already restored.
     A second refreshSession() rotates the login and can sign the account out. */
  function withFreshSession(sb, cb) {
    sb.auth.getSession().then(function (res) {
      if (res && res.error) {
        cb(null);
        return;
      }
      var sess = res.data && res.data.session;
      cb(sess && sess.user ? sess : null);
    }).catch(function () {
      cb(null);
    });
  }

  /**
   * Latest storybook shelf JSON (parsed), or (err, null) on failure.
   * Tries SDK download(cache:no-store), Storage REST (Bearer), signed URL + fetch(no-store), then plain SDK download.
   * @param {(err: Error|null, data: object|array|null) => void} cb
   */
  function downloadStorybookLibrary(cb) {
    console.log("[score-cloud] downloadStorybookLibrary starting...");
    if (!isConfigured()) {
      console.warn("[score-cloud] Not configured");
      cb(new Error("not_configured"), null);
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        console.error("[score-cloud] No supabase client");
        cb(new Error("no_client"), null);
        return;
      }
      withFreshSession(sb, function (sess) {
        if (!sess || !sess.user) {
          console.warn("[score-cloud] No active session or user");
          cb(new Error("no_session"), null);
          return;
        }
        var path = storybookObjectPath(sess.user.id);
        console.log("[score-cloud] Downloading shelf path:", path);

        var settled = false;
        function done(err, data) {
          if (settled) {
            return;
          }
          settled = true;
          cb(err, data);
        }

        var c = cfg();
        var base = String(c.supabaseUrl || "").replace(/\/+$/, "");
        var anonKey = String(c.supabaseAnonKey || "");
        var token = sess.access_token;
        var restPath = path
          .split("/")
          .map(function (seg) {
            return encodeURIComponent(seg);
          })
          .join("/");
        var restUrl =
          base + "/storage/v1/object/authenticated/" + STORYBOOK_BUCKET + "/" + restPath;

        function parseBodyText(text) {
          var t = String(text || "").trim();
          if (!t) {
            done(null, []);
            return;
          }
          try {
            var json = JSON.parse(t);
            console.log(
              "[score-cloud] Parsed shelf JSON",
              Array.isArray(json) ? "array len " + json.length : typeof json,
            );
            done(null, json);
          } catch (e) {
            console.error("[score-cloud] JSON parse error:", e);
            done(e, null);
          }
        }

        function fromBlob(blob) {
          if (blob.text && typeof blob.text === "function") {
            blob
              .text()
              .then(parseBodyText)
              .catch(function (err) {
                console.error("[score-cloud] Blob text error:", err);
                done(err, null);
              });
          } else {
            var fr = new global.FileReader();
            fr.onload = function () {
              parseBodyText(String(fr.result));
            };
            fr.onerror = function (err) {
              done(err, null);
            };
            fr.readAsText(blob);
          }
        }

        function notFoundMessage(msg) {
          var m = String(msg || "").toLowerCase();
          return (
            m.trim() === "{}" ||
            m.indexOf("not found") >= 0 ||
            m.indexOf("does not exist") >= 0 ||
            m.indexOf("404") >= 0 ||
            m.indexOf("object not found") >= 0
          );
        }

        function doLegacyDownload() {
          sb.storage
            .from(STORYBOOK_BUCKET)
            .download(path)
            .then(function (result) {
              if (settled) {
                return;
              }
              if (result.error || !result.data) {
                var rawErr = result.error && (result.error.message || result.error);
                if (notFoundMessage(rawErr)) {
                  done(null, []);
                  return;
                }
                console.warn("[score-cloud] legacy download error:", result.error);
                done(
                  result.error instanceof Error
                    ? result.error
                    : new Error(String(rawErr || "download")),
                  null,
                );
                return;
              }
              fromBlob(result.data);
            })
            .catch(function (err) {
              console.error("[score-cloud] Download catch error:", err);
              if (!settled) {
                done(err, null);
              }
            });
        }

        function trySignedThenLegacy(reason) {
          if (settled) {
            return;
          }
          console.warn("[score-cloud] storybook download trying signed URL after:", reason);
          sb.storage
            .from(STORYBOOK_BUCKET)
            .createSignedUrl(path, 900)
            .then(function (su) {
              if (settled) {
                return;
              }
              if (su.error && notFoundMessage(su.error.message || su.error)) {
                done(null, []);
                return;
              }
              if (su.error || !su.data || !su.data.signedUrl) {
                console.warn("[score-cloud] createSignedUrl failed:", su.error);
                doLegacyDownload();
                return;
              }
              global
                .fetch(su.data.signedUrl, { cache: "no-store", credentials: "omit" })
                .then(function (r) {
                  if (settled) {
                    return;
                  }
                  if (r.status === 404) {
                    done(null, []);
                    return;
                  }
                  if (!r.ok) {
                    throw new Error("signed_fetch_" + r.status);
                  }
                  return r.text();
                })
                .then(function (text) {
                  if (settled || text === undefined) {
                    return;
                  }
                  parseBodyText(text);
                })
                .catch(function (e) {
                  console.warn("[score-cloud] signed URL fetch failed:", e);
                  if (!settled) {
                    doLegacyDownload();
                  }
                });
            })
            .catch(function (e) {
              console.warn("[score-cloud] createSignedUrl threw:", e);
              if (!settled) {
                doLegacyDownload();
              }
            });
        }

        function tryRestFetch(reason) {
          if (settled) {
            return;
          }
          if (!base || !token) {
            trySignedThenLegacy(reason || "no_base_or_token");
            return;
          }
          console.warn("[score-cloud] storybook download trying REST after:", reason);
          global
            .fetch(restUrl, {
              cache: "no-store",
              headers: {
                Authorization: "Bearer " + token,
                apikey: anonKey,
              },
            })
            .then(function (r) {
              if (settled) {
                return;
              }
              if (r.status === 404) {
                done(null, []);
                return;
              }
              if (!r.ok) {
                trySignedThenLegacy("rest_" + r.status);
                return;
              }
              return r.text();
            })
            .then(function (text) {
              if (settled || text === undefined) {
                return;
              }
              parseBodyText(text);
            })
            .catch(function (e) {
              console.warn("[score-cloud] REST shelf fetch failed:", e);
              if (!settled) {
                trySignedThenLegacy("rest_network");
              }
            });
        }

        sb.storage
          .from(STORYBOOK_BUCKET)
          .download(path, { cache: "no-store" })
          .then(function (result) {
            if (settled) {
              return;
            }
            if (result.error || !result.data) {
              var rawErr = result.error && (result.error.message || result.error);
              if (notFoundMessage(rawErr)) {
                done(null, []);
                return;
              }
              tryRestFetch(String(rawErr || "sdk_download"));
              return;
            }
            fromBlob(result.data);
          })
          .catch(function (err) {
            console.warn("[score-cloud] SDK download failed:", err);
            tryRestFetch("sdk_throw");
          });
      });
    });
  }

  function emitStorybookShelfUpload(detail) {
    try {
      global.dispatchEvent(new CustomEvent("kids-storybook-shelf-upload", { detail: detail }));
    } catch (e) {}
  }

  /**
   * Upload shelf JSON right after save so leaving the page doesn’t skip sync.
   * @param {string} rawJsonString
   * @param {function(Error|null): void} [onDone] — null on success; Error on failure (including no_session when sync is configured but user not signed in)
   */
  function scheduleStorybookUpload(rawJsonString, onDone) {
    onDone = typeof onDone === "function" ? onDone : null;
    console.log("[score-cloud] scheduleStorybookUpload called, isConfigured:", isConfigured(), "raw length:", rawJsonString ? rawJsonString.length : 0);
    if (!isConfigured() || !rawJsonString) {
      if (onDone) {
        onDone(null);
      }
      return;
    }
    console.log("[score-cloud] uploadStorybookLibrary (immediate)…");
    uploadStorybookLibrary(rawJsonString, function (err) {
      if (err) {
        console.error("[score-cloud] uploadStorybookLibrary error:", err);
      } else {
        console.log("[score-cloud] uploadStorybookLibrary success!");
      }
      if (onDone) {
        onDone(err || null);
      }
    });
  }

  /** @param {string} rawJsonString - full serialized shelf */
  function uploadStorybookLibrary(rawJsonString, cb) {
    cb = cb || function () {};
    console.log("[score-cloud] uploadStorybookLibrary starting...");
    if (!isConfigured() || !rawJsonString) {
      console.warn("[score-cloud] Not configured or no data");
      emitStorybookShelfUpload({ ok: false, code: "not_configured", message: "Sync not configured" });
      cb(new Error("not_configured"));
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        console.error("[score-cloud] No supabase client");
        emitStorybookShelfUpload({ ok: false, code: "no_client", message: "Could not load sync" });
        cb(new Error("no_client"));
        return;
      }
      withFreshSession(sb, function (sess) {
        if (!sess || !sess.user) {
          console.warn(
            "[score-cloud] No active session — storybook shelf not uploaded. Sign in under ⚙️ Sync, then shelve a book again."
          );
          setStorybookShelfSyncState(
            "Not signed in — your story library did not upload. Use Sync below, then tap “Put on my shelf” once more.",
            "warn"
          );
          emitStorybookShelfUpload({
            ok: false,
            code: "no_session",
            message: "Not signed in — open ⚙️ and use family password, then shelve again.",
          });
          cb(new Error("no_session"));
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
              emitStorybookShelfUpload({ ok: false, code: "storage", message: errMsg });
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
            emitStorybookShelfUpload({ ok: true, code: "ok" });
            cb(null);
          })
          .catch(function (e) {
            emitStorybookShelfUpload({
              ok: false,
              code: "network",
              message: formatStorageErr(e),
            });
            cb(e);
          });
      });
    });
  }

  /**
   * Grown-up diagnostic: list storybook folder + try download (same as the app). Calls cb(err, info).
   */
  function debugStorybookStorage(cb) {
    if (!isConfigured()) {
      cb(new Error("not_configured"), null);
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        cb(new Error("no_client"), null);
        return;
      }
      withFreshSession(sb, function (sess) {
        if (!sess || !sess.user) {
          cb(new Error("no_session"), null);
          return;
        }
        var uid = String(sess.user.id);
        var folder = uid + "/storybook";
        var path = storybookObjectPath(uid);
        sb.storage
          .from(STORYBOOK_BUCKET)
          .list(folder, { limit: 40 })
          .then(function (listRes) {
            if (listRes.error) {
              cb(listRes.error, { userId: uid, files: null });
              return;
            }
            sb.storage
              .from(STORYBOOK_BUCKET)
              .download(path)
              .then(function (downRes) {
                function fallbackDownload() {
                  downloadStorybookLibrary(function (derr, data) {
                    var books = null;
                    if (!derr && data != null) {
                      books = normalizedCloudShelf(data);
                    }
                    cb(null, {
                      userId: uid,
                      files: listRes.data || [],
                      bookCount: Array.isArray(books) ? books.length : null,
                      shelfJsonUtf8BytesApprox: null,
                      downloadError: derr ? formatStorageErr(derr) : null,
                    });
                  });
                }
                if (downRes.error || !downRes.data) {
                  fallbackDownload();
                  return;
                }
                var blob = downRes.data;
                if (blob.text && typeof blob.text === "function") {
                  blob
                    .text()
                    .then(function (text) {
                      var t = String(text || "");
                      var books = [];
                      try {
                        books = normalizedCloudShelf(JSON.parse(t.trim() || "[]"));
                      } catch (e) {
                        cb(null, {
                          userId: uid,
                          files: listRes.data || [],
                          bookCount: null,
                          shelfJsonUtf8BytesApprox: t.length,
                          parseError: formatStorageErr(e),
                          downloadError: null,
                        });
                        return;
                      }
                      cb(null, {
                        userId: uid,
                        files: listRes.data || [],
                        bookCount: Array.isArray(books) ? books.length : 0,
                        shelfJsonUtf8BytesApprox: t.length,
                        downloadError: null,
                      });
                    })
                    .catch(function () {
                      fallbackDownload();
                    });
                  return;
                }
                fallbackDownload();
              })
              .catch(function () {
                downloadStorybookLibrary(function (derr, data) {
                  var books = null;
                  if (!derr && data != null) {
                    books = normalizedCloudShelf(data);
                  }
                  cb(null, {
                    userId: uid,
                    files: listRes.data || [],
                    bookCount: Array.isArray(books) ? books.length : null,
                    shelfJsonUtf8BytesApprox: null,
                    downloadError: derr ? formatStorageErr(derr) : null,
                  });
                });
              });
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

  /** @param {function(Array): void} cb */
  function storybookShelfGetJson(cb) {
    var st = global.StorybookShelfStore;
    if (st && typeof st.getJson === "function") {
      st.getJson()
        .then(function (arr) {
          cb(Array.isArray(arr) ? arr : []);
        })
        .catch(function () {
          cb([]);
        });
      return;
    }
    cb([]);
  }

  /** @param {Array} merged @param {function(Error|null): void} cb */
  function storybookShelfSetMerged(merged, cb) {
    var st = global.StorybookShelfStore;
    if (st && typeof st.setJson === "function") {
      st.setJson(merged)
        .then(function () {
          cb(null);
        })
        .catch(function (e) {
          cb(e || new Error("storage_quota"));
        });
      return;
    }
    cb(new Error("no_store"));
  }

  /** Prefer savedAt, then id prefix b{timestamp}. */
  function shelfBookVersionTime(book) {
    if (!book) {
      return 0;
    }
    if (book.savedAt) {
      var t = Date.parse(book.savedAt);
      if (!isNaN(t)) {
        return t;
      }
    }
    var id = String(book.id || "");
    var m = id.match(/^b(\d+)/);
    if (m) {
      var n = parseInt(m[1], 10);
      if (!isNaN(n)) {
        return n;
      }
    }
    return 0;
  }

  function sortShelfForCompare(arr) {
    return arr.slice().sort(function (a, c) {
      return String((a && a.id) || "").localeCompare(String((c && c.id) || ""), undefined, {
        numeric: true,
      });
    });
  }

  /**
   * Download cloud shelf, merge into shelf store (IndexedDB when available), upload if needed.
   * @param {function(Error|null): void} [optionalCb] runs after merge + optional upload — passes download error if any, else null
   */
  function mergeStorybookShelfFromCloud(optionalCb) {
    optionalCb = typeof optionalCb === "function" ? optionalCb : function () {};
    if (!isConfigured()) {
      optionalCb(null);
      return;
    }
    downloadStorybookLibrary(function (err, data) {
      if (err) {
        console.warn("[score-cloud] mergeStorybookShelfFromCloud: download error, leaving local shelf untouched:", err);
        optionalCb(err);
        return;
      }
      if (data === null || data === undefined) {
        console.warn("[score-cloud] mergeStorybookShelfFromCloud: no data from download");
        optionalCb(new Error("empty_cloud_response"));
        return;
      }
      var cloudBooks = normalizedCloudShelf(data);

      ensureClient(function (sb) {
        if (!sb) {
          optionalCb(null);
          return;
        }
        sb.auth.getSession().then(function (res) {
          var user = res.data && res.data.session && res.data.session.user;
          if (!user) {
            bindShelfUser(null);
            optionalCb(null);
            return;
          }
          bindShelfUser(user.id);
          storybookShelfGetJson(function (local) {
        function continueMerge() {
        var cloudById = Object.create(null);
        var i;
        var b;
        for (i = 0; i < cloudBooks.length; i++) {
          b = cloudBooks[i];
          if (b && b.id) {
            cloudById[b.id] = b;
          }
        }

        var mergedMap = Object.create(null);
        for (i = 0; i < local.length; i++) {
          b = local[i];
          if (b && b.id) {
            mergedMap[b.id] = b;
          }
        }

        var changedLocal = false;
        var needsUpload = false;

        for (i = 0; i < cloudBooks.length; i++) {
          b = cloudBooks[i];
          if (!b || !b.id) {
            continue;
          }
          var loc = mergedMap[b.id];
          if (!loc) {
            mergedMap[b.id] = b;
            changedLocal = true;
            continue;
          }
          var tL = shelfBookVersionTime(loc);
          var tC = shelfBookVersionTime(b);
          if (tC > tL) {
            mergedMap[b.id] = b;
            changedLocal = true;
          } else if (tL > tC) {
            needsUpload = true;
          }
        }

        for (i = 0; i < local.length; i++) {
          b = local[i];
          if (b && b.id && !cloudById[b.id]) {
            needsUpload = true;
            break;
          }
        }

        var merged = [];
        for (var id in mergedMap) {
          if (Object.prototype.hasOwnProperty.call(mergedMap, id)) {
            merged.push(mergedMap[id]);
          }
        }
        merged.sort(function (a, c) {
          return shelfBookVersionTime(c) - shelfBookVersionTime(a);
        });

        var same =
          JSON.stringify(sortShelfForCompare(merged)) === JSON.stringify(sortShelfForCompare(local));
        if (!same) {
          changedLocal = true;
        }

        function finish() {
          optionalCb(null);
        }

        function runUploadThenFinish() {
          if (needsUpload) {
            try {
              uploadStorybookLibrary(JSON.stringify(merged), function (upErr) {
                if (upErr) {
                  console.error(
                    "[score-cloud] mergeStorybookShelfFromCloud upload:",
                    formatStorageErr(upErr),
                  );
                }
                finish();
              });
            } catch (e2) {
              finish();
            }
          } else {
            finish();
          }
        }

        if (changedLocal) {
          storybookShelfSetMerged(merged, function (e) {
            if (e) {
              console.warn("[score-cloud] mergeStorybookShelfFromCloud: persist failed:", e);
              optionalCb(new Error("storage_quota"));
              return;
            }
            runUploadThenFinish();
          });
        } else {
          runUploadThenFinish();
        }
        }

        var store = global.StorybookShelfStore;
        if (store && typeof store.clearIsolated === "function") store.clearIsolated();
        continueMerge();
          });
        }).catch(function () {
          optionalCb(null);
        });
      });
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
      if (!d) return;
      if (global.WondiiSession) {
        var lead = d.querySelector(".kids-settings__lead");
        if (lead) {
          lead.textContent = "Sound, contrast and motion stay on this device. Stories, characters and scores stay with this Wondii account.";
        }
        var synced = d.querySelector("[data-score-sync]");
        if (synced) synced.remove();
        return;
      }
      if (d.querySelector("[data-score-sync]")) {
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
        '<p class="kids-settings__sync-account" id="kidsSyncAccountLine" hidden></p>' +
        '<p class="kids-settings__sync-storybook" id="kidsStorybookShelfLine" role="status" aria-live="polite"></p>' +
        '<label class="kids-settings__row kids-settings__row--email"><span class="kids-settings__sync-label">Family password</span><input type="password" id="kidsSyncPassword" class="kids-settings__sync-input" autocomplete="current-password" placeholder="Family password" /></label>' +
        '<label class="kids-settings__show-pass"><input type="checkbox" id="kidsSyncShowPass" checked /> Show password while typing</label>' +
        '<button type="button" class="kids-settings__sync-btn" id="kidsSyncSignIn">Sign in for cloud sync</button>' +
        '<button type="button" class="kids-settings__sync-btn kids-settings__sync-btn--ghost" id="kidsSyncPull">Pull scores from cloud now</button>' +
        '<button type="button" class="kids-settings__sync-btn kids-settings__sync-btn--ghost" id="kidsSyncTestStorybook">Test story library in cloud</button>' +
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
      var btnTestStory = zone.querySelector("#kidsSyncTestStorybook");
      var btnOut = zone.querySelector("#kidsSyncOut");
      var accountLineEl = zone.querySelector("#kidsSyncAccountLine");

      function refreshAuthUi() {
        ensureClient(function (sb) {
          if (!sb) {
            setStatus(statusEl, "Could not load sync.");
            if (accountLineEl) {
              accountLineEl.hidden = true;
            }
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
              if (accountLineEl) {
                accountLineEl.hidden = false;
                accountLineEl.textContent =
                  "Cloud account id (must match every device after sign-in): " + String(sess.user.id);
              }
            } else {
              setStatus(
                statusEl,
                "Log in from the Wondii home with your own email. Stories and scores stay on that account."
              );
              btnOut.style.display = "none";
              if (accountLineEl) {
                accountLineEl.hidden = true;
                accountLineEl.textContent = "";
              }
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
          setStatus(
            statusEl,
            "Log in from the Wondii home with your own email. Stories, games and scores stay on that account."
          );
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

      if (btnTestStory) {
        btnTestStory.addEventListener("click", function () {
          setStatus(statusEl, "Testing story library storage…");
          debugStorybookStorage(function (err, info) {
            if (err) {
              var em = formatStorageErr(err);
              setStatus(statusEl, "Story library test failed — see alert.");
              global.alert(
                "Could not read your story library in Supabase Storage.\n\n" +
                  em +
                  "\n\nCheck: Dashboard → Storage → bucket storybook_room → policies; sign in again with ⚙️; deploy latest site JS (not only edge functions).",
              );
              return;
            }
            var names = (info.files || [])
              .map(function (f) {
                return f.name;
              })
              .join(", ");
            var dl = info.downloadError ? "\nDownload / parse error: " + info.downloadError : "";
            var bc = info.bookCount;
            var bytes = info.shelfJsonUtf8BytesApprox;
            var parseErr = info.parseError;
            var sizeLine =
              bytes != null
                ? "\n\nShelf file length (~JavaScript characters / UTF-16 code units):\n" +
                  String(bytes) +
                  "\nThere’s no dashboard “limit of 14” — shelf.json holds one JSON array, and uploads repeat whatever last fit device storage (heavy images → fewer books)."
                : "";
            var parseLine = parseErr ? "\nParse error (cloud file may be truncated): " + parseErr : "";
            setStatus(statusEl, "Story library test finished — see alert.");
            global.alert(
              "Story library cloud check\n\n" +
                "User id:\n" +
                info.userId +
                "\n\nFiles in …/storybook/:\n" +
                (names || "(none)") +
                "\n\nBooks parsed from shelf.json: " +
                (bc == null ? "?" : String(bc)) +
                dl +
                sizeLine +
                parseLine +
                "\n\nIf this count barely grows after “Put on my shelf”, the browser IndexedDB quota is deleting the oldest book before upload — slim shelf updates (URLs without huge images) reduce that.\n\nIf two tablets show different user ids, they are different accounts.",
            );
          });
        });
      }

      if (btnOut) {
        btnOut.addEventListener("click", function () {
          ensureClient(function (sb) {
            if (!sb) {
              return;
            }
            global.KidsScoreCloud.signOut(function () {
              refreshAuthUi();
              setStatus(statusEl, "Signed out on this device.");
            });
          });
        });
      }
    };
  }

  function subscribeAuth() {
    if (global.WondiiSession) {
      var seen = "";
      global.WondiiSession.subscribe(function (auth) {
        if (auth.status === "initialising" || auth.status === "error") return;
        var mark = auth.status + ":" + (auth.userId || "");
        if (mark === seen) return;
        seen = mark;
        if (auth.status !== "authenticated" || !auth.session || !auth.session.user) {
          clearAccountScope();
          return;
        }
        bindShelfUser(auth.session.user.id);
        pullAndApply(function () {
          refreshOpenScoreUis();
        });
      });
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        return;
      }
      sb.auth.onAuthStateChange(function (event, session) {
        if (event === "SIGNED_OUT") {
          clearAccountScope();
          return;
        }
        if (session && session.user && event === "SIGNED_IN") {
          bindShelfUser(session.user.id);
          pullAndApply(function (changed) {
            refreshOpenScoreUis();
            if (!changed) {
              pushBundle();
            }
          });
        }
      });
      sb.auth.getSession().then(function (res) {
        var sess = res.data && res.data.session;
        if (sess && sess.user) {
          bindShelfUser(sess.user.id);
          pullAndApply(function (changed) {
            refreshOpenScoreUis();
          });
        } else {
          bindShelfUser(null);
          try {
            global.dispatchEvent(new CustomEvent("kids-scorecard-refresh"));
          } catch (e) {}
        }
      });
    });
  }

  global.KidsScoreCloud = {
    onScoreSaved: function () {
      schedulePush();
    },
    bindAccountScope: bindAccountScope,
    isConfigured: isConfigured,
    /** cb(session|null, err) — err set when the sync library or network could not be reached. */
    signOut: function (cb) {
      ensureClient(function (sb) {
        if (!sb) {
          if (cb) cb();
          return;
        }
        sb.auth.getSession().then(function (res) {
          var sess = res.data && res.data.session;
          function finishOut() {
            sb.auth.signOut().then(function () {
              if (cb) cb();
            }).catch(function () {
              clearAccountScope();
              if (cb) cb();
            });
          }
          if (!sess || !sess.user) {
            finishOut();
            return;
          }
          var nested = collectNestedPayload();
          if (!Object.keys(nested).length) {
            finishOut();
            return;
          }
          sb.from("score_bundles")
            .upsert(
              {
                user_id: sess.user.id,
                payload: nested,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            )
            .then(finishOut)
            .catch(finishOut);
        }).catch(function () {
          sb.auth.signOut().then(function () {
            if (cb) cb();
          });
        });
      });
    },
    getSession: function (cb) {
      ensureClient(function (sb) {
        if (!sb) {
          cb(null, new Error("sync_unavailable"));
          return;
        }
        sb.auth
          .getSession()
          .then(function (res) {
            cb((res && res.data && res.data.session) || null, res && res.error ? res.error : null);
          })
          .catch(function (e) {
            cb(null, e || new Error("session_failed"));
          });
      });
    },
    /** Family-password sign-in (same account as ⚙️ Sync). cb(err|null). */
    signIn: function (password, cb) {
      var loginEmail = (cfg().syncLoginEmail && String(cfg().syncLoginEmail).trim()) || "";
      this.signInWithEmail(loginEmail, password, cb);
    },
    /** Email + password sign-in. cb(err|null). */
    signInWithEmail: function (email, password, cb) {
      var loginEmail = String(email || "").trim();
      if (!loginEmail) {
        cb(new Error("not_configured"));
        return;
      }
      ensureClient(function (sb) {
        if (!sb) {
          cb(new Error("sync_unavailable"));
          return;
        }
        sb.auth
          .signInWithPassword({ email: loginEmail, password: String(password || "") })
          .then(function (r) {
            cb(r && r.error ? r.error : null);
          })
          .catch(function (e) {
            cb(e || new Error("sign_in_failed"));
          });
      });
    },
    /**
     * Create an account. cb(err|null, { session, needsConfirm }).
     * Characters and books are stored under this user’s id.
     */
    updatePassword: function (password, cb) {
      ensureClient(function (sb) {
        if (!sb) {
          cb(new Error("sync_unavailable"));
          return;
        }
        sb.auth.updateUser({ password: String(password || "") }).then(function (r) {
          cb(r && r.error ? r.error : null);
        }).catch(function (e) {
          cb(e || new Error("password_failed"));
        });
      });
    },
    signUp: function (email, password, cb, extra) {
      var loginEmail = String(email || "").trim();
      if (!loginEmail) {
        cb(new Error("not_configured"));
        return;
      }
      var displayName = extra && extra.displayName ? String(extra.displayName).trim() : "";
      ensureClient(function (sb) {
        if (!sb) {
          cb(new Error("sync_unavailable"));
          return;
        }
        var redirect = "https://www.wondii.co.uk/portal.html";
        var options = { emailRedirectTo: redirect };
        if (displayName) options.data = { full_name: displayName };
        sb.auth
          .signUp({
            email: loginEmail,
            password: String(password || ""),
            options: options,
          })
          .then(function (r) {
            if (r && r.error) {
              cb(r.error);
              return;
            }
            var user = r && r.data && r.data.user;
            var session = (r && r.data && r.data.session) || null;
            if (user && Array.isArray(user.identities) && user.identities.length === 0) {
              cb(new Error("already_registered"));
              return;
            }
            cb(null, {
              session: session,
              needsConfirm: !session,
              email: (user && user.email) || (session && session.user && session.user.email) || loginEmail
            });
          })
          .catch(function (e) {
            cb(e || new Error("sign_up_failed"));
          });
      });
    },
    downloadColouringSession: downloadColouringSession,
    uploadColouringSession: uploadColouringSession,
    scheduleColouringUpload: scheduleColouringUpload,
    downloadStorybookLibrary: downloadStorybookLibrary,
    uploadStorybookLibrary: uploadStorybookLibrary,
    scheduleStorybookUpload: scheduleStorybookUpload,
    mergeStorybookShelfFromCloud: mergeStorybookShelfFromCloud,
    debugStorybookStorage: debugStorybookStorage,
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
