/**
 * Character library storage — private Supabase bucket `characters_room`.
 *   {uid}/characters/index.json   — metadata array
 *   {uid}/characters/{id}.png     — generated 3D-clay cartoon PNG
 * Mirrors patterns in js/score-cloud.js (uses the same Supabase client + session refresh).
 */
(function (global) {
  "use strict";

  var BUCKET = "characters_room";
  var SYNC_LIB =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";

  var client = null;
  var loadingLib = false;
  var loadWaiters = [];

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
      cb();
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

  function indexPath(uid) {
    return uid + "/characters/index.json";
  }
  function imagePath(uid, id) {
    return uid + "/characters/" + id + ".png";
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

  function blobToText(blob) {
    return new Promise(function (resolve, reject) {
      if (blob.text && typeof blob.text === "function") {
        blob.text().then(resolve).catch(reject);
        return;
      }
      var fr = new global.FileReader();
      fr.onload = function () {
        resolve(String(fr.result));
      };
      fr.onerror = function (e) {
        reject(e);
      };
      fr.readAsText(blob);
    });
  }

  function withSession(cb) {
    if (!isConfigured()) {
      cb(new Error("not_configured"), null, null);
      return;
    }
    ensureClient(function (sb) {
      if (!sb) {
        cb(new Error("no_client"), null, null);
        return;
      }
      withFreshSession(sb, function (sess) {
        if (!sess || !sess.user) {
          cb(new Error("no_session"), null, null);
          return;
        }
        cb(null, sb, sess);
      });
    });
  }

  /** Load the user's character index (metadata array). cb(err, array). */
  function loadCharacters(cb) {
    withSession(function (err, sb, sess) {
      if (err) {
        cb(err, null);
        return;
      }
      var path = indexPath(sess.user.id);
      sb.storage
        .from(BUCKET)
        .download(path, { cache: "no-store" })
        .then(function (res) {
          if (res.error || !res.data) {
            var raw = res.error && (res.error.message || res.error);
            if (notFoundMessage(raw)) {
              cb(null, []);
              return;
            }
            cb(res.error instanceof Error ? res.error : new Error(String(raw || "download")), null);
            return;
          }
          blobToText(res.data)
            .then(function (text) {
              var t = String(text || "").trim();
              if (!t) {
                cb(null, []);
                return;
              }
              try {
                var parsed = JSON.parse(t);
                cb(null, Array.isArray(parsed) ? parsed : []);
              } catch (e) {
                cb(e, null);
              }
            })
            .catch(function (e) {
              cb(e, null);
            });
        })
        .catch(function (e) {
          cb(e, null);
        });
    });
  }

  /** Replace the entire character index. cb(err). */
  function saveCharactersIndex(arr, cb) {
    withSession(function (err, sb, sess) {
      if (err) {
        cb(err);
        return;
      }
      var path = indexPath(sess.user.id);
      var blob = new global.Blob([JSON.stringify(arr || [])], {
        type: "application/json",
      });
      sb.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: "application/json" })
        .then(function (up) {
          cb(up.error || null);
        })
        .catch(function (e) {
          cb(e);
        });
    });
  }

  /** Upload a PNG blob for a given character id. cb(err). */
  function uploadCharacterPng(id, pngBlob, cb) {
    withSession(function (err, sb, sess) {
      if (err) {
        cb(err);
        return;
      }
      var path = imagePath(sess.user.id, id);
      sb.storage
        .from(BUCKET)
        .upload(path, pngBlob, { upsert: true, contentType: "image/png" })
        .then(function (up) {
          cb(up.error || null);
        })
        .catch(function (e) {
          cb(e);
        });
    });
  }

  /** Signed URL for displaying a character image (1 hour). cb(err, url). */
  function getCharacterSignedUrl(id, cb) {
    withSession(function (err, sb, sess) {
      if (err) {
        cb(err, null);
        return;
      }
      var path = imagePath(sess.user.id, id);
      sb.storage
        .from(BUCKET)
        .createSignedUrl(path, 3600)
        .then(function (su) {
          if (su.error || !su.data || !su.data.signedUrl) {
            cb(su.error || new Error("no_signed_url"), null);
            return;
          }
          cb(null, su.data.signedUrl);
        })
        .catch(function (e) {
          cb(e, null);
        });
    });
  }

  /** Delete the PNG for a character (does not modify index). cb(err). */
  function deleteCharacterImage(id, cb) {
    withSession(function (err, sb, sess) {
      if (err) {
        cb(err);
        return;
      }
      var path = imagePath(sess.user.id, id);
      sb.storage
        .from(BUCKET)
        .remove([path])
        .then(function (r) {
          cb(r.error || null);
        })
        .catch(function (e) {
          cb(e);
        });
    });
  }

  /** Convert a data: URL (image/png base64) to a Blob — runs in the browser. */
  function dataUrlToBlob(dataUrl) {
    var m = /^data:([^;]+);base64,(.*)$/i.exec(String(dataUrl || ""));
    if (!m) return null;
    var mime = m[1];
    var bin = global.atob(m[2]);
    var bytes = new global.Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new global.Blob([bytes], { type: mime });
  }

  /** Short, URL-safe id. */
  function newCharacterId() {
    var rand = Math.random().toString(36).slice(2, 10);
    return "char_" + Date.now().toString(36) + "_" + rand;
  }

  global.CharacterStore = {
    isConfigured: isConfigured,
    loadCharacters: loadCharacters,
    saveCharactersIndex: saveCharactersIndex,
    uploadCharacterPng: uploadCharacterPng,
    getCharacterSignedUrl: getCharacterSignedUrl,
    deleteCharacterImage: deleteCharacterImage,
    dataUrlToBlob: dataUrlToBlob,
    newCharacterId: newCharacterId,
  };
})(typeof window !== "undefined" ? window : this);
