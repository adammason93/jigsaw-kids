/* Turns a saved Wondii shelf book into the content the 3D reader already draws.
   It does not draw, animate, or store books. A book id is only accepted when it
   is on the signed-in account's shelf. */
(function (root) {
  "use strict";

  var COPY = {
    missing: "This link does not name a book.",
    unauthorised: "Sign in to open this book. It stays on the account that saved it.",
    unavailable: "This book is not on your shelf.",
    empty: "This book has no pages yet."
  };

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

  function load() {
    var id = requestedId();
    if (id == null) return Promise.resolve({ ok: true, kind: "sample" });
    if (!id) return Promise.resolve({ ok: false, reason: "missing" });
    return whenSession().then(function (view) {
      var fixture = localFixture();
      if (fixture) {
        var local = classify(id, fixture.userId, fixture.books);
        if (local.ok) return { ok: true, kind: "saved", plan: plan(local.book), fixture: true };
      }
      var userId = view && view.userId ? String(view.userId) : "";
      var store = root.StorybookShelfStore;
      if (userId && store && typeof store.getVisibleJson === "function") {
        var bound = store.currentUserId ? String(store.currentUserId() || "") : "";
        if (bound && bound !== userId) return { ok: false, reason: "unauthorised" };
        return store.getVisibleJson().then(function (books) {
          var decision = classify(id, userId, books);
          if (!decision.ok) return decision;
          return { ok: true, kind: "saved", plan: plan(decision.book) };
        });
      }
      return { ok: false, reason: "unauthorised" };
    });
  }

  root.WondiiBookData = {
    requestedId: requestedId,
    classify: classify,
    plan: plan,
    load: load,
    message: function (reason) {
      return COPY[reason] || "This book could not be opened.";
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
