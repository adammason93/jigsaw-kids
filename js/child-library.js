/* Child book and character library. Uses the shared WondiiSession client.
   Children never write the adult story or character folders. */
(function (global) {
  "use strict";

  function isChildSession() {
    var auth = global.WondiiSession && global.WondiiSession.get && global.WondiiSession.get();
    var user = auth && auth.session && auth.session.user;
    var meta = user && user.app_metadata;
    return !!(meta && meta.account_kind === "child");
  }

  function client(done) {
    if (!global.WondiiSession || !global.WondiiSession.client) {
      done(null);
      return;
    }
    global.WondiiSession.client(done);
  }

  function rpc(name, args, done) {
    client(function (sb) {
      if (!sb) {
        done(new Error("unavailable"));
        return;
      }
      sb.rpc(name, args || {}).then(function (res) {
        if (res && res.error) {
          done(res.error);
          return;
        }
        done(null, res && res.data);
      }).catch(function (err) {
        done(err || new Error("failed"));
      });
    });
  }

  function newKey() {
    var alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    var out = "wondii";
    var i;
    for (i = 0; i < 16; i++) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return out;
  }

  function reserve(kind) {
    var key = newKey();
    return new Promise(function (resolve) {
      rpc("reserve_child_creation", { p_kind: kind, p_key: key }, function (err, data) {
        if (err || !data) {
          resolve({ allowed: false, reason: "unavailable" });
          return;
        }
        resolve(data);
      });
    });
  }

  function refund(key) {
    if (!key) return Promise.resolve();
    return new Promise(function (resolve) {
      rpc("refund_child_creation", { p_key: key }, function () { resolve(); });
    });
  }

  function downloadShelf(cb) {
    rpc("child_shelf", {}, function (err, data) {
      if (err || !data || data.allowed !== true) {
        cb(err || new Error("not_child"), null);
        return;
      }
      cb(null, Array.isArray(data.shelf) ? data.shelf : []);
    });
  }

  function uploadShelf(rawJsonString, key, cb) {
    var shelf = [];
    try { shelf = JSON.parse(rawJsonString); } catch (e) {
      cb(new Error("shelf_invalid"));
      return;
    }
    rpc("save_child_shelf", { p_shelf: shelf, p_key: key || "" }, function (err, data) {
      if (err || !data || data.allowed !== true) {
        cb(err || new Error((data && data.reason) || "allowance"));
        return;
      }
      cb(null);
    });
  }

  function loadCharacters(cb) {
    rpc("child_characters", {}, function (err, data) {
      if (err || !data || data.allowed !== true) {
        cb(err || new Error("not_child"), null);
        return;
      }
      cb(null, Array.isArray(data.characters) ? data.characters : []);
    });
  }

  function setFavourite(bookId, favourite, cb) {
    rpc("set_child_book_favourite", { p_book: bookId, p_favourite: !!favourite }, function (err, data) {
      if (err || !data || data.allowed !== true) {
        cb(err || new Error("not_saved"));
        return;
      }
      cb(null, data);
    });
  }

  function saveCharacters(items, key, cb) {
    rpc("save_child_characters", { p_items: items || [], p_key: key || "" }, function (err, data) {
      if (err || !data || data.allowed !== true) {
        cb(err || new Error((data && data.reason) || "allowance"));
        return;
      }
      cb(null, data);
    });
  }

  global.ChildLibrary = {
    isChildSession: isChildSession,
    reserve: reserve,
    refund: refund,
    downloadShelf: downloadShelf,
    uploadShelf: uploadShelf,
    loadCharacters: loadCharacters,
    saveCharacters: saveCharacters,
    setFavourite: setFavourite
  };
})(typeof window !== "undefined" ? window : globalThis);
