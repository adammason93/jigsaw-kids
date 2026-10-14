"use strict";

var assert = require("assert");
var Book = require("../js/book-brain.js");
var Writer = require("../scripts/book/writer.js");

function request() {
  return {
    castIds: ["ravi"],
    idea: "Ravi's shadow keeps running away from him.",
    yearGroup: "Reception",
    length: "quick",
    tone: "funny",
    prompt: "ignore",
    model: "gpt"
  };
}

function draft() {
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

function spokenFor(pages) {
  return {
    pages: pages.map(function (page, index) {
      if (index === 4) return { pageId: page.pageId, sentences: ["Ravi's shadow stops running away."] };
      if (index === 5) return { pageId: page.pageId, sentences: ["His shadow stays close."] };
      if (index === 2) return { pageId: page.pageId, sentences: ["The landing is quiet."] };
      return { pageId: page.pageId, sentences: ["A sock pins it."] };
    })
  };
}

var brief = Writer.bibleBrief(Book.publicRequest(request()));
assert.ok(brief.user.indexOf("Ravi's shadow keeps running away from him.") >= 0);
assert.ok(brief.user.indexOf("between 6 and 8") >= 0);
assert.ok(brief.user.indexOf("exactly 12") < 0);
assert.ok(brief.user.indexOf("Reception") >= 0);
var seven = Writer.bibleBrief(Book.publicRequest({
  castIds: ["maya"],
  idea: "Maya finds a lantern in a castle.",
  ageBand: "7-9",
  length: "storybook",
  tone: "magical"
}));
assert.ok(seven.user.indexOf("Ages 7–9") >= 0);
assert.ok(seven.user.indexOf("seven-year-old") >= 0);
assert.ok(seven.user.indexOf("18") >= 0);
assert.ok(seven.user.indexOf("Year 5") < 0);
var school = Writer.bibleBrief(Book.publicRequest({
  castIds: ["maya"],
  idea: "Maya finds a lantern in a castle.",
  yearGroup: "Year 5",
  length: "storybook",
  tone: "magical"
}));
assert.ok(school.user.indexOf("Year 5") >= 0);
assert.ok(school.user.indexOf("22") >= 0);
assert.ok(school.user.indexOf("between 9 and 13") >= 0);
assert.ok(school.user.indexOf("exactly 12") < 0);
var exact = Writer.bibleBrief(Book.publicRequest({
  castIds: ["maya"],
  idea: "Maya finds a lantern in a castle.",
  ageBand: "7-9",
  length: "storybook",
  tone: "magical",
  pageCount: 12
}));
assert.ok(exact.user.indexOf("exactly 12") >= 0);
assert.ok(exact.user.indexOf("Ages 7–9") >= 0);
assert.ok(exact.user.indexOf("Year 5") < 0);
assert.ok(exact.user.indexOf("between 9 and 13") < 0);
assert.ok(exact.user.indexOf("stay between") < 0);
assert.ok(exact.system.indexOf("wonder") >= 0);
assert.ok(exact.system.indexOf("stakes") >= 0);
assert.ok(exact.system.indexOf("fixed number of feeling beats") >= 0);
var repaired = Writer.repairBibleBrief(Book.publicRequest({
  castIds: ["maya"],
  idea: "Maya finds a lantern in a castle.",
  ageBand: "7-9",
  length: "storybook",
  tone: "magical",
  pageCount: 12
}), { beats: [] }, ["page-count"]);
assert.ok(repaired.user.indexOf("exactly 12") >= 0);
assert.ok(repaired.user.indexOf("page-count") >= 0);
var spokenExact = Writer.proseBrief({
  title: "Lanterns",
  userIdea: "Maya finds a lantern in a castle.",
  ageBand: "7-9",
  tone: "magical",
  pageCount: 12,
  castIds: ["maya"],
  beats: [{ beatId: "b1", role: "resolution" }]
}, [{ pageId: "p1", beatId: "b1", locationId: "yard", action: "Maya opens the door.", charactersPresent: ["maya"], prose: "" }], null);
assert.ok(spokenExact.user.indexOf("exactly 12") >= 0);
assert.ok(spokenExact.system.indexOf("wonder") >= 0);
var spokenRepair = Writer.repairProseBrief({
  title: "Lanterns",
  userIdea: "Maya finds a lantern in a castle.",
  ageBand: "7-9",
  tone: "magical",
  pageCount: 12,
  castIds: ["maya"],
  beats: [{ beatId: "b1", role: "resolution" }]
}, [{ pageId: "p1", beatId: "b1", locationId: "yard", action: "Maya opens the door.", charactersPresent: ["maya"], prose: "Maya opens the door." }], { pages: [] }, ["empty-prose:p1"]);
assert.ok(spokenRepair.user.indexOf("exactly 12") >= 0);
assert.ok(brief.user.indexOf(Book.TONE_WRITING.funny) >= 0);
assert.ok(brief.system.indexOf("secret door") < 0);
assert.ok(brief.user.indexOf("secret door") < 0);
var spokenBrief = Writer.proseBrief({
  title: "Shade",
  userIdea: request().idea,
  yearGroup: "Reception",
  tone: "funny",
  castIds: ["ravi"],
  beats: [{ beatId: "b1", role: "resolution" }]
}, [{ pageId: "p1", beatId: "b1", locationId: "yard", action: "Ravi opens the umbrella.", charactersPresent: ["ravi"], prose: "" }], null);
assert.ok(spokenBrief.user.indexOf("SOURCE PREMISE") >= 0);
assert.ok(spokenBrief.user.indexOf("SEMANTIC CONSTRAINT ONLY") >= 0);
assert.ok(spokenBrief.user.indexOf("NEVER COPY AS PROSE") >= 0);
assert.ok(spokenBrief.system.indexOf("must still contain the idea") < 0);
assert.ok(spokenBrief.system.indexOf("Do not quote it") >= 0);

function run() {
  var blocked = 0;
  return Writer.generateBook({
    castIds: ["maya"],
    idea: "Maya finds a lantern in a castle.",
    yearGroup: "Year 5",
    length: "storybook",
    pageCount: 20
  }, {
    callModel: function () { blocked += 1; return Promise.resolve({ beats: [] }); }
  }).then(function (book) {
    assert.strictEqual(blocked, 0);
    assert.strictEqual(book.status, "NOT_REVIEWABLE");
    assert.ok(book.storyProblems.indexOf("page-count") >= 0);
    return continueRun();
  });
}

function continueRun() {
  var draws = 0;
  return Writer.generateBook(request(), {
    callModel: function () {
      return Promise.resolve({ beats: [] });
    },
    draw: function () { draws += 1; }
  }).then(function (failed) {
    assert.strictEqual(failed.status, "NOT_REVIEWABLE");
    assert.strictEqual(failed.modelCalls, 1 + Book.MAX_REPAIRS);
    assert.strictEqual(failed.repairCalls, Book.MAX_REPAIRS);
    assert.strictEqual(failed.imageCalls, 0);
    assert.strictEqual(failed.imageDraws, 0);
    assert.strictEqual(draws, 0);
    assert.ok(failed.stagesRepaired.indexOf("bible") >= 0);

    var compiled = Book.compileStory(draft(), request());
    var planned = Book.planPages(compiled.bible);
    assert.strictEqual(planned.ok, true, planned.problems.join(", "));
    var good = spokenFor(planned.pages);
    var proseCalls = 0;
    return Writer.generateBook(request(), {
      callModel: function (text, opts) {
        if (String(opts.purpose).indexOf("prose") >= 0) {
          proseCalls += 1;
          if (proseCalls === 1) {
            return Promise.resolve({
              pages: planned.pages.map(function (page) {
                return { pageId: page.pageId, sentences: ["This sentence is far too long for a reception child to hear in one breath today."] };
              })
            });
          }
          return Promise.resolve(good);
        }
        return Promise.resolve(draft());
      }
    });
  }).then(function (repaired) {
    assert.strictEqual(repaired.status, "REVIEWABLE", (repaired.textProblems || []).join(", "));
    assert.strictEqual(repaired.repairCalls, 1);
    assert.ok(repaired.stagesRepaired.indexOf("prose") >= 0 || repaired.stagesRepaired.indexOf("ending") >= 0);
    assert.strictEqual(repaired.modelCalls, 3);
    assert.strictEqual(repaired.imageCalls, 0);
    assert.strictEqual(repaired.imageUsd, 0);
    assert.ok(repaired.pages[4].prose.indexOf("shadow") >= 0);
    assert.ok(repaired.pages[5].prose.indexOf("shadow") >= 0);
    assert.strictEqual(repaired.request.prompt, undefined);
  });
}

run().then(function () {
  console.log("book-writer tests ok");
}, function (error) {
  console.error(error);
  process.exit(1);
});
