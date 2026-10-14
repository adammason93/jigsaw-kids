"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Cast = require("../js/character-bible.js");
var Book = require("../js/book-brain.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

var bible = Book.fixtureBible();
var book = Book.runFixture("secret-door");

assert.strictEqual(book.ok, true, book.problems.join(", "));
assert.deepStrictEqual(book.castIds, ["maya", "leo"]);
assert.deepStrictEqual(book.bible.castIds, ["maya", "leo"]);
assert.ok(book.pages[book.pages.length - 1].beatId === bible.resolutionBeatId);
assert.ok(book.stages.indexOf("writing") > book.stages.indexOf("planning"));
assert.ok(book.stages.indexOf("illustrating") < 0);
assert.strictEqual(book.imageCalls, 0);

var maya = Cast.getCharacter("maya");
assert.throws(function () { maya.hair = "green"; });
var changed = Cast.storyState(maya, { clothing: "raincoat", locationId: "hall", emotion: "cold" });
assert.strictEqual(changed.ok, true);
assert.strictEqual(changed.state.clothing, "raincoat");
assert.strictEqual(maya.defaultClothing, "yellow cardigan, white shirt, blue skirt, white socks");
assert.strictEqual(Cast.storyState(maya, { hair: "green" }).ok, false);
["leo", "ravi", "mina"].forEach(function (id) {
  var report = Cast.referenceReport(id);
  assert.deepStrictEqual(report.referenceAssetIds, []);
  assert.ok(report.missingReferences.indexOf("portrait") >= 0);
});
var mayaRef = Cast.referenceReport("maya");
assert.strictEqual(mayaRef.locked, true);
assert.deepStrictEqual(mayaRef.referenceAssetIds, ["maya-v1"]);
assert.strictEqual(mayaRef.versionId, "maya-v1");
assert.strictEqual(Cast.externalCharacterSlot({ characterId: "pupil-1" }).reason, "future");
assert.ok(!/require\(["']\.\/story-lesson/.test(fs.readFileSync(path.join(__dirname, "../js/character-bible.js"), "utf8")));
assert.ok(!/require\(["']\.\/story-lesson/.test(fs.readFileSync(path.join(__dirname, "../js/book-brain.js"), "utf8")));

var lostIdea = clone(bible);
lostIdea.premise = "A day at the park.";
lostIdea.hook = "Birds sing.";
lostIdea.beats.forEach(function (beat) { beat.action = "Birds sing."; });
assert.ok(Book.validateBible(lostIdea).problems.indexOf("idea-not-central") >= 0);

var noGoal = clone(bible);
noGoal.goal = "";
noGoal.centralProblem = "";
var goalProblems = Book.validateBible(noGoal).problems;
assert.ok(goalProblems.indexOf("goal-missing") >= 0);
assert.ok(goalProblems.indexOf("problem-missing") >= 0);

var noEnd = clone(bible);
noEnd.climaxBeatId = "";
noEnd.resolutionBeatId = "";
var endProblems = Book.validateBible(noEnd).problems;
assert.ok(endProblems.indexOf("climax-missing") >= 0);
assert.ok(endProblems.indexOf("resolution-missing") >= 0);
assert.strictEqual(Book.sealPlan(noEnd, book.pages).ok, false);
assert.ok(Book.commitProse(noEnd, book.pages, false).problems.indexOf("ending-not-planned") >= 0);

var dropped = clone(bible);
dropped.beats.forEach(function (beat) {
  beat.charactersPresent = ["maya"];
  beat.absent = {};
});
assert.ok(Book.validateBible(dropped).problems.indexOf("cast-missing:leo") >= 0);

var quiet = clone(bible);
quiet.beats.forEach(function (beat) { beat.expresses = []; });
assert.ok(Book.validateBible(quiet).problems.some(function (problem) { return problem.indexOf("personality-unused") === 0; }));

var repeated = clone(bible);
repeated.beats[2].problemFamily = "stuck";
repeated.beats[3].problemFamily = "stuck";
assert.ok(Book.validateBible(repeated).problems.some(function (problem) { return problem.indexOf("story-repetition") === 0; }));

var earlyKey = clone(bible);
earlyKey.entities[1].introducedAt = "b6";
assert.ok(Book.validateBible(earlyKey).problems.some(function (problem) { return problem.indexOf("object-unintroduced:golden-key") === 0; }));

var moon = clone(bible);
moon.beats[5].stateAfter.characters[0].locationId = "moon";
assert.ok(Book.validateBible(moon).problems.indexOf("teleport:maya") >= 0);

var shortBook = clone(bible);
shortBook.targetLength = "adventure";
assert.ok(Book.validateBible(shortBook, { length: "adventure", idea: bible.userIdea, yearGroup: "Year 2", castIds: bible.castIds }).problems.indexOf("length-shape") >= 0);

assert.notDeepStrictEqual(Book.lengthProfile("quick").roles, Book.lengthProfile("storybook").roles);
assert.notDeepStrictEqual(Book.lengthProfile("storybook").roles, Book.lengthProfile("adventure").roles);
assert.ok(Book.lengthProfile("adventure").roles.length > Book.lengthProfile("storybook").roles.length);
assert.ok(Book.lengthProfile("storybook").roles.length > Book.lengthProfile("quick").roles.length);

var keyPage = book.pages.filter(function (page) {
  return page.stateAfter.entities.some(function (entity) {
    return entity.entityId === "golden-key" && entity.ownerCharacterId === "maya";
  });
})[0];
var keyIndex = book.pages.indexOf(keyPage);
assert.ok(keyIndex > 0);
assert.ok(book.pages[keyIndex].stateBefore.entities.some(function (entity) {
  return entity.entityId === "golden-key" && !entity.ownerCharacterId;
}));
assert.ok(book.pages[keyIndex + 1].stateBefore.entities.some(function (entity) {
  return entity.entityId === "golden-key" && entity.ownerCharacterId === "maya";
}));
assert.strictEqual(
  book.pages[keyIndex].stateAfter.entities.filter(function (entity) { return entity.entityId === "golden-key"; })[0].entityId,
  book.pages[keyIndex + 1].stateBefore.entities.filter(function (entity) { return entity.entityId === "golden-key"; })[0].entityId
);

var whistle = clone(book.pages[0]);
whistle.sentences = [{ text: "Maya found a silver whistle.", entities: ["silver-whistle"], locations: [] }];
var invented = Book.commitProse(bible, [whistle], true);
assert.ok(invented.problems.some(function (problem) { return problem.indexOf("unplanned-object") === 0; }));

var moonLine = clone(book.pages[0]);
moonLine.sentences = [{ text: "Maya stopped in the school hall.", entities: [], locations: ["moon-base"] }];
assert.ok(Book.commitProse(bible, [moonLine], true).problems.some(function (problem) {
  return problem.indexOf("unplanned-location") === 0;
}));

assert.ok(Book.textLimits("Reception").maxSentenceWords < Book.textLimits("Year 6").maxSentenceWords);
assert.strictEqual(Book.textLimits("Reception").maxDialogueTurns, 0);
var longLine = clone(book.pages[0]);
longLine.sentences = [{ text: "Maya stopped in the school hall and then she kept talking for a very long time indeed today.", entities: [], locations: [] }];
assert.ok(Book.commitProse(bible, [longLine], true).problems.some(function (problem) { return problem.indexOf("age-sentence") === 0; }));

var sameShot = clone(book.pages);
sameShot[1].shotType = sameShot[0].shotType;
assert.ok(Book.compositionProblems(sameShot).some(function (problem) { return problem.indexOf("composition-repeat") === 0; }));
assert.deepStrictEqual(Book.compositionProblems(book.pages), []);

var provider = { calls: 0, draw: function () { provider.calls += 1; } };
var blocked = Book.requestImages({ textReview: { ok: false }, storyReview: { ok: false } }, provider);
assert.strictEqual(blocked.reason, "text_review");
assert.strictEqual(blocked.imageCalls, 0);
assert.strictEqual(provider.calls, 0);
var held = Book.requestImages({ textReview: book.textReview, storyReview: book.storyReview }, provider);
assert.strictEqual(held.reason, "images_disabled");
assert.strictEqual(provider.calls, 0);

var view = Book.generationView({ stage: "planning" });
assert.strictEqual(view.percent, null);
assert.strictEqual(view.determinate, false);
assert.ok(view.label.indexOf("%") < 0);
var illustrating = Book.generationView({ stage: "illustrating", pageCount: 12, illustrating: { index: 4 } });
assert.strictEqual(illustrating.pageLabel, "Illustrating page 4 of 12");
assert.strictEqual(illustrating.percent, null);

var request = Book.publicRequest({
  castIds: ["maya", "leo"],
  idea: "They discover a secret door underneath their school.",
  yearGroup: "Year 2",
  length: "storybook",
  tone: "magical",
  prompt: "secret prompt",
  seed: 9,
  model: "gpt",
  style: "watercolor"
});
assert.deepStrictEqual(Object.keys(request), Book.PUBLIC_KEYS);
assert.strictEqual(request.prompt, undefined);
assert.deepStrictEqual(request.castIds, ["maya", "leo"]);
var accepted = Book.acceptCreation(request);
assert.strictEqual(accepted.ok, true);
assert.strictEqual(accepted.imageCalls, 0);
assert.strictEqual(accepted.cast[0].characterId, "maya");
assert.ok(Book.acceptCreation({ castIds: ["maya", "leo", "ravi", "mina", "extra"], idea: "A door.", yearGroup: "Year 2", length: "quick" }).problems.indexOf("cast-size") >= 0);

var legacy = {
  id: "b-old",
  title: "Old Tale",
  author: "Sam",
  readerArtLayout: "duplex",
  storyTextMode: "rhyme",
  storyLength: "short",
  pages: [
    { text: "Once a rhyme.", imageDataUrl: null, imageUrlFallback: "https://example.com/a.jpg", textSafeZones: [{ side: "left", position: "upper-left" }] },
    { text: "", imageUrlFallback: null }
  ]
};
var legacyStory = Book.readerStoryFromShelfItem(legacy);
assert.strictEqual(legacyStory.pages[0].text, "Once a rhyme.");
assert.strictEqual(legacyStory.pages[0].imageUrl, "https://example.com/a.jpg");
assert.strictEqual(legacyStory.storyTextMode, "rhyme");
assert.ok(legacyStory.pages[0].textSafeZones);

assert.strictEqual(book.readerStory.pages[0].text.indexOf("Maya stopped") >= 0, true);
assert.strictEqual(book.readerStory.pages[0].imageUrl, null);
assert.notStrictEqual(book.cover.pageId, book.pages[0].pageId);
assert.strictEqual(book.cover.titleSafeRegion, "upper");
assert.deepStrictEqual(book.cover.protagonists, ["maya", "leo"]);

var repair = Book.repairRequest({ castIds: bible.castIds, visualStyle: bible.visualStyle, pages: book.pages }, "p4");
assert.deepStrictEqual(repair.pageIds, ["p4"]);
assert.strictEqual(repair.previousPageId, "p3");
assert.strictEqual(repair.nextPageId, "p5");
assert.ok(repair.stateBefore);

var edit = Book.applyTextEdit(book, "p1", "Maya stopped in the school hall. Leo waited beside her.");
assert.strictEqual(edit.ok, true);
assert.strictEqual(edit.imageStale, false);
assert.strictEqual(edit.imageCalls, 0);
var stale = Book.applyTextEdit(book, "p1", "Maya stopped in the school hall with the golden key.");
assert.strictEqual(stale.imageStale, true);
assert.strictEqual(stale.imageCalls, 0);

var ui = fs.readFileSync(path.join(__dirname, "../games/book-create.js"), "utf8");
assert.ok(ui.indexOf("publicRequest") >= 0);
assert.ok(ui.indexOf("w-card--interactive") >= 0);
assert.ok(ui.indexOf("w-btn--primary") >= 0);
assert.ok(ui.indexOf("aria-valuenow") < 0);
assert.ok(!/pictureQuality|illustrationStyle|sbIllustration/.test(ui));

var flatEnd = clone(bible);
flatEnd.beats.forEach(function (beat) {
  if (beat.beatId === flatEnd.climaxBeatId || beat.beatId === flatEnd.resolutionBeatId) beat.action = "Everyone smiled.";
});
assert.ok(Book.validateBible(flatEnd).problems.indexOf("idea-not-structural") >= 0);

var toldPages = clone(book.pages);
toldPages[0].prose = "Maya was curious. Leo waited beside her.";
assert.ok(Book.reviewText(bible, toldPages).problems.indexOf("trait-told") >= 0);

assert.notStrictEqual(Book.YEAR_WRITING.Reception, Book.YEAR_WRITING["Year 6"]);
assert.notStrictEqual(Book.TONE_WRITING.bedtime, Book.TONE_WRITING.adventure);
assert.notStrictEqual(Book.TONE_WRITING.funny, Book.TONE_WRITING.mystery);
assert.ok(Book.lengthProfile("quick").roles.indexOf("attempt") >= 0);
assert.strictEqual(Book.MAX_REPAIRS, 2);
assert.strictEqual(Book.IMAGES_ENABLED, false);

function shadowRequest() {
  return {
    castIds: ["ravi"],
    idea: "Ravi's shadow keeps running away from him.",
    yearGroup: "Reception",
    length: "quick",
    tone: "funny"
  };
}

function shadowDraft() {
  return {
    title: "The Shadow That Ran",
    premise: "Ravi's shadow keeps running away from him.",
    hook: "Ravi's shadow keeps running away from his shoes.",
    goal: "Get the shadow to stay.",
    centralProblem: "The shadow keeps running away.",
    stakes: "Ravi may be left without a shadow.",
    motif: "a loose shadow",
    locations: [
      { locationId: "bedroom", name: "bedroom", connectedTo: ["landing"], visualIdentity: "small bedroom" },
      { locationId: "landing", name: "landing", connectedTo: [], visualIdentity: "landing by the stairs" }
    ],
    entities: [{ entityId: "shadow", name: "shadow", identity: "Ravi's own shadow" }],
    beats: [
      { role: "hook", locationId: "bedroom", charactersPresent: ["ravi"], expresses: [{ characterId: "ravi", trait: "inventive", shows: "He pins a sock over the loose shape." }], problemFamily: "", action: "Ravi's shadow keeps running away from his shoes.", emotion: "surprised", shotType: "establishing", compositionIntent: "A small bedroom.", textPurpose: "hook", pageTurnHook: "The shadow reached the door.", visualFocus: "A loose shadow.", entityState: [{ entityId: "shadow", introduce: true, ownerCharacterId: null, locationId: "bedroom", state: "loose" }] },
      { role: "discovery", locationId: "bedroom", charactersPresent: ["ravi"], expresses: [], problemFamily: "escape", action: "The loose shadow slips beneath the bedroom rug.", emotion: "cross", shotType: "medium", compositionIntent: "The rug.", textPurpose: "discovery", pageTurnHook: "It slipped onward.", visualFocus: "The shadow on the rug.", entityState: [] },
      { role: "attempt", locationId: "landing", charactersPresent: ["ravi"], expresses: [], problemFamily: "chase", action: "Ravi follows because the shadow keeps running away.", emotion: "sorry", shotType: "action", compositionIntent: "The landing.", textPurpose: "attempt", pageTurnHook: "The shadow waited.", visualFocus: "Ravi on the landing.", entityState: [{ entityId: "shadow", ownerCharacterId: null, locationId: "landing", state: "running" }] },
      { role: "turn", locationId: "landing", charactersPresent: ["ravi"], expresses: [], problemFamily: "wait", action: "Ravi waits on the landing. The shadow will not come closer.", emotion: "sorry", shotType: "reaction", compositionIntent: "Ravi still.", textPurpose: "turn", pageTurnHook: "", visualFocus: "Ravi waiting.", entityState: [] },
      { role: "climax", locationId: "landing", charactersPresent: ["ravi"], expresses: [{ characterId: "ravi", trait: "bold", shows: "He steps into the dark and holds still." }], problemFamily: "choice", action: "Ravi stands still so his shadow stops running away.", emotion: "brave", shotType: "close", compositionIntent: "Stillness.", textPurpose: "climax", pageTurnHook: "Will it stay?", visualFocus: "Ravi holding still.", entityState: [{ entityId: "shadow", ownerCharacterId: "ravi", state: "caught" }] },
      { role: "resolution", locationId: "bedroom", charactersPresent: ["ravi"], expresses: [], problemFamily: "", action: "Ravi's shadow keeps close and stops running away.", emotion: "glad", shotType: "reveal", compositionIntent: "The bedroom again.", textPurpose: "resolution", pageTurnHook: "And then?", visualFocus: "Shadow at his feet.", entityState: [] }
    ]
  };
}

var compiled = Book.compileStory(shadowDraft(), shadowRequest());
assert.strictEqual(compiled.ok, true, compiled.problems.join(", "));
assert.deepStrictEqual(compiled.bible.castIds, ["ravi"]);
assert.strictEqual(compiled.bible.userIdea, shadowRequest().idea);
assert.strictEqual(compiled.bible.beats[0].stateAfter.entities[0].entityId, "shadow");
assert.strictEqual(compiled.bible.beats[1].stateBefore.entities[0].entityId, "shadow");
assert.strictEqual(compiled.bible.beats[2].stateAfter.entities[0].ownerCharacterId, null);
assert.strictEqual(compiled.bible.beats[5].stateAfter.entities[0].ownerCharacterId, "ravi");
assert.strictEqual(compiled.bible.beats[5].stateAfter.entities[0].locationId, "bedroom");
var plannedShadow = Book.planPages(compiled.bible);
assert.strictEqual(plannedShadow.ok, true, plannedShadow.problems.join(", "));
assert.ok(plannedShadow.pages.filter(function (page) { return page.pageTurnHook; }).length < plannedShadow.pages.length);
assert.ok(plannedShadow.pages.filter(function (page) { return page.pageTurnHook; }).length < plannedShadow.pages.length);

var sameShot = shadowDraft();
sameShot.beats.forEach(function (beat) { beat.shotType = "establishing"; });
var fixedShots = Book.compileStory(sameShot, shadowRequest());
assert.notStrictEqual(fixedShots.bible.beats[0].shotType, fixedShots.bible.beats[1].shotType);

var intruder = shadowDraft();
intruder.beats[0].charactersPresent = ["ravi", "dragon"];
assert.ok(Book.compileStory(intruder, shadowRequest()).problems.some(function (problem) {
  return problem.indexOf("unplanned-character:dragon") === 0;
}));

var withMoth = shadowDraft();
withMoth.storyCast = [{
  characterId: "porch-moth",
  name: "the porch moth",
  type: "animal",
  species: "moth",
  colouring: "grey",
  markings: "two eye spots",
  distinctiveFeatures: ["two eye spots"],
  referenceAssetIds: ["porch-moth-v1"]
}];
withMoth.beats[0].charactersPresent = ["ravi", "porch-moth"];
withMoth.beats[0].characterState = [{ characterId: "porch-moth", mud: "dusty" }];
withMoth.beats[2].charactersPresent = ["ravi", "porch-moth"];
var mothBook = Book.compileStory(withMoth, shadowRequest());
assert.strictEqual(mothBook.ok, true, mothBook.problems.join(", "));
assert.strictEqual(mothBook.bible.storyCast[0].markings, "two eye spots");
assert.strictEqual(mothBook.bible.storyCast[0].species, "moth");
assert.strictEqual(mothBook.bible.beats[2].stateBefore.characters.filter(function (row) {
  return row.characterId === "porch-moth";
})[0].mud, "dusty");

var named = shadowDraft();
named.beats[0].expresses[0].shows = "Ravi was inventive.";
assert.ok(Book.compileStory(named, shadowRequest()).problems.some(function (problem) {
  return problem.indexOf("trait-told") === 0;
}));

var generic = shadowDraft();
generic.beats[4].action = "Everyone smiled.";
generic.beats[5].action = "The room grew quiet.";
assert.ok(Book.compileStory(generic, shadowRequest()).problems.indexOf("idea-not-structural") >= 0);

var spoken = plannedShadow.pages.map(function (page, index) {
  if (index === 4) return { pageId: page.pageId, sentences: ["Ravi's shadow stops running away."] };
  if (index === 5) return { pageId: page.pageId, sentences: ["His shadow stays close."] };
  if (index === 2) return { pageId: page.pageId, sentences: ["The landing is quiet."] };
  return { pageId: page.pageId, sentences: ["A sock pins it."] };
});
var attached = Book.attachSpokenProse(compiled.bible, plannedShadow.pages, spoken);
assert.strictEqual(attached.ok, true, attached.problems.join(", "));
assert.ok(attached.pages[4].prose.indexOf("shadow") >= 0);
assert.ok(attached.pages[5].prose.indexOf("shadow") >= 0);
var images = Book.requestImages({ textReview: attached, storyReview: compiled }, { draw: function () { throw new Error("image provider called"); } });
assert.strictEqual(images.imageCalls, 0);
assert.strictEqual(images.reason, "images_disabled");

function proseReview(year, idea, castIds, lines) {
  return Book.reviewText({
    yearGroup: year,
    userIdea: idea,
    castIds: castIds,
    climaxBeatId: "b1",
    resolutionBeatId: "b" + lines.length
  }, lines.map(function (line, index) {
    return { pageId: "p" + (index + 1), beatId: "b" + (index + 1), prose: line };
  }));
}

var echoed = proseReview("Year 3", "They wake up and discover their town is floating in the clouds.", ["maya"], [
  "Maya stepped, and the rooftops shifted.",
  "When you wake and discover your town floating in clouds, where do you step?"
]);
assert.ok(echoed.problems.indexOf("prompt-echo:p2") >= 0, echoed.problems.join(", "));

var nouns = proseReview("Year 3", "They find a tiny dragon hiding underneath their school.", ["maya", "leo"], [
  "Maya waited by the hatch.",
  "Leo held the tiny dragon. The school was quiet."
]);
assert.ok(nouns.problems.indexOf("prompt-echo:p1") < 0, nouns.problems.join(", "));
assert.ok(nouns.problems.indexOf("prompt-echo:p2") < 0, nouns.problems.join(", "));

var explained = proseReview("Year 5", "Every clock in the world suddenly stops except one.", ["leo", "ravi", "mina"], [
  "Leo held the link. Ravi joined the chain and every clock in the world started.",
  "Mina said every clock in the world started because the chain was whole."
]);
assert.ok(explained.problems.indexOf("ending-repeated:p2") >= 0, explained.problems.join(", "));

var toldEnding = proseReview("Year 2", "Maya finds a lonely star that is scared to go back into the sky.", ["maya"], [
  "Maya listened. The star reached the sky.",
  "The star wasn't lonely or scared anymore."
]);
assert.ok(toldEnding.problems.indexOf("emotion-told:p2") >= 0, toldEnding.problems.join(", "));

var fiveShort = proseReview("Year 5", "Every clock in the world suddenly stops except one.", ["leo"], [
  "The clock held. The world waited. Leo watched. A hand moved. Then another.",
  "Leo closed the door."
]);
assert.ok(!fiveShort.problems.some(function (problem) { return problem.indexOf("reading-load") === 0 || problem.indexOf("age-amount") === 0; }), fiveShort.problems.join(", "));
assert.strictEqual(fiveShort.ok, true, fiveShort.problems.join(", "));

function heavyLine(first) {
  var parts = [first];
  var i;
  for (i = 1; i < 20; i += 1) parts.push("tick");
  return parts.join(" ");
}
var heavy = proseReview("Year 5", "Every clock in the world suddenly stops except one.", ["leo"], [
  [heavyLine("Clock"), heavyLine("World"), heavyLine("Leo"), heavyLine("Hands")].join(". ") + ".",
  "Leo nodded."
]);
assert.ok(heavy.problems.indexOf("reading-load:p1") >= 0, heavy.problems.join(", "));
assert.ok(!heavy.problems.some(function (problem) { return problem.indexOf("age-sentence:p1") === 0; }), heavy.problems.join(", "));

var climbs = proseReview("Year 1", "They find a tiny dragon hiding underneath their school.", ["maya"], [
  "They climb the stair. Maya sees the dragon.",
  "They climb again. The school is quiet."
]);
assert.ok(climbs.problems.indexOf("pattern-repeat:p2") >= 0, climbs.problems.join(", "));

var refrain = proseReview("Reception", "Ravi's shadow keeps running away from him.", ["ravi"], [
  "Ravi's shadow keeps running away from him.",
  "Ravi's shadow keeps running away from him."
]);
assert.strictEqual(refrain.ok, true, refrain.problems.join(", "));
assert.ok(!refrain.problems.some(function (problem) { return problem.indexOf("prompt-echo") === 0 || problem.indexOf("pattern-repeat") === 0; }));

var namedShadow = proseReview("Reception", "Ravi's shadow keeps running away from him.", ["ravi"], [
  "Ravi plants his feet. His shadow races past his shoes.",
  "Ravi tiptoes. His shadow stays beside him."
]);
assert.ok(namedShadow.problems.indexOf("idea-not-central") < 0, namedShadow.problems.join(", "));
var driftedShadow = proseReview("Reception", "Ravi's shadow keeps running away from him.", ["ravi"], [
  "Ravi plants his feet.",
  "Ravi tiptoes home."
]);
assert.ok(driftedShadow.problems.indexOf("idea-not-central") >= 0);

var quickShape = Book.lengthShape(bible.beats, Book.lengthProfile("quick"));
assert.ok(quickShape.indexOf("length-shape") < 0, quickShape.join(", "));
assert.ok(quickShape.indexOf("depth-thin") < 0, quickShape.join(", "));
var storybookShape = Book.lengthShape(bible.beats, Book.lengthProfile("storybook"));
assert.ok(storybookShape.indexOf("length-shape") >= 0);
var adventureShape = Book.lengthShape(bible.beats, Book.lengthProfile("adventure"));
assert.ok(adventureShape.indexOf("length-shape") >= 0);

var splitBeats = clone(bible.beats);
splitBeats[2].action = splitBeats[1].action;
var split = Book.lengthShape(splitBeats, Book.lengthProfile("quick"));
assert.ok(split.some(function (problem) { return problem.indexOf("beat-split") === 0; }), split.join(", "));
assert.ok(split.indexOf("depth-thin") >= 0 || split.some(function (problem) { return problem.indexOf("beat-split") === 0; }));

var quietBeats = clone(bible.beats);
quietBeats[3].role = "reaction";
quietBeats[3].experience = "reaction";
quietBeats[3].action = "Maya knelt and listened to the floor. Leo stayed beside her.";
var quiet = Book.lengthShape(quietBeats, Book.lengthProfile("quick"));
assert.ok(!quiet.some(function (problem) { return problem.indexOf("beat-split") === 0; }), quiet.join(", "));
assert.ok(quiet.indexOf("depth-thin") < 0, quiet.join(", "));

var yearOne = Book.readerProfile({ yearGroup: "Year 1", length: "quick" });
var ageFive = Book.readerProfile({ ageBand: "5-6", length: "storybook" });
assert.strictEqual(yearOne.limits.maxSentenceWords, ageFive.limits.maxSentenceWords);
assert.strictEqual(yearOne.limits.maxPageWords, ageFive.limits.maxPageWords);
assert.strictEqual(yearOne.narrativeComplexity, ageFive.narrativeComplexity);
assert.notStrictEqual(Book.readerProfile({ yearGroup: "Year 2" }).limits.maxSentenceWords, ageFive.limits.maxSentenceWords);
assert.strictEqual(Book.readerProfile({ yearGroup: "Reception" }).narrativeComplexity, Book.readerProfile({ ageBand: "3-4" }).narrativeComplexity);
assert.strictEqual(Book.readerProfile({ yearGroup: "Year 3" }).limits.maxPageWords, Book.readerProfile({ ageBand: "7-8" }).limits.maxPageWords);
assert.strictEqual(Book.readerProfile({ yearGroup: "Year 5" }).limits.maxSentenceWords, Book.readerProfile({ ageBand: "9-10" }).limits.maxSentenceWords);
assert.strictEqual(Book.readerProfile({ yearGroup: "Year 6" }).limits.maxPageWords, Book.readerProfile({ ageBand: "11-12" }).limits.maxPageWords);
assert.notStrictEqual(Book.readerProfile({ yearGroup: "Year 4" }).stage, Book.readerProfile({ ageBand: "7-8" }).stage);

var receptionAdventure = Book.readerProfile({ yearGroup: "Reception", length: "adventure" });
var receptionQuick = Book.readerProfile({ yearGroup: "Reception", length: "quick" });
assert.strictEqual(receptionAdventure.limits.maxSentenceWords, receptionQuick.limits.maxSentenceWords);
assert.strictEqual(receptionAdventure.narrativeComplexity, receptionQuick.narrativeComplexity);
assert.strictEqual(receptionAdventure.limits.maxPageWords, Book.textLimits("Reception").maxPageWords);

var olderQuick = Book.readerProfile({ yearGroup: "Year 6", length: "quick" });
var olderAdventure = Book.readerProfile({ yearGroup: "Year 6", length: "adventure" });
assert.strictEqual(olderQuick.limits.maxSentenceWords, olderAdventure.limits.maxSentenceWords);
assert.strictEqual(olderQuick.narrativeComplexity, olderAdventure.narrativeComplexity);
assert.ok(olderQuick.limits.maxSentenceWords > Book.textLimits("Reception").maxSentenceWords);

assert.ok(ui.indexOf('"radiogroup"') >= 0);
assert.ok(ui.indexOf('"radio"') >= 0);
assert.ok(ui.indexOf("Who's reading?") >= 0);
assert.ok(ui.indexOf("Who's the story for?") >= 0);
assert.ok(ui.indexOf('length: "storybook"') >= 0);
assert.ok(ui.indexOf("Recommended") >= 0);
assert.ok(ui.indexOf("data-cast-source") >= 0 && ui.indexOf('"saved"') >= 0);
assert.ok(ui.indexOf("Choose your characters") >= 0);
assert.ok(ui.indexOf("renderPicker") >= 0);
assert.ok(fs.readFileSync(path.join(__dirname, "../schools/learn/character-portal.js"), "utf8").indexOf("Wondii Crew") >= 0);
assert.ok(ui.indexOf("secret door") < 0);
assert.ok(ui.indexOf("ArrowRight") >= 0);

var familyBook = Book.compileStory({
  title: "Yesterday's puddle",
  premise: "Leo finds a puddle that shows him yesterday.",
  hook: "A puddle holds yesterday.",
  goal: "See yesterday without stepping in.",
  centralProblem: "Leo cannot step into yesterday.",
  stakes: "Yesterday may fade.",
  emotionalArc: ["curious", "surprised", "careful", "hopeful", "brave", "glad"],
  motif: "a still puddle",
  locations: [
    { locationId: "yard", name: "yard", connectedTo: ["path"], visualIdentity: "a wet yard" },
    { locationId: "path", name: "path", connectedTo: ["yard"], visualIdentity: "a path home" }
  ],
  entities: [],
  beats: [
    { role: "hook", locationId: "yard", charactersPresent: ["leo"], expresses: [{ characterId: "leo", trait: "careful", shows: "He stops before the water." }], action: "Leo finds a puddle that shows him yesterday.", emotion: "curious", shotType: "establishing", visualFocus: "The puddle.", worldState: "still-water", entityState: [] },
    { role: "discovery", locationId: "yard", charactersPresent: ["leo"], expresses: [], action: "Yesterday's Leo waves from the puddle.", emotion: "surprised", shotType: "close", visualFocus: "A wave.", worldState: "yesterday-visible", entityState: [] },
    { role: "attempt", locationId: "yard", charactersPresent: ["leo"], expresses: [], action: "Leo steps in. The picture breaks.", emotion: "sorry", shotType: "action", visualFocus: "Ripples.", worldState: "picture-broken", entityState: [] },
    { role: "turn", locationId: "yard", charactersPresent: ["leo"], expresses: [], action: "Leo waits until the water is still.", emotion: "careful", shotType: "reaction", visualFocus: "Still water.", worldState: "water-settling", entityState: [] },
    { role: "climax", locationId: "yard", charactersPresent: ["leo"], expresses: [{ characterId: "leo", trait: "kind", shows: "He waves back and does not step in." }], action: "Leo waves at the puddle, and yesterday waves too.", emotion: "glad", shotType: "medium", visualFocus: "Two waves.", worldState: "wave-returned", entityState: [] },
    { role: "resolution", locationId: "path", charactersPresent: ["leo"], expresses: [], action: "Leo walks home. The puddle keeps yesterday.", emotion: "glad", shotType: "reveal", visualFocus: "The path.", entityState: [] }
  ]
}, { castIds: ["leo"], idea: "Leo finds a puddle that shows him yesterday.", ageBand: "5-6", length: "quick", tone: "magical", context: "family" });
assert.strictEqual(familyBook.ok, true, (familyBook.problems || []).join(", "));
assert.strictEqual(familyBook.bible.yearGroup, "");
assert.strictEqual(familyBook.bible.ageBand, "5-6");
assert.strictEqual(familyBook.bible.readerStage, "year1");
assert.strictEqual(Book.limitsFor(familyBook.bible).maxSentenceWords, Book.textLimits("Year 1").maxSentenceWords);

console.log("book-brain tests ok");
