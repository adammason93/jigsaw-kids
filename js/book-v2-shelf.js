/* Saves one validated Book V2 book to the owner's private shelf.
   A child allowance is claimed only after that save, and only once.
   This file does not call a model, draw a picture, or open a database. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookV2Shelf = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var KEY = /^[A-Za-z0-9_-]{8,80}$/;

  function fail(reason) {
    return {
      ok: false,
      saved: false,
      claimed: false,
      duplicate: false,
      reason: reason,
      message: "Nothing was saved."
    };
  }

  function imageOf(page) {
    if (!page) return "";
    var inline = page.imageDataUrl ? String(page.imageDataUrl) : "";
    var fallback = page.imageUrlFallback ? String(page.imageUrlFallback) : "";
    return inline || fallback;
  }

  function privatePicture(value) {
    if (!value) return false;
    if (value.indexOf("data:image/") === 0) return true;
    return value.indexOf("wondii-private:") === 0;
  }

  function reviewProblem(result) {
    var book = result || {};
    if (book.status !== "REVIEWABLE") return "incomplete";
    if (book.textProblems && book.textProblems.length) return "rejected";
    if (book.storyProblems && book.storyProblems.length) return "rejected";
    if (book.illustrationStyle && book.illustrationStyle !== "wondii-picture-book") return "style";
    var title = book.bible && book.bible.title ? String(book.bible.title).trim() : "";
    if (!title) return "incomplete";
    var pages = book.pages || [];
    if (!pages.length) return "incomplete";
    var wanted = Number(book.bible && book.bible.pageCount || 0);
    if (wanted > 0 && pages.length !== wanted) return "page-count";
    var missing = pages.some(function (page) {
      return !page || !String(page.text || page.prose || "").trim() || !privatePicture(imageOf(page));
    });
    if (missing) return "incomplete";
    return "";
  }

  function shelfPages(result) {
    return (result.pages || []).map(function (page) {
      var text = String(page.text || page.prose || "");
      var image = imageOf(page);
      var inline = image.indexOf("data:image/") === 0 ? image : null;
      var stored = image.indexOf("wondii-private:") === 0 ? image : null;
      return {
        text: text,
        imageDataUrl: inline,
        imageUrlFallback: stored
      };
    });
  }

  function storedArt(art) {
    if (!art || (art.schema !== "wondii-art-direction/1" && art.schema !== "wondii-art-direction/2")) return null;
    if (!art.pages || !art.pages.length) return null;
    return {
      schema: art.schema,
      pages: art.pages,
      spreads: art.spreads || []
    };
  }

  function toShelf(result, id, owner, key) {
    var pages = shelfPages(result);
    var cover = pages[0] && (pages[0].imageDataUrl || pages[0].imageUrlFallback) || null;
    var book = {
      id: id,
      title: String(result.bible.title).trim(),
      author: "",
      readerArtLayout: "duplex",
      storyTextMode: "prose",
      storyLength: "medium",
      creationKey: key,
      ownerUserId: owner.userId,
      childId: owner.accountKind === "child" ? owner.childId : "",
      illustrationStyle: "wondii-picture-book",
      v2: true,
      pages: pages,
      sceneDataUrl: cover && cover.indexOf("data:image/") === 0 ? cover : null,
      sceneUrlFallback: cover && cover.indexOf("wondii-private:") === 0 ? cover : null
    };
    var count = Number(result.bible && result.bible.pageCount || 0);
    if (count > 0) book.pageCount = count;
    var art = storedArt(result.artDirection);
    if (art) book.artDirection = art;
    return book;
  }

  function bookId(owner, key) {
    var who = String(owner.userId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24);
    return ("b-" + who + "-" + key.replace(/[^A-Za-z0-9_-]/g, "")).slice(0, 80);
  }

  function rollback(store, owner, id) {
    var list = (store.readShelf(owner.userId) || []).filter(function (book) {
      return book && book.id !== id;
    });
    store.writeShelf(owner.userId, list);
    if (owner.accountKind === "child" && store.deleteObject) {
      store.deleteObject(owner.childId + "/books/" + id + ".json");
    }
  }

  function commitBook(input, ports) {
    var source = input || {};
    var owner = source.owner || {};
    var store = ports && ports.store;
    var allowance = ports && ports.allowance;
    var key = String(source.creationKey || "");
    if (!KEY.test(key)) return fail("allowance-key");
    if (key === "showcase-the-lanterns-missing-path" || key === "showcase-the-rain-that-rose") return fail("read-only");
    if (!owner.userId || !store || !store.readShelf || !store.writeShelf) return fail("unauthorised");
    var child = owner.accountKind === "child";
    if (child && !owner.childId) return fail("unauthorised");
    if (!child && owner.childId) return fail("wrong-shelf");

    var existing = (store.readShelf(owner.userId) || []).filter(function (book) {
      return book && book.creationKey === key;
    })[0];
    if (existing) {
      return {
        ok: true,
        saved: true,
        claimed: false,
        duplicate: true,
        reason: "already-saved",
        book: existing,
        reader: "book-prototype/?book=" + encodeURIComponent(existing.id),
        message: "This book is already on the shelf."
      };
    }

    var problem = reviewProblem(source.result);
    if (problem) return fail(problem);

    var id = bookId(owner, key);
    var book = toShelf(source.result, id, owner, key);
    var list = (store.readShelf(owner.userId) || []).slice();
    list.unshift(book);
    store.writeShelf(owner.userId, list);
    if (child) {
      if (!store.putObject) {
        rollback(store, owner, id);
        return fail("unauthorised");
      }
      store.putObject(owner.childId + "/books/" + id + ".json", JSON.stringify(book));
    }

    if (!child) {
      return {
        ok: true,
        saved: true,
        claimed: false,
        duplicate: false,
        reason: "saved",
        book: book,
        reader: "book-prototype/?book=" + encodeURIComponent(book.id),
        message: "The book is on your shelf."
      };
    }

    var claim = allowance && allowance.claim(owner.childId, key);
    if (!claim || !claim.allowed) {
      rollback(store, owner, id);
      return fail(claim && claim.reason || "allowance");
    }
    return {
      ok: true,
      saved: true,
      claimed: true,
      duplicate: false,
      reason: "saved",
      book: book,
      reader: "book-prototype/?book=" + encodeURIComponent(book.id),
      message: "The book is on your shelf."
    };
  }

  function memoryStore() {
    var shelves = {};
    var objects = {};
    return {
      readShelf: function (userId) { return shelves[userId] ? shelves[userId].slice() : []; },
      writeShelf: function (userId, books) { shelves[userId] = (books || []).slice(); },
      putObject: function (path, body) { objects[path] = body; },
      deleteObject: function (path) { delete objects[path]; },
      getObject: function (path) { return objects[path] || null; }
    };
  }

  /* Mirrors claim_child_generation: one reserved key can be claimed once.
     A second claim is already used. A refund spends the reservation. */
  function memoryAllowance() {
    var reserved = {};
    var claimed = {};
    return {
      reserve: function (childId, key) { reserved[childId + ":" + key] = "reserved"; },
      claim: function (childId, key) {
        var id = childId + ":" + key;
        if (reserved[id] !== "reserved" || claimed[id]) {
          return { allowed: false, reason: "already_used" };
        }
        claimed[id] = true;
        return { allowed: true, reason: "claimed", childId: childId, key: key };
      },
      refund: function (childId, key) {
        var id = childId + ":" + key;
        delete claimed[id];
        if (reserved[id] === "reserved") reserved[id] = "refunded";
        return { refunded: true };
      },
      claimedCount: function () { return Object.keys(claimed).length; }
    };
  }

  /* A saved plan is not a book. A finished book keeps its pages and can open. */
  function isStoryPlan(book) {
    if (!book || book.generated === true || book.recordKind === "book") return false;
    return book.recordKind === "plan" || book.simulated === true;
  }

  function isPlanRecord(book) {
    return isStoryPlan(book);
  }

  function planRequest(source, preview) {
    var request = (source && source.request) || (preview && preview.request) || {};
    var members = Array.isArray(request.members) ? request.members : [];
    return {
      idea: String(request.idea || (source && source.idea) || "").trim(),
      place: String(request.place || (source && source.place) || ""),
      theme: String(request.theme || (source && source.theme) || ""),
      length: String(request.length || (source && source.length) || ""),
      ageBand: String(request.ageBand || (source && source.ageBand) || ""),
      names: Array.isArray(request.names) ? request.names.map(function (name) { return String(name || ""); }).filter(Boolean) : [],
      members: members.map(function (member) {
        if (!member) return "";
        return String(member.id || member);
      }).filter(Boolean)
    };
  }

  /* One story plan on this account's shelf.
     A repeated key updates that plan. A different key is a new record.
     An existing book that is not this plan is left untouched. */
  function placePlan(input) {
    var source = input || {};
    var owner = source.owner || {};
    var key = String(source.creationKey || "");
    var userId = String(owner.userId || "");
    var preview = source.preview || {};
    var shelf = Array.isArray(source.shelf) ? source.shelf : [];
    if (!KEY.test(key)) return fail("allowance-key");
    if (key === "showcase-the-lanterns-missing-path" || key === "showcase-the-rain-that-rose") return fail("read-only");
    if (!userId) return fail("unauthorised");
    if (owner.accountKind === "child" && !owner.childId) return fail("unauthorised");
    if (owner.accountKind !== "child" && owner.childId) return fail("wrong-shelf");
    if (preview.generated === true) return fail("generated");
    var title = String(source.title || "").trim();
    if (!title) return fail("incomplete");
    var request = planRequest(source, preview);
    var job = source.job && typeof source.job === "object" ? {
      creationKey: key,
      accountId: userId,
      stage: "plan",
      status: "saved",
      paid: false,
      started: false,
      recoverable: true,
      attempts: Number(source.job.attempts) || 0,
      budgetUsd: 1.2,
      calls: { text: 0, image: 0, vision: 0 },
      stages: Array.isArray(source.job.stages) ? source.job.stages.slice(0, 8) : [],
      reason: String(source.job.reason || "paid-generation-not-approved")
    } : null;

    var id = bookId(owner, key);
    var snapshot = shelf.slice();
    var next = [];
    var replaced = false;
    var i;
    for (i = 0; i < shelf.length; i++) {
      var book = shelf[i];
      if (!book) continue;
      var mark = book.ownerUserId || book.ownerId || "";
      var sameKey = !!(book.creationKey && String(book.creationKey) === key);
      var sameId = String(book.id || "") === id;
      if (mark && String(mark) !== userId) {
        if (sameId || sameKey) return Object.assign(fail("occupied"), { shelf: snapshot });
        next.push(book);
        continue;
      }
      if (sameKey || sameId) {
        if (book.creationKey && String(book.creationKey) !== key) {
          return Object.assign(fail("occupied"), { shelf: snapshot });
        }
        if (!isPlanRecord(book)) {
          return {
            ok: true,
            saved: true,
            claimed: false,
            duplicate: true,
            reason: "already-saved",
            book: book,
            shelf: snapshot,
            reader: "book-prototype/?book=" + encodeURIComponent(book.id),
            message: "This book is already on the shelf."
          };
        }
        if (!replaced) replaced = true;
        continue;
      }
      next.push(book);
    }

    var planned = {
      id: id,
      recordKind: "plan",
      status: "saved-plan",
      openable: false,
      title: title,
      author: "",
      creationKey: key,
      ownerUserId: userId,
      ownerId: userId,
      childId: owner.accountKind === "child" ? owner.childId : "",
      v2: true,
      simulated: true,
      generated: false,
      savedAt: source.savedAt || new Date().toISOString(),
      request: request,
      job: job,
      pages: []
    };
    next.unshift(planned);
    return {
      ok: true,
      saved: true,
      claimed: false,
      duplicate: replaced,
      reason: replaced ? "already-saved" : "saved",
      book: planned,
      shelf: next,
      reader: "",
      message: replaced ? "This story idea is already saved." : "The story idea is saved. The illustrated book has not been made yet."
    };
  }

  /* Keep every book from the account's cloud shelf and this device.
     The newer saved copy wins when both have the same id. */
  function mergeOwned(local, cloud) {
    var map = Object.create(null);
    var order = [];
    function take(list) {
      (list || []).forEach(function (book) {
        if (!book || book.id == null || String(book.id) === "") return;
        var id = String(book.id);
        if (!Object.prototype.hasOwnProperty.call(map, id)) order.push(id);
        var prev = map[id];
        if (!prev) {
          map[id] = book;
          return;
        }
        var tPrev = Date.parse(prev.savedAt || "") || 0;
        var tNext = Date.parse(book.savedAt || "") || 0;
        if (tNext >= tPrev) map[id] = book;
      });
    }
    take(cloud);
    take(local);
    return order.map(function (id) { return map[id]; });
  }

  return {
    commitBook: commitBook,
    isStoryPlan: isStoryPlan,
    placePlan: placePlan,
    mergeOwned: mergeOwned,
    memoryStore: memoryStore,
    memoryAllowance: memoryAllowance
  };
});
