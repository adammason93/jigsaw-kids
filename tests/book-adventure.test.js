"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var Adventure = require("../js/book-adventure.js");
var Journey = require("../js/book-journey.js");
var Visual = require("../js/book-visual.js");
var Book = require("../js/book-brain.js");
var Writer = require("../scripts/book/writer.js");

var root = path.join(__dirname, "..");
var castlePath = path.join(root, "docs/agent/book-v2/castle-lost-lanterns/book.json");
var castleBefore = fs.readFileSync(castlePath);
var proseBefore = crypto.createHash("sha256").update(JSON.parse(castleBefore).pages.map(function (page) {
  return page.prose;
}).join("\n")).digest("hex");

function section(partial) {
  return {
    section: partial.section,
    locationId: partial.locationId,
    purpose: partial.purpose || "The characters need to find out what happened.",
    objective: partial.objective,
    discoveryOrObstacle: partial.discovery || "A new clue.",
    change: partial.change,
    leadsTo: partial.leadsTo || ""
  };
}

function place(id, setting, links) {
  return {
    locationId: id,
    name: id,
    setting: setting,
    connectedTo: links || [],
    visualIdentity: setting
  };
}

function beat(id, role, locationId, entity) {
  return {
    beatId: id,
    role: role,
    locationId: locationId,
    entitiesRequired: entity ? [entity] : [],
    worldState: role
  };
}

var adventure = Adventure.assess({
  tone: "adventure",
  targetLength: "storybook",
  pageCount: 12,
  userIdea: "Two children discover a hidden bell under the hill.",
  locations: [
    place("trees", "quiet woodland", ["cave"]),
    place("cave", "underground cavern", ["trees", "spring"]),
    place("spring", "glowing underground spring", ["cave"])
  ],
  entities: [{ entityId: "bell", name: "hidden bell" }],
  journey: [
    section({ section: "opening", locationId: "trees", objective: "Find where the sound starts", discovery: "A path of wet stones", change: "They decide to follow the stones down", leadsTo: "cave" }),
    section({ section: "middle", locationId: "cave", objective: "Get past the dark water", discovery: "The bell is caught under a ledge", change: "They stop searching the woods and climb down", leadsTo: "spring" }),
    section({ section: "end", locationId: "spring", objective: "Free the bell", discovery: "The ledge lifts when they lean together", change: "The sound returns and they can go home", leadsTo: "" })
  ],
  beats: [
    beat("b1", "hook", "trees", "bell"),
    beat("b2", "discovery", "trees"),
    beat("b3", "attempt", "cave", "bell"),
    beat("b4", "setback", "cave"),
    beat("b5", "climax", "spring", "bell"),
    beat("b6", "resolution", "spring")
  ]
}, { tone: "adventure", idea: "Two children discover a hidden bell under the hill.", length: "storybook", pageCount: 12 });
assert.strictEqual(adventure.kind, "adventure");
assert.strictEqual(adventure.blockProblems.length, 0, adventure.blockProblems.join(", "));
assert.ok(adventure.distinctSettings.length >= 3);

var mystery = Adventure.assess({
  tone: "mystery",
  targetLength: "storybook",
  pageCount: 12,
  userIdea: "Who moved the blue shoe in the old house?",
  locations: [place("house", "one old house", [])],
  entities: [{ entityId: "shoe", name: "blue shoe" }],
  journey: [
    section({ section: "question", locationId: "house", objective: "Find the shoe", discovery: "Mud prints stop at a cupboard", change: "They search the cupboard instead of the garden", leadsTo: "same" }),
    section({ section: "wrong", locationId: "house", objective: "Check the cupboard", discovery: "The cupboard holds a clean ribbon, not the shoe", change: "They follow the ribbon upstairs", leadsTo: "same" }),
    section({ section: "answer", locationId: "house", objective: "See who carried the ribbon", discovery: "The cat has the shoe in a basket", change: "The question is answered", leadsTo: "" })
  ],
  beats: [1, 2, 3, 4, 5, 6].map(function (n) {
    return beat("m" + n, n === 6 ? "resolution" : "discovery", "house", "shoe");
  })
}, { tone: "mystery", idea: "Who moved the blue shoe in the old house?", length: "storybook", pageCount: 12 });
assert.strictEqual(mystery.kind, "mystery");
assert.strictEqual(mystery.blockProblems.length, 0, mystery.blockProblems.join(", "));
assert.strictEqual(mystery.distinctSettings.length, 1);

var bedtime = Adventure.assess({
  tone: "bedtime",
  targetLength: "storybook",
  pageCount: 12,
  userIdea: "A child listens to the rain and settles for sleep.",
  locations: [place("room", "small bedroom", [])],
  journey: [
    section({ section: "dusk", locationId: "room", objective: "Get comfortable", discovery: "The rain taps the window", change: "The child listens instead of tossing", leadsTo: "same" }),
    section({ section: "sleep", locationId: "room", objective: "Let the day go", discovery: "The lamp is the only bright spot", change: "The room feels quiet enough for sleep", leadsTo: "" })
  ],
  beats: [beat("d1", "hook", "room"), beat("d2", "resolution", "room")]
}, { tone: "bedtime", idea: "A child listens to the rain and settles for sleep.", length: "storybook", pageCount: 12 });
assert.strictEqual(bedtime.kind, "bedtime");
assert.strictEqual(bedtime.needsJourney, false);
assert.strictEqual(bedtime.blockProblems.length, 0, bedtime.blockProblems.join(", "));
var loud = Adventure.assess({
  tone: "bedtime",
  targetLength: "quick",
  userIdea: "A quiet night.",
  locations: [place("room", "small bedroom", [])],
  journey: [section({ section: "scare", locationId: "room", objective: "Escape", discovery: "A monster chase begins", change: "They run from danger", leadsTo: "" })],
  beats: [beat("z1", "hook", "room")]
}, { tone: "bedtime", length: "quick", idea: "A quiet night." });
assert.ok(loud.reviewProblems.indexOf("bedtime-spectacle") >= 0);
assert.strictEqual(loud.blockProblems.length, 0);

var learning = Adventure.assess({
  tone: "surprise",
  targetLength: "storybook",
  pageCount: 12,
  userIdea: "Maya and Leo learn how a river reaches the sea.",
  locations: [
    place("bank", "river bank", ["mouth"]),
    place("mouth", "river mouth", ["bank"])
  ],
  journey: [
    section({ section: "source", locationId: "bank", objective: "See where the water goes", discovery: "The stream joins a wider river", change: "They follow the current instead of turning back", leadsTo: "mouth" }),
    section({ section: "sea", locationId: "mouth", objective: "Find the river's end", discovery: "Fresh water spreads into the salt sea", change: "They understand the river has reached the sea", leadsTo: "" })
  ],
  beats: [beat("e1", "hook", "bank"), beat("e2", "discovery", "mouth"), beat("e3", "resolution", "mouth")]
}, { tone: "surprise", idea: "Maya and Leo learn how a river reaches the sea.", length: "storybook", pageCount: 12 });
assert.strictEqual(learning.kind, "educational");
assert.strictEqual(learning.needsJourney, true);
assert.strictEqual(learning.blockProblems.length, 0, learning.blockProblems.join(", "));

var narrow = Adventure.assess({
  tone: "adventure",
  targetLength: "storybook",
  pageCount: 12,
  userIdea: "Maya and Leo discover why the castle lights went out.",
  locations: [
    place("yard", "castle stone", ["hall"]),
    place("hall", "castle stone", ["yard", "room"]),
    place("room", "castle stone", ["hall"])
  ],
  entities: [{ entityId: "lantern", name: "lantern" }],
  journey: [
    section({ section: "one", locationId: "yard", objective: "Inspect the lantern", discovery: "The lantern is dark", change: "They keep inspecting the lantern", leadsTo: "hall" }),
    section({ section: "two", locationId: "hall", objective: "Inspect the lantern", discovery: "The lantern is dark", change: "They keep inspecting the lantern", leadsTo: "room" }),
    section({ section: "three", locationId: "room", objective: "Inspect the lantern", discovery: "The lantern is dark", change: "They keep inspecting the lantern", leadsTo: "" })
  ],
  beats: [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) {
    var where = n < 3 ? "yard" : n < 6 ? "hall" : "room";
    return beat("n" + n, "attempt", where, "lantern");
  })
}, { tone: "adventure", idea: "Maya and Leo discover why the castle lights went out.", length: "storybook", pageCount: 12 });
assert.ok(narrow.blockProblems.indexOf("narrow-world") >= 0, narrow.blockProblems.join(", "));

var guide = Adventure.writerGuide({
  tone: "adventure",
  idea: "Maya and Leo discover a mysterious pathway behind a waterfall that leads them into a hidden world.",
  length: "storybook",
  pageCount: 12
});
assert.strictEqual(Adventure.storyKind({ tone: "adventure", idea: "Maya and Leo discover a mysterious pathway behind a waterfall that leads them into a hidden world." }), "adventure");
assert.ok(guide.indexOf("not a default") >= 0);
assert.ok(!/must include a forest|required locations|the secret beyond/i.test(guide));
assert.ok(guide.indexOf("same faces, hair, and clothes") >= 0);
var source = fs.readFileSync(path.join(root, "js/book-adventure.js"), "utf8");
assert.ok(source.indexOf("waterfall") < 0);
assert.ok(source.indexOf("maya-v1") < 0);

var brief = Writer.bibleBrief(Book.publicRequest({
  castIds: ["maya", "leo"],
  idea: "Maya and Leo discover a mysterious pathway behind a waterfall that leads them into a hidden world.",
  ageBand: "7-9",
  length: "storybook",
  tone: "adventure",
  pageCount: 12
}));
assert.ok(brief.user.indexOf("\"journey\"") >= 0);
assert.ok(brief.user.indexOf("not a default") >= 0);
assert.ok(brief.system.indexOf("wondii-picture-book") >= 0 || brief.user.indexOf("picture book") >= 0);
assert.strictEqual(Book.VISUAL_STYLE, "wondii-picture-book");

var moved = Journey.analyse({
  tone: "adventure",
  bible: {
    tone: "adventure",
    locations: [
      place("trees", "quiet woodland", ["cave"]),
      place("cave", "underground cavern", ["trees"]),
      place("spring", "glowing underground spring", ["cave"])
    ]
  },
  beats: [
    { beatId: "s1", role: "hook", locationId: "trees", shotType: "establishing" },
    { beatId: "s2", role: "discovery", locationId: "cave", shotType: "reveal" },
    { beatId: "s3", role: "climax", locationId: "spring", shotType: "action" },
    { beatId: "s4", role: "resolution", locationId: "trees", shotType: "vignette" }
  ]
});
assert.strictEqual(moved.spreads[1].placeTransition.indexOf("New story location") >= 0, true);
assert.ok(moved.spreads[1].continuityLine.indexOf("First view") >= 0);
assert.ok(moved.spreads[3].placeTransition.indexOf("Returning to a place already shown") >= 0);
assert.strictEqual(moved.spreads[0].placeTransition, "");

var prompt = Visual.spreadPrompt({
  tone: "adventure",
  visualStyle: "wondii-picture-book",
  locations: [place("cave", "underground cavern", [])]
}, {
  locationId: "cave",
  charactersPresent: ["maya"],
  illustrationMoment: "Maya climbs into the cavern.",
  storyEvent: "Maya climbs into the cavern.",
  continuityLine: "First view of the cavern. Establish this look and keep it later: underground cavern.",
  placeTransition: moved.spreads[1].placeTransition,
  cameraBrief: "A reveal: the new discovery is the clearest thing in the picture.",
  worldTone: "Let this place feel alive through the story's own landmarks. Do not invent a new location.",
  textSafeRegion: "upper-left",
  lighting: "clear daylight",
  pageRole: "left-page",
  emotion: "curious"
}, [{
  characterId: "maya",
  name: "Maya",
  hair: "long dark curls",
  skinTone: "medium brown",
  defaultClothing: "yellow cardigan, white shirt, blue skirt, white socks",
  footwear: "navy shoes"
}]);
assert.ok(prompt.indexOf("wondii-picture-book") >= 0);
assert.ok(prompt.indexOf("New story location") >= 0);
assert.ok(prompt.indexOf("Do not invent a new location") >= 0);
assert.ok(prompt.indexOf("Face, hair, and clothing may not") >= 0);
assert.ok(!/floating island|crystal chamber/i.test(prompt));

var castle = JSON.parse(fs.readFileSync(castlePath, "utf8"));
var castleReport = Adventure.assess(castle.bible, {
  tone: castle.bible.tone,
  idea: castle.bible.userIdea,
  length: castle.bible.targetLength,
  pageCount: castle.pages.length
});
assert.strictEqual(castleReport.kind, "adventure");
assert.ok(castleReport.blockProblems.indexOf("journey-missing") >= 0);
assert.strictEqual(fs.readFileSync(castlePath).equals(castleBefore), true);
assert.strictEqual(crypto.createHash("sha256").update(castle.pages.map(function (page) {
  return page.prose;
}).join("\n")).digest("hex"), proseBefore);

function actionBeat(id, locationId, action) {
  return { beatId: id, role: "attempt", locationId: locationId, action: action, entitiesRequired: ["object"] };
}

var waterfallPath = path.join(root, "docs/agent/book-v2/secret-beyond-the-waterfall/book.json");
var waterfallBefore = fs.readFileSync(waterfallPath);
var waterfall = JSON.parse(waterfallBefore.toString("utf8"));
var waterfallReport = Adventure.assess(waterfall.bible, {
  tone: "adventure",
  idea: waterfall.bible.userIdea,
  length: "storybook",
  pageCount: 12
});
assert.ok(waterfallReport.blockProblems.indexOf("narrow-adventure") >= 0, waterfallReport.blockProblems.join(", "));
assert.ok(waterfallReport.placeShare >= 0.6);
assert.strictEqual(fs.readFileSync(waterfallPath).equals(waterfallBefore), true);

var onePlaceWonder = [];
["They meet a singing turtle.", "A curtain of fish opens.", "They follow a ribbon of light.", "A small boat is waiting.", "They hear their names in the spray.", "A garden grows on the water.", "They share a shell of stars with a shy eel.", "The eel shows them a door of bubbles.", "They step through into moonlight.", "They wave to the turtle.", "They find a pebble that remembers them.", "They walk home along the glow."].forEach(function (action, index) {
  onePlaceWonder.push(actionBeat("w" + (index + 1), "grotto", action));
});
var wonder = Adventure.assess({
  tone: "adventure",
  targetLength: "storybook",
  pageCount: 12,
  userIdea: "Maya and Leo discover a pathway behind a waterfall that leads them into a hidden world.",
  locations: [place("grotto", "a glowing water grotto", []), place("home", "the path home", ["grotto"])],
  journey: [
    section({ section: "meet", locationId: "grotto", objective: "Find who lives here", discovery: "A singing turtle", change: "They follow the turtle", leadsTo: "grotto" }),
    section({ section: "garden", locationId: "grotto", objective: "See what the water is growing", discovery: "A garden and a shy eel", change: "The eel opens a door of bubbles", leadsTo: "home" }),
    section({ section: "home", locationId: "home", objective: "Carry the memory home", discovery: "A pebble that remembers them", change: "They leave with the glow", leadsTo: "" })
  ],
  beats: onePlaceWonder.concat([actionBeat("w13", "home", "They walk home along the glow.")]).slice(0, 12)
}, { tone: "adventure", idea: "Maya and Leo discover a pathway behind a waterfall that leads them into a hidden world.", length: "storybook", pageCount: 12 });
assert.strictEqual(wonder.blockProblems.indexOf("narrow-adventure"), -1, wonder.blockProblems.join(", "));

var repairIdea = "Maya and Leo mend a broken music box before the concert.";
var repairBeats = [];
for (var step = 1; step <= 12; step += 1) {
  repairBeats.push(actionBeat("r" + step, "workshop", "Maya lifts the broken wheel and Leo presses it into the socket."));
}
var repair = Adventure.assess({
  tone: "adventure",
  targetLength: "storybook",
  pageCount: 12,
  userIdea: repairIdea,
  locations: [place("workshop", "a small music workshop", [])],
  journey: [
    section({ section: "open", locationId: "workshop", objective: "See why the box is silent", discovery: "The wheel has slipped", change: "They decide to mend it", leadsTo: "workshop" }),
    section({ section: "mend", locationId: "workshop", objective: "Seat the wheel", discovery: "It wobbles until they press together", change: "The box can hold a note", leadsTo: "" })
  ],
  beats: repairBeats
}, { tone: "adventure", idea: repairIdea, length: "storybook", pageCount: 12 });
assert.strictEqual(repair.blockProblems.indexOf("narrow-adventure"), -1, repair.blockProblems.join(", "));

var lanternBeats = ["hall", "stair", "cellar", "hall"].reduce(function (list, room) {
  for (var copy = 0; copy < 3; copy += 1) {
    list.push(actionBeat(room + copy + list.length, room, "Maya lifts the lantern and Leo presses it into the silver socket."));
  }
  return list;
}, []);
var repeated = Adventure.assess({
  tone: "adventure",
  targetLength: "storybook",
  pageCount: 12,
  userIdea: "Maya and Leo follow a light through an old house.",
  locations: [
    place("hall", "a long hall", ["stair"]),
    place("stair", "a turning stair", ["hall", "cellar"]),
    place("cellar", "a cool cellar", ["stair"])
  ],
  journey: [
    section({ section: "hall", locationId: "hall", objective: "Try the lantern", discovery: "The socket is empty", change: "They carry it upstairs", leadsTo: "stair" }),
    section({ section: "stair", locationId: "stair", objective: "Try the lantern again", discovery: "The socket is still empty", change: "They carry it down", leadsTo: "cellar" }),
    section({ section: "cellar", locationId: "cellar", objective: "Try the lantern once more", discovery: "The socket is empty here too", change: "They take it back", leadsTo: "hall" })
  ],
  beats: lanternBeats
}, { tone: "adventure", idea: "Maya and Leo follow a light through an old house.", length: "storybook", pageCount: 12 });
assert.ok(repeated.blockProblems.indexOf("narrow-adventure") >= 0, repeated.blockProblems.join(", "));
assert.ok(repeated.distinctSettings.length >= 3);

var nextGuide = Adventure.writerGuide({
  tone: "adventure",
  idea: "Maya and Leo discover a mysterious pathway behind a waterfall that leads them into a hidden world.",
  length: "storybook",
  pageCount: 12
});
assert.ok(nextGuide.indexOf("Do not default to a broken magical object") >= 0);
assert.ok(nextGuide.indexOf("narrow-adventure") >= 0);
assert.ok(nextGuide.indexOf("A repair can be the story") >= 0);
assert.ok(!/\b(must visit|at least \d+ (places|locations)|exactly \d+ locations)\b/i.test(nextGuide));

console.log("book-adventure.test.js ok");
