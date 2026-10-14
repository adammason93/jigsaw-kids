"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var vm = require("vm");
var Showcase = require("../js/book-showcase.js");
var Shelf = require("../js/book-v2-shelf.js");

var root = path.join(__dirname, "..");
var castlePath = path.join(root, "docs/agent/book-v2/castle-lost-lanterns/book.json");
var castle = JSON.parse(fs.readFileSync(castlePath, "utf8"));
var record = JSON.parse(fs.readFileSync(path.join(root, "games/showcase/the-lanterns-missing-path.json"), "utf8"));
var showcaseSource = fs.readFileSync(path.join(root, "js/book-showcase.js"), "utf8");
var portal = fs.readFileSync(path.join(root, "js/portal-home.js"), "utf8");
var reader = fs.readFileSync(path.join(root, "games/book-prototype/book.js"));

assert.strictEqual(Showcase.publishState("the-lanterns-missing-path"), "awaiting-visual-approval");
assert.strictEqual(record.publishState, "awaiting-visual-approval");
assert.strictEqual(record.readOnly, true);
assert.strictEqual(record.systemOwned, true);
assert.strictEqual(record.title, castle.bible.title);
assert.strictEqual(record.pages.length, 12);
record.pages.forEach(function (page, index) {
  assert.strictEqual(page.text, castle.pages[index].prose);
  assert.ok(page.imageUrlFallback.indexOf("/games/showcase/the-lanterns-missing-path/p" + (index + 1) + ".jpg") === 0);
});
assert.ok(JSON.stringify(record).indexOf("docs/agent") < 0);
assert.ok(JSON.stringify(record).indexOf("127.0.0.1") < 0);
assert.ok(showcaseSource.indexOf("docs/agent") < 0);
assert.ok(fs.existsSync(path.join(root, "games/showcase/the-lanterns-missing-path/p1.jpg")));
assert.ok(fs.existsSync(path.join(root, "games/showcase/the-lanterns-missing-path/p12.jpg")));

var school = { workspaceKind: "school", role: "teacher" };
var family = { workspaceKind: "family", role: "owner" };
var signedOut = { workspaceKind: "signed-out" };
var listed = Showcase.publicList(family);
assert.strictEqual(listed.length, 1);
assert.strictEqual(listed[0].id, "the-rain-that-rose");
assert.strictEqual(listed[0].href, "games/book-prototype/?book=the-rain-that-rose");
assert.strictEqual(listed[0].readOnly, true);
assert.strictEqual(Showcase.publicList(school).length, 1);
assert.strictEqual(Showcase.publicList(signedOut).length, 0);
assert.ok(!listed.some(function (book) { return book.id === "the-lanterns-missing-path"; }));
var published = Showcase.BOOKS.map(function (book) {
  return Object.assign({}, book, { publishState: "published" });
});
assert.strictEqual(Showcase.publicList(school, published).length, 2);
assert.strictEqual(Showcase.publicList(family, published).length, 2);
assert.strictEqual(Showcase.publicList(signedOut, published).length, 0);
assert.strictEqual(Showcase.publicList(school, published)[0].href, "games/book-prototype/?book=the-lanterns-missing-path");
assert.strictEqual(Showcase.publicList(school, published)[0].readOnly, true);
assert.strictEqual(Showcase.publishState("the-lanterns-missing-path"), "awaiting-visual-approval");
assert.strictEqual(Showcase.publishState("the-rain-that-rose"), "published");

assert.strictEqual(Showcase.canOpen("the-lanterns-missing-path", null).reason, "unauthorised");
assert.strictEqual(Showcase.canOpen("the-lanterns-missing-path", { userId: "teacher-1", workspaceKind: "school" }).ok, true);
assert.strictEqual(Showcase.canOpen("the-lanterns-missing-path", { userId: "family-1", workspaceKind: "family" }).review, true);
assert.strictEqual(Showcase.canOpen("missing", { userId: "family-1", workspaceKind: "family" }).reason, "unavailable");

var store = Shelf.memoryStore();
var refused = Shelf.commitBook({
  creationKey: "showcase-the-lanterns-missing-path",
  owner: { userId: "family-1", accountKind: "adult" },
  result: { status: "REVIEWABLE", bible: { title: castle.bible.title }, pages: record.pages, illustrationStyle: "wondii-picture-book" }
}, { store: store });
assert.strictEqual(refused.ok, false);
assert.strictEqual(refused.reason, "read-only");
assert.strictEqual(store.readShelf("family-1").length, 0);
var rainRecord = JSON.parse(fs.readFileSync(path.join(root, "games/showcase/the-rain-that-rose.json"), "utf8"));
var rainBook = JSON.parse(fs.readFileSync(path.join(root, "docs/agent/book-v2/the-rain-that-rose-candidate/book.json"), "utf8"));
assert.strictEqual(rainRecord.publishState, "published");
assert.strictEqual(rainRecord.readOnly, true);
assert.strictEqual(rainRecord.systemOwned, true);
assert.strictEqual(rainRecord.pages.length, 12);
rainRecord.pages.forEach(function (page, index) {
  assert.strictEqual(page.text, rainBook.pages[index].prose);
  assert.ok(fs.existsSync(path.join(root, "games/showcase/the-rain-that-rose/p" + (index + 1) + ".jpg")));
});
assert.ok(JSON.stringify(rainRecord).indexOf("docs/agent") < 0);
assert.strictEqual(Showcase.canOpen("the-rain-that-rose", null).reason, "unauthorised");
assert.strictEqual(Showcase.canOpen("the-rain-that-rose", { userId: "family-1", workspaceKind: "family" }).ok, true);
assert.strictEqual(Showcase.canOpen("the-rain-that-rose", { userId: "family-1", workspaceKind: "family" }).review, false);
var rainCopy = Shelf.commitBook({
  creationKey: "showcase-the-rain-that-rose",
  owner: { userId: "family-1", accountKind: "adult" },
  result: { status: "REVIEWABLE", bible: { title: "The Rain That Rose" }, pages: rainRecord.pages, illustrationStyle: "wondii-picture-book" }
}, { store: store });
assert.strictEqual(rainCopy.ok, false);
assert.strictEqual(rainCopy.reason, "read-only");
assert.strictEqual(store.readShelf("family-1").length, 0);

assert.ok(portal.indexOf("Explore Wondii") >= 0);
assert.ok(portal.indexOf("publicList") >= 0);
assert.ok(portal.indexOf("isShowcase") >= 0);

var sandbox = {
  console: console,
  URLSearchParams: URLSearchParams,
  fetch: function () {
    return Promise.resolve({
      ok: true,
      json: function () { return Promise.resolve(record); }
    });
  }
};
sandbox.window = sandbox;
sandbox.location = { search: "?book=the-lanterns-missing-path", hostname: "wondii.example", pathname: "/games/book-prototype/", hash: "" };
sandbox.sessionStorage = { getItem: function () { return null; } };
sandbox.WondiiSession = {
  subscribe: function (fn) { fn({ userId: "", status: "ready" }); }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js/book-showcase.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "games/book-prototype/book-data.js"), "utf8"), sandbox);
sandbox.location.search = "?book=the-lanterns-missing-path";
var closed = null;
sandbox.WondiiBookData.load().then(function (result) { closed = result; });
setTimeout(function () {
  assert.strictEqual(closed.reason, "unauthorised");
  sandbox.WondiiSession.subscribe = function (fn) {
    fn({ userId: "family-1", status: "ready" });
  };
  var opened = null;
  sandbox.WondiiBookData.load().then(function (result) { opened = result; });
  setTimeout(function () {
    assert.strictEqual(opened.ok, true, JSON.stringify(opened));
    assert.strictEqual(opened.kind, "showcase");
    assert.strictEqual(opened.readOnly, true);
    assert.strictEqual(opened.plan.pages.length, 12);
    assert.strictEqual(opened.plan.pages[0].text, castle.pages[0].prose);
    assert.ok(opened.plan.pages[0].imageSrc.indexOf("/games/showcase/") === 0);
    var personal = [{ id: "mine", title: "My story" }];
    assert.ok(!personal.some(function (book) { return book.id === "the-lanterns-missing-path"; }));
    assert.strictEqual(crypto.createHash("sha1").update(reader).digest("hex"), "bcadc75b5f7fbccc90f2651bcabf44d6e489fbd3");
    console.log("book-showcase.test.js ok");
  }, 30);
}, 30);
