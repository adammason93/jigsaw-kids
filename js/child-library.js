/* Child book and character library. Uses the shared WondiiSession client.
   Pictures go in the private child_library bucket, never an adult folder
   and never a public URL. */
(function (global) {
  "use strict";

  var BUCKET = "child_library";
  var MARKER = "wondii-private:";

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

  function safeId(value) {
    return /^[A-Za-z0-9_-]{1,80}$/.test(String(value || ""));
  }

  function markerRelative(value) {
    var raw = String(value || "");
    if (raw.indexOf(MARKER) !== 0) return "";
    var path = raw.slice(MARKER.length);
    if (path.indexOf("..") !== -1 || path.indexOf("://") !== -1) return "";
    if (!/^(books|characters|shared)\/[A-Za-z0-9_-]{1,80}(?:\/[A-Za-z0-9_.-]{1,80}){0,2}$/.test(path)) return "";
    return path;
  }

  function profileId(done) {
    var auth = global.WondiiSession && global.WondiiSession.get && global.WondiiSession.get();
    var meta = auth && auth.session && auth.session.user && auth.session.user.app_metadata;
    if (meta && meta.child_profile_id) {
      done(null, String(meta.child_profile_id));
      return;
    }
    rpc("child_content_access", {}, function (err, data) {
      if (!err && data && data.allowed === true && data.childId) done(null, String(data.childId));
      else done(err || new Error("not_child"));
    });
  }

  function dataUrlToBlob(dataUrl) {
    var match = /^data:([^;]+);base64,(.*)$/i.exec(String(dataUrl || ""));
    if (!match) return null;
    var bin = global.atob(match[2]);
    var bytes = new global.Uint8Array(bin.length);
    var i;
    for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new global.Blob([bytes], { type: match[1] });
  }

  function blobToDataUrl(blob, done) {
    var reader = new global.FileReader();
    reader.onload = function () { done(String(reader.result || "")); };
    reader.onerror = function () { done(""); };
    reader.readAsDataURL(blob);
  }

  function putObject(sb, path, blob, contentType, done) {
    sb.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: contentType,
      cacheControl: "private, no-store"
    })
      .then(function (up) { done(up.error || null); })
      .catch(function (err) { done(err || new Error("upload_failed")); });
  }

  function objectUrl(sb, path) {
    var base = String(sb && sb.supabaseUrl || "").replace(/\/$/, "");
    var encoded = String(path || "").split("/").map(function (part) {
      return encodeURIComponent(part);
    }).join("/");
    if (!base || !encoded) return "";
    return base + "/storage/v1/object/" + BUCKET + "/" + encoded;
  }

  function getObject(sb, path, done) {
    var url = objectUrl(sb, path);
    Promise.resolve(sb.auth.getSession()).then(function (sess) {
      var token = sess && sess.data && sess.data.session && sess.data.session.access_token;
      if (!url || !token) throw new Error("missing");
      return fetch(url, {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        headers: {
          Authorization: "Bearer " + token,
          apikey: sb.supabaseKey || "",
          "Cache-Control": "no-store",
          Pragma: "no-cache"
        }
      });
    }).then(function (res) {
      if (!res || !res.ok) throw new Error("missing");
      return res.blob();
    }).then(function (blob) {
      done(null, blob);
    }).catch(function (err) {
      done(err || new Error("missing"), null);
    });
  }

  function removeObjects(sb, paths, done) {
    if (!paths.length) {
      done(null);
      return;
    }
    sb.storage.from(BUCKET).remove(paths)
      .then(function () { done(null); })
      .catch(function () { done(null); });
  }

  function eachSeries(items, worker, done) {
    var index = 0;
    function next(err) {
      if (err) {
        done(err);
        return;
      }
      if (index >= items.length) {
        done(null);
        return;
      }
      worker(items[index], index, function (workerErr) {
        index += 1;
        next(workerErr);
      });
    }
    next(null);
  }

  function storePicture(sb, path, dataUrl, done) {
    var blob = dataUrlToBlob(dataUrl);
    if (!blob) {
      done(new Error("picture_invalid"));
      return;
    }
    var type = blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "image/jpeg";
    putObject(sb, path, blob, type, done);
  }

  function copyableStorybookUrl(value) {
    var raw = String(value || "").trim();
    if (!/^https:\/\//i.test(raw)) return false;
    var parsed;
    try { parsed = new global.URL(raw); } catch (e) { return false; }
    var host = parsed.hostname.toLowerCase();
    var supabaseHost = host === "supabase.co" || host.slice(-12) === ".supabase.co";
    var wondiiHost = host === "wondii.co.uk" || host === "www.wondii.co.uk";
    if (!supabaseHost && !wondiiHost) return false;
    return parsed.pathname.indexOf("/storage/v1/object/public/storybook_images/") !== -1;
  }

  function pictureProblem(value) {
    var raw = String(value || "");
    if (!raw) return "";
    if (raw.indexOf(MARKER) === 0) return markerRelative(raw) ? "" : "picture_invalid";
    if (raw.indexOf("data:image/") === 0) return "";
    if (/^https?:\/\//i.test(raw)) return copyableStorybookUrl(raw) ? "" : "public_picture";
    if (raw.indexOf("data:") === 0) return "public_picture";
    return "";
  }

  function fetchPicture(url, done) {
    fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      mode: "cors",
      referrerPolicy: "no-referrer"
    }).then(function (res) {
      if (!res.ok) throw new Error("picture_missing");
      return res.blob();
    }).then(function (blob) {
      done(null, blob);
    }).catch(function (err) {
      done(err || new Error("picture_missing"), null);
    });
  }

  function stripBook(sb, childId, book, done) {
    if (!book || !safeId(book.id)) {
      done(new Error("book_invalid"));
      return;
    }
    var copy = JSON.parse(JSON.stringify(book));
    var jobs = [];
    var seen = {};
    var pictureCount = 0;
    var blocked = "";
    function queue(value, assign) {
      if (typeof value !== "string" || !value) return;
      var problem = pictureProblem(value);
      if (problem) {
        blocked = problem;
        return;
      }
      if (value.indexOf(MARKER) === 0) return;
      if (seen[value]) {
        jobs.push({ reuse: seen[value], assign: assign });
        return;
      }
      var relative = "books/" + book.id + "/p" + pictureCount + ".jpg";
      pictureCount += 1;
      seen[value] = relative;
      jobs.push({ source: value, relative: relative, assign: assign });
    }
    if (Array.isArray(copy.pages)) {
      copy.pages.forEach(function (page) {
        if (!page) return;
        queue(page.imageDataUrl, function (marker) {
          page.imageDataUrl = null;
          page.imageUrlFallback = marker;
        });
        queue(page.imageUrl, function (marker) {
          page.imageUrl = null;
          if (!page.imageUrlFallback) page.imageUrlFallback = marker;
        });
        queue(page.imageUrlFallback, function (marker) {
          page.imageDataUrl = null;
          page.imageUrl = null;
          page.imageUrlFallback = marker;
        });
      });
    }
    queue(copy.sceneDataUrl, function (marker) {
      copy.sceneDataUrl = null;
      copy.sceneUrlFallback = marker;
    });
    queue(copy.sceneUrlFallback, function (marker) {
      copy.sceneDataUrl = null;
      copy.sceneUrlFallback = marker;
    });
    queue(copy.sceneImageUrl, function (marker) {
      copy.sceneImageUrl = null;
      if (!copy.sceneUrlFallback || copy.sceneUrlFallback.indexOf(MARKER) !== 0) copy.sceneUrlFallback = marker;
    });
    if (blocked) {
      done(new Error(blocked));
      return;
    }
    var coverBlob = null;
    eachSeries(jobs, function (job, _index, next) {
      if (job.reuse) {
        job.assign(MARKER + job.reuse);
        next(null);
        return;
      }
      function stored(err, blob) {
        if (err) {
          next(err);
          return;
        }
        if (!coverBlob && blob) coverBlob = blob;
        job.assign(MARKER + job.relative);
        next(null);
      }
      if (job.source.indexOf("data:image/") === 0) {
        var blob = dataUrlToBlob(job.source);
        if (!blob) {
          next(new Error("picture_invalid"));
          return;
        }
        var type = blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "image/jpeg";
        putObject(sb, childId + "/" + job.relative, blob, type, function (err) {
          stored(err, err ? null : blob);
        });
        return;
      }
      fetchPicture(job.source, function (err, blob) {
        if (err || !blob) {
          next(err || new Error("picture_missing"));
          return;
        }
        var remoteType = blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "image/jpeg";
        putObject(sb, childId + "/" + job.relative, blob, remoteType, function (putErr) {
          stored(putErr, putErr ? null : blob);
        });
      });
    }, function (err) {
      if (err) {
        done(err);
        return;
      }
      function writeJson() {
        putObject(
          sb,
          childId + "/books/" + book.id + ".json",
          new global.Blob([JSON.stringify(copy)], { type: "application/json" }),
          "application/json",
          function (jsonErr) { done(jsonErr, jsonErr ? null : copy); }
        );
      }
      if (!coverBlob) {
        writeJson();
        return;
      }
      putObject(sb, childId + "/books/" + book.id + "/cover.jpg", coverBlob, coverBlob.type || "image/jpeg", function (coverErr) {
        if (coverErr) {
          done(coverErr);
          return;
        }
        writeJson();
      });
    });
  }

  function hydrateValue(sb, childId, value, done) {
    var relative = markerRelative(value);
    if (!relative) {
      done(value);
      return;
    }
    getObject(sb, childId + "/" + relative, function (err, blob) {
      if (err || !blob) {
        done(null);
        return;
      }
      blobToDataUrl(blob, function (dataUrl) { done(dataUrl || null); });
    });
  }

  function hydrateBook(sb, childId, book, done) {
    if (!book) {
      done(null);
      return;
    }
    var copy = JSON.parse(JSON.stringify(book));
    var pending = 1;
    function finish() {
      pending -= 1;
      if (pending === 0) done(copy);
    }
    function fill(value, assign) {
      if (!markerRelative(value)) return;
      pending += 1;
      hydrateValue(sb, childId, value, function (dataUrl) {
        assign(dataUrl);
        finish();
      });
    }
    if (Array.isArray(copy.pages)) {
      copy.pages.forEach(function (page) {
        if (!page) return;
        fill(page.imageUrlFallback, function (dataUrl) {
          page.imageDataUrl = dataUrl;
          page.imageUrlFallback = dataUrl;
        });
        fill(page.imageDataUrl, function (dataUrl) {
          page.imageDataUrl = dataUrl;
          page.imageUrlFallback = dataUrl;
        });
      });
    }
    fill(copy.sceneUrlFallback, function (dataUrl) {
      copy.sceneDataUrl = dataUrl;
      copy.sceneUrlFallback = dataUrl;
    });
    fill(copy.sceneDataUrl, function (dataUrl) {
      copy.sceneDataUrl = dataUrl;
      copy.sceneUrlFallback = dataUrl;
    });
    finish();
  }

  function reserve(kind) {
    var key = newKey();
    return new Promise(function (resolve) {
      rpc("reserve_child_creation", { p_kind: kind, p_key: key }, function (err, data) {
        if (err || !data) {
          resolve({ allowed: false, reason: "unavailable" });
          return;
        }
        if (!data.key) data.key = key;
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
      var shelf = Array.isArray(data.shelf) ? data.shelf : [];
      client(function (sb) {
        profileId(function (idErr, childId) {
          if (!sb || idErr) {
            cb(null, shelf);
            return;
          }
          var hydrated = [];
          eachSeries(shelf, function (book, index, next) {
            hydrateBook(sb, childId, book, function (item) {
              hydrated[index] = item;
              next(null);
            });
          }, function () { cb(null, hydrated); });
        });
      });
    });
  }

  function uploadShelf(rawJsonString, key, cb) {
    var shelf = [];
    try { shelf = JSON.parse(rawJsonString); } catch (e) {
      cb(new Error("shelf_invalid"));
      return;
    }
    if (!Array.isArray(shelf)) {
      cb(new Error("shelf_invalid"));
      return;
    }
    client(function (sb) {
      if (!sb) {
        cb(new Error("unavailable"));
        return;
      }
      profileId(function (err, childId) {
        if (err) {
          cb(err);
          return;
        }
        var slim = [];
        eachSeries(shelf, function (book, index, next) {
          stripBook(sb, childId, book, function (stripErr, copy) {
            if (stripErr) {
              next(stripErr);
              return;
            }
            slim[index] = copy;
            next(null);
          });
        }, function (seriesErr) {
          if (seriesErr) {
            cb(seriesErr);
            return;
          }
          rpc("save_child_shelf", { p_shelf: slim, p_key: key || "" }, function (saveErr, data) {
            if (saveErr || !data || data.allowed !== true) {
              cb(saveErr || new Error((data && data.reason) || "allowance"));
              return;
            }
            cb(null);
          });
        });
      });
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

  function storeCharacterArt(id, blob, cb) {
    if (!safeId(id) || !blob) {
      cb(new Error("picture_invalid"));
      return;
    }
    client(function (sb) {
      profileId(function (err, childId) {
        if (!sb || err) {
          cb(err || new Error("unavailable"));
          return;
        }
        putObject(sb, childId + "/characters/" + id + ".png", blob, blob.type || "image/png", cb);
      });
    });
  }

  function localArtUrl(relative, cb) {
    var path = markerRelative(MARKER + String(relative || ""));
    if (!path) {
      cb(new Error("picture_invalid"), null);
      return;
    }
    client(function (sb) {
      profileId(function (err, childId) {
        if (!sb || err) {
          cb(err || new Error("unavailable"), null);
          return;
        }
        getObject(sb, childId + "/" + path, function (getErr, blob) {
          if (getErr || !blob) {
            cb(getErr || new Error("missing"), null);
            return;
          }
          cb(null, global.URL.createObjectURL(blob));
        });
      });
    });
  }

  function characterArtUrl(id, cb) {
    localArtUrl("characters/" + id + ".png", cb);
  }

  function loadOwnedBook(childId, bookId, cb) {
    if (!safeId(bookId)) {
      cb(new Error("book_invalid"), null);
      return;
    }
    client(function (sb) {
      if (!sb) {
        cb(new Error("unavailable"), null);
        return;
      }
      getObject(sb, childId + "/books/" + bookId + ".json", function (err, blob) {
        if (err || !blob) {
          cb(err || new Error("missing"), null);
          return;
        }
        var reader = new global.FileReader();
        reader.onload = function () {
          var book = null;
          try { book = JSON.parse(String(reader.result || "")); } catch (e) { book = null; }
          if (!book) {
            cb(new Error("book_invalid"), null);
            return;
          }
          hydrateBook(sb, childId, book, function (item) { cb(null, item); });
        };
        reader.onerror = function () { cb(new Error("book_invalid"), null); };
        reader.readAsText(blob);
      });
    });
  }

  function loadSharedBook(shareId, cb) {
    if (!safeId(shareId)) {
      cb(new Error("share_invalid"), null);
      return;
    }
    profileId(function (err, childId) {
      if (err) {
        cb(err, null);
        return;
      }
      client(function (sb) {
        if (!sb) {
          cb(new Error("unavailable"), null);
          return;
        }
        getObject(sb, childId + "/shared/" + shareId + "/book.json", function (getErr, blob) {
          if (getErr || !blob) {
            cb(getErr || new Error("missing"), null);
            return;
          }
          var reader = new global.FileReader();
          reader.onload = function () {
            var parsed = null;
            try { parsed = JSON.parse(String(reader.result || "")); } catch (e) { parsed = null; }
            if (!parsed) {
              cb(new Error("book_invalid"), null);
              return;
            }
            hydrateBook(sb, childId, parsed, function (item) { cb(null, item); });
          };
          reader.onerror = function () { cb(new Error("book_invalid"), null); };
          reader.readAsText(blob);
        });
      });
    });
  }

  function storeSharedPackage(childId, shareId, book, characterBlob, cb) {
    if (!safeId(shareId)) {
      cb(new Error("share_invalid"));
      return;
    }
    client(function (sb) {
      if (!sb) {
        cb(new Error("unavailable"));
        return;
      }
      if (characterBlob) {
        putObject(sb, childId + "/shared/" + shareId + "/character.png", characterBlob, characterBlob.type || "image/png", function (err) {
          if (err) {
            cb(err);
            return;
          }
          putObject(sb, childId + "/shared/" + shareId + "/cover.jpg", characterBlob, characterBlob.type || "image/jpeg", function (coverErr) {
            cb(coverErr);
          });
        });
        return;
      }
      var copy = JSON.parse(JSON.stringify(book || {}));
      copy.id = copy.id || shareId;
      var jobs = [];
      var shareBlocked = "";
      function queue(value, assign) {
        if (typeof value !== "string" || !value) return;
        if (value.indexOf(MARKER) === 0) return;
        if (value.indexOf("data:image/") !== 0 && !copyableStorybookUrl(value)) {
          if (/^https?:\/\//i.test(value) || value.indexOf("data:") === 0) shareBlocked = "public_picture";
          return;
        }
        var relative = "shared/" + shareId + "/p" + jobs.length + ".jpg";
        jobs.push({ source: value, relative: relative, assign: assign });
      }
      if (Array.isArray(copy.pages)) {
        copy.pages.forEach(function (page) {
          if (!page) return;
          queue(page.imageDataUrl || page.imageUrl || page.imageUrlFallback, function (marker) {
            page.imageDataUrl = null;
            page.imageUrl = null;
            page.imageUrlFallback = marker;
          });
        });
      }
      queue(copy.sceneDataUrl, function (marker) {
        copy.sceneDataUrl = null;
        copy.sceneUrlFallback = marker;
      });
      queue(copy.sceneUrlFallback, function (marker) {
        copy.sceneDataUrl = null;
        copy.sceneUrlFallback = marker;
      });
      if (shareBlocked) {
        cb(new Error(shareBlocked));
        return;
      }
      var shareCover = null;
      eachSeries(jobs, function (job, _index, next) {
        function stored(err, blob) {
          if (err) {
            next(err);
            return;
          }
          if (!shareCover && blob) shareCover = blob;
          job.assign(MARKER + job.relative);
          next(null);
        }
        if (job.source.indexOf("data:image/") === 0) {
          var blob = dataUrlToBlob(job.source);
          if (!blob) {
            next(new Error("picture_invalid"));
            return;
          }
          putObject(sb, childId + "/" + job.relative, blob, blob.type || "image/jpeg", function (err) {
            stored(err, err ? null : blob);
          });
          return;
        }
        fetchPicture(job.source, function (err, blob) {
          if (err || !blob) {
            next(err || new Error("picture_missing"));
            return;
          }
          putObject(sb, childId + "/" + job.relative, blob, blob.type || "image/jpeg", function (putErr) {
            stored(putErr, putErr ? null : blob);
          });
        });
      }, function (err) {
        if (err) {
          cb(err);
          return;
        }
        var body = new global.Blob([JSON.stringify(copy)], { type: "application/json" });
        putObject(sb, childId + "/shared/" + shareId + "/book.json", body, "application/json", function (jsonErr) {
          if (jsonErr) {
            cb(jsonErr);
            return;
          }
          if (!shareCover) {
            cb(null);
            return;
          }
          putObject(sb, childId + "/shared/" + shareId + "/cover.jpg", shareCover, shareCover.type || "image/jpeg", function (coverErr) {
            cb(coverErr);
          });
        });
      });
    });
  }

  function removeShareFiles(childId, shareId, cb) {
    if (!safeId(shareId)) {
      cb(null);
      return;
    }
    var paths = [childId + "/shared/" + shareId + "/book.json", childId + "/shared/" + shareId + "/cover.jpg", childId + "/shared/" + shareId + "/character.png"];
    var i;
    for (i = 0; i < 16; i++) paths.push(childId + "/shared/" + shareId + "/p" + i + ".jpg");
    client(function (sb) {
      if (!sb) {
        cb(null);
        return;
      }
      removeObjects(sb, paths, cb);
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
    setFavourite: setFavourite,
    storeCharacterArt: storeCharacterArt,
    characterArtUrl: characterArtUrl,
    localArtUrl: localArtUrl,
    loadOwnedBook: loadOwnedBook,
    loadSharedBook: loadSharedBook,
    storeSharedPackage: storeSharedPackage,
    removeShareFiles: removeShareFiles
  };
})(typeof window !== "undefined" ? window : globalThis);
