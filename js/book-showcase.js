/* One system-owned demonstration book.
   It is not copied onto personal shelves. Public listing waits for visual approval. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WondiiBookShowcase = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var BOOKS = [
    {
      id: "the-lanterns-missing-path",
      title: "The Lantern’s Missing Path",
      blurb: "Maya and Leo follow a missing light through an old castle.",
      publishState: "awaiting-visual-approval",
      readOnly: true,
      systemOwned: true,
      creationKey: "showcase-the-lanterns-missing-path",
      readerHref: "games/book-prototype/?book=the-lanterns-missing-path",
      recordUrl: "/games/showcase/the-lanterns-missing-path.json",
      cover: "/games/showcase/the-lanterns-missing-path/p1.jpg"
    },
    {
      id: "the-rain-that-rose",
      title: "The Rain That Rose",
      blurb: "Maya and Leo follow the rain that rises behind a waterfall.",
      publishState: "published",
      readOnly: true,
      systemOwned: true,
      creationKey: "showcase-the-rain-that-rose",
      readerHref: "games/book-prototype/?book=the-rain-that-rose",
      recordUrl: "/games/showcase/the-rain-that-rose.json",
      cover: "/games/showcase/the-rain-that-rose/p1.jpg"
    }
  ];

  function find(id) {
    var wanted = String(id || "");
    var found = null;
    BOOKS.forEach(function (book) {
      if (book.id === wanted) found = book;
    });
    return found;
  }

  function signedIn(viewer) {
    var who = viewer || {};
    if (!who.userId) return false;
    return who.workspaceKind === "school" || who.workspaceKind === "family";
  }

  function canPreview(viewer) {
    var who = viewer || {};
    if (!signedIn(who)) return false;
    if (who.canPreviewUnpublished === true) return true;
    return who.workspaceKind === "school" && (who.role === "school_admin" || who.role === "owner");
  }

  function canOpen(id, viewer) {
    var book = find(id);
    if (!book) return { ok: false, reason: "unavailable" };
    if (!signedIn(viewer)) return { ok: false, reason: "unauthorised" };
    if (book.publishState === "published") return { ok: true, review: false, book: book };
    if (book.publishState === "awaiting-visual-approval" && canPreview(viewer)) {
      return { ok: true, review: true, book: book };
    }
    if (book.publishState === "awaiting-visual-approval") return { ok: false, reason: "unpublished" };
    return { ok: false, reason: "unavailable" };
  }

  function card(book) {
    return {
      id: book.id,
      type: "Example",
      title: book.title,
      meta: "Read-only preview",
      href: book.readerHref,
      cover: book.cover,
      action: "Read",
      readOnly: true,
      systemOwned: true,
      publishState: book.publishState
    };
  }

  function publicList(caps, records) {
    var who = caps || {};
    if (who.workspaceKind !== "school" && who.workspaceKind !== "family") return [];
    return (records || BOOKS).filter(function (book) {
      return book && book.publishState === "published" && book.systemOwned === true;
    }).map(function (book) {
      var item = card(book);
      item.meta = "Available to read";
      item.action = "Read book";
      return item;
    });
  }

  /* Stories shelf. Published books are readable. An unpublished book is visible,
     but only a school admin can open it. */
  function storyShelf(viewer) {
    if (!signedIn(viewer)) return [];
    var preview = canPreview(viewer);
    return BOOKS.filter(function (book) {
      return book.publishState === "published" || book.publishState === "awaiting-visual-approval";
    }).map(function (book) {
      var item = card(book);
      if (book.publishState === "published") {
        item.meta = "Available to read";
        item.action = "Read book";
        return item;
      }
      item.meta = "Awaiting approval";
      if (preview) {
        item.action = "Preview";
        return item;
      }
      item.action = "";
      item.href = "";
      return item;
    });
  }

  function isShowcase(id) {
    return !!find(id);
  }

  function reservedKey(key) {
    return BOOKS.some(function (book) { return book.creationKey === key; });
  }

  function publishState(id) {
    var book = find(id);
    return book ? book.publishState : "";
  }

  function recordUrl(id) {
    var book = find(id);
    return book ? book.recordUrl : "";
  }

  return {
    BOOKS: BOOKS,
    find: find,
    canOpen: canOpen,
    publicList: publicList,
    storyShelf: storyShelf,
    canPreview: canPreview,
    isShowcase: isShowcase,
    reservedKey: reservedKey,
    publishState: publishState,
    recordUrl: recordUrl
  };
});
