"use strict";

var assert = require("assert");
var Identity = require("../js/book-v2-identity.js");
var Crew = require("../js/wondii-crew.js");
var Bible = require("../js/character-bible.js");

var crew = Crew.list();
assert.strictEqual(crew.length, 12);
crew.forEach(function (row) {
  var built = Identity.buildRegistry({
    members: [{ id: row.id, name: row.name, source: "wondii-crew" }]
  });
  assert.strictEqual(built.ok, true, row.id + " " + built.problems.join(","));
  var entry = built.selected[0];
  assert.strictEqual(entry.portrait, row.portrait);
  assert.ok(entry.portrait.indexOf(row.id + ".jpg") >= 0);
  assert.strictEqual(entry.locked, true);
  if (row.id === "wondii-maya") {
    assert.strictEqual(entry.referenceApproved, true);
    assert.ok(entry.reference.indexOf("maya-v1.jpg") >= 0);
    assert.strictEqual(entry.reliable, true);
  } else {
    assert.strictEqual(entry.referenceApproved, false);
    assert.strictEqual(entry.reliable, false);
    assert.ok(entry.reference.indexOf("maya-v1") < 0);
    assert.ok(entry.limitation.indexOf("Portrait only") >= 0);
  }
});
assert.strictEqual(Bible.resolveReference("leo"), null);

var together = Identity.buildRegistry({
  members: [
    { id: "wondii-maya", name: "Maya" },
    { id: "wondii-leo", name: "Leo" },
    { id: "wondii-amara", name: "Amara" },
    { id: "char_hugo", name: "Hugo", source: "saved" }
  ],
  savedReferences: [{
    id: "char_hugo",
    name: "Hugo",
    ownerType: "family",
    ownerId: "family-1",
    reference: "characters/char_hugo.png"
  }],
  storyCharacters: [{
    id: "fox-1",
    name: "Bramble",
    appearance: "a small red fox with one white ear",
    clothing: "a blue scarf"
  }],
  pages: [
    { pageId: "p1", charactersPresent: ["wondii-maya", "wondii-leo", "wondii-amara", "char_hugo", "fox-1"] }
  ]
});
assert.strictEqual(together.ok, true, together.problems.join(","));
assert.strictEqual(together.registry.length, 5);
var page = together.illustration.spreads[0];
assert.strictEqual(page.references.length, 5);
var files = page.references.map(function (row) { return row.file; });
assert.strictEqual(new Set(files).size, 5);
assert.ok(files[1].indexOf("wondii-leo.jpg") >= 0);
assert.ok(files.every(function (file, index) { return index === 0 || file.indexOf("maya-v1") < 0; }));
assert.strictEqual(together.illustration.multiCharacter, true);
assert.strictEqual(together.illustration.solved, false);
assert.strictEqual(together.illustration.visuallyReviewed, false);
assert.strictEqual(together.illustration.reliableReproduction, false);
assert.ok(together.selected[3].pages.indexOf("p1") >= 0);

var clash = Identity.buildRegistry({
  members: [{ id: "wondii-maya", name: "Maya" }],
  storyCharacters: [{ id: "wondii-maya", name: "Maya", appearance: "someone else" }]
});
assert.strictEqual(clash.ok, false);
assert.ok(clash.problems.indexOf("story-replaces-selected:wondii-maya") >= 0);

var stolen = Identity.buildRegistry({
  members: [{ id: "wondii-leo", name: "Leo" }],
  storyCharacters: [{
    id: "fox-2",
    name: "Bramble",
    appearance: "a fox",
    portrait: "games/images/characters/crew/wondii-leo.jpg"
  }]
});
assert.strictEqual(stolen.ok, false);
assert.ok(stolen.problems.some(function (problem) { return problem.indexOf("story-uses-selected-art:") === 0; }));

var shared = Identity.buildRegistry({
  members: [{ id: "11111111-1111-1111-1111-111111111111", name: "Pip", source: "shared" }],
  sharedCharacters: [{
    id: "11111111-1111-1111-1111-111111111111",
    name: "Pip",
    shareId: "11111111-1111-1111-1111-111111111111",
    reference: "shared/11111111-1111-1111-1111-111111111111/character.png"
  }]
});
assert.strictEqual(shared.ok, true, shared.problems.join(","));
assert.strictEqual(shared.selected[0].source, "shared");
assert.strictEqual(shared.selected[0].referenceApproved, false);
assert.ok(shared.selected[0].reference.indexOf("maya") < 0);

var leo = Identity.buildRegistry({
  members: [{ id: "wondii-leo", name: "Leo" }]
});
assert.strictEqual(leo.selected[0].blocksGeneration, false);
assert.strictEqual(leo.selected[0].reliable, false);
assert.strictEqual(leo.selected[0].appearanceSpec.matchPortrait, true);
assert.strictEqual(leo.selected[0].appearanceSpec.consistencyPromised, false);
assert.ok(leo.selected[0].reference.indexOf("wondii-leo.jpg") >= 0);
assert.strictEqual(leo.illustration.blocksGeneration, false);
assert.strictEqual(leo.illustration.consistencyPromised, false);
assert.strictEqual(leo.illustration.reviewPath, "vision-check-and-one-repair");

var maya = Identity.buildRegistry({
  members: [{ id: "wondii-maya", name: "Maya" }]
});
assert.strictEqual(maya.selected[0].appearanceSpec.source, "approved-sheet");
assert.ok(maya.selected[0].reference.indexOf("maya-v1.jpg") >= 0);

Identity.clearCache();
var first = Identity.prepareReference(leo.selected[0]);
var second = Identity.prepareReference(leo.selected[0]);
assert.strictEqual(first.reused, false);
assert.strictEqual(second.reused, true);
assert.strictEqual(first.key, second.key);
assert.strictEqual(first.file, second.file);
assert.strictEqual(first.bytes, undefined);
var changed = Object.assign({}, leo.selected[0], { referenceVersion: "portrait:replaced" });
var third = Identity.prepareReference(changed);
assert.strictEqual(third.reused, false);
assert.notStrictEqual(third.key, first.key);

var saved = Identity.buildRegistry({
  members: [{ id: "char_hugo", name: "Hugo", source: "saved" }],
  savedReferences: [{
    id: "char_hugo",
    name: "Hugo",
    ownerType: "family",
    ownerId: "family-1",
    reference: "characters/char_hugo.png",
    hair: "curly brown hair",
    clothing: "a green hoodie",
    colours: ["green", "khaki"],
    proportions: "school-age"
  }]
});
assert.strictEqual(saved.ok, true, saved.problems.join(","));
assert.strictEqual(saved.selected[0].appearanceSpec.hair, "curly brown hair");
assert.strictEqual(saved.selected[0].appearanceSpec.clothing, "a green hoodie");
assert.deepStrictEqual(saved.selected[0].appearanceSpec.colours, ["green", "khaki"]);
assert.strictEqual(saved.selected[0].appearanceSpec.proportions, "school-age");
assert.strictEqual(saved.selected[0].blocksGeneration, false);
var closed = Identity.prepareScene(saved.registry, ["char_hugo"]);
assert.strictEqual(closed.blocksGeneration, true);
assert.ok(closed.limitations.indexOf("inaccessible:char_hugo") >= 0);
assert.ok(closed.files.every(function (file) { return file.file.indexOf("maya") < 0; }));
var open = Identity.prepareScene(saved.registry, ["char_hugo"], { ownerId: "family-1" });
assert.strictEqual(open.ok, true);
assert.strictEqual(open.blocksGeneration, false);
assert.ok(open.files[0].file.indexOf("char_hugo") >= 0);
assert.strictEqual(open.files[0].privateArt, true);
assert.ok(!/^https?:/.test(open.files[0].file));

var missing = Identity.buildRegistry({
  members: [{ id: "char_ned", name: "Ned", source: "saved" }]
});
assert.strictEqual(missing.ok, false);
assert.ok(missing.problems.indexOf("missing-artwork:char_ned") >= 0);

var early = Identity.prepareReference({
  characterId: "dragon-1",
  source: "story-generated",
  name: "Ember",
  appearance: ""
});
assert.strictEqual(early.ok, false);
assert.strictEqual(early.reason, "identity-before-scene");

var story = Identity.buildRegistry({
  members: [{ id: "wondii-maya", name: "Maya" }],
  storyCharacters: [{ id: "fox-1", name: "Bramble", appearance: "a small red fox with one white ear", clothing: "a blue scarf" }],
  pages: [
    { pageId: "p1", charactersPresent: ["fox-1"] },
    { pageId: "p2", charactersPresent: ["wondii-maya", "fox-1"] }
  ]
});
Identity.clearCache();
var foxFirst = Identity.prepareScene(story.registry, ["fox-1"]);
var foxLater = Identity.prepareScene(story.registry, ["wondii-maya", "fox-1"]);
var foxAgain = foxLater.files.filter(function (file) { return file.characterId === "fox-1"; })[0];
assert.strictEqual(foxFirst.blocksGeneration, false);
assert.strictEqual(foxAgain.reused, true);
assert.strictEqual(foxAgain.version, foxFirst.files[0].version);
assert.ok(foxLater.files[0].file.indexOf("maya-v1") >= 0 || foxLater.files[1].file.indexOf("maya-v1") >= 0);

var crowdIds = ["wondii-maya", "wondii-leo", "wondii-amara", "wondii-finn", "wondii-zara"];
var crowd = Identity.buildRegistry({
  members: crowdIds.map(function (id) { return { id: id, name: Crew.get(id).name }; })
});
Identity.clearCache();
var scene = Identity.prepareScene(crowd.registry, crowdIds);
assert.strictEqual(scene.ok, true, scene.limitations.join(","));
assert.strictEqual(scene.blocksGeneration, false);
assert.deepStrictEqual(scene.omitted, []);
assert.strictEqual(scene.passes.length, 2);
assert.strictEqual(scene.passes[0].length, 4);
assert.strictEqual(scene.passes[1].length, 1);
assert.strictEqual(scene.files.length, 5);
assert.strictEqual(new Set(scene.files.map(function (file) { return file.file; })).size, 5);

var proof = require("fs").readFileSync(require("path").join(__dirname, "../scripts/book/visual-proof.js"), "utf8");
assert.ok(proof.indexOf("!plan.reliable") < 0);
assert.ok(proof.indexOf("Not drawing a partial cast") >= 0);

console.log("book-v2 identity tests ok");
