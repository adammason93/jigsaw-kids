var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Journey = require("../js/book-journey.js");

var source = fs.readFileSync(path.join(__dirname, "../js/book-journey.js"), "utf8");
assert.ok(!/maya|flowerpot|hidden-star|garden-wall|a blink for the sky/i.test(source));

function beat(partial) {
  return {
    beatId: partial.beatId,
    role: partial.role,
    locationId: partial.locationId,
    subLocationId: partial.subLocationId || "",
    charactersPresent: partial.cast || ["nima"],
    emotion: partial.emotion || "calm",
    shotType: partial.shotType || "medium",
    textSafeRegion: partial.textSafeRegion || "upper-left",
    worldState: partial.worldState || "",
    lighting: partial.lighting || "",
    timeOfDay: partial.timeOfDay || "",
    visualImportance: partial.visualImportance || "",
    stateBefore: partial.before || { characters: [], entities: [] },
    stateAfter: partial.after || {
      characters: (partial.cast || ["nima"]).map(function (id) {
        return { characterId: id, locationId: partial.locationId, emotion: partial.emotion || "calm", clothing: "red coat", carriedEntities: partial.carried || [] };
      }),
      entities: partial.entities || []
    }
  };
}

function entity(id, state) {
  return { entityId: id, state: state, locationId: "" };
}

var kiteBible = {
  tone: "adventure",
  climaxBeatId: "k4",
  locations: [
    { locationId: "beach", name: "the beach", connectedTo: ["dune"], visualIdentity: "a wide sandy beach with one striped windbreak" }
  ],
  entities: [
    { entityId: "kite", name: "the kite", identity: "a red diamond kite", locationId: "" },
    { entityId: "windbreak", name: "the windbreak", identity: "a striped windbreak", locationId: "beach", landmark: true }
  ]
};

var kiteSamePlace = Journey.analyse({
  bible: kiteBible,
  beats: [
    beat({ beatId: "k1", role: "hook", locationId: "beach", emotion: "curious", entities: [entity("kite", "folded on the sand")] }),
    beat({ beatId: "k2", role: "attempt", locationId: "beach", emotion: "hopeful", entities: [entity("kite", "lifting off the sand")] }),
    beat({ beatId: "k3", role: "setback", locationId: "beach", subLocationId: "shoreline", emotion: "worried", entities: [entity("kite", "tangled in the windbreak")] }),
    beat({ beatId: "k4", role: "climax", locationId: "beach", emotion: "proud", entities: [entity("kite", "high over the sea")] })
  ]
});
assert.ok(kiteSamePlace.deltas.some(function (row) {
  return row.visualDelta.locationChanged === false && row.storyProgressed === true && row.visualDelta.objectStateChanged === true;
}));
assert.strictEqual(kiteSamePlace.repetition.length, 0);
assert.ok(!kiteSamePlace.problems.some(function (problem) { return problem.indexOf("location-required") === 0; }));

var cameraOnly = Journey.analyse({
  beats: [
    beat({ beatId: "c1", role: "attempt", locationId: "beach", shotType: "medium", entities: [entity("kite", "folded on the sand")] }),
    beat({ beatId: "c2", role: "attempt", locationId: "beach", shotType: "close", entities: [entity("kite", "folded on the sand")] })
  ]
});
assert.strictEqual(cameraOnly.deltas[0].visualDelta.scaleChanged, true);
assert.strictEqual(cameraOnly.deltas[0].storyProgressed, false);
assert.strictEqual(cameraOnly.deltas[0].cameraOnly, true);
assert.ok(cameraOnly.problems.indexOf("spread-unearned:c2") >= 0);

var repeated = Journey.analyse({
  bible: {
    locations: [{ locationId: "shore", name: "the shore", connectedTo: [], visualIdentity: "wet sand and one breakwater" }],
    entities: [{ entityId: "kite", name: "the kite", identity: "a red kite", locationId: "" }]
  },
  beats: [1, 2, 3, 4].map(function (n) {
    return beat({
      beatId: "r" + n,
      role: n === 1 ? "attempt" : "reaction",
      locationId: "shore",
      emotion: "curious",
      entities: [entity("kite", n === 1 ? "in hand" : "still in hand")]
    });
  })
});
assert.strictEqual(repeated.repetition.length, 1);
assert.strictEqual(repeated.repetition[0].length, 4);
assert.deepStrictEqual(repeated.repetition[0].reasons, [
  "same-location", "same-cast", "same-story-objects", "in-place-action", "same-emotional-register"
]);
assert.ok(repeated.problems.some(function (problem) { return problem.indexOf("visual-repetition:") === 0; }));

var quiet = Journey.analyse({
  bible: {
    tone: "bedtime",
    locations: [{ locationId: "bedroom", name: "the bedroom", connectedTo: [], visualIdentity: "a small bedroom with a round window" }],
    entities: [{ entityId: "lamp", name: "the lamp", identity: "a bedside lamp", locationId: "bedroom", landmark: true }]
  },
  beats: [
    beat({ beatId: "q1", role: "hook", locationId: "bedroom", emotion: "sleepy", entities: [] }),
    beat({ beatId: "q2", role: "discovery", locationId: "bedroom", subLocationId: "window", emotion: "curious", entities: [entity("moth", "on the glass")] }),
    beat({ beatId: "q3", role: "attempt", locationId: "bedroom", subLocationId: "bed", emotion: "gentle", worldState: "lamp-dim", entities: [entity("moth", "still on the glass")] }),
    beat({ beatId: "q4", role: "approach", locationId: "bedroom", subLocationId: "window", emotion: "quiet", worldState: "curtain-open", entities: [entity("moth", "lifting")] }),
    beat({ beatId: "q5", role: "resolution", locationId: "bedroom", emotion: "still", worldState: "lamp-off", entities: [entity("moth", "gone into the dark")] })
  ]
});
assert.ok(quiet.deltas.every(function (row) { return row.visualDelta.locationChanged === false; }));
assert.ok(quiet.deltas.some(function (row) { return row.storyProgressed === true; }));
assert.strictEqual(quiet.repetition.length, 0);
assert.strictEqual(quiet.visualArc.intensity, "gentle");
assert.ok(!quiet.problems.some(function (problem) { return problem.indexOf("visual-repetition") === 0; }));

var foxBible = {
  tone: "adventure",
  climaxBeatId: "f3",
  locations: [
    { locationId: "clearing", name: "the clearing", connectedTo: ["creek"], visualIdentity: "a pine clearing around a moss stone" },
    { locationId: "creek", name: "the creek", connectedTo: ["clearing"], visualIdentity: "a creek beside the same moss stone" }
  ],
  entities: [
    { entityId: "lantern", name: "the lantern", identity: "a small brass lantern", locationId: "" },
    { entityId: "moss-stone", name: "the moss stone", identity: "a moss stone", locationId: "clearing", landmark: true }
  ]
};
var fox = Journey.analyse({
  bible: foxBible,
  beats: [
    beat({ beatId: "f1", role: "hook", locationId: "clearing", cast: ["fox"], entities: [entity("lantern", "unlit")] }),
    beat({ beatId: "f2", role: "approach", locationId: "creek", cast: ["fox"], entities: [entity("lantern", "lit")] }),
    beat({ beatId: "f3", role: "climax", locationId: "creek", cast: ["fox"], emotion: "brave", entities: [entity("lantern", "held high")] })
  ]
});
assert.strictEqual(fox.deltas[0].visualDelta.locationChanged, true);
assert.strictEqual(fox.deltas[0].worldIdentity.identityHeld, true);
assert.ok(fox.deltas[0].worldIdentity.sharedLandmarks.indexOf("moss-stone") >= 0);

var broken = Journey.analyse({
  bible: {
    locations: [
      { locationId: "clearing", name: "the clearing", connectedTo: [], visualIdentity: "pines" },
      { locationId: "desert", name: "the desert", connectedTo: [], visualIdentity: "dunes" }
    ]
  },
  beats: [
    beat({ beatId: "w1", role: "hook", locationId: "clearing" }),
    beat({ beatId: "w2", role: "attempt", locationId: "desert" })
  ]
});
assert.ok(broken.problems.indexOf("world-break:w2") >= 0);

var objectChange = Journey.analyse({
  beats: [
    beat({ beatId: "o1", role: "attempt", locationId: "yard", entities: [entity("robot", "still")] }),
    beat({ beatId: "o2", role: "attempt", locationId: "yard", entities: [entity("robot", "rolling")] })
  ]
});
assert.strictEqual(objectChange.deltas[0].visualDelta.objectStateChanged, true);
assert.strictEqual(objectChange.deltas[0].storyProgressed, true);

var characterChange = Journey.analyse({
  beats: [
    beat({ beatId: "h1", role: "relationship", locationId: "house", emotion: "calm", carried: [], entities: [entity("robot", "still")] }),
    beat({ beatId: "h2", role: "relationship", locationId: "house", emotion: "calm", carried: ["robot"], entities: [entity("robot", "still")] })
  ]
});
assert.strictEqual(characterChange.deltas[0].visualDelta.characterStateChanged, true);
assert.strictEqual(characterChange.deltas[0].visualDelta.emotionalStateChanged, false);
assert.strictEqual(characterChange.deltas[0].storyProgressed, true);

var climax = Journey.analyse({
  bible: { climaxBeatId: "x3" },
  beats: [
    beat({ beatId: "x1", role: "hook", locationId: "house" }),
    beat({ beatId: "x2", role: "attempt", locationId: "house", entities: [entity("robot", "awake")] }),
    beat({ beatId: "x3", role: "climax", locationId: "house", emotion: "proud", entities: [entity("robot", "lifting the roof")] })
  ]
});
assert.strictEqual(climax.spreads[2].visualImportance, "hero");
assert.strictEqual(climax.spreads[2].pageRole, Journey.PAGE_ROLES.DOUBLE_PAGE_SPREAD);
assert.ok(climax.spreads.slice(0, 2).every(function (spread) { return spread.visualImportance !== "hero"; }));

var manyHeroes = Journey.analyse({
  bible: { climaxBeatId: "m2" },
  beats: [
    beat({ beatId: "m1", role: "attempt", locationId: "house", visualImportance: "hero" }),
    beat({ beatId: "m2", role: "climax", locationId: "house", visualImportance: "hero" }),
    beat({ beatId: "m3", role: "resolution", locationId: "house", visualImportance: "hero" })
  ]
});
assert.ok(manyHeroes.problems.indexOf("hero-repeat") >= 0);
assert.strictEqual(manyHeroes.spreads.filter(function (spread) { return spread.visualImportance === "hero"; }).length, 1);
assert.strictEqual(manyHeroes.spreads[1].visualImportance, "hero");

assert.deepStrictEqual(Object.keys(kiteSamePlace.deltas[0].visualDelta), Journey.DELTA_KEYS);

var left = Journey.analyse({
  beats: [
    beat({ beatId: "p1", role: "hook", locationId: "house", textSafeRegion: "upper-right" }),
    beat({ beatId: "p2", role: "discovery", locationId: "house", textSafeRegion: "upper-left" })
  ]
});
assert.strictEqual(left.spreads[0].pageRole, "left-page");
assert.strictEqual(left.spreads[0].plannedTextRegion, "upper-left");
assert.strictEqual(left.spreads[1].pageRole, "right-page");
assert.strictEqual(left.spreads[1].plannedTextRegion, "upper-right");

console.log("book-journey tests ok");
