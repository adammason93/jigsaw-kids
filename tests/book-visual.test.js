"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Cast = require("../js/character-bible.js");
var Book = require("../js/book-brain.js");
var Visual = require("../js/book-visual.js");

var maya = Cast.getCharacter("maya");
assert.strictEqual(maya.footwear, "navy shoes");
assert.ok(maya.relativeHeight);
assert.strictEqual(Cast.storyState(maya, { footwear: "boots" }).ok, false);
assert.strictEqual(Cast.referenceReport("maya").locked, true);
assert.deepStrictEqual(Cast.referenceReport("maya").referenceAssetIds, ["maya-v1"]);
assert.ok(maya.defaultClothing.indexOf("white socks") >= 0);

var candidate = Cast.proposeReference("maya", { assetId: "maya-sheet" });
assert.strictEqual(candidate.locked, false);
assert.strictEqual(candidate.status, "candidate");
assert.strictEqual(Cast.resolveReference("maya").versionId, "maya-v1");
assert.deepStrictEqual(Cast.referenceReport("maya", candidate).referenceAssetIds, ["maya-v1"]);
assert.deepStrictEqual(Cast.storyReferences("maya", candidate).assetIds, ["maya-sheet"]);
assert.strictEqual(Cast.storyReferences("maya", candidate).approved, false);
var replaced = Cast.publishReference("maya", {
  versionId: "maya-v2",
  assetId: "maya-v2",
  file: "games/images/characters/maya-v2.jpg",
  provenance: { note: "later replacement" }
});
assert.strictEqual(replaced.maya.currentVersionId, "maya-v2");
assert.strictEqual(Cast.resolveReference("maya", "maya-v1", replaced).assetId, "maya-v1");
assert.strictEqual(Cast.resolveReference("maya").versionId, "maya-v1");
var pinned = Cast.bindReferences(["maya"]);
assert.strictEqual(pinned.maya, "maya-v1");
assert.strictEqual(Cast.resolveReference("maya", pinned.maya, replaced).file, "games/images/characters/maya-v1.jpg");
assert.strictEqual(Visual.wornOutfit("yellow cardigan, white shirt, blue skirt", maya.defaultClothing).indexOf("white socks") >= 0, true);
assert.strictEqual(Visual.wornOutfit("red raincoat", maya.defaultClothing), "red raincoat");

assert.strictEqual(Visual.styleFor("bedtime").styleId, Visual.styleFor("mystery").styleId);
assert.notStrictEqual(Visual.styleFor("bedtime").mood, Visual.styleFor("mystery").mood);
assert.ok(Visual.LAYOUTS.indexOf("image-left") >= 0);
assert.strictEqual(Visual.layoutFor({ shotType: "close", textSafeRegion: "upper-right" }), "caption-bleed");
assert.strictEqual(Visual.layoutFor({ shotType: "establishing", textSafeRegion: "upper-left" }), "large-reveal");
assert.ok(Visual.sheetPrompt(maya).indexOf("No letters") >= 0);
assert.ok(Visual.sheetPrompt(maya).toLowerCase().indexOf("pixar") < 0);

var sailBible = {
  tone: "adventure",
  castIds: ["maya"],
  yearGroup: "Year 3",
  locations: [
    { locationId: "deck", name: "the sail deck", visualIdentity: "a wooden deck and one mast", connectedTo: [] }
  ],
  entities: [
    { entityId: "sail", name: "the sail", identity: "a broad cloth sail", ownerCharacterId: null, locationId: "deck", state: "intact", introducedAt: "b1" }
  ],
  beats: [
    { beatId: "b1", role: "hook", shotType: "establishing", locationId: "deck", emotion: "curious", action: "Maya holds the rope." },
    { beatId: "b2", role: "attempt", shotType: "action", locationId: "deck", emotion: "worried", action: "Maya pulls the rope too hard." }
  ]
};
var lateColour = Visual.unplannedVisualProblems(sailBible, [
  { pageId: "p1", beatId: "b1", charactersPresent: ["maya"], prose: "Maya held the rope." },
  { pageId: "p2", beatId: "b2", charactersPresent: ["maya"], prose: "They looked at the sail. Purple and yellow filled it." }
]);
assert.ok(lateColour.indexOf("unplanned-visual:sail:p2") >= 0, lateColour.join(", "));

var planted = Object.assign({}, sailBible, {
  entities: [{ entityId: "sail", name: "the sail", identity: "a purple and yellow cloth sail", state: "intact", introducedAt: "b1" }]
});
assert.deepStrictEqual(Visual.unplannedVisualProblems(planted, [
  { pageId: "p2", beatId: "b2", charactersPresent: ["maya"], prose: "They looked at the sail. Purple and yellow filled it." }
]), []);

var introduced = Visual.unplannedVisualProblems(sailBible, [
  { pageId: "p1", beatId: "b1", charactersPresent: ["maya"], prose: "Maya found the purple sail." },
  { pageId: "p2", beatId: "b2", charactersPresent: ["maya"], prose: "The purple sail held." }
]);
assert.deepStrictEqual(introduced, []);

var sleeves = Visual.unplannedVisualProblems({
  castIds: ["maya"],
  entities: [{ entityId: "star", name: "the star", identity: "a warm-white star", introducedAt: "b1" }],
  beats: []
}, [
  { pageId: "p1", beatId: "b1", charactersPresent: ["maya"], prose: "One star blinked back. Maya's yellow sleeves settled beneath its light." }
]);
assert.deepStrictEqual(sleeves, []);

var torn = {
  pageId: "p5",
  beatId: "b5",
  locationId: "deck",
  charactersPresent: ["maya"],
  action: "Maya pulls the rope too hard.",
  emotion: "worried",
  shotType: "action",
  textSafeRegion: "upper-left",
  compositionIntent: "The pull.",
  visualFocus: "Her hands on the rope.",
  entitiesRequired: ["sail"],
  stateBefore: { characters: [], entities: [{ entityId: "sail", state: "intact" }] },
  stateAfter: { characters: [], entities: [{ entityId: "sail", state: "torn" }] }
};
var contract = Visual.pageVisualContract(sailBible, [torn], 0);
assert.strictEqual(contract.openingState.entities[0].state, "intact");
assert.strictEqual(contract.stateAfter.entities[0].state, "torn");
assert.ok(Visual.spreadPrompt(sailBible, contract, Visual.visualBookBible(sailBible).cast).indexOf("intact") >= 0);
assert.ok(Visual.spreadPrompt(sailBible, contract, []).indexOf("No letters") >= 0);
assert.notStrictEqual(contract.spreadId, "cover");

var regen = Visual.regenContract(contract);
assert.ok(regen.mayChange.indexOf("pose") >= 0);
assert.strictEqual(regen.mustKeep.locationId, "deck");
assert.strictEqual(regen.mustKeep.openingState.entities[0].state, "intact");
assert.strictEqual(regen.mustKeep.storyEvent, "Maya pulls the rope too hard.");

var cover = Book.coverPlan(Book.fixtureBible());
assert.strictEqual(cover.pageId, "cover");
assert.notStrictEqual(cover.pageId, "p1");

assert.deepStrictEqual(Visual.acceptIllustration({
  characters: [{ characterId: "maya", identityMatch: true }],
  missingEntities: [],
  locationMatch: true,
  prematureResult: false,
  textDetected: false,
  anatomyOk: true,
  textSafeUsable: true,
  duplicateCharacter: false
}, contract).ok, true);
assert.ok(Visual.acceptIllustration({
  characters: [{ characterId: "maya", identityMatch: false }],
  textDetected: true
}, contract).problems.indexOf("identity:maya") >= 0);

var bookE = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/agent/book-v2/text-validation-depth/e/book.json"), "utf8"));
var chosen = Visual.proofSpreads(bookE.pages, bookE.bible.beats);
assert.deepStrictEqual(chosen.map(function (page) { return page.pageId; }), ["p2", "p5", "p10"]);
assert.strictEqual(new Set(chosen.map(function (page) { return page.shotType; })).size, 3);
var plans = Visual.contractsFor(bookE.bible, bookE.pages, {});
assert.strictEqual(plans.spreads.length, 11);
assert.strictEqual(plans.visualBible.style.styleId, "wondii-picture-book");
assert.strictEqual(plans.visualBible.cast.length, 1);
assert.strictEqual(plans.visualBible.cast[0].characterId, "maya");
assert.ok(plans.spreads.every(function (spread) { return spread.prose === ""; }));
assert.strictEqual(Visual.MAX_VISUAL_REPAIRS, 1);
var p2 = plans.spreads.filter(function (spread) { return spread.spreadId === "p2"; })[0];
var p5 = plans.spreads.filter(function (spread) { return spread.spreadId === "p5"; })[0];
assert.ok(Visual.mustShow(bookE.bible, p2).indexOf("hidden-star") >= 0);
assert.ok(Visual.mustShow(bookE.bible, p2).indexOf("clay-flowerpot") >= 0);
assert.ok(Visual.mustShow(bookE.bible, p5).indexOf("hidden-star") >= 0);
assert.ok(Visual.mustShow(bookE.bible, p5).indexOf("clay-flowerpot") < 0);
assert.strictEqual(p5.montage, false);
assert.strictEqual(p5.characterInstances.maya, 1);
assert.ok(p5.sequentialActions.length >= 3);
assert.ok(p5.illustrationMoment.toLowerCase().indexOf("closes") < 0);
assert.ok(p5.illustrationMoment.toLowerCase().indexOf("again") >= 0);
assert.deepStrictEqual(Visual.momentProblems(p5), []);
var p5Prompt = Visual.spreadPrompt(bookE.bible, p5, plans.visualBible.cast);
assert.ok(p5Prompt.indexOf("one pose only") >= 0);
assert.ok(p5Prompt.indexOf(p5.illustrationMoment) >= 0);
var drawn = p5Prompt.split("Draw only this instant: ")[1].split("Emotion")[0];
assert.ok(drawn.toLowerCase().indexOf("closes") < 0);
assert.ok(p5Prompt.toLowerCase().indexOf("sequence") < 0);
assert.ok(p5Prompt.indexOf("white socks") >= 0);

var sequence = Visual.illustrationMoment({
  charactersPresent: ["sailor"],
  storyEvent: "The sailor opens the hatch, closes it, and opens it again. The lantern answers with two small blinks."
});
assert.ok(sequence.steps.length >= 3);
assert.strictEqual(sequence.montage, false);
assert.strictEqual(sequence.characterInstances.sailor, 1);
assert.ok(sequence.instant.toLowerCase().indexOf("closes") < 0);
assert.ok(sequence.instant.toLowerCase().indexOf("opens it again") >= 0);
assert.ok(sequence.instant.toLowerCase().indexOf("lantern") >= 0);
var montage = Visual.illustrationMoment({
  charactersPresent: ["sailor"],
  montage: true,
  storyEvent: "The sailor opens the hatch, closes it, and opens it again."
});
assert.strictEqual(montage.montage, true);
assert.strictEqual(montage.characterInstances.sailor, "sequence");

var pull = {
  charactersPresent: ["sailor"],
  storyEvent: "The sailor pulls the rope.",
  openingState: { entities: [{ entityId: "sail", state: "intact" }] },
  stateAfter: { entities: [{ entityId: "sail", state: "torn" }] }
};
var pullMoment = Visual.illustrationMoment(pull);
assert.ok(pullMoment.instant.indexOf("torn") < 0);
assert.deepStrictEqual(Visual.momentProblems(Object.assign({}, pull, pullMoment, {
  illustrationMoment: pullMoment.instant,
  characterInstances: pullMoment.characterInstances
})), []);
assert.ok(Visual.momentProblems(Object.assign({}, pull, pullMoment, {
  illustrationMoment: "The sail is torn already.",
  characterInstances: pullMoment.characterInstances
})).indexOf("moment-after-only") >= 0);

var lamp = Visual.entitySpec({
  entityId: "harbour-lamp",
  name: "the harbour lamp",
  identity: "a small brass lamp"
}, { visualFocus: "a tiny flame" }, null);
assert.ok(lamp.aliases.indexOf("lamp") >= 0);
assert.ok(lamp.aliases.indexOf("brass") >= 0);
assert.strictEqual(lamp.scale, "small");
var lampSeen = Visual.judgeSightings([lamp], {
  missingEntities: ["harbour-lamp"],
  observations: "a brass lamp glows on the post"
});
assert.strictEqual(lampSeen[0].status, "confirmed");
assert.strictEqual(lampSeen[0].redraw, false);
var lampUnsure = Visual.judgeSightings([lamp], {
  missingEntities: ["harbour-lamp"],
  observations: "the street is dark"
});
assert.strictEqual(lampUnsure[0].status, "uncertain");
assert.strictEqual(lampUnsure[0].redraw, false);

var crate = Visual.entitySpec({
  entityId: "cargo-crate",
  name: "the cargo crate",
  identity: "a large wooden crate"
}, {}, null);
assert.strictEqual(crate.scale, "ordinary");
var crateGone = Visual.judgeSightings([crate], {
  missingEntities: ["cargo-crate"],
  observations: "an empty quay"
});
assert.strictEqual(crateGone[0].status, "missing");
assert.strictEqual(crateGone[0].redraw, true);

var gate = Visual.entitySpec({
  entityId: "harbour-gate",
  name: "the harbour gate",
  identity: "a tall wooden gate",
  locationId: "harbour"
}, {}, { locationId: "harbour", visualIdentity: "a stone harbour and a tall wooden gate" });
assert.strictEqual(gate.landmark, true);
var gateUnsure = Visual.judgeSightings([gate], {
  missingEntities: ["harbour-gate"],
  locationMatch: true,
  observations: ""
});
assert.strictEqual(gateUnsure[0].status, "uncertain");
assert.strictEqual(gateUnsure[0].redraw, false);

var tower = Visual.entitySpec({
  entityId: "clock-tower",
  name: "the clock tower",
  identity: "a tall stone tower"
}, {}, null);
assert.ok(tower.aliases.indexOf("tower") >= 0);
assert.strictEqual(Visual.judgeSightings([tower], {
  missingEntities: ["clock-tower"],
  observations: "a stone tower stands behind the street"
})[0].status, "confirmed");

assert.strictEqual(Visual.acceptIllustration({
  characters: [{ characterId: "sailor", identityMatch: true }],
  missingEntities: ["harbour-lamp"],
  observations: "the street is dark",
  locationMatch: true,
  prematureResult: false,
  textDetected: false,
  anatomyOk: true,
  textSafeUsable: true,
  duplicateCharacter: false
}, { charactersPresent: ["sailor"], entitySpecs: [lamp] }).ok, true);
assert.ok(Visual.acceptIllustration({
  characters: [{ characterId: "sailor", identityMatch: true }],
  missingEntities: ["cargo-crate"],
  observations: "an empty quay",
  duplicateCharacter: false,
  locationMatch: true,
  prematureResult: false,
  textDetected: false,
  anatomyOk: true,
  textSafeUsable: true
}, { charactersPresent: ["sailor"], entitySpecs: [crate] }).problems.indexOf("entity:cargo-crate") >= 0);

var lantern = Visual.defineStoryEntity({
  entityId: "harbour-lantern",
  identity: "a small brass lantern",
  state: "lit"
}, {
  visualIdentity: "the same brass lantern in every picture",
  shape: "a round lamp with a handle",
  relativeScale: "small enough to carry",
  materials: "brass and glass",
  colourLight: "warm yellow flame",
  distinctiveFeatures: ["a smiling face"],
  needsReference: false,
  referenceAssetIds: ["should-be-dropped"]
});
assert.strictEqual(lantern.face, "none");
assert.deepStrictEqual(lantern.distinctiveFeatures, []);
assert.deepStrictEqual(lantern.referenceAssetIds, []);
assert.strictEqual(lantern.scope, "book");
var faced = Visual.defineStoryEntity({
  entityId: "mask",
  identity: "a wooden mask with a painted smile",
  state: "hanging"
}, {
  shape: "oval",
  distinctiveFeatures: ["a painted smile"],
  needsReference: true,
  referenceAssetIds: ["mask-v1"]
});
assert.strictEqual(faced.face, "required");
assert.deepStrictEqual(faced.referenceAssetIds, ["mask-v1"]);
var counted = Visual.acceptIllustration({
  characters: [{ characterId: "sailor", identityMatch: true, count: 3, outfitMatch: true }],
  momentMatch: false,
  montageShown: true,
  locationMatch: true,
  prematureResult: false,
  textDetected: false,
  anatomyOk: true,
  textSafeUsable: true,
  duplicateCharacter: false
}, { charactersPresent: ["sailor"], characterInstances: { sailor: 1 }, montage: false, entitySpecs: [] });
assert.ok(counted.problems.indexOf("count:sailor") >= 0);
assert.ok(counted.problems.indexOf("moment") >= 0);
assert.ok(counted.problems.indexOf("montage") >= 0);

console.log("book-visual tests ok");
