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
  /** Max books on shelf; trim removes oldest. Keep in sync with games/storybook.js SHELF_MAX_BOOKS. */
  var STORYBOOK_SHELF_MAX = 200;

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

  /**
   * Refresh JWT before Storage calls — expired access_token breaks private bucket reads/writes.
   */
  function withFreshSession(sb, cb) {
    sb.auth.getSession().then(function (res) {
      var sess = res.data && res.data.session;
      if (!sess || !sess.user) {
        cb(null);
        return;
      }
      sb.auth
        .refreshSession()
        .then(function (r2) {
          var next = r2.data && r2.data.session;
          cb(next && next.user ? next : sess);
        })
        .catch(function () {
          cb(sess);
        });
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
        sb.storage
          .from(STORYBOOK_BUCKET)
          .list(folder, { limit: 40 })
          .then(function (listRes) {
            if (listRes.error) {
              cb(listRes.error, { userId: uid, files: null });
              return;
            }
            downloadStorybookLibrary(function (derr, data) {
              var books = null;
              if (!derr && data != null) {
                books = normalizedCloudShelf(data);
              }
              cb(null, {
                userId: uid,
                files: listRes.data || [],
                bookCount: Array.isArray(books) ? books.length : null,
                downloadError: derr ? formatStorageErr(derr) : null,
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
          cb(loadLocalStorybookShelf());
        });
      return;
    }
    cb(loadLocalStorybookShelf());
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
    try {
      global.localStorage.setItem(STORYBOOK_SHELF_KEY, JSON.stringify(merged));
      cb(null);
    } catch (e) {
      cb(e);
    }
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

      storybookShelfGetJson(function (local) {
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
        while (merged.length > STORYBOOK_SHELF_MAX) {
          merged.pop();
          changedLocal = true;
          needsUpload = true;
        }

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
                "Sign in with the family password to turn on sync."
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
                "\n\nIf two tablets show different user ids, they are using different accounts.",
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
