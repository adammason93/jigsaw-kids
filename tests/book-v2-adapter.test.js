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

assert.deepStrictEqual(Adapter.mapAge({ familyAgeBand: "4-6" }), { familyAgeBand: "4-6", ageBand: "4-6" });
assert.deepStrictEqual(Adapter.mapAge({ familyAgeBand: "7-9" }), { familyAgeBand: "7-9", ageBand: "7-9" });
assert.deepStrictEqual(Adapter.mapAge({ familyAgeBand: "10-12" }), { familyAgeBand: "10-12", ageBand: "10-12" });
assert.strictEqual(Adapter.mapAge({ ageBand: "10-12" }).ageBand, "10-12");
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
assert.strictEqual(older.ageBand, "10-12");
assert.strictEqual(older.constraintYear, "Year 6");
assert.notStrictEqual(older.constraintYear, "Year 1");
assert.deepStrictEqual(older.request.castIds, ["wondii-maya", "wondii-leo"]);
assert.strictEqual(older.request.length, "storybook");
assert.strictEqual(older.request.pageCount, undefined);
var counted = Adapter.prepare(local({
  familyAgeBand: "7-9",
  members: [{ id: "wondii-maya", name: "Maya" }],
  idea: "Maya finds a lantern in the castle.",
  place: "castle",
  length: "medium",
  theme: "Magic",
  pageCount: 12
}));
assert.strictEqual(counted.ok, true, (counted.problems || []).join(","));
assert.strictEqual(counted.request.pageCount, 12);
assert.strictEqual(counted.request.length, "storybook");
assert.strictEqual(counted.constraintYear, "Ages 7–9");
var tooLong = Adapter.prepare(local({
  familyAgeBand: "7-9",
  members: [{ id: "wondii-maya", name: "Maya" }],
  idea: "Maya finds a lantern in the castle.",
  place: "castle",
  length: "medium",
  theme: "Magic",
  pageCount: 20
}));
assert.strictEqual(tooLong.ok, false);
assert.ok(tooLong.problems.indexOf("page-count") >= 0);
assert.strictEqual(older.request.tone, "mystery");
assert.strictEqual(older.illustrationStyle, "wondii-picture-book");
assert.strictEqual(older.generated, false);
assert.strictEqual(older.imageCalls, 0);
assert.strictEqual(older.identities[0].journeyId, "wondii-maya");
assert.strictEqual(older.identities[0].bibleId, "maya");
assert.strictEqual(older.identities[0].name, "Maya");
assert.ok(older.identities[0].reference.indexOf("maya-v1.jpg") >= 0);
assert.ok(older.identities[0].portrait.indexOf("wondii-maya.jpg") >= 0);
assert.strictEqual(older.identities[1].journeyId, "wondii-leo");
assert.strictEqual(older.identities[1].bibleId, "leo");
assert.strictEqual(older.identities[1].name, "Leo");
assert.strictEqual(older.identities[1].lockedSheet, false);
assert.strictEqual(older.identities[1].sheet, "portrait-only");
assert.ok(older.identities[1].portrait.indexOf("wondii-leo.jpg") >= 0);
assert.ok(older.identities[1].reference.indexOf("maya-v1") < 0);
assert.ok(older.identities[1].portrait.indexOf("maya") < 0);

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
assert.ok(personal.problems.indexOf("wrong-artwork:char_hugo") >= 0);
assert.strictEqual(personal.identities[0].source, "saved");
assert.strictEqual(personal.identities[0].bibleId, "");
assert.strictEqual(personal.identities[0].reference, "");
assert.ok(personal.identities.every(function (row) { return row.bibleId !== "maya" && row.journeyId !== "wondii-maya"; }));

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
assert.strictEqual(saved.ageBand, "4-6");
assert.strictEqual(saved.constraintYear, "Year 1");
assert.strictEqual(saved.request.idea, "A story set in the castle.");
assert.ok(saved.request.idea.indexOf("forest") < 0);
assert.deepStrictEqual(saved.request.castIds, ["wondii-maya", "char_hugo"]);
var hugo = saved.identities.filter(function (row) { return row.journeyId === "char_hugo"; })[0];
var maya = saved.identities.filter(function (row) { return row.journeyId === "wondii-maya"; })[0];
assert.strictEqual(hugo.source, "saved");
assert.strictEqual(hugo.bibleId, "");
assert.strictEqual(hugo.referenceApproved, false);
assert.ok(hugo.reference.indexOf("char_hugo") >= 0);
assert.ok(hugo.reference.indexOf("maya") < 0);
assert.strictEqual(maya.bibleId, "maya");
assert.ok(maya.reference.indexOf("maya-v1.jpg") >= 0);
assert.notStrictEqual(hugo.reference, maya.reference);

var unsupported = Adapter.prepare(local({
  familyAgeBand: "7-9",
  members: [{ id: "wondii-amara", name: "Amara" }],
  idea: "Amara waits by the gate.",
  length: "short"
}));
assert.strictEqual(unsupported.ok, true, unsupported.problems.join(", "));
assert.strictEqual(unsupported.identities[0].source, "wondii-crew");
assert.strictEqual(unsupported.identities[0].bibleId, "");
assert.strictEqual(unsupported.identities[0].referenceApproved, false);
assert.strictEqual(unsupported.identities[0].reliable, false);
assert.ok(unsupported.identities[0].portrait.indexOf("wondii-amara.jpg") >= 0);
assert.ok(unsupported.identities[0].reference.indexOf("maya-v1") < 0);

var mismatch = Adapter.prepare(local({
  familyAgeBand: "7-9",
  members: [{ id: "wondii-leo", name: "Maya" }],
  idea: "A light moves along the wall.",
  length: "short"
}));
assert.strictEqual(mismatch.ok, false);
assert.ok(mismatch.problems.indexOf("identity-mismatch:wondii-leo") >= 0);
assert.notStrictEqual(mismatch.identities[0].bibleId, "maya");

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

var lockedWorld = Adapter.prepare(local({
  familyAgeBand: "7-9",
  members: [{ id: "wondii-maya", name: "Maya" }],
  idea: "Maya finds a quiet star.",
  place: "castle",
  length: "medium"
}));
assert.ok(lockedWorld.request.idea.indexOf("Maya finds a quiet star") === 0);
assert.ok(lockedWorld.request.idea.indexOf("The story is set in the castle.") >= 0);
assert.ok(lockedWorld.request.idea.indexOf("forest") < 0);
assert.ok(lockedWorld.request.idea.indexOf("woods") < 0);

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
