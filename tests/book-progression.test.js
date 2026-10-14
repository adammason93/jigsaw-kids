var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Progress = require("../js/book-progression.js");
var Book = require("../js/book-brain.js");

var source = fs.readFileSync(path.join(__dirname, "../js/book-progression.js"), "utf8");
var writer = fs.readFileSync(path.join(__dirname, "../scripts/book/writer.js"), "utf8");
assert.ok(!/maya|flowerpot|hidden-star|garden-wall|a blink for the sky/i.test(source));
assert.ok(writer.indexOf("story state must change") >= 0);
assert.ok(writer.indexOf("interchangeable attempt") >= 0);

function row(partial) {
  return {
    beatId: partial.beatId,
    spreadId: partial.spreadId || partial.beatId,
    role: partial.role,
    locationId: partial.locationId,
    locationZone: partial.zone || "",
    worldState: partial.world || "",
    environmentalState: partial.environment || "",
    timeOfDay: partial.time || "",
    goalNow: partial.goal || "",
    obstacleNow: partial.obstacle || "",
    consequenceNow: partial.consequence || "",
    emotion: partial.emotion || "calm",
    shotType: partial.shot || "medium",
    charactersPresent: partial.cast || ["nima"],
    stateAfter: { entities: partial.entities || [] }
  };
}

function ent(id, owner, at) {
  return { entityId: id, ownerCharacterId: owner || null, locationId: at || "", state: partialState(id) };
}

function partialState() {
  return "present";
}

function place(id, links) {
  return { locationId: id, name: id, connectedTo: links || [], visualIdentity: id };
}

var pirate = Progress.review({
  length: "storybook",
  tone: "adventure",
  bible: {
    goal: "Bring the key home",
    centralProblem: "The key is locked away",
    tone: "adventure",
    targetLength: "storybook",
    locations: [place("ship", ["island"]), place("island", ["ship", "cave"]), place("cave", ["island"])],
    entities: [{ entityId: "brass-key", name: "brass key", identity: "a brass key" }]
  },
  beats: [
    row({ beatId: "a1", role: "hook", locationId: "ship", emotion: "wary" }),
    row({ beatId: "a2", role: "approach", locationId: "island", emotion: "alert", entryFrom: "ship" }),
    row({ beatId: "a3", role: "discovery", locationId: "cave", entities: [ent("brass-key", null, "cave")] }),
    row({ beatId: "a4", role: "attempt", locationId: "cave", entities: [ent("brass-key", null, "cave")], obstacle: "The lock will not turn" }),
    row({ beatId: "a5", role: "consequence", locationId: "cave", entities: [ent("brass-key", "nima", "cave")], consequence: "The lock gives way" }),
    row({ beatId: "a6", role: "climax", locationId: "island", entities: [ent("brass-key", "nima", "island")] }),
    row({ beatId: "a7", role: "resolution", locationId: "ship", entities: [ent("brass-key", "nima", "ship")] })
  ]
});
assert.strictEqual(pirate.verdict, "PASS", pirate.blockProblems.concat(pirate.reviewProblems).join(", "));
assert.ok(pirate.progressionDeltas.some(function (delta) { return delta.progressionDelta.LOCATION && delta.to === "a2"; }));
assert.strictEqual(pirate.staticRuns.length, 0);
assert.ok(pirate.storyProgressionMap.some(function (beat) { return beat.narrativePhase === "CLIMAX" && beat.layoutIntent === "DOUBLE_PAGE_SPREAD"; }));
assert.ok(pirate.visualProgressionMap.filter(function (beat) { return beat.locationId === "cave"; }).length >= 2);

var bedroom = Progress.review({
  tone: "magical",
  bible: {
    goal: "Get back to the floor",
    centralProblem: "Gravity is letting go",
    locations: [place("bedroom", [])],
    entities: []
  },
  beats: [
    row({ beatId: "b1", role: "hook", locationId: "bedroom", world: "ordinary" }),
    row({ beatId: "b2", role: "discovery", locationId: "bedroom", world: "a hum in the walls" }),
    row({ beatId: "b3", role: "attempt", locationId: "bedroom", world: "toys leaving the floor" }),
    row({ beatId: "b4", role: "setback", locationId: "bedroom", world: "a seam opens in the ceiling" }),
    row({ beatId: "b5", role: "climax", locationId: "bedroom", world: "the room turns upside down" }),
    row({ beatId: "b6", role: "resolution", locationId: "bedroom", world: "the room settles, changed" })
  ]
});
assert.strictEqual(bedroom.verdict, "PASS", bedroom.blockProblems.concat(bedroom.reviewProblems).join(", "));
assert.ok(bedroom.progressionDeltas.every(function (delta) { return delta.progressionDelta.LOCATION === false && delta.progressionDelta.WORLD_STATE === true; }));
assert.strictEqual(bedroom.staticRuns.length, 0);

var greenhouse = Progress.review({
  tone: "adventure",
  bible: {
    goal: "Keep the plants alive",
    centralProblem: "The glass is failing",
    locations: [place("greenhouse", [])],
    entities: [{ entityId: "glass-roof", name: "glass roof", identity: "a cracked glass roof" }]
  },
  beats: [
    row({ beatId: "c1", role: "hook", locationId: "greenhouse", world: "cracked", entities: [ent("glass-roof", null, "greenhouse")] }),
    row({ beatId: "c2", role: "attempt", locationId: "greenhouse", world: "patched", entities: [ent("glass-roof", null, "greenhouse")] }),
    row({ beatId: "c3", role: "consequence", locationId: "greenhouse", world: "humid", consequence: "The patch holds the rain out", entities: [ent("glass-roof", null, "greenhouse")] }),
    row({ beatId: "c4", role: "setback", locationId: "greenhouse", world: "overgrown", entities: [ent("glass-roof", null, "greenhouse")] }),
    row({ beatId: "c5", role: "climax", locationId: "greenhouse", world: "blooming", entities: [ent("glass-roof", null, "greenhouse")] }),
    row({ beatId: "c6", role: "resolution", locationId: "greenhouse", world: "steady", entities: [ent("glass-roof", null, "greenhouse")] })
  ]
});
assert.strictEqual(greenhouse.verdict, "PASS", greenhouse.blockProblems.concat(greenhouse.reviewProblems).join(", "));
assert.ok(greenhouse.progressionDeltas.some(function (delta) { return delta.progressionDelta.WORLD_STATE && delta.progressionDelta.LOCATION === false; }));
assert.strictEqual(greenhouse.staticRuns.length, 0);

var bedtime = Progress.review({
  tone: "bedtime",
  bible: {
    goal: "Settle for sleep",
    centralProblem: "The room still feels awake",
    tone: "bedtime",
    locations: [place("small-room", [])],
    entities: []
  },
  beats: [
    row({ beatId: "d1", role: "hook", locationId: "small-room", time: "dusk", environment: "lamp-on", emotion: "restless" }),
    row({ beatId: "d2", role: "wonder", locationId: "small-room", time: "night", environment: "rain", emotion: "listening" }),
    row({ beatId: "d3", role: "reaction", locationId: "small-room", time: "night", environment: "rain-soft", emotion: "quieter" }),
    row({ beatId: "d4", role: "resolution", locationId: "small-room", time: "late", environment: "moon", emotion: "sleepy" })
  ]
});
assert.strictEqual(bedtime.verdict, "PASS", bedtime.blockProblems.concat(bedtime.reviewProblems).join(", "));
assert.strictEqual(bedtime.staticRuns.length, 0);
assert.ok(bedtime.storyProgressionMap.some(function (beat) { return beat.quiet && beat.earned; }));
assert.ok(bedtime.progressionDeltas.some(function (delta) { return delta.progressionDelta.LOCATION === false && delta.progressionDelta.WORLD_STATE === true; }));

var stuck = Progress.review({
  bible: {
    goal: "Move the crate",
    centralProblem: "The crate will not budge",
    locations: [place("warehouse", [])],
    entities: [{ entityId: "crate", name: "crate", identity: "a heavy crate" }]
  },
  beats: [1, 2, 3, 4, 5].map(function (n) {
    return row({
      beatId: "e" + n,
      role: "attempt",
      locationId: "warehouse",
      shot: ["medium", "close", "overhead", "low", "high"][n - 1],
      emotion: "determined",
      entities: [ent("crate", null, "warehouse")]
    });
  })
});
assert.strictEqual(stuck.verdict, "BLOCK");
assert.strictEqual(stuck.staticRuns.length, 1);
assert.deepStrictEqual(stuck.staticRuns[0].spreadIds, ["e1", "e2", "e3", "e4", "e5"]);
assert.strictEqual(stuck.staticRuns[0].repeatedLocation, "warehouse");
assert.ok(stuck.staticRuns[0].unchangedDimensions.indexOf("LOCATION") >= 0);
assert.ok(stuck.staticRuns[0].unchangedDimensions.indexOf("WORLD_STATE") >= 0);
assert.ok(stuck.staticRuns[0].changedDimensions.indexOf("LOCATION") < 0);
assert.ok(!stuck.progressionDeltas.some(function (delta) { return delta.progressionDelta.SHOT || delta.progressionDelta.scaleChanged; }));

var camera = Progress.progressionDelta(
  row({ beatId: "s1", role: "attempt", locationId: "warehouse", shot: "medium", entities: [ent("crate", null, "warehouse")] }),
  row({ beatId: "s2", role: "attempt", locationId: "warehouse", shot: "close", entities: [ent("crate", null, "warehouse")] })
);
assert.strictEqual(camera.LOCATION, false);
assert.strictEqual(camera.WORLD_STATE, false);
assert.strictEqual(camera.ENTITY_STATE, false);
assert.strictEqual(camera.ACTION, false);

var quietBetween = Progress.review({
  bible: {
    locations: [place("bedroom", [])],
    entities: []
  },
  beats: [
    row({ beatId: "q1", role: "hook", locationId: "bedroom", world: "still" }),
    row({ beatId: "q2", role: "wonder", locationId: "bedroom", world: "still", emotion: "listening" }),
    row({ beatId: "q3", role: "discovery", locationId: "bedroom", world: "the window opens" })
  ]
});
assert.strictEqual(quietBetween.staticRuns.length, 0);
assert.strictEqual(quietBetween.storyProgressionMap[1].earned, true);

var sameAttempts = Progress.review({
  bible: { locations: [place("yard", [])], entities: [] },
  beats: [
    row({ beatId: "t1", role: "attempt", locationId: "yard" }),
    row({ beatId: "t2", role: "attempt", locationId: "yard" }),
    row({ beatId: "t3", role: "consequence", locationId: "yard", world: "the gate opens" })
  ]
});
assert.ok(sameAttempts.reviewProblems.indexOf("missing-consequence:t2") >= 0);
assert.strictEqual(sameAttempts.verdict, "REVIEW");

var unlinked = Progress.review({
  bible: { locations: [place("harbour", []), place("ridge", [])], entities: [] },
  beats: [
    row({ beatId: "u1", role: "hook", locationId: "harbour" }),
    row({ beatId: "u2", role: "approach", locationId: "ridge", world: "the path climbs" }),
    row({ beatId: "u3", role: "climax", locationId: "ridge", world: "the flag is reached" }),
    row({ beatId: "u4", role: "resolution", locationId: "ridge", world: "the flag stays" })
  ]
});
assert.ok(unlinked.reviewProblems.indexOf("world-link:u2") >= 0);
assert.ok(!unlinked.blockProblems.some(function (problem) { return problem.indexOf("movement-contradiction") === 0; }));

var erased = Progress.proseProblems({
  locations: [place("ship", ["island"]), place("island", ["ship"])],
  entities: []
}, [
  { pageId: "p1", beatId: "p1", role: "hook", locationId: "ship", prose: "They stood on the ship." },
  { pageId: "p2", beatId: "p2", role: "approach", locationId: "island", prose: "They kept pulling the same rope." }
]);
assert.ok(erased.indexOf("prose-erases-progression:p2") >= 0);

var kept = Progress.proseProblems({
  locations: [place("ship", ["island"]), place("island", ["ship"])],
  entities: []
}, [
  { pageId: "p1", beatId: "p1", role: "hook", locationId: "ship", prose: "They stood on the ship." },
  { pageId: "p2", beatId: "p2", role: "approach", locationId: "island", prose: "The island came into view." }
]);
assert.strictEqual(kept.length, 0);

var blocked = Book.validateBible({
  yearGroup: "Year 2",
  targetLength: "quick",
  userIdea: "Nima chases a kite across a field.",
  castIds: ["leo"],
  goal: "Catch the kite",
  centralProblem: "The kite stays put",
  premise: "Nima chases a kite across a field.",
  hook: "A kite sits in the grass.",
  climaxBeatId: "b5",
  resolutionBeatId: "b6",
  locations: [place("field", [])],
  entities: [],
  beats: [1, 2, 3, 4, 5, 6].map(function (n) {
    return {
      beatId: "b" + n,
      role: n === 1 ? "hook" : (n === 5 ? "climax" : (n === 6 ? "resolution" : "attempt")),
      locationId: "field",
      charactersPresent: ["leo"],
      expresses: n === 1 ? [{ characterId: "leo", trait: "careful", shows: "He checks the string." }] : [],
      because: n > 1 ? "b" + (n - 1) : "",
      resolvesProblem: n === 6,
      action: n === 5 || n === 6 ? "Nima chases the kite." : "Nima pulls the kite string.",
      emotion: "calm",
      shotType: "medium",
      stateBefore: { characters: [], entities: [] },
      stateAfter: { characters: [], entities: [] },
      problemFamily: "pull-" + n
    };
  })
});
assert.ok(blocked.problems.some(function (problem) { return problem.indexOf("static-run:") === 0; }), blocked.problems.join(", "));
