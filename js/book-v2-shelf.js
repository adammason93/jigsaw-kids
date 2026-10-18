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
    if (result.composition && result.composition.schema === "wondii-composition/1") {
      book.composition = result.composition;
    }
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

  function pageReady(page) {
    return !!(page && String(page.text || page.prose || "").trim() && privatePicture(imageOf(page)));
  }

  function hasStoryPages(book) {
    return (book.pages || []).some(function (page) {
      return page && String(page.text || page.prose || "").trim();
    });
  }

  /* An empty saved idea can be filled in. A book that already has pages cannot. */
  function replaceablePlan(book) {
    if (!book || book.recordKind === "book" || book.generated === true) return false;
    if (hasStoryPages(book)) return false;
    return book.recordKind === "plan" || book.status === "saved-plan";
  }

  function carryPlan(book, plan) {
    book.id = plan.id || book.id;
    var credit = authorCredit(plan.author || "");
    if (credit) book.author = credit;
    if (plan.request && typeof plan.request === "object") book.request = plan.request;
    if (plan.resume && typeof plan.resume === "object") book.resume = plan.resume;
    if (plan.ownerUserId) book.ownerUserId = plan.ownerUserId;
    if (plan.ownerId) book.ownerId = plan.ownerId;
    if (plan.childId) book.childId = plan.childId;
    if (plan.request && plan.request.length) book.storyLength = String(plan.request.length);
    return book;
  }

  function markComplete(book) {
    var pages = book.pages || [];
    var wanted = Number(book.pageCount || 0);
    if (!pages.length || (wanted > 0 && pages.length !== wanted) || !pages.every(pageReady)) return false;
    book.generated = true;
    book.recordKind = "book";
    book.openable = true;
    book.simulated = false;
    book.status = "saved";
    book.savedAt = new Date().toISOString();
    return true;
  }

  function restoreShelf(store, owner, previous) {
    try { store.writeShelf(owner.userId, previous); } catch (_error) { /* the previous shelf stays */ }
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

    var previous = (store.readShelf(owner.userId) || []).slice();
    var existing = previous.filter(function (book) {
      return book && book.creationKey === key;
    })[0];
    if (existing && !replaceablePlan(existing)) {
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

    var id = existing && existing.id ? existing.id : bookId(owner, key);
    var book = toShelf(source.result, id, owner, key);
    if (existing) carryPlan(book, existing);
    if (!markComplete(book)) return fail("incomplete");
    var list = previous.filter(function (item) {
      if (!item) return false;
      if (existing && (item === existing || String(item.id || "") === String(id))) return false;
      if (item.creationKey && String(item.creationKey) === key) return false;
      return true;
    });
    list.unshift(book);
    try {
      store.writeShelf(owner.userId, list);
    } catch (_error) {
      restoreShelf(store, owner, previous);
      return fail("save");
    }
    if (child) {
      if (!store.putObject) {
        if (existing) restoreShelf(store, owner, previous);
        else rollback(store, owner, id);
        return fail("unauthorised");
      }
      try {
        store.putObject(owner.childId + "/books/" + id + ".json", JSON.stringify(book));
      } catch (_error) {
        if (existing) restoreShelf(store, owner, previous);
        else rollback(store, owner, id);
        return fail("save");
      }
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
      if (existing) restoreShelf(store, owner, previous);
      else rollback(store, owner, id);
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
    if (book.recordKind === "plan" || book.status === "saved-plan") return true;
    var pages = book.pages || [];
    var hasText = pages.some(function (page) {
      return page && String(page.text || page.prose || "").trim();
    });
    if (hasText) return false;
    return book.simulated === true;
  }

  function isPlanRecord(book) {
    return isStoryPlan(book);
  }

  function authorCredit(value) {
    var name = String(value || "").replace(/\s+/g, " ").trim();
    if (!name || name.length > 40) return "";
    if (/[<>@]/.test(name)) return "";
    if (!/^[\p{L}\p{N}][\p{L}\p{N} '&.,-]*$/u.test(name)) return "";
    return name;
  }

  function resumePayload(source) {
    var raw = source && source.resume;
    if (!raw || typeof raw !== "object") return null;
    var text = "";
    try { text = JSON.stringify(raw); } catch (e) { return null; }
    if (!text || text.length > 20000 || text.indexOf("data:image") >= 0) return null;
    try { return JSON.parse(text); } catch (e2) { return null; }
  }

  /* Continue must send the cast already stored with the story.
     Rebuilding it from the character library drops the source and the portrait paths,
     and Book V2 then rejects the plan before it can claim the checkpoint. */
  function continueRequest(saved) {
    var source = saved || {};
    var members = Array.isArray(source.members) ? source.members : [];
    var ready = members.filter(function (member) {
      return member && member.id && member.name && member.source;
    });
    if (!ready.length || ready.length !== members.length) return null;
    var age = String(source.familyAgeBand || source.ageBand || "");
    if (age !== "4-6" && age !== "7-9" && age !== "10-12") return null;
    var key = String(source.creationKey || "");
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) return null;
    var body = {
      members: ready.map(function (member) {
        return { id: String(member.id), name: String(member.name), source: String(member.source) };
      }),
      savedReferences: Array.isArray(source.savedReferences) ? source.savedReferences.slice() : [],
      sharedCharacters: Array.isArray(source.sharedCharacters) ? source.sharedCharacters.slice() : [],
      idea: String(source.idea || "").trim(),
      place: String(source.place || "library"),
      length: String(source.length || "medium"),
      theme: String(source.theme || "Adventure"),
      familyAgeBand: age,
      authorDisplay: String(source.authorDisplay || ""),
      creationKey: key,
      approveGeneration: false,
      background: true,
      continueJob: true,
      watch: false
    };
    if (source.pageCount) body.pageCount = source.pageCount;
    return body;
  }

  /* A reopened story must keep the cast that was saved with it.
     An empty source means the character library had not loaded, not that the
     child changed the story. */
  function castFromResume(saved) {
    var source = saved || {};
    var members = Array.isArray(source.members) ? source.members : [];
    var ready = [];
    members.forEach(function (member) {
      if (!member || !member.id || !member.name || !member.source) return;
      ready.push({
        id: String(member.id),
        name: String(member.name),
        source: String(member.source)
      });
    });
    if (!ready.length || ready.length !== members.length) return null;
    var references = Array.isArray(source.savedReferences) ? source.savedReferences.filter(function (row) {
      return row && row.id && row.reference && row.ownerId;
    }) : [];
    return { members: ready, savedReferences: references };
  }

  /* A saved family character is only ready when its private portrait path
     is still attached. A source label on its own is not enough. */
  function completeCast(saved) {
    var cast = castFromResume(saved);
    if (!cast) return null;
    var covered = cast.members.every(function (member) {
      if (member.source !== "saved") return true;
      return cast.savedReferences.some(function (row) {
        return row.id === member.id && row.reference && row.ownerId;
      });
    });
    return covered ? cast : null;
  }

  /* Reopening must not keep a session copy that lost the portraits when
     the shelf still has them. A complete session copy is an intentional edit. */
  function preferResume(session, shelfResume) {
    if (completeCast(session)) return session;
    if (completeCast(shelfResume)) return shelfResume;
    return session || shelfResume || null;
  }

  function keepCast(previous, incoming) {
    var next = Object.assign({}, incoming || {});
    var prior = completeCast(previous);
    if (!prior || completeCast(next)) return next;
    var nextIds = (Array.isArray(next.members) ? next.members : []).map(function (member) {
      return String(member && member.id || member || "");
    }).join("\n");
    var priorIds = prior.members.map(function (member) { return member.id; }).join("\n");
    if (nextIds && nextIds !== priorIds) return next;
    next.members = prior.members;
    next.savedReferences = prior.savedReferences;
    return next;
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
    var previous = null;
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
        if (!replaced) {
          replaced = true;
          previous = book;
        }
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
      author: authorCredit(source.authorDisplay || source.author || ""),
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
    var resume = resumePayload(source);
    if (resume && previous && previous.resume) resume = keepCast(previous.resume, resume);
    if (resume) planned.resume = resume;
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
    authorCredit: authorCredit,
    castFromResume: castFromResume,
    completeCast: completeCast,
    preferResume: preferResume,
    continueRequest: continueRequest,
    placePlan: placePlan,
    mergeOwned: mergeOwned,
    memoryStore: memoryStore,
    memoryAllowance: memoryAllowance
  };
});
