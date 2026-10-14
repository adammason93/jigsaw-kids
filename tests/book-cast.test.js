"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Cast = require("../js/character-bible.js");
var BookCast = require("../js/book-cast.js");

function page(id, present, before, after) {
  return {
    pageId: id,
    charactersPresent: present,
    characterStateBefore: before || [],
    stateBefore: { characters: before || [] },
    stateAfter: { characters: after || before || [] }
  };
}

function animal(id, name, species, extra) {
  return Object.assign({
    characterId: id,
    name: name,
    type: "animal",
    species: species,
    covering: "feathers",
    colouring: "grey",
    markings: "plain",
    eyes: "dark",
    ears: "",
    horns: "",
    tail: "",
    distinctiveFeatures: [],
    accessories: [],
    relativeSize: "small",
    referenceAssetIds: [id + "-v1"]
  }, extra || {});
}

var dog = animal("field-dog", "the field dog", "dog", {
  covering: "short fur",
  colouring: "tan",
  markings: "one white ear",
  ears: "floppy",
  tail: "curled",
  distinctiveFeatures: ["one white ear"],
  accessories: ["red collar"],
  relativeSize: "knee-high beside the children",
  visualImportance: "important"
});
var penguin = animal("harbour-penguin", "the harbour penguin", "penguin", {
  colouring: "black and white",
  markings: "black back and white belly",
  distinctiveFeatures: ["black back and white belly"],
  relativeSize: "up to a child's waist"
});
var monster = {
  characterId: "cave-monster",
  name: "the cave monster",
  type: "creature",
  species: "monster",
  covering: "smooth hide",
  colouring: "moss green",
  markings: "three pale spots",
  eyes: "round amber",
  horns: "three round horns",
  tail: "short",
  distinctiveFeatures: ["three round horns"],
  accessories: ["yellow backpack"],
  relativeSize: "a head taller than the children",
  visualImportance: "important",
  referenceAssetIds: ["cave-monster-v1"]
};

var selectedPages = [
  page("p1", ["maya", "leo"]),
  page("p2", ["maya"])
];
var selected = BookCast.compileBookCast({ castIds: ["maya", "leo"], storyCast: [] }, selectedPages);
assert.strictEqual(selected.byId.maya.origin, "canonical");
assert.strictEqual(selected.byId.leo.origin, "canonical");
assert.strictEqual(selected.byId.maya.identity.species, "human");
assert.strictEqual(selected.byId.leo.identity.species, "human");
assert.strictEqual(selected.byId.maya.identity.hair, Cast.getCharacter("maya").hair);
assert.strictEqual(selected.byId.leo.identity.hair, Cast.getCharacter("leo").hair);
assert.strictEqual(selected.byId.maya.identity.defaultClothing, Cast.getCharacter("maya").defaultClothing);
assert.strictEqual(selected.byId.leo.identity.footwear, Cast.getCharacter("leo").footwear);
assert.ok(selected.byId.maya.identity.defaultClothing.indexOf("white socks") >= 0);
assert.strictEqual(selected.byId.maya.reference.strength, "canonical-sheet");
assert.strictEqual(selected.byId.maya.reference.ready, true);
assert.strictEqual(selected.byId.leo.reference.ready, false);
assert.ok(selected.problems.indexOf("reference-before-first-spread:leo") >= 0);

var dogPages = [
  page("p1", ["maya", "leo", "field-dog"]),
  page("p2", ["maya"]),
  page("p3", ["leo"]),
  page("p4", ["field-dog"], [], [{ characterId: "field-dog", mud: "muddy" }])
];
var withDog = BookCast.compileBookCast({ castIds: ["maya", "leo"], storyCast: [dog] }, dogPages);
assert.strictEqual(withDog.byId["field-dog"].origin, "story");
assert.strictEqual(withDog.byId["field-dog"].relationship, "story-created");
assert.strictEqual(withDog.byId["field-dog"].identity.species, "dog");
assert.strictEqual(withDog.byId["field-dog"].identity.markings, "one white ear");
assert.strictEqual(Object.prototype.hasOwnProperty.call(withDog.byId["field-dog"].identity, "footwear"), false);
assert.deepStrictEqual(withDog.byId["field-dog"].spreadsPresent, ["p1", "p4"]);
assert.strictEqual(withDog.byId["field-dog"].firstAppearance, "p1");
assert.strictEqual(withDog.byId["field-dog"].finalAppearance, "p4");
assert.strictEqual(withDog.byId.maya.identity.hair, selected.byId.maya.identity.hair);

var crowdPages = [page("p1", ["maya", "leo", "harbour-penguin", "cave-monster"])];
var crowd = BookCast.compileBookCast({
  castIds: ["maya", "leo"],
  storyCast: [penguin, monster]
}, crowdPages);
["maya", "leo", "harbour-penguin", "cave-monster"].forEach(function (id) {
  assert.ok(crowd.byId[id], id);
});
assert.strictEqual(crowd.byId["harbour-penguin"].identity.markings, "black back and white belly");
assert.deepStrictEqual(crowd.byId["cave-monster"].identity.distinctiveFeatures, ["three round horns"]);
assert.strictEqual(Object.prototype.hasOwnProperty.call(crowd.byId["harbour-penguin"].identity, "footwear"), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(crowd.byId["cave-monster"].identity, "hair"), false);
var brief = BookCast.spreadCastBrief(crowd, crowdPages[0]);
assert.ok(brief.indexOf("Maya") >= 0);
assert.ok(brief.indexOf("Leo") >= 0);
assert.ok(brief.indexOf("harbour penguin") >= 0);
assert.ok(brief.indexOf("cave monster") >= 0);
assert.ok(brief.indexOf("once") >= 0);
assert.ok(brief.indexOf("maya-v1") >= 0);

var muddy = [
  page("p1", ["field-dog"], [{ characterId: "field-dog" }], [{ characterId: "field-dog", mud: "muddy", clothing: "red scarf" }]),
  page("p2", ["maya"]),
  page("p3", ["field-dog"], [{ characterId: "field-dog", mud: "muddy", clothing: "red scarf" }], [{ characterId: "field-dog", mud: "muddy", clothing: "red scarf" }])
];
var dogCast = BookCast.compileBookCast({ castIds: ["maya"], storyCast: [dog] }, muddy);
assert.deepStrictEqual(BookCast.carryProblems(muddy, dogCast), []);
assert.strictEqual(dogCast.byId["field-dog"].identity.markings, "one white ear");
var dropped = BookCast.carryProblems([
  muddy[0],
  page("p3", ["field-dog"], [{ characterId: "field-dog", mud: "" }], [{ characterId: "field-dog" }])
], dogCast);
assert.ok(dropped.indexOf("state-dropped:field-dog:mud") >= 0);
assert.ok(dropped.indexOf("state-dropped:field-dog:clothing") >= 0);

assert.strictEqual(BookCast.applyState(dogCast.byId["field-dog"].identity, { mud: "muddy" }).ok, true);
assert.ok(BookCast.applyState(dogCast.byId["field-dog"].identity, { species: "wolf" }).problems.indexOf("species") >= 0);
assert.ok(BookCast.applyState(dogCast.byId["field-dog"].identity, { colouring: "black" }).problems.indexOf("colouring") >= 0);
assert.ok(BookCast.applyState(dogCast.byId["field-dog"].identity, { markings: "spots" }).problems.indexOf("markings") >= 0);
assert.ok(BookCast.applyState(crowd.byId["harbour-penguin"].identity, { markings: "pink stripes" }).ok === false);
assert.ok(BookCast.applyState(crowd.byId["cave-monster"].identity, { distinctiveFeatures: ["no horns"] }).problems.indexOf("distinctiveFeatures") >= 0);

var seen = {
  characters: [
    { characterId: "maya", identityMatch: true, count: 1 },
    { characterId: "leo", identityMatch: true, count: 1 },
    { characterId: "harbour-penguin", identityMatch: true, count: 1, markings: "black back and white belly", species: "penguin" },
    { characterId: "cave-monster", identityMatch: true, count: 1, species: "monster", colouring: "moss green" }
  ]
};
assert.strictEqual(BookCast.reviewSpread(crowd, crowdPages[0], seen).ok, true);
var omitted = BookCast.reviewSpread(crowd, crowdPages[0], {
  characters: seen.characters.filter(function (row) { return row.characterId !== "cave-monster"; })
});
assert.ok(omitted.problems.indexOf("character-missing:cave-monster") >= 0);
var copied = BookCast.reviewSpread(crowd, crowdPages[0], {
  characters: seen.characters.map(function (row) {
    return row.characterId === "harbour-penguin" ? Object.assign({}, row, { count: 2 }) : row;
  })
});
assert.ok(copied.problems.indexOf("duplicate:harbour-penguin") >= 0);
var montage = BookCast.reviewSpread(crowd, Object.assign({}, crowdPages[0], { montage: true }), {
  characters: seen.characters.map(function (row) {
    return row.characterId === "maya" ? Object.assign({}, row, { count: 2 }) : row;
  })
});
assert.ok(montage.problems.indexOf("duplicate:maya") < 0);

var extra = animal("lane-sparrow", "a lane sparrow", "sparrow", { referenceAssetIds: [], visualImportance: "background" });
var once = BookCast.compileBookCast({ castIds: [], storyCast: [extra] }, [page("p1", ["lane-sparrow"])]);
assert.strictEqual(once.byId["lane-sparrow"].reference.strength, "none");
assert.strictEqual(once.byId["lane-sparrow"].reference.expensive, false);
assert.strictEqual(once.byId["lane-sparrow"].reference.required, false);
assert.strictEqual(BookCast.referenceSheetPrompt(once.byId["lane-sparrow"]), "");

var unlocked = animal("field-dog", "the field dog", "dog", { referenceAssetIds: [], visualImportance: "important" });
var early = BookCast.compileBookCast({ castIds: [], storyCast: [unlocked] }, [
  page("p2", ["field-dog"]),
  page("p7", ["field-dog"])
]);
assert.strictEqual(early.ready, false);
assert.ok(early.problems.indexOf("reference-before-first-spread:field-dog") >= 0);
assert.ok(BookCast.referenceSheetPrompt(early.byId["field-dog"]).indexOf("dog") >= 0);
assert.ok(BookCast.referenceSheetPrompt(early.byId["field-dog"]).toLowerCase().indexOf("shoes") < 0);
var lockedDog = BookCast.compileBookCast({ castIds: [], storyCast: [dog] }, [
  page("p2", ["field-dog"]),
  page("p7", ["field-dog"])
]);
assert.strictEqual(lockedDog.byId["field-dog"].reference.ready, true);
assert.strictEqual(lockedDog.byId["field-dog"].identity.markings, "one white ear");
assert.strictEqual(lockedDog.byId["field-dog"].firstAppearance, "p2");

var later = BookCast.redesignProblems(lockedDog, { characterId: "field-dog", markings: "no white ear", species: "wolf" });
assert.ok(later.indexOf("redesign:field-dog:markings") >= 0);
assert.ok(later.indexOf("redesign:field-dog:species") >= 0);
var wrongLook = BookCast.reviewSpread(lockedDog, page("p7", ["field-dog"]), {
  characters: [{ characterId: "field-dog", identityMatch: false, count: 1, markings: "no white ear", species: "wolf", colouring: "black" }]
});
assert.ok(wrongLook.problems.indexOf("markings:field-dog") >= 0);
assert.ok(wrongLook.problems.indexOf("species:field-dog") >= 0);
assert.strictEqual(lockedDog.byId["field-dog"].identity.markings, "one white ear");
assert.strictEqual(lockedDog.byId["field-dog"].identity.species, "dog");

var lostPack = BookCast.reviewSpread(crowd, Object.assign({}, crowdPages[0], {
  characterStateBefore: [{ characterId: "cave-monster", removedAccessories: ["yellow backpack"] }]
}), {
  characters: seen.characters.map(function (row) {
    return row.characterId === "cave-monster" ? Object.assign({}, row, { missingAccessories: ["yellow backpack"] }) : row;
  })
});
assert.ok(lostPack.problems.indexOf("accessory:cave-monster:yellow backpack") < 0);
var stillWears = BookCast.reviewSpread(crowd, crowdPages[0], {
  characters: seen.characters.map(function (row) {
    return row.characterId === "cave-monster" ? Object.assign({}, row, { missingAccessories: ["yellow backpack"] }) : row;
  })
});
assert.ok(stillWears.problems.indexOf("accessory:cave-monster:yellow backpack") >= 0);

assert.ok(!/field-dog|harbour-penguin|cave-monster|maya|leo/.test(fs.readFileSync(path.join(__dirname, "../js/book-cast.js"), "utf8")));

console.log("book-cast tests ok");
