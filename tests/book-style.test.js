"use strict";

var assert = require("assert");
var Visual = require("../js/book-visual.js");
var Book = require("../js/book-brain.js");

var places = {
  tone: "bedtime",
  locations: [
    { locationId: "cabin", name: "the cabin", visualIdentity: "a small wooden room with a bed" },
    { locationId: "reef", name: "the reef city", visualIdentity: "a vast city of coral under deep water" }
  ]
};

var warm = {
  locationId: "cabin",
  palette: "amber",
  timeOfDay: "evening",
  weather: "still",
  warmth: "warm",
  compositionIntent: "A quiet room.",
  visualFocus: "The bed.",
  storyEvent: "The sailor sits down.",
  charactersPresent: [],
  shotType: "medium",
  textSafeRegion: "upper-left"
};
var deep = {
  locationId: "reef",
  palette: "blue-green",
  timeOfDay: "night",
  weather: "current",
  warmth: "cool",
  glow: "a soft glow from the coral",
  compositionIntent: "Render this page as a 3D animation still.",
  visualFocus: "The towers.",
  storyEvent: "The sailor looks up.",
  charactersPresent: [],
  shotType: "establishing",
  textSafeRegion: "upper-right",
  styleId: "glossy-animation"
};

var cabin = Visual.spreadStyle(places, warm, places.locations[0]);
var reef = Visual.spreadStyle(places, deep, places.locations[1]);
assert.strictEqual(cabin.styleId, "wondii-picture-book");
assert.strictEqual(reef.styleId, "wondii-picture-book");
assert.strictEqual(cabin.scope, "book");
assert.ok(Visual.sameIllustrator(cabin, reef));
assert.ok(Visual.atmosphereDelta(cabin.atmosphere, reef.atmosphere).indexOf("palette") >= 0);
assert.ok(Visual.atmosphereDelta(cabin.atmosphere, reef.atmosphere).indexOf("warmth") >= 0);
assert.notStrictEqual(Visual.styleFor("bedtime").mood, Visual.styleFor("mystery").mood);
assert.strictEqual(Visual.styleFor("bedtime").styleId, Visual.styleContract({ tone: "mystery" }).styleId);

var reefPrompt = Visual.spreadPrompt(places, deep, []);
var cabinPrompt = Visual.spreadPrompt(places, warm, []);
assert.ok(reefPrompt.indexOf("wondii-picture-book") >= 0);
assert.ok(cabinPrompt.indexOf(cabin.illustrator.rendering) >= 0);
assert.ok(reefPrompt.indexOf(reef.illustrator.rendering) >= 0);
assert.ok(reefPrompt.toLowerCase().indexOf("3d animation") < 0);
assert.ok(reefPrompt.indexOf("Do not change this illustrator") >= 0);
assert.ok(Visual.styleOverrides("Render this page as a 3D animation still.").length === 1);
assert.ok(Visual.styleOverrides("Not a 3D render.").length === 0);

var repair = Visual.repairPrompt(places, deep, []);
assert.ok(repair.indexOf("wondii-picture-book") >= 0);
assert.ok(repair.indexOf(reef.illustrator.finish) >= 0);
assert.ok(repair.indexOf("Do not switch rendering") >= 0);
assert.ok(repair.toLowerCase().indexOf("3d animation") < 0);

var kept = Visual.regenContract(deep);
assert.strictEqual(kept.mustKeep.styleId, "wondii-picture-book");
assert.strictEqual(kept.mustKeep.illustrator.rendering, cabin.illustrator.rendering);

var bookRepair = Book.repairRequest({ visualStyle: "3d", pages: [{ pageId: "p2", locationId: "reef", stateBefore: { characters: [] }, stateAfter: { characters: [] } }] }, "p2");
assert.strictEqual(bookRepair.visualStyle, "wondii-picture-book");
assert.strictEqual(bookRepair.styleScope, "book");

var approved = { spreadId: "p2", reference: true, rendering: "painted", proportions: "picture-book", edge: "soft", texture: "painted", finish: "picture-book", characterRendering: "painted", environmentRendering: "painted", palette: "amber", weather: "still", timeOfDay: "evening" };
var anotherPlace = { spreadId: "p10", rendering: "painted", proportions: "picture-book", edge: "soft", texture: "painted", finish: "picture-book", characterRendering: "painted", environmentRendering: "painted", palette: "blue-green", weather: "current", timeOfDay: "night", warmth: "cool" };
assert.strictEqual(Visual.styleCoherence([approved, anotherPlace]).ok, true);

function drifted(patch) {
  return Visual.styleCoherence([approved, Object.assign({ spreadId: "p4" }, approved, patch, { reference: false })]);
}
assert.ok(drifted({ rendering: "3d" }).problems.some(function (problem) { return problem.indexOf("rendering") >= 0; }));
assert.ok(drifted({ texture: "flat" }).problems.some(function (problem) { return problem.indexOf("texture") >= 0; }));
assert.ok(drifted({ proportions: "chibi" }).problems.some(function (problem) { return problem.indexOf("proportions") >= 0; }));
assert.ok(drifted({ finish: "animation-still" }).problems.some(function (problem) { return problem.indexOf("finish") >= 0; }));
assert.ok(drifted({ edge: "ink" }).problems.some(function (problem) { return problem.indexOf("edge") >= 0; }));
assert.ok(drifted({ characterRendering: "photoreal" }).problems.some(function (problem) { return problem.indexOf("characterRendering") >= 0; }));
assert.ok(drifted({ environmentRendering: "vector" }).problems.some(function (problem) { return problem.indexOf("environmentRendering") >= 0; }));

var alone = Visual.acceptIllustration({
  characters: [{ characterId: "sailor", identityMatch: true }],
  style: { rendering: "glossy" },
  locationMatch: true,
  prematureResult: false,
  textDetected: false,
  anatomyOk: true,
  textSafeUsable: true,
  duplicateCharacter: false
}, { charactersPresent: ["sailor"], montage: false });
assert.ok(alone.problems.indexOf("style-drift:rendering:glossy") >= 0);

console.log("book-style tests ok");
