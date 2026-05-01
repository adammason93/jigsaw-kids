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
  var SHELF_RECORD_KEY = "v1";

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

  function idbGetString() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(STORE_SHELF, "readonly");
          var r = tx.objectStore(STORE_SHELF).get(SHELF_RECORD_KEY);
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

  function idbPutString(s) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(STORE_SHELF, "readwrite");
          tx.objectStore(STORE_SHELF).put(s, SHELF_RECORD_KEY);
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
    return idbPutString(raw).then(function () {
      return idbGetString();
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

    /** @returns {Promise<string|null>} raw JSON string */
    getRaw: function () {
      if (!idbAvailable()) {
        return Promise.resolve(lsGet());
      }
      return idbGetString()
        .then(function (raw) {
          if (raw != null && String(raw).length) {
            return String(raw);
          }
          var fallback = lsGet();
          if (fallback) {
            return idbPutString(fallback).then(function () {
              lsRemove();
              return fallback;
            });
          }
          return null;
        })
        .catch(function () {
          return lsGet();
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
      var s = String(jsonString);
      if (!idbAvailable()) {
        return new Promise(function (resolve, reject) {
          try {
            lsSet(s);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      }
      return idbPutString(s).then(function () {
        lsRemove();
      });
    },

    setJson: function (list) {
      return this.setRaw(JSON.stringify(list));
    },
  };
})(typeof window !== "undefined" ? window : this);
