/* Turns a saved Wondii book into the content the 3D reader already draws.
   It does not draw, animate, or store books. A book id is accepted only from
   the signed-in shelf, a parent's read of that child's book, a child's
   shared copy, or a system showcase book the viewer is allowed to open.
   sample=1 and demo=1 open The Rain That Rose. A failed load never becomes
   the old prototype sample. */
(function (root) {
  "use strict";

  var COPY = {
    missing: "This link does not name a book.",
    unauthorised: "Sign in to open this book. It stays on the account that saved it.",
    unavailable: "This book is not on your shelf.",
    unpublished: "This book is not available to read yet.",
    file: "This book could not be opened. The book file did not load.",
    pictures: "This book could not be opened. Its pictures did not load.",
    closed: "This book could not be opened.",
    empty: "This book has no pages yet.",
    plan: "This story idea is saved. The illustrated book has not been made yet."
  };

  function isStoryPlan(book) {
    if (!book || book.generated === true || book.recordKind === "book") return false;
    return book.recordKind === "plan" || book.simulated === true;
  }

  function prepareReader() {
    var params;
    try {
      params = new URLSearchParams(root.location.search);
    } catch (e) {
      return;
    }
    if (params.has("book")) return;
    if (params.get("sample") === "1" || params.get("demo") === "1") return;
    params.set("book", "");
    var path = root.location.pathname || "";
    var hash = root.location.hash || "";
    var next = path + "?" + params.toString() + hash;
    if (root.history && root.history.replaceState) {
      root.history.replaceState(null, "", next);
    }
  }

  function requestedId() {
    var params;
    try {
      params = new URLSearchParams(root.location.search);
    } catch (e) {
      return null;
    }
    if (!params.has("book")) return null;
    return String(params.get("book") || "").trim();
  }

  function sampleRequested() {
    try {
      var params = new URLSearchParams(root.location.search);
      return params.get("sample") === "1" || params.get("demo") === "1";
    } catch (e) {
      return false;
    }
  }

  /* The old sample flag opened prototype art that is not on the public site.
     It now opens the published showcase book instead. */
  function showcaseRequest() {
    var id = requestedId();
    if (id) return id;
    if (sampleRequested()) return "the-rain-that-rose";
    return "";
  }

  function classify(id, userId, books) {
    if (id == null) return { ok: true, kind: "sample" };
    if (!String(id).trim()) return { ok: false, reason: "missing" };
    if (!userId) return { ok: false, reason: "unauthorised" };
    var list = Array.isArray(books) ? books : [];
    var found = null;
    var wanted = String(id);
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === wanted) found = list[i];
    }
    if (!found) return { ok: false, reason: "unavailable" };
    if (isStoryPlan(found)) return { ok: false, reason: "plan" };
    if (!found.pages || !found.pages.length) return { ok: false, reason: "empty" };
    return { ok: true, kind: "saved", book: found };
  }

  function pageImage(page) {
    if (!page) return "";
    var inline = page.imageDataUrl ? String(page.imageDataUrl) : "";
    var fallback = page.imageUrlFallback ? String(page.imageUrlFallback) : "";
    return inline || fallback;
  }

  function plan(book) {
    var source = book || {};
    var pages = (source.pages || []).map(function (page, index) {
      var src = pageImage(page);
      return {
        number: index + 1,
        text: page && page.text ? String(page.text) : "",
        imageSrc: src,
        missingArt: !src,
        shot: page && (page.shot || page.shotType) ? String(page.shot || page.shotType) : "",
        phase: page && (page.phase || page.narrativePhase) ? String(page.phase || page.narrativePhase) : "",
        layoutIntent: page && page.layoutIntent ? String(page.layoutIntent) : "",
        textSafeZones: page && page.textSafeZones ? page.textSafeZones : null,
        impactWords: page && page.impactWords ? page.impactWords : null,
        textBlocks: page && page.textBlocks ? page.textBlocks : null
      };
    });
    var coverSrc = source.sceneDataUrl ? String(source.sceneDataUrl) : "";
    if (!coverSrc && source.sceneUrlFallback) coverSrc = String(source.sceneUrlFallback);
    if (!coverSrc && pages[0] && pages[0].imageSrc) coverSrc = pages[0].imageSrc;
    return {
      id: String(source.id || ""),
      title: String(source.title || "Untitled story"),
      author: String(source.author || "Wondii"),
      kicker: "A Wondii Adventure",
      coverSrc: coverSrc,
      pages: pages,
      atmosphere: source.atmosphere || null,
      readerArtLayout: source.readerArtLayout || "",
      storyTextMode: source.storyTextMode || "",
      storyLength: source.storyLength || "",
      spreadCount: 1 + Math.ceil(pages.length / 2)
    };
  }

  function localFixture() {
    var host = "";
    try { host = String(root.location.hostname || ""); } catch (e) { return null; }
    if (host !== "127.0.0.1" && host !== "localhost") return null;
    var raw = "";
    try { raw = root.sessionStorage.getItem("wondii-reader-fixture") || ""; } catch (e2) { return null; }
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      if (!data || data.userId !== "local-fixture" || !Array.isArray(data.books)) return null;
      return data;
    } catch (e3) {
      return null;
    }
  }

  function whenSession() {
    return new Promise(function (resolve) {
      var Session = root.WondiiSession;
      if (!Session || !Session.subscribe) {
        resolve({ userId: "", status: "missing" });
        return;
      }
      var settled = false;
      function finish(view) {
        if (settled) return;
        if (!view || view.status === "initialising") return;
        settled = true;
        resolve(view);
      }
      Session.subscribe(finish);
      root.setTimeout(function () {
        if (settled) return;
        settled = true;
        resolve(Session.get ? Session.get() : { userId: "", status: "timeout" });
      }, 8000);
    });
  }

  function searchParams() {
    try {
      return new URLSearchParams(root.location.search);
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function childParam() {
    return String(searchParams().get("child") || "").trim();
  }

  function sharedRequested() {
    var value = String(searchParams().get("shared") || "").trim();
    return value === "1" || value === "true";
  }

  function childSession() {
    var lib = root.ChildLibrary;
    return !!(lib && lib.isChildSession && lib.isChildSession());
  }

  function waitForShelf() {
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve();
      }
      root.addEventListener("kids-scorecard-refresh", finish, { once: true });
      root.addEventListener("kids-storybook-merge-failed", finish, { once: true });
      root.setTimeout(finish, 8000);
    });
  }

  function fromLibrary(loader) {
    return new Promise(function (resolve) {
      var settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        resolve(result);
      }
      root.setTimeout(function () {
        finish({ ok: false, reason: "closed" });
      }, 12000);
      try {
        loader(function (err, item) {
          if (err || !item) {
            finish({ ok: false, reason: "closed" });
            return;
          }
          if (isStoryPlan(item)) {
            finish({ ok: false, reason: "plan" });
            return;
          }
          var reading = plan(item);
          if (!reading.pages.length) {
            finish({ ok: false, reason: "empty" });
            return;
          }
          finish({ ok: true, kind: "saved", plan: reading });
        });
      } catch (e) {
        finish({ ok: false, reason: "closed" });
      }
    });
  }

  function loadShelf(userId, id) {
    var store = root.StorybookShelfStore;
    if (!userId || !store || typeof store.getVisibleJson !== "function") {
      return Promise.resolve({ ok: false, reason: "unauthorised" });
    }
    var bound = store.currentUserId ? String(store.currentUserId() || "") : "";
    if (bound && bound !== userId) return Promise.resolve({ ok: false, reason: "unauthorised" });
    return store.getVisibleJson().then(function (books) {
      var decision = classify(id, userId, books);
      if (!decision.ok) return decision;
      return { ok: true, kind: "saved", plan: plan(decision.book) };
    }).catch(function () {
      return { ok: false, reason: "unavailable" };
    });
  }

  function viewerFrom(view, fixture) {
    if (view && view.userId) {
      var school = !!(view.organisation || view.organisationId || view.workspaceKind === "school");
      return { userId: String(view.userId), workspaceKind: school ? "school" : "family" };
    }
    if (fixture && fixture.userId) return { userId: String(fixture.userId), workspaceKind: "family" };
    return null;
  }

  function previewViewer(id, viewer) {
    var Showcase = root.WondiiBookShowcase;
    if (!viewer || !viewer.userId || !Showcase || Showcase.publishState(id) !== "awaiting-visual-approval") {
      return Promise.resolve(viewer);
    }
    var session = root.WondiiSession;
    var client = session && typeof session.current === "function" ? session.current() : null;
    if (!client || typeof client.from !== "function") return Promise.resolve(viewer);
    return client.from("organisation_members").select("role").eq("user_id", viewer.userId).eq("status", "active").then(function (res) {
      var rows = (res && res.data) || [];
      var role = "";
      rows.forEach(function (row) {
        if (row && (row.role === "owner" || row.role === "school_admin")) role = row.role;
      });
      if (!role) return viewer;
      return { userId: viewer.userId, workspaceKind: "school", role: role };
    }).catch(function () {
      return viewer;
    });
  }

  function loadShowcase(id, viewer) {
    var Showcase = root.WondiiBookShowcase;
    return previewViewer(id, viewer).then(function (who) {
      var gate = Showcase.canOpen(id, who);
      if (!gate.ok) return { ok: false, reason: gate.reason };
      return fetch(Showcase.recordUrl(id), { cache: "no-store" }).then(function (res) {
        if (!res.ok) return { ok: false, reason: "file" };
        return res.json().then(function (record) {
          if (!record || record.id !== id || record.readOnly !== true) return { ok: false, reason: "unavailable" };
          if (record.publishState !== Showcase.publishState(id)) return { ok: false, reason: "unavailable" };
          var reading = plan(record);
          if (!reading.pages.length) return { ok: false, reason: "empty" };
          return { ok: true, kind: "showcase", plan: reading, readOnly: true };
        }).catch(function () {
          return { ok: false, reason: "file" };
        });
      }).catch(function () {
        return { ok: false, reason: "file" };
      });
    });
  }

  function load() {
    var id = requestedId();
    if ((id == null || !id) && sampleRequested()) id = "the-rain-that-rose";
    if (id == null) return Promise.resolve({ ok: true, kind: "sample" });
    if (!id) return Promise.resolve({ ok: false, reason: "missing" });
    if (root.WondiiBookShowcase && root.WondiiBookShowcase.isShowcase(id)) {
      return whenSession().then(function (view) {
        return loadShowcase(id, viewerFrom(view, localFixture()));
      });
    }
    var child = childParam();
    var shared = sharedRequested();
    return whenSession().then(function (view) {
      var fixture = localFixture();
      if (fixture && !child && !shared) {
        var local = classify(id, fixture.userId, fixture.books);
        if (local.ok) return { ok: true, kind: "saved", plan: plan(local.book), fixture: true };
      }
      var userId = view && view.userId ? String(view.userId) : "";
      if (!userId) return { ok: false, reason: "unauthorised" };
      if (child) {
        if (childSession() || !root.ChildLibrary || !root.ChildLibrary.loadOwnedBook) {
          return { ok: false, reason: "closed" };
        }
        return fromLibrary(function (cb) {
          root.ChildLibrary.loadOwnedBook(child, id, cb);
        });
      }
      if (shared) {
        if (!childSession() || !root.ChildLibrary || !root.ChildLibrary.loadSharedBook) {
          return { ok: false, reason: "closed" };
        }
        return fromLibrary(function (cb) {
          root.ChildLibrary.loadSharedBook(id, cb);
        });
      }
      return waitForShelf().then(function () {
        return loadShelf(userId, id);
      });
    });
  }

  root.WondiiBookData = {
    prepareReader: prepareReader,
    requestedId: requestedId,
    sampleRequested: sampleRequested,
    showcaseRequest: showcaseRequest,
    classify: classify,
    plan: plan,
    load: load,
    message: function (reason) {
      return COPY[reason] || "This book could not be opened.";
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
