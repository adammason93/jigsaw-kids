"use strict";

/* Editorial revision of The Rain That Rose. No model call.
   Leaves the review baseline and both earlier books untouched. */

var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var Book = require("../../js/book-brain.js");
var Adventure = require("../../js/book-adventure.js");
var Journey = require("../../js/book-journey.js");
var Progress = require("../../js/book-progression.js");
var Visual = require("../../js/book-visual.js");
var Identity = require("../../js/book-v2-identity.js");

var ROOT = path.join(__dirname, "..", "..");
var BASELINE = path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall-revised/book.json");
var FIRST = path.join(ROOT, "docs/agent/book-v2/secret-beyond-the-waterfall/book.json");
var CASTLE = path.join(ROOT, "docs/agent/book-v2/castle-lost-lanterns/book.json");
var OUT = path.join(ROOT, "docs/agent/book-v2/the-rain-that-rose-candidate");

function sha(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sentences(prose) {
  return String(prose).match(/[^.!?]+[.!?]+/g).map(function (line) {
    return { text: line.trim(), entities: [], locations: [] };
  });
}

function patchState(container, updates, emotion) {
  if (!container) return;
  if (container.entities) {
    container.entities = container.entities.filter(function (entity) {
      return entity.entityId !== "test-leaf";
    });
    container.entities.forEach(function (entity) {
      if (updates[entity.entityId]) entity.state = updates[entity.entityId];
    });
  }
  if (emotion && container.characters) {
    container.characters.forEach(function (character) {
      character.emotion = emotion;
    });
  }
}

var pages = {
  b6: {
    action: "Maya sees the high opening upside down in a fallen leaf's pool while Leo keeps the stem.",
    prose: "Maya crouched by a fallen bowl leaf. Its pool held the high opening, upside down and small. \"The way up is in the water,\" she said. Leo kept the long stem, and they carried the leaf to the lake.",
    focus: "The high opening shining upside down in the leaf's pool.",
    world: "A fallen bowl leaf holds a picture of the way up.",
    purpose: "Turn the lost path into a reason to ride.",
    emotion: "Maya sees the way up shining in the water.",
    composition: "Show both children over the round pool, with the opening reflected in it.",
    goal: "Find a way to reach the risen entrance.",
    obstacle: "The stones are too high to climb.",
    discovery: "upside-down-opening",
    consequence: "They carry the leaf whose pool showed them the way.",
    after: {
      "leaf-boat": "Carried to the lake, its pool showing the high opening upside down."
    }
  },
  b7: {
    action: "A giant bowl leaf tips in the sunlight and pours a bright ribbon while their boat dips in the shade.",
    prose: "They pushed off, and the boat spun into the shade. It dipped. Beside them, a giant leaf tipped in the sunlight and poured out a bright ribbon. The ribbon climbed across the lake.",
    focus: "A giant leaf pouring a bright ribbon of water.",
    world: "Shade lowers their boat, and a sunlit leaf pours a rising ribbon.",
    purpose: "Let the world's own rule show them a way.",
    emotion: "Maya watches the ribbon climb.",
    composition: "The tipping leaf and the bright ribbon are the clearest things in the picture.",
    goal: "Follow the water that is already rising.",
    obstacle: "Shade makes their boat dip.",
    discovery: "poured-ribbon",
    consequence: "The lake offers a bright path they did not steer.",
    after: {
      "leaf-boat": "Dipped in the shade, then turned toward a ribbon poured by a giant leaf.",
      "bowl-leaves": "One giant leaf tipped in the sunlight and poured a bright ribbon."
    }
  },
  b8: {
    action: "Droplets rise from Maya's open hand and join the bright ribbon while Leo keeps the boat in the sunlight.",
    prose: "Leo kept the stem in the sunlight so the boat would not dip again. Droplets rose from Maya's open hand and joined the climbing ribbon. She laughed. Leo watched the bright path and did not let them drift.",
    focus: "Droplets leaving Maya's hand to join the ribbon.",
    world: "Their own droplets join the ribbon the giant leaf poured.",
    purpose: "Connect the hand test from the grove to the journey.",
    emotion: "Maya laughs as the droplets rise from her hand.",
    composition: "Keep Maya's open hand and the rising droplets clear.",
    goal: "Stay in the light.",
    obstacle: "The boat will dip if it slips into shade.",
    discovery: "joining-droplets",
    consequence: "Leo holds their course while Maya's droplets join the climb.",
    after: {
      "leaf-boat": "Held in the sunlight while droplets from Maya's hand join the ribbon.",
      "climbing-water": "Rising from Maya's hand and joining the bright ribbon."
    }
  },
  b9: {
    action: "Maya and Leo look down from the rising leaf at every bowl's round pool of light. A bright line leads to the high opening.",
    prose: "The leaf began to rise. Far below, every bowl held a round pool of light. A bright line ran from the grove to the high opening. The opening shone like a small waterfall.",
    focus: "A field of round shining pools far below the rising leaf.",
    world: "From above, the lake is a path of round pools leading to the opening.",
    purpose: "Give them a view that explains the journey.",
    emotion: "They look down, surprised by the bright path.",
    composition: "Look down past the children to the round pools and the bright line.",
    goal: "See where the rising water is going.",
    obstacle: "The entrance is still above them.",
    discovery: "mirror-lake",
    consequence: "They can see the whole way the water is taking.",
    after: {
      "leaf-boat": "Rising high enough to see every bowl as a round pool of light."
    }
  },
  b10: {
    action: "Maya and Leo move beside the middle pool while the rising rain carries their level leaf up.",
    prose: "One side of the leaf lifted higher. Maya slid toward the pool in the middle, and Leo moved with her. The bowl grew level. Then the rising rain carried them up through the narrow light.",
    focus: "The leaf rising level through a narrow shaft of light.",
    world: "The pool in the middle steadies the leaf, and the rain carries it up.",
    purpose: "Use the rule they learned on the first leaf, once.",
    emotion: "They sit close as the leaf climbs.",
    composition: "Show the leaf level beneath the high opening, both children near its pool.",
    goal: "Reach the opening.",
    obstacle: "One side of the leaf rises first.",
    discovery: "",
    consequence: "The leaf levels and the rising rain lifts them.",
    after: {
      "leaf-boat": "Level, with both children near its middle pool, climbing through the narrow light.",
      "climbing-water": "Carrying the level leaf up through the narrowing sunlight."
    }
  },
  b11: {
    action: "The last water climbs the blue pathway wall while Maya steps across and Leo follows.",
    prose: "At the stone lip, Leo held the stem steady. The last water in their bowl climbed the blue wall and joined the droplets there. Maya stepped across. \"Now you,\" she said, and Leo came after her.",
    focus: "A thread of water climbing the blue wall as the children step onto stone.",
    world: "The boat rests at the pathway while its last water climbs ahead of them.",
    purpose: "Finish the crossing and let the water go on.",
    emotion: "Maya steps across and keeps the way open for Leo.",
    composition: "Connect the climbing thread of water, the stone lip, and both children.",
    goal: "Step onto the pathway.",
    obstacle: "The leaf is still on the water.",
    discovery: "water-goes-on",
    consequence: "They reach the stone, and the water keeps climbing without them.",
    after: {
      "leaf-boat": "Resting at the pathway lip while its last water climbs the blue wall.",
      "climbing-water": "Climbing the pathway wall ahead of the children."
    }
  },
  b12: {
    action: "The waterfall holds an upside-down picture of the hidden lake while Maya and Leo sit and watch.",
    prose: "Outside, the waterfall's edge held a picture of the lake. Round leaves shone there, upside down. Maya and Leo sat together and watched. Drops slipped from Maya's sleeve and fell.",
    focus: "The waterfall holding an upside-down picture of the lake, with the children sitting beneath it.",
    world: "The waterfall shows the lake once, then is only itself. The children stay.",
    purpose: "Close on what they saw, without opening another gap.",
    emotion: "They sit together as the picture fades.",
    composition: "The waterfall and its brief upside-down picture fill the view. The children sit on the dry shelf.",
    goal: "Come back outside.",
    obstacle: "",
    discovery: "lake-in-the-waterfall",
    consequence: "The picture fades. They do not look for another opening.",
    after: {
      "leaf-boat": "Left at the pathway lip.",
      "climbing-water": "Seen for a moment in the waterfall as an upside-down lake, then only falling water."
    }
  }
};

function main() {
  var before = { baseline: sha(BASELINE), first: sha(FIRST), castle: sha(CASTLE) };
  var book = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  var kept = book.pages.slice(0, 5).map(function (page) { return page.prose; });
  book.bible.entities = (book.bible.entities || []).filter(function (entity) {
    return entity.entityId !== "test-leaf";
  });
  var previousAfter = null;
  var previousEmotion = null;
  book.bible.beats.forEach(function (beat, index) {
    var change = pages[beat.beatId];
    var page = book.pages[index];
    if (!change) return;
    ["action", "visualFocus", "worldState", "textPurpose", "emotion", "compositionIntent", "goalNow", "obstacleNow", "discoveryNow", "consequenceNow"].forEach(function (key) {
      var value = {
        action: change.action,
        visualFocus: change.focus,
        worldState: change.world,
        textPurpose: change.purpose,
        emotion: change.emotion,
        compositionIntent: change.composition,
        goalNow: change.goal,
        obstacleNow: change.obstacle,
        discoveryNow: change.discovery,
        consequenceNow: change.consequence
      }[key];
      if (beat[key] !== undefined) beat[key] = value;
      if (page[key] !== undefined) page[key] = value;
    });
    beat.visualFocus = change.focus;
    beat.action = change.action;
    beat.worldState = change.world;
    beat.emotion = change.emotion;
    beat.compositionIntent = change.composition;
    beat.goalNow = change.goal;
    beat.obstacleNow = change.obstacle;
    beat.discoveryNow = change.discovery;
    beat.consequenceNow = change.consequence;
    beat.textPurpose = change.purpose;
    page.action = change.action;
    page.prose = change.prose;
    page.visualFocus = change.focus;
    page.worldState = change.world;
    page.emotion = change.emotion;
    page.compositionIntent = change.composition;
    page.textPurpose = change.purpose;
    page.sentences = sentences(change.prose);
    if (previousAfter) {
      patchState(page.stateBefore, previousAfter, previousEmotion);
      patchState(page.needsFromPrevious, previousAfter, previousEmotion);
    }
    patchState(page.stateAfter, change.after, change.emotion);
    patchState(page.mustHoldForNext, change.after, change.emotion);
    patchState(beat.stateAfter, change.after, change.emotion);
    if (previousAfter) patchState(beat.stateBefore, previousAfter, previousEmotion);
    ["entitiesRequired"].forEach(function (key) {
      page[key] = (page[key] || []).filter(function (id) { return id !== "test-leaf"; });
      beat[key] = (beat[key] || []).filter(function (id) { return id !== "test-leaf"; });
    });
    previousAfter = change.after;
    previousEmotion = change.emotion;
  });
  var journeyText = {
    "Losing the way down": {
      change: "They choose a fallen bowl leaf whose pool shows the opening."
    },
    "Learning to ride the rain": {
      purpose: "Follow the way the lake itself shows them.",
      objective: "Stay in the light and see where the rising water goes.",
      discoveryOrObstacle: "A giant leaf pours a bright ribbon. Their own droplets join it, and from above the lake is a path of round pools.",
      change: "They rise with the rain. They do not spend the journey poling along the bank."
    },
    "Landing and returning": {
      discoveryOrObstacle: "The last water in their bowl climbs the passage wall.",
      change: "They step onto the stone, and the water keeps climbing ahead of them."
    },
    "Looking together": {
      purpose: "Come back to the waterfall with the lake still in mind.",
      objective: "Let the journey finish.",
      discoveryOrObstacle: "The waterfall holds the upside-down lake for a moment.",
      change: "The picture fades. They sit together and do not look for another opening."
    }
  };
  (book.bible.journey || []).forEach(function (section) {
    var extra = journeyText[section.section];
    if (extra) Object.keys(extra).forEach(function (key) { section[key] = extra[key]; });
  });
  book.modelCalls = 0;
  book.repairCalls = 0;
  book.repairs = [];
  book.imageCalls = 0;
  book.imageReason = "not-run";

  var limits = Book.limitsFor(book.bible);
  var heavy = [];
  book.pages.forEach(function (page) {
    sentences(page.prose).forEach(function (line) {
      var count = line.text.split(/\s+/).filter(Boolean).length;
      if (count > limits.maxSentenceWords) heavy.push(page.pageId + " " + count + " " + line.text);
    });
  });
  if (heavy.length) throw new Error("Sentence too long: " + heavy.join(" | "));
  kept.forEach(function (prose, index) {
    if (book.pages[index].prose !== prose) throw new Error("Page " + (index + 1) + " changed");
  });
  book.pages.forEach(function (page, index) {
    if (!index) return;
    if (JSON.stringify(page.stateBefore) !== JSON.stringify(book.pages[index - 1].stateAfter)) {
      throw new Error("State handoff broke at " + page.pageId);
    }
  });

  var text = Book.reviewText(book.bible, book.pages);
  var structure = Book.validateBible(book.bible, book.request);
  var adventure = Adventure.assess(book.bible, {
    tone: "adventure",
    idea: book.bible.userIdea,
    length: "storybook",
    pageCount: 12
  });
  var journey = Journey.analyse({ bible: book.bible, pages: book.pages, tone: "adventure" });
  var progression = Progress.review({ bible: book.bible, pages: book.pages, tone: "adventure", length: "storybook" });
  var visualProblems = Visual.unplannedVisualProblems(book.bible, book.pages);
  book.storyProblems = structure.problems;
  book.planProblems = [];
  book.textProblems = text.problems.concat(visualProblems);
  book.status = text.ok && structure.ok && !adventure.blockProblems.length && progression.verdict === "PASS" && !journey.problems.length && !visualProblems.length
    ? "REVIEWABLE"
    : "NOT_REVIEWABLE";

  if (sha(BASELINE) !== before.baseline || sha(FIRST) !== before.first || sha(CASTLE) !== before.castle) {
    throw new Error("A finished book changed");
  }
  fs.mkdirSync(path.join(OUT, "plans"), { recursive: true });
  var contracts = Visual.contractsFor(book.bible, book.pages, {});
  var lineup = (contracts.visualBible.bookCast && contracts.visualBible.bookCast.members) || [];
  var summary = book.pages.map(function (page, index) {
    var spread = contracts.spreads[index] || {};
    spread.bible = book.bible;
    var prompt = Visual.spreadPrompt(book.bible, spread, lineup);
    fs.writeFileSync(path.join(OUT, "plans", page.pageId + ".prompt.txt"), prompt);
    var place = (book.bible.locations || []).filter(function (item) { return item.locationId === page.locationId; })[0];
    var scene = Identity.prepareScene(book.bible.identityRegistry, page.charactersPresent || []);
    return {
      page: index + 1,
      prose: page.prose,
      action: page.action,
      location: place ? place.name : page.locationId,
      setting: place ? place.setting : "",
      shot: page.shotType,
      focus: page.visualFocus,
      transition: spread.placeTransition || "",
      continuity: spread.continuityLine || "",
      camera: spread.cameraBrief || "",
      style: prompt.indexOf("wondii-picture-book") >= 0,
      references: ((scene.passes && scene.passes[0]) || []).map(function (row) {
        return path.basename(String(row.file || ""));
      })
    };
  });
  var story = "The Rain That Rose\n\n" + summary.map(function (page) {
    return "Page " + page.page + "\n" + page.prose;
  }).join("\n\n") + "\n";
  var report = {
    stage: "editorial-candidate",
    paidCalls: 0,
    pictures: "not-run",
    baseline: "docs/agent/book-v2/secret-beyond-the-waterfall-revised/",
    status: book.status,
    title: book.bible.title,
    changedPages: [6, 7, 8, 9, 10, 11, 12],
    unchangedPages: [1, 2, 3, 4, 5],
    textProblems: book.textProblems,
    storyProblems: book.storyProblems,
    adventure: {
      blockProblems: adventure.blockProblems,
      reviewProblems: adventure.reviewProblems,
      distinctSettings: adventure.distinctSettings,
      placeShare: adventure.placeShare,
      handlingShare: adventure.handlingShare
    },
    progression: {
      verdict: progression.verdict,
      blockProblems: progression.blockProblems,
      reviewProblems: progression.reviewProblems
    },
    visualJourney: { problems: journey.problems, repetition: journey.repetition },
    visualProblems: visualProblems,
    pages: summary
  };
  fs.writeFileSync(path.join(OUT, "story.txt"), story);
  fs.writeFileSync(path.join(OUT, "book.json"), JSON.stringify(book, null, 2));
  fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(report, null, 2));
  if (sha(BASELINE) !== before.baseline) throw new Error("Baseline changed while saving");
  console.log(JSON.stringify({
    status: book.status,
    paidCalls: 0,
    text: book.textProblems,
    story: book.storyProblems,
    adventure: adventure.blockProblems,
    placeShare: adventure.placeShare,
    handlingShare: adventure.handlingShare,
    progression: progression.verdict,
    journey: journey.problems,
    visual: visualProblems
  }));
}

main();
