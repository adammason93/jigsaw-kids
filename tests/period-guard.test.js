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

// Live run 9: a living-past place plus three character sheets gave children beside living
// dinosaurs in all four pictures. A living-past place now carries no characters at all.
var living = { topic: "Dinosaurs", subject: "Science", yearGroup: "Year 3", activities: [], storyPlan: { characters: [], setting: "A prehistoric landscape filled with various dinosaurs, each showcasing unique features that help them survive." } };
var livingPrompt = Visuals.buildAdventurePrompt(living, asset, Visuals.charactersForAdventure(living));
assert.ok(Visuals.livingPastScene(living, living.storyPlan.setting));
assert.ok(livingPrompt.indexOf("CHARACTER_A") === -1, "no character sheet in a living-past picture");
assert.ok(/no people in it: no children, no explorers/.test(livingPrompt));
assert.ok(livingPrompt.indexOf(guard) !== -1, "the period guard stays");
// A fossil dig or museum keeps the explorers (people with fossils is allowed by the guard).
["A fossil dig on a windy cliff", "The dinosaur gallery of a natural history museum", "A dinosaur skeleton in the school hall"].forEach(function (setting) {
  var withPeople = { topic: "Dinosaurs", subject: "Science", yearGroup: "Year 3", activities: [], storyPlan: { characters: [], setting: setting } };
  var p = Visuals.buildAdventurePrompt(withPeople, asset, Visuals.charactersForAdventure(withPeople));
  assert.ok(!Visuals.livingPastScene(withPeople, setting), setting);
  assert.ok(p.indexOf("CHARACTER_A") !== -1, "explorers stay for: " + setting);
});
// Non-deep-time lessons are unchanged.
var shark = { topic: "Sharks", subject: "Science", yearGroup: "Year 4", activities: [], storyPlan: { characters: [], setting: "A coral reef" } };
assert.ok(!Visuals.livingPastScene(shark, "A coral reef"));
assert.ok(Visuals.buildAdventurePrompt(shark, asset, Visuals.charactersForAdventure(shark)).indexOf("CHARACTER_A") !== -1);

console.log("period guard tests passed");
