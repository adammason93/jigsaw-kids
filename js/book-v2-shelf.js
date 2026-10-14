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

  function toShelf(result, id, owner, key) {
    var pages = shelfPages(result);
    var cover = pages[0] && (pages[0].imageDataUrl || pages[0].imageUrlFallback) || null;
    return {
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

  return {
    commitBook: commitBook,
    memoryStore: memoryStore,
    memoryAllowance: memoryAllowance
  };
});
