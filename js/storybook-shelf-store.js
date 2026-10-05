/**
 * Persists the storybook shelf outside localStorage (IndexedDB) so large shelves
 * work on mobile Safari. Migrates legacy key jigsawKids_storybookShelf_v1 once.
 */
(function (global) {
  "use strict";

  var LS_KEY = "jigsawKids_storybookShelf_v1";
  var DB_NAME = "jigsaw-kids-app";
  var DB_VERSION = 1;
  var STORE_SHELF = "storybookShelf";
  /** Legacy device shelf. Kept on disk so an existing library is not deleted. Never read for a signed-in user. */
  var LEGACY_RECORD_KEY = "v1";
  var VIEW_KEY = "wondii-shelf-view";
  var activeUid = "";

  function readView() {
    try {
      var raw = global.sessionStorage.getItem(VIEW_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.books)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  var dbPromise = null;

  function idbAvailable() {
    return !!(global.indexedDB && global.indexedDB.open);
  }

  function openDb() {
    if (!idbAvailable()) {
      return Promise.reject(new Error("no_idb"));
    }
    if (dbPromise) {
      return dbPromise;
    }
    dbPromise = new Promise(function (resolve, reject) {
      var req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = function () {
        dbPromise = null;
        reject(req.error || new Error("idb_open"));
      };
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_SHELF)) {
          db.createObjectStore(STORE_SHELF);
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
    });
    return dbPromise;
  }

  function idbGetString(recordKey) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(STORE_SHELF, "readonly");
          var r = tx.objectStore(STORE_SHELF).get(recordKey);
          r.onsuccess = function () {
            resolve(r.result !== undefined ? r.result : null);
          };
          r.onerror = function () {
            reject(r.error);
          };
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  function idbPutString(s, recordKey) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(STORE_SHELF, "readwrite");
          tx.objectStore(STORE_SHELF).put(s, recordKey);
          tx.oncomplete = function () {
            resolve();
          };
          tx.onerror = function () {
            reject(tx.error || new Error("idb_tx"));
          };
          tx.onabort = function () {
            reject(tx.error || new Error("idb_abort"));
          };
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  function lsGet() {
    try {
      return global.localStorage.getItem(LS_KEY);
    } catch (e) {
      return null;
    }
  }

  function lsRemove() {
    try {
      global.localStorage.removeItem(LS_KEY);
    } catch (e) {}
  }

  function lsSet(s) {
    global.localStorage.setItem(LS_KEY, s);
  }

  function migrateFromLsOnce() {
    var raw = lsGet();
    if (!raw) {
      return Promise.resolve();
    }
    return idbPutString(raw, LEGACY_RECORD_KEY).then(function () {
      return idbGetString(LEGACY_RECORD_KEY);
    }).then(function (v) {
      if (v != null && String(v) === String(raw)) {
        lsRemove();
      }
    });
  }

  global.StorybookShelfStore = {
    LS_KEY: LS_KEY,

    /** Open DB and move legacy localStorage shelf into IndexedDB if present. */
    ready: function () {
      if (!idbAvailable()) {
        return Promise.resolve();
      }
      return openDb()
        .then(migrateFromLsOnce)
        .catch(function () {
          dbPromise = null;
        });
    },

    /**
     * Bind the shelf to the authenticated user. Pass null on logout.
     * Reads and writes use only that user's record. The legacy device shelf is left untouched.
     */
    bindUser: function (uid) {
      var next = uid ? String(uid) : "";
      if (next !== activeUid) this.clearIsolated();
      activeUid = next;
    },

    currentUserId: function () {
      return activeUid || "";
    },

    /** @returns {Promise<string|null>} raw JSON string for the signed-in user, or null when nobody is signed in */
    getRaw: function () {
      if (!activeUid) {
        return Promise.resolve(null);
      }
      var recordKey = "u:" + activeUid;
      var userLsKey = LS_KEY + ":" + activeUid;
      function userLs() {
        try {
          return global.localStorage.getItem(userLsKey);
        } catch (e) {
          return null;
        }
      }
      if (!idbAvailable()) {
        return Promise.resolve(userLs());
      }
      return idbGetString(recordKey)
        .then(function (raw) {
          if (raw != null && String(raw).length) {
            return String(raw);
          }
          var fallback = userLs();
          if (fallback) {
            return idbPutString(fallback, recordKey).then(function () {
              try {
                global.localStorage.removeItem(userLsKey);
              } catch (e) {}
              return fallback;
            });
          }
          return null;
        })
        .catch(function () {
          return userLs();
        });
    },

    getJson: function () {
      var self = this;
      return this.getRaw().then(function (raw) {
        if (!raw) {
          return [];
        }
        try {
          var data = JSON.parse(String(raw));
          return Array.isArray(data) ? data : [];
        } catch (e) {
          return [];
        }
      });
    },

    setRaw: function (jsonString) {
      if (!activeUid) {
        return Promise.reject(new Error("no_account"));
      }
      var recordKey = "u:" + activeUid;
      var s = String(jsonString);
      if (!idbAvailable()) {
        return new Promise(function (resolve, reject) {
          try {
            global.localStorage.setItem(LS_KEY + ":" + activeUid, s);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      }
      return idbPutString(s, recordKey);
    },

    setJson: function (list) {
      return this.setRaw(JSON.stringify(list));
    },

    /** This login is looking at its own cloud shelf, not another profile saved on this device. */
    isIsolated: function () {
      return !!readView();
    },

    getVisibleJson: function () {
      var view = readView();
      if (view) return Promise.resolve(view.books.slice());
      return this.getJson();
    },

    setIsolated: function (uid, books) {
      var prev = readView();
      var id = uid || (prev && prev.uid) || "";
      try {
        global.sessionStorage.setItem(VIEW_KEY, JSON.stringify({ uid: id, books: books || [] }));
      } catch (e) {}
    },

    clearIsolated: function () {
      try { global.sessionStorage.removeItem(VIEW_KEY); } catch (e) {}
    },
  };
})(typeof window !== "undefined" ? window : this);
