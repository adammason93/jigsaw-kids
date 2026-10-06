"use strict";

// Image guard for deep-time topics: no present-day people beside living dinosaurs.
// The explorer characters are present-day children; a dinosaur lesson's pictures show
// living dinosaurs without people, or people with fossils, skeletons, or models.

var assert = require("assert");
var Visuals = require("../js/visual-adventure.js");

var dino = { topic: "Dinosaurs", subject: "Science", yearGroup: "Year 3", activities: [], storyPlan: { characters: [] } };
var guard = Visuals.periodGuard(dino);
assert.ok(/never show a person beside a living dinosaur/.test(guard));
assert.ok(/fossils, skeletons, or museum models/.test(guard));
assert.ok(/correct proportions/.test(guard));
["Fossils", "Prehistoric life", "The Jurassic coast"].forEach(function (topic) {
  assert.ok(Visuals.periodGuard({ topic: topic }), topic);
});
assert.strictEqual(Visuals.periodGuard({ topic: "Volcanoes", subject: "Geography" }), "");
assert.strictEqual(Visuals.periodGuard({ topic: "Sharks" }), "");

var asset = { id: "teach", slotId: "teach", brief: { educationalFocus: "Straight back legs under the body" } };
var prompt = Visuals.buildAdventurePrompt(dino, asset, Visuals.charactersForAdventure(dino));
assert.ok(prompt.indexOf(guard) !== -1, "the dinosaur image prompt carries the period guard");
var other = Visuals.buildAdventurePrompt({ topic: "Sharks", subject: "Science", yearGroup: "Year 4" }, asset, []);
assert.ok(other.indexOf("living dinosaur") === -1);

console.log("period guard tests passed");
