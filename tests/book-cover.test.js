"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Cast = require("../js/character-bible.js");
var BookCast = require("../js/book-cast.js");
var Book = require("../js/book-brain.js");
var Visual = require("../js/book-visual.js");

var maya = Cast.getCharacter("maya");

function yardPages(who, count) {
  var pages = [];
  for (var i = 0; i < count; i += 1) {
    pages.push({
      pageId: "p" + (i + 1),
      beatId: "b" + (i + 1),
      locationId: "yard",
      charactersPresent: who,
      entitiesRequired: ["lantern"],
      action: "They wait in the yard.",
      shotType: "medium"
    });
  }
  return pages;
}

var quiet = {
  title: "The Little Lantern",
  tone: "bedtime",
  castIds: ["maya"],
  hook: "A lantern blinks in the shed.",
  premise: "Maya finds a lantern that is afraid of the dark.",
  centralProblem: "The lantern will not stay lit.",
  motif: "a small light",
  climaxBeatId: "b2",
  resolutionBeatId: "b3",
  emotionalArc: ["A small light asks for company."],
  locations: [
    { locationId: "shed", name: "the shed", visualIdentity: "a wooden shed with a shed door", connectedTo: ["lane"] },
    { locationId: "lane", name: "the lane", visualIdentity: "a dark lane beyond the shed", connectedTo: ["shed"] }
  ],
  entities: [
    { entityId: "lantern", name: "the lantern", identity: "a small warm lantern", locationId: "lane", state: "lit", introducedAt: "b1" },
    { entityId: "shed-door", name: "the shed door", identity: "the wooden door of the shed", locationId: "shed", state: "shut", introducedAt: "b1" }
  ]
};
var quietPages = yardPages(["maya"], 3);
quietPages[0].locationId = "shed";
quietPages[2].beatId = "b3";
var quietCover = Visual.planCover(quiet, quietPages);
assert.deepStrictEqual(quietCover.heroCharacterIds, ["maya"]);
assert.deepStrictEqual(quietCover.featuredEntityIds, ["lantern"]);
assert.strictEqual(quietCover.pageId, "cover");
assert.notStrictEqual(quietCover.pageId, quietPages[0].pageId);
assert.strictEqual(quietCover.shot, "cover");
assert.ok(quietCover.titleSafeRegion);
assert.strictEqual(quietCover.sourceSpreadId, null);
assert.strictEqual(quietCover.aliasesInterior, false);
assert.notStrictEqual(quietCover.coverMoment, quietPages[0].action);
assert.strictEqual(quietCover.illustratorId, "wondii-picture-book");

var duo = Book.coverPlan(Book.fixtureBible());
assert.deepStrictEqual(duo.protagonists, ["maya", "leo"]);
assert.deepStrictEqual(duo.heroCharacterIds, ["maya", "leo"]);
assert.strictEqual(duo.titleSafeRegion, "upper");
assert.strictEqual(duo.illustratorId, "wondii-picture-book");

var dogBook = {
  title: "Muddy Paws",
  tone: "funny",
  castIds: ["maya"],
  hook: "Pip will not come in from the rain.",
  premise: "Maya and Pip get caught in the rain.",
  locations: [{ locationId: "yard", name: "the yard", visualIdentity: "a wet yard", connectedTo: [] }],
  entities: [],
  storyCast: [{
    characterId: "pip",
    name: "Pip",
    origin: "story",
    type: "animal",
    species: "dog",
    covering: "short tan fur",
    markings: "one white ear",
    visualImportance: "important",
    referenceAssetIds: ["pip-v1"]
  }]
};
var dogPages = yardPages(["maya", "pip"], 3);
var dogCover = Visual.planCover(dogBook, dogPages);
assert.deepStrictEqual(dogCover.heroCharacterIds, ["maya", "pip"]);
assert.ok(dogCover.referenceAssetIds.indexOf("maya-v1") >= 0);
assert.ok(dogCover.referenceAssetIds.indexOf("pip-v1") >= 0);
var dogCast = BookCast.compileBookCast(dogBook, dogPages);
var dogPrompt = Visual.coverPrompt(dogBook, dogCover, dogCast.members);
assert.ok(dogPrompt.indexOf("pip-v1") >= 0);
assert.ok(dogPrompt.indexOf("Do not redesign") >= 0);
assert.ok(dogPrompt.indexOf("Muddy Paws") < 0);

var crowd = Visual.planCover({
  title: "The Whole Class",
  tone: "adventure",
  castIds: ["maya", "leo", "ravi", "mina"],
  hook: "The class arrives.",
  premise: "The class arrives at the gate.",
  locations: [{ locationId: "yard", name: "the yard", visualIdentity: "a yard", connectedTo: [] }],
  entities: []
}, []);
assert.strictEqual(crowd.heroCharacterIds.length, 2);
assert.ok(crowd.supportingCharacterIds.length >= 2);

var quietCast = BookCast.compileBookCast(quiet, quietPages);
var quietPrompt = Visual.coverPrompt(quiet, quietCover, quietCast.members);
assert.ok(quietPrompt.indexOf("The Little Lantern") < 0);
assert.ok(quietPrompt.indexOf("Leo") < 0);
assert.ok(quietPrompt.indexOf("Do not draw a title") >= 0);
assert.ok(quietPrompt.indexOf(quietCover.titleSafeRegion) >= 0);
assert.ok(quietPrompt.indexOf("Do not draw a box") >= 0);
assert.ok(quietPrompt.indexOf("wondii-picture-book") >= 0);
assert.ok(quietPrompt.indexOf(maya.hair) >= 0);
assert.ok(quietPrompt.indexOf("maya-v1") >= 0);
assert.ok(BookCast.redesignProblems(quietCast, { characterId: "maya", hair: "short blonde hair" }).length > 0);
assert.ok(quietPrompt.indexOf("short blonde hair") < 0);

var forced = Visual.planCover(quiet, quietPages, { pageStyle: { styleId: "glossy-animation", illustrator: { rendering: "3d" } }, aliasSpreadId: "p1" });
assert.strictEqual(forced.illustratorId, "wondii-picture-book");
assert.strictEqual(forced.style.illustrator.rendering, "soft painted picture-book");
assert.strictEqual(forced.sourceSpreadId, null);
var forcedPrompt = Visual.coverPrompt(quiet, forced, quietCast.members);
assert.ok(forcedPrompt.indexOf("glossy-animation") < 0);
assert.ok(forcedPrompt.indexOf("wondii-picture-book") >= 0);

var repair = Visual.coverRepairPrompt(quiet, quietCover, quietCast.members);
assert.ok(repair.indexOf("wondii-picture-book") >= 0);
assert.ok(repair.indexOf("maya-v1") >= 0);
assert.ok(repair.indexOf("The Little Lantern") < 0);

var source = fs.readFileSync(path.join(__dirname, "../js/book-visual.js"), "utf8");
assert.ok(source.indexOf("A Blink for the Sky") < 0);
assert.ok(Visual.COVER_TITLE_FAMILIES.indexOf("phrase-stack") >= 0);

var one = Visual.coverTitleLayout("Lantern", quietCover);
assert.strictEqual(one.family, "single-line");
assert.deepStrictEqual(one.lines, ["Lantern"]);

var medium = Visual.coverTitleLayout("The Little Lantern", quietCover);
assert.strictEqual(medium.family, "short-stack");
assert.strictEqual(medium.lines.join(" "), "The Little Lantern");
assert.ok(medium.lines.length === 2);

var phrase = Visual.coverTitleLayout("A Song for the Moon", quietCover);
assert.strictEqual(phrase.family, "phrase-stack");
assert.deepStrictEqual(phrase.lines, ["A Song", "for the", "Moon"]);
assert.ok(phrase.rows[1].every(function (word) { return word.role === "connector"; }));
assert.strictEqual(phrase.rows[0][0].role, "connector");
assert.strictEqual(phrase.rows[0][1].role, "primary");
assert.ok(phrase.lines.every(function (line) {
  var parts = line.split(/\s+/);
  var last = parts[parts.length - 1].toLowerCase();
  var connectors = { a: 1, an: 1, the: 1, for: 1, of: 1, to: 1, and: 1, in: 1, on: 1, with: 1, from: 1 };
  if (!connectors[last]) return true;
  return parts.every(function (word) { return connectors[word.toLowerCase()]; });
}));

var longTitle = Visual.coverTitleLayout("The Extraordinary Adventure Beneath the Playground", quietCover);
assert.strictEqual(longTitle.lines.join(" "), "The Extraordinary Adventure Beneath the Playground");
assert.ok(longTitle.lines.length >= 2 && longTitle.lines.length <= 4);
assert.ok(longTitle.lines.every(function (line) { return !/\b(the|for|of|to|and|in)$/i.test(line) || line.split(/\s+/).every(function (word) { return /^(a|an|the|for|of|to|and|in|on|with|from)$/i.test(word); }); }));
assert.strictEqual(longTitle.artworkUnchanged, true);
assert.strictEqual(longTitle.artwork, null);
assert.ok(longTitle.bounds.maxHeight);
assert.ok(parseFloat(longTitle.bounds.top) + parseFloat(longTitle.bounds.maxHeight) <= 42);
assert.ok(longTitle.minReadRem >= 0.7);

var many = Visual.coverTitleLayout("One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve", quietCover);
assert.strictEqual(many.family, "long-title");
assert.ok(many.lines.length >= 3 && many.lines.length <= 4);
assert.strictEqual(many.lines.join(" "), "One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve");
assert.strictEqual(many.artwork, one.artwork);

var switched = Visual.coverTitleLayout("A Song for the Moon", quietCover, { family: "wide-two-line", treatment: "offset" });
assert.strictEqual(switched.family, "wide-two-line");
assert.strictEqual(switched.treatment, "offset");
assert.notStrictEqual(switched.lines.join("|"), phrase.lines.join("|"));
assert.strictEqual(switched.artwork, phrase.artwork);
assert.strictEqual(switched.lines.join(" "), phrase.lines.join(" "));

var day = Visual.coverTitleLayout("The Little Lantern", { titleSafeRegion: "upper", lighting: "clear daylight", tone: "adventure" });
assert.strictEqual(day.contrast, "dark");
assert.strictEqual(phrase.contrast, "light");

var preview = Visual.coverPreviewDocument(quietCover, longTitle, "images/cover.jpg");
assert.ok(preview.indexOf("Extraordinary") >= 0);
assert.ok(preview.indexOf("images/cover.jpg") >= 0);
assert.ok(preview.indexOf("<img ") >= 0);
assert.ok(preview.indexOf("<h1") >= 0);
assert.ok(preview.indexOf("Fredoka") >= 0);
assert.ok(preview.indexOf("clamp(") >= 0);
assert.ok(preview.indexOf("cqi") >= 0);
assert.ok(preview.indexOf("A Wondii Story") >= 0);
assert.ok(preview.indexOf("wondi-wordmark.svg") >= 0);

var bookE = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/agent/book-v2/text-validation-depth/e/book.json"), "utf8"));
var starSpecs = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/agent/book-v2/visual-proof/e/story-entities.json"), "utf8"));
var bookCover = Visual.planCover(bookE.bible, bookE.pages, { bookId: "E", storyEntities: starSpecs });
assert.deepStrictEqual(bookCover.heroCharacterIds, ["maya"]);
assert.deepStrictEqual(bookCover.featuredEntityIds, ["hidden-star"]);
assert.ok(bookCover.referenceAssetIds.indexOf("maya-v1") >= 0);
assert.strictEqual(bookCover.illustratorId, "wondii-picture-book");
assert.ok(bookE.pages.every(function (page) { return page.pageId !== bookCover.pageId && page.action !== bookCover.coverMoment; }));
var bookCast = BookCast.compileBookCast(bookE.bible, bookE.pages);
var bookPrompt = Visual.coverPrompt(bookE.bible, bookCover, bookCast.members);
assert.ok(bookPrompt.indexOf("A Blink for the Sky") < 0);
assert.ok(bookPrompt.indexOf("wondii-picture-book") >= 0);
assert.ok(bookPrompt.indexOf("maya-v1") >= 0);
assert.ok(bookPrompt.indexOf("warm gold-white") >= 0);
assert.ok(/five even points|simple star/i.test(bookPrompt));
assert.ok(bookPrompt.indexOf("Face: none") < 0);
assert.strictEqual(Visual.coverQualityNotes({ qualityNotes: ["A little quiet."], readsAsInteriorSpread: true }).regenerate, false);

var passed = Visual.acceptCover({
  characters: [{ characterId: "maya", identityMatch: true, outfitMatch: true, count: 1 }],
  entities: [{ entityId: "hidden-star", status: "confirmed" }],
  textDetected: false,
  anatomyOk: true,
  textSafeUsable: true,
  duplicateCharacter: false,
  momentMatch: true,
  montageShown: false,
  entityHasFace: false,
  locationMatch: true,
  style: { rendering: "painted", proportions: "picture-book", finish: "picture-book" }
}, bookCover);
assert.strictEqual(passed.ok, true);
var faced = Visual.acceptCover({
  characters: [{ characterId: "maya", identityMatch: true, outfitMatch: true, count: 1 }],
  entities: [{ entityId: "hidden-star", status: "confirmed" }],
  textDetected: false,
  anatomyOk: true,
  entityHasFace: true,
  style: { rendering: "painted" }
}, bookCover);
assert.ok(faced.problems.indexOf("entity-face") >= 0);
