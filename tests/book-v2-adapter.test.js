"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Adapter = require("../js/book-v2-adapter.js");

var root = path.join(__dirname, "..");
var adapterSource = fs.readFileSync(path.join(root, "js/book-v2-adapter.js"), "utf8");
assert.ok(adapterSource.indexOf("OPENAI_API_KEY") < 0);
assert.ok(adapterSource.indexOf("scripts/book/") < 0);
assert.ok(adapterSource.indexOf("book-prototype/book.js") < 0);

function local(extra) {
  return Object.assign({ host: "127.0.0.1", bookV2: "1" }, extra || {});
}

assert.strictEqual(Adapter.enabled({ host: "wondii.co.uk", bookV2: "1" }), false);
assert.strictEqual(Adapter.enabled({ host: "127.0.0.1", bookV2: "0" }), false);
assert.strictEqual(Adapter.enabled(local()), true);

var off = Adapter.prepare({ host: "wondii.co.uk", bookV2: "1", familyAgeBand: "10-12" });
assert.strictEqual(off.route, "clever-service");
assert.strictEqual(off.active, false);
assert.strictEqual(off.generated, false);

assert.deepStrictEqual(Adapter.mapAge({ familyAgeBand: "4-6" }), { familyAgeBand: "4-6", ageBand: "5-6" });
assert.deepStrictEqual(Adapter.mapAge({ familyAgeBand: "7-9" }), { familyAgeBand: "7-9", ageBand: "7-8" });
assert.deepStrictEqual(Adapter.mapAge({ familyAgeBand: "10-12" }), { familyAgeBand: "10-12", ageBand: "9-10" });
assert.strictEqual(Adapter.mapAge({ ageBand: "10-12" }).ageBand, "9-10");
assert.strictEqual(Adapter.mapAge({}), null);

var missingAge = Adapter.prepare(local({
  members: [{ id: "wondii-maya", name: "Maya" }],
  idea: "Maya finds a quiet star.",
  length: "medium"
}));
assert.strictEqual(missingAge.ok, false);
assert.ok(missingAge.problems.indexOf("age-missing") >= 0);
assert.strictEqual(missingAge.generated, false);

var older = Adapter.prepare(local({
  familyAgeBand: "10-12",
  members: [
    { id: "wondii-maya", name: "Maya", src: "games/images/characters/crew/wondii-maya.jpg" },
    { id: "wondii-leo", name: "Leo", src: "games/images/characters/crew/wondii-leo.jpg" }
  ],
  idea: "They follow a light across the castle wall.",
  place: "castle",
  length: "medium",
  theme: "Mystery"
}));
assert.strictEqual(older.ok, true, older.problems.join(", "));
assert.strictEqual(older.ageBand, "9-10");
assert.notStrictEqual(older.ageBand, "5-6");
assert.deepStrictEqual(older.request.castIds, ["wondii-maya", "wondii-leo"]);
assert.strictEqual(older.request.length, "storybook");
assert.strictEqual(older.request.tone, "mystery");
assert.strictEqual(older.illustrationStyle, "wondii-picture-book");
assert.strictEqual(older.generated, false);
assert.strictEqual(older.imageCalls, 0);
assert.strictEqual(older.cast[0].characterId, "wondii-maya");
assert.ok(older.cast[0].reference.indexOf("maya-v1.jpg") >= 0);
assert.ok(older.cast.every(function (row) { return row.characterId !== "maya" || row.characterId === "wondii-maya"; }));

var personal = Adapter.prepare(local({
  familyAgeBand: "7-9",
  members: [
    { id: "char_hugo", name: "Hugo", src: "games/images/characters/crew/wondii-maya.jpg" }
  ],
  savedReferences: [{
    id: "char_hugo",
    ownerType: "family",
    ownerId: "family-1",
    reference: "games/images/characters/crew/wondii-maya.jpg"
  }],
  idea: "Hugo looks for a lost button.",
  length: "short"
}));
assert.strictEqual(personal.ok, false);
assert.ok(personal.problems.indexOf("unknown-cast:char_hugo") >= 0);
assert.ok(!personal.cast || personal.cast.every(function (row) { return row.characterId !== "wondii-maya"; }));

var saved = Adapter.prepare(local({
  familyAgeBand: "4-6",
  members: [
    { id: "wondii-maya", name: "Maya" },
    { id: "char_hugo", name: "Hugo", src: "" }
  ],
  savedReferences: [{
    characterId: "char_hugo",
    ownerType: "family",
    ownerId: "family-1",
    reference: "characters/char_hugo.png"
  }],
  idea: "",
  place: "castle",
  length: "long",
  theme: "Adventure"
}));
assert.strictEqual(saved.ok, true, saved.problems.join(", "));
assert.strictEqual(saved.ageBand, "5-6");
assert.strictEqual(saved.request.idea, "A story set in the castle.");
assert.ok(saved.request.idea.indexOf("forest") < 0);
assert.deepStrictEqual(saved.request.castIds, ["wondii-maya", "char_hugo"]);
assert.strictEqual(saved.request.length, "adventure");
var hugo = saved.request.characterReferences.filter(function (row) { return row.characterId === "char_hugo"; })[0];
var maya = saved.request.characterReferences.filter(function (row) { return row.characterId === "wondii-maya"; })[0];
assert.ok(hugo);
assert.ok(hugo.reference.indexOf("char_hugo") >= 0);
assert.ok(hugo.reference.indexOf("maya") < 0);
assert.ok(maya);
assert.ok(maya.reference.indexOf("maya-v1.jpg") >= 0);

var emptyWorld = Adapter.prepare(local({
  familyAgeBand: "4-6",
  members: [{ id: "wondii-leo", name: "Leo" }],
  idea: "",
  place: "library",
  length: "medium"
}));
assert.strictEqual(emptyWorld.request.idea, "A story set in Wondii World.");
assert.ok(emptyWorld.request.idea.indexOf("forest") < 0);
assert.ok(emptyWorld.request.idea.indexOf("woods") < 0);

var proof = JSON.parse(fs.readFileSync(path.join(root, "docs/agent/book-v2/text-validation-prose/e/book.json"), "utf8"));
var opened = Adapter.shelfFromProof(proof);
assert.strictEqual(opened.ok, true, opened.message || "");
assert.strictEqual(opened.plan.title, "Maya’s Sky Song");
assert.strictEqual(opened.plan.id, proof.id);
assert.ok(opened.plan.pages.length >= 2);
assert.ok(opened.plan.pages[0].text.indexOf("Maya hummed") === 0);
assert.strictEqual(opened.plan.pages[1].text, "");
assert.strictEqual(opened.illustrationStyle, "wondii-picture-book");
assert.strictEqual(opened.imageCalls, 0);
var prose = opened.plan.pages.map(function (page) { return page.text; }).filter(Boolean);
var sourceProse = proof.pages.map(function (page) { return page.prose; });
assert.deepStrictEqual(prose, sourceProse);

var blocked = JSON.parse(fs.readFileSync(path.join(root, "docs/agent/book-v2/text-validation/d/book.json"), "utf8"));
var refused = Adapter.shelfFromProof(blocked);
assert.strictEqual(refused.ok, false);
assert.strictEqual(refused.reason, "incomplete");

var legacyPages = [];
for (var i = 0; i < 12; i++) {
  legacyPages.push({ text: "Page " + (i + 1) + ".", imageDataUrl: "data:image/gif;base64,p" + i });
}
var legacy = Adapter.readerPlan({
  id: "older-book",
  title: "The Blue Lighthouse",
  author: "Fixture",
  pages: legacyPages,
  readerArtLayout: "duplex",
  storyTextMode: "prose"
});
assert.strictEqual(legacy.ok, true);
assert.strictEqual(legacy.plan.title, "The Blue Lighthouse");
assert.strictEqual(legacy.plan.pages.length, 12);
assert.strictEqual(legacy.plan.pages[0].text, "Page 1.");
assert.strictEqual(legacy.plan.pages[11].text, "Page 12.");
assert.strictEqual(legacy.plan.pages[3].imageSrc, "data:image/gif;base64,p3");

assert.strictEqual(Adapter.readerPlan({ title: "No id" }).reason, "missing");
assert.strictEqual(Adapter.readerPlan({ id: "empty", pages: [] }).reason, "empty");
assert.ok(adapterSource.indexOf("Golden Key") < 0);

console.log("book-v2 adapter tests ok");
