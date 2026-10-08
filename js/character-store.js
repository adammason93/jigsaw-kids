/**
 * Character library storage — private Supabase bucket `characters_room`.
 * Family:  {user id}/characters/…
 * School:  school/{organisation id}/characters/…
 * The active workspace comes from WondiiAccount. A school session never
 * reads or writes the family folder.
 */
(function (global) {
  "use strict";

  var BUCKET = "characters_room";
  var SYNC_LIB =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";

  var client = null;
  var loadingLib = false;
  var loadWaiters = [];
  var bound = null;
  var saveLock = false;

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

  function withFreshSession(sb, cb) {
    sb.auth.getSession().then(function (res) {
      if (res && res.error) {
        cb(null, res.error);
        return;
      }
      var sess = res.data && res.data.session;
      cb(sess && sess.user ? sess : null, null);
    }).catch(function (err) {
      cb(null, err || new Error("session"));
    });
  }

  function fail(code, message) {
    var err = new Error(message || code);
    err.code = code;
    return err;
  }

  function bindWorkspace(workspace) {
    bound = workspace && workspace.ownerId ? workspace : null;
  }

  function accountApi() {
    return global.WondiiAccount || null;
  }

  function prefixFor(workspace) {
    var api = accountApi();
    if (api) return api.storagePrefix(workspace);
    if (!workspace || !workspace.ownerId) return "";
    if (workspace.ownerType === "school") return "school/" + workspace.ownerId;
    if (workspace.ownerType === "family") return workspace.ownerId;
    return "";
  }

  function workspaceFor(sess) {
    if (bound && bound.ownerId) return bound;
    var org = global.WondiiOrg && global.WondiiOrg.get && global.WondiiOrg.get();
    if (org && org.status && org.status !== "ready") return null;
    if (org && org.organisationId) return null;
    if (sess && sess.user && sess.user.id) {
      return {
        kind: "family",
        ownerType: "family",
        ownerId: sess.user.id,
        userId: sess.user.id,
        role: "owner",
        label: "Family"
      };
    }
    return null;
  }

  function indexPath(workspace) {
    return prefixFor(workspace) + "/characters/index.json";
  }
  function imagePath(workspace, id) {
    return prefixFor(workspace) + "/characters/" + id + ".png";
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
      withFreshSession(sb, function (sess, sessionErr) {
        if (sessionErr) {
          cb(fail("session_unavailable", "Could not open characters. Try again."), null, null);
          return;
        }
        if (!sess || !sess.user) {
          var school = bound && bound.kind === "school";
          cb(fail(school ? "school-signed-out" : "no_session", school
            ? "Your school session has ended. Log in again to open this school's characters."
            : "Log in to Wondii to see this account's characters."), null, null);
          return;
        }
        var workspace = workspaceFor(sess);
        if (!workspace || !prefixFor(workspace)) {
          cb(fail("no_workspace", "This page does not know which account the character belongs to."), null, null);
          return;
        }
        if (workspace.ownerType === "family" && workspace.ownerId !== sess.user.id) {
          cb(fail("workspace-mismatch", "This character does not belong to the signed-in account."), null, null);
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
      var path = indexPath(workspaceFor(sess));
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
                var rows = Array.isArray(parsed) ? parsed : [];
                var api = accountApi();
                var workspace = workspaceFor(sess);
                cb(null, api ? api.visibleRecords(rows, workspace) : rows);
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
      var path = indexPath(workspaceFor(sess));
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
      var path = imagePath(workspaceFor(sess), id);
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
      var path = imagePath(workspaceFor(sess), id);
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
      var path = imagePath(workspaceFor(sess), id);
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

  function storageError(error) {
    if (!error) return null;
    if (error instanceof Error && error.code && error.code !== "save_failed") return error;
    var message = String((error && error.message) || error || "");
    if (/row-level security|permission denied|not authorized|unauthorized/i.test(message)) {
      return fail("save_failed", "This account could not save the character. Sign in again and try once more.");
    }
    return fail("save_failed", "The character was not saved.");
  }

  /** Upload the picture, then write the workspace index. cb(err, record). */
  function saveCharacter(record, pngBlob, cb) {
    if (saveLock) {
      cb(fail("busy", "Save is already running."));
      return;
    }
    if (!pngBlob) {
      cb(fail("invalid", "Generate the character before saving."));
      return;
    }
    var api = accountApi();
    var workspace = bound;
    if (!api || !workspace || !workspace.ownerId) {
      cb(fail("no_workspace", "This page does not know which account the character belongs to."));
      return;
    }
    var draft = api.stampRecord(Object.assign({}, record, {
      id: record && record.id ? record.id : newCharacterId(),
      createdAt: (record && record.createdAt) || new Date().toISOString()
    }), workspace);
    if (!draft.name) {
      cb(fail("invalid", "Type a name before saving."));
      return;
    }
    saveLock = true;
    uploadCharacterPng(draft.id, pngBlob, function (uploadErr) {
      if (uploadErr) {
        saveLock = false;
        cb(storageError(uploadErr));
        return;
      }
      loadCharacters(function (loadErr, list) {
        if (loadErr) {
          saveLock = false;
          cb(storageError(loadErr));
          return;
        }
        var saved = api.applySave(list || [], draft, workspace);
        if (!saved.ok) {
          saveLock = false;
          cb(fail(saved.code, "The character could not be saved."));
          return;
        }
        saveCharactersIndex(saved.index, function (indexErr) {
          saveLock = false;
          if (indexErr) {
            cb(storageError(indexErr));
            return;
          }
          cb(null, saved.record);
        });
      });
    });
  }

  global.CharacterStore = {
    isConfigured: isConfigured,
    bindWorkspace: bindWorkspace,
    loadCharacters: loadCharacters,
    saveCharactersIndex: saveCharactersIndex,
    saveCharacter: saveCharacter,
    uploadCharacterPng: uploadCharacterPng,
    getCharacterSignedUrl: getCharacterSignedUrl,
    deleteCharacterImage: deleteCharacterImage,
    dataUrlToBlob: dataUrlToBlob,
    newCharacterId: newCharacterId,
  };
})(typeof window !== "undefined" ? window : this);
