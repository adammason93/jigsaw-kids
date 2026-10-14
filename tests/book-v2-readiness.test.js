"use strict";

var assert = require("assert");
var Readiness = require("../scripts/book/readiness.js");
var Shelf = require("../js/book-v2-shelf.js");

var CAST = ["wondii-maya", "wondii-leo", "char_pip"];
var PLACES = [
  { locationId: "gate", name: "castle gate", connectedTo: ["hall"], visualIdentity: "a stone arch" },
  { locationId: "hall", name: "great hall", connectedTo: ["gate", "stair"], visualIdentity: "a long hall" },
  { locationId: "stair", name: "winding stair", connectedTo: ["hall", "tower"], visualIdentity: "a narrow stair" },
  { locationId: "tower", name: "high tower", connectedTo: ["stair", "garden"], visualIdentity: "a round room" },
  { locationId: "garden", name: "quiet garden", connectedTo: ["tower"], visualIdentity: "a walled garden" }
];
var ROLES = ["hook", "discovery", "reaction", "relationship", "attempt", "complication", "reveal", "setback", "exploration", "approach", "climax", "resolution"];
var WHERE = ["gate", "gate", "hall", "hall", "stair", "stair", "tower", "tower", "garden", "garden", "tower", "garden"];
var SHOTS = ["establishing", "close", "reaction", "medium", "action", "overhead", "low", "high", "reveal", "vignette", "establishing", "close"];
var FAMILIES = ["", "found", "listen", "trust", "climb", "snag", "window", "gust", "path", "last", "return", ""];
var ACTIONS = [
  "Maya waits while Pip looks along the castle gate.",
  "A paper lantern is caught under the castle gate.",
  "Pip follows the paper lantern into the hall.",
  "The fox sits and watches the paper lantern.",
  "Leo checks each step before anyone follows.",
  "The paper lantern snags and Pip stops.",
  "Maya sees the paper lantern by the tower window.",
  "A gust takes the paper lantern off the sill.",
  "Pip follows the paper lantern along the path.",
  "The fox leads them toward the last turn.",
  "Maya holds the paper lantern steady in the castle.",
  "The paper lantern rests, and the castle is quiet."
];
var LINES = [
  "Maya waits by the closed door.",
  "Leo points at the paper lantern.",
  "Pip steps closer to listen.",
  "A small fox keeps one ear turned.",
  "Leo tests the next step.",
  "The light snags on a rail.",
  "Maya sees the light in a high window.",
  "A gust pushes the light away.",
  "Pip walks the long path.",
  "The fox pads beside the wall.",
  "Maya cups the pale light.",
  "The light sits still on the wall."
];

function draft() {
  return {
    title: "The Paper Lantern",
    premise: "Maya and Pip follow a paper lantern through the castle.",
    hook: "A paper lantern is caught at the castle gate.",
    goal: "Help the lantern get home.",
    centralProblem: "The paper lantern is stuck and keeps moving away.",
    stakes: "The lantern may be lost in the castle.",
    motif: "a paper lantern",
    locations: PLACES,
    entities: [{ entityId: "lantern", name: "lantern", identity: "a paper lantern" }],
    storyCast: [{
      characterId: "fox-1",
      name: "Bramble",
      type: "creature",
      species: "fox",
      face: "a small fox face",
      colouring: "red",
      markings: "one white ear",
      covering: "short fur",
      accessories: ["a blue scarf"],
      distinctiveFeatures: ["one white ear"]
    }],
    beats: ROLES.map(function (role, index) {
      var present = CAST.slice();
      if (index >= 2) present.push("fox-1");
      var beat = {
        role: role,
        locationId: WHERE[index],
        charactersPresent: present,
        expresses: [],
        problemFamily: FAMILIES[index],
        action: ACTIONS[index],
        emotion: index === 10 ? "brave" : "steady",
        shotType: SHOTS[index],
        compositionIntent: "View " + (index + 1) + " of this place.",
        textPurpose: role,
        pageTurnHook: index === 0 || index === 3 || index === 7 ? "What happens next?" : "",
        visualFocus: "The next change in the castle.",
        goalNow: "step-" + (index + 1),
        obstacleNow: "block-" + (index + 1),
        worldState: "state-" + (index + 1),
        entityState: []
      };
      if (index === 0) beat.expresses.push({ characterId: "wondii-maya", trait: "curious", shows: "She kneels and listens at the gate." });
      if (index === 4) beat.expresses.push({ characterId: "wondii-leo", trait: "careful", shows: "He checks the step before he climbs." });
      if (index === 1) beat.entityState.push({ entityId: "lantern", introduce: true, ownerCharacterId: null, locationId: "gate", state: "caught" });
      if (index === 5) beat.entityState.push({ entityId: "lantern", ownerCharacterId: "char_pip", locationId: "stair", state: "carried" });
      if (index === 10) beat.entityState.push({ entityId: "lantern", ownerCharacterId: "wondii-maya", locationId: "tower", state: "steady" });
      return beat;
    })
  };
}

function spoken() {
  return {
    pages: LINES.map(function (line, index) {
      return { pageId: "p" + (index + 1), sentences: [line] };
    })
  };
}

var body = {
  familyAgeBand: "7-9",
  members: [
    { id: "wondii-maya", name: "Maya", source: "wondii-crew" },
    { id: "wondii-leo", name: "Leo", source: "wondii-crew" },
    { id: "char_pip", name: "Pip", source: "saved" }
  ],
  savedReferences: [{
    id: "char_pip",
    name: "Pip",
    ownerType: "family",
    ownerId: "family-1",
    reference: "characters/char_pip.png",
    hair: "short black hair",
    clothing: "a yellow raincoat",
    colours: ["yellow"],
    proportions: "school-age"
  }],
  idea: "Pip follows a paper lantern through the castle with Maya and Leo.",
  place: "castle",
  length: "medium",
  theme: "Magic",
  creationKey: "readiness-key"
};

var store = Shelf.memoryStore();
var allowance = Shelf.memoryAllowance();
allowance.reserve("child-1", body.creationKey);

Readiness.rehearse(body, {
  callModel: function (brief, opts) {
    if (String(opts.purpose).indexOf("prose") >= 0) return Promise.resolve(spoken());
    return Promise.resolve(draft());
  },
  viewer: { ownerId: "family-1" },
  owner: { userId: "user-1", accountKind: "child", childId: "child-1" },
  store: store,
  allowance: allowance,
  mockImages: function (page) { return "wondii-private:readiness/" + page.pageId; }
}).then(function (report) {
  assert.strictEqual(report.status, "REVIEWABLE", [].concat(report.storyProblems, report.planProblems, report.textProblems).join(" | "));
  assert.strictEqual(report.pageCount, 12);
  assert.strictEqual(report.imageCalls, 0);
  assert.strictEqual(report.imageDraws, 0);
  assert.strictEqual(report.mockedModel, true);
  assert.ok(report.locations.length >= 4);
  assert.deepStrictEqual(report.castIds, CAST);
  assert.deepStrictEqual(report.storyCast, ["fox-1"]);

  var bibleCall = report.writerCalls.filter(function (call) { return call.purpose === "book-bible"; })[0];
  assert.ok(bibleCall.user.indexOf("Maya") >= 0);
  assert.ok(bibleCall.user.indexOf("Leo") >= 0);
  assert.ok(bibleCall.user.indexOf("Pip") >= 0);
  assert.ok(bibleCall.user.indexOf("own portrait") >= 0);
  assert.ok(bibleCall.user.indexOf("char_pip: unknown") < 0);
  assert.ok(bibleCall.user.indexOf("maya-v1") < 0 || bibleCall.user.indexOf("They stay this person") >= 0);

  var mayaRef = report.bookCast.references.filter(function (row) { return row.characterId === "wondii-maya"; })[0];
  var leoRef = report.bookCast.references.filter(function (row) { return row.characterId === "wondii-leo"; })[0];
  var pipRef = report.bookCast.references.filter(function (row) { return row.characterId === "char_pip"; })[0];
  assert.ok(mayaRef.file.indexOf("maya-v1.jpg") >= 0);
  assert.ok(leoRef.file.indexOf("wondii-leo.jpg") >= 0);
  assert.ok(leoRef.file.indexOf("maya-v1") < 0);
  assert.ok(pipRef.file.indexOf("char_pip.png") >= 0);
  assert.ok(pipRef.file.indexOf("maya") < 0);
  assert.strictEqual(mayaRef.ready, true);
  assert.strictEqual(leoRef.ready, true);
  assert.ok(report.bookCast.problems.indexOf("reference-before-first-spread:fox-1") >= 0);
  assert.strictEqual(report.bookCast.ready, false);

  var mayaFile = report.access.filter(function (row) { return row.characterId === "wondii-maya"; })[0];
  var leoFile = report.access.filter(function (row) { return row.characterId === "wondii-leo"; })[0];
  var pipFile = report.access.filter(function (row) { return row.characterId === "char_pip"; })[0];
  assert.strictEqual(mayaFile.reason, "readable");
  assert.ok(mayaFile.bytes > 0);
  assert.strictEqual(leoFile.reason, "readable");
  assert.strictEqual(pipFile.reason, "private-not-fetched");

  var foxPages = report.scenes.filter(function (scene) {
    return (scene.files || []).some(function (file) { return file.characterId === "fox-1"; });
  });
  assert.ok(foxPages.length >= 2);
  assert.strictEqual(foxPages[0].files.filter(function (file) { return file.characterId === "fox-1"; })[0].version, foxPages[1].files.filter(function (file) { return file.characterId === "fox-1"; })[0].version);
  assert.strictEqual(foxPages[1].files.filter(function (file) { return file.characterId === "fox-1"; })[0].reused, true);
  report.scenes.forEach(function (scene) {
    assert.deepStrictEqual(scene.omitted, []);
    var ids = (scene.files || []).map(function (file) { return file.file; }).filter(Boolean);
    assert.strictEqual(new Set(ids).size, ids.length);
  });
  var crowded = report.scenes.filter(function (scene) { return scene.files.length >= 4; })[0];
  assert.ok(crowded);
  assert.ok(crowded.passes.length >= 1);
  assert.strictEqual([].concat.apply([], crowded.passes).length, crowded.files.length);

  assert.strictEqual(report.prompts.length, 12);
  assert.ok(report.prompts.every(function (row) { return row.prompt.indexOf("Match each shown character") >= 0; }));
  assert.ok(report.prompts.every(function (row) { return row.repairPrompt.indexOf("Revise this one picture") >= 0; }));

  assert.strictEqual(report.saveRefused.saved, false);
  assert.strictEqual(report.saveRefused.claimed, false);
  assert.strictEqual(report.save.saved, true);
  assert.strictEqual(report.save.claimed, true);
  assert.strictEqual(report.duplicate.duplicate, true);
  assert.strictEqual(report.duplicate.claimed, false);
  assert.strictEqual(allowance.claimedCount(), 1);
  assert.strictEqual(report.reader.pages.length, 12);
  assert.strictEqual(report.reader.title, "The Paper Lantern");
  assert.ok(report.reader.pages.every(function (page) { return page.text && page.imageSrc.indexOf("wondii-private:") === 0 && page.missingArt === false; }));
  assert.strictEqual(report.consistencyPromised, false);
  console.log("book-v2 readiness test ok");
}).catch(function (error) {
  console.error(error && error.stack || error);
  process.exit(1);
});
