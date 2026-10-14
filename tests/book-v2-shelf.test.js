"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var Shelf = require("../js/book-v2-shelf.js");
var Bible = require("../js/character-bible.js");

var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "js/book-v2-shelf.js"), "utf8");
assert.ok(source.indexOf("api.openai.com") < 0);
assert.ok(source.indexOf("OPENAI_API_KEY") < 0);

var spec = JSON.parse(fs.readFileSync(path.join(root, "docs/agent/book-v2/leo-reference-spec.json"), "utf8"));
assert.strictEqual(spec.characterId, "leo");
assert.strictEqual(spec.journeyId, "wondii-leo");
assert.strictEqual(spec.approved, false);
assert.strictEqual(spec.generated, false);
assert.strictEqual(spec.status, "specification-only");
assert.strictEqual(spec.approvedSheet, null);
assert.ok(spec.portrait.indexOf("wondii-leo.jpg") >= 0);
assert.ok(spec.portrait.indexOf("maya-v1") < 0);
assert.ok(spec.conflicts.length >= 4);
assert.strictEqual(Bible.resolveReference("leo"), null);
assert.ok(Bible.resolveReference("maya").file.indexOf("maya-v1.jpg") >= 0);
assert.ok(JSON.stringify(spec).indexOf("\"approved\": true") < 0);

function finished(extra) {
  return Object.assign({
    status: "REVIEWABLE",
    textProblems: [],
    storyProblems: [],
    illustrationStyle: "wondii-picture-book",
    bible: { title: "The Castle Light", castIds: ["maya", "leo"] },
    pages: [
      { text: "Maya held the light.", imageDataUrl: "data:image/gif;base64,maya-page" },
      { text: "Leo waited by the wall.", imageDataUrl: "data:image/gif;base64,leo-page" }
    ]
  }, extra || {});
}

function childPorts() {
  var store = Shelf.memoryStore();
  var allowance = Shelf.memoryAllowance();
  allowance.reserve("child-1", "book-key-0001");
  return { store: store, allowance: allowance };
}

var owner = { userId: "user-child", accountKind: "child", childId: "child-1" };
var ports = childPorts();
var saved = Shelf.commitBook({
  creationKey: "book-key-0001",
  owner: owner,
  result: finished()
}, ports);
assert.strictEqual(saved.ok, true, saved.reason);
assert.strictEqual(saved.claimed, true);
assert.strictEqual(saved.book.title, "The Castle Light");
assert.ok(saved.reader.indexOf("book-prototype/?book=b-user-child-book-key-0001") >= 0);
assert.ok(ports.store.getObject("child-1/books/" + saved.book.id + ".json"));
assert.strictEqual(ports.allowance.claimedCount(), 1);

var again = Shelf.commitBook({
  creationKey: "book-key-0001",
  owner: owner,
  result: finished()
}, ports);
assert.strictEqual(again.duplicate, true);
assert.strictEqual(again.claimed, false);
assert.strictEqual(again.book.id, saved.book.id);
assert.strictEqual(ports.store.readShelf(owner.userId).length, 1);
assert.strictEqual(ports.allowance.claimedCount(), 1);

var rejected = Shelf.commitBook({
  creationKey: "book-key-0002",
  owner: owner,
  result: finished({ textProblems: ["age-amount:p1"] })
}, ports);
assert.strictEqual(rejected.ok, false);
assert.strictEqual(rejected.saved, false);
assert.strictEqual(rejected.claimed, false);
assert.strictEqual(ports.store.readShelf(owner.userId).length, 1);
assert.strictEqual(ports.allowance.claimedCount(), 1);

var incomplete = Shelf.commitBook({
  creationKey: "book-key-0003",
  owner: owner,
  result: finished({
    pages: [{ text: "Maya held the light.", imageDataUrl: null }]
  })
}, ports);
assert.strictEqual(incomplete.reason, "incomplete");
assert.strictEqual(incomplete.saved, false);
assert.strictEqual(ports.allowance.claimedCount(), 1);

var other = { userId: "user-other", accountKind: "adult" };
var stolen = Shelf.commitBook({
  creationKey: "book-key-0001",
  owner: other,
  result: finished()
}, ports);
assert.strictEqual(stolen.ok, true);
assert.strictEqual(stolen.claimed, false);
assert.notStrictEqual(stolen.book.ownerUserId, owner.userId);
assert.strictEqual(ports.store.readShelf(owner.userId).length, 1);
assert.strictEqual(ports.allowance.claimedCount(), 1);

var adultStore = Shelf.memoryStore();
var adultAllowance = Shelf.memoryAllowance();
var adult = Shelf.commitBook({
  creationKey: "book-key-0004",
  owner: { userId: "user-adult", accountKind: "adult", childId: "child-1" },
  result: finished()
}, { store: adultStore, allowance: adultAllowance });
assert.strictEqual(adult.reason, "wrong-shelf");
assert.strictEqual(adult.saved, false);
assert.strictEqual(adultAllowance.claimedCount(), 0);

var noReserve = childPorts();
delete noReserve.allowance;
noReserve.allowance = Shelf.memoryAllowance();
var unpaid = Shelf.commitBook({
  creationKey: "book-key-0005",
  owner: owner,
  result: finished()
}, noReserve);
assert.strictEqual(unpaid.saved, false);
assert.strictEqual(unpaid.claimed, false);
assert.strictEqual(noReserve.store.readShelf(owner.userId).length, 0);
assert.strictEqual(noReserve.store.getObject("child-1/books/b-user-child-book-key-0005.json"), null);

var sandbox = { console: console, URLSearchParams: URLSearchParams };
sandbox.window = sandbox;
sandbox.location = { search: "", hostname: "127.0.0.1" };
sandbox.sessionStorage = { getItem: function () { return null; } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "games/book-prototype/book-data.js"), "utf8"), sandbox);
var opened = sandbox.WondiiBookData.classify(saved.book.id, owner.userId, ports.store.readShelf(owner.userId));
assert.strictEqual(opened.ok, true);
var plan = sandbox.WondiiBookData.plan(opened.book);
assert.strictEqual(plan.title, "The Castle Light");
assert.strictEqual(plan.pages.length, 2);
assert.ok(plan.pages[0].imageSrc.indexOf("maya-page") >= 0);
assert.ok(plan.pages[1].imageSrc.indexOf("leo-page") >= 0);
assert.strictEqual(plan.pages[0].missingArt, false);
var hidden = sandbox.WondiiBookData.classify(saved.book.id, "user-other", ports.store.readShelf("user-other"));
assert.strictEqual(hidden.ok, false);
assert.strictEqual(hidden.reason, "unavailable");

console.log("book-v2 shelf tests ok");
