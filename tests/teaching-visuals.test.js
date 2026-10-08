"use strict";

// Teaching visuals (patch 6). In research mode each gate-ready unit gets one teaching picture,
// chosen by a reusable rule from the unit's own source wording: comparison when the explanation
// compares ("than"), cutaway when the feature is inside the body, close-up otherwise. Teaching
// pictures show one animal type, no people and no text, and keep the deep-time guard (no
// pterosaurs or sea reptiles shown as the lesson group, no mixed periods). The hook is framed as
// a story picture and keeps the no-people-beside-living-animals guard. Every asset carries a
// frame label the player shows. The production planner (planVisualAssets) is unchanged.

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Visuals = require("../js/visual-adventure.js");

var adventure = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/source-grounded/run9-generate-adventure.json"), "utf8"));
adventure.topic = "Dinosaurs"; adventure.yearGroup = "Year 3"; adventure.subject = "Science";
var apply = adventure.activities.filter(function (a) { return a.slotId === "apply"; })[0];
apply.scene = apply.scene || {};
apply.scene.interaction = { type: "choose", instruction: "Choose one.", unitId: "u1", newCase: { text: "Imagine two new reptiles: one with straight legs under its body and one with legs sprawled to the side.", kind: "transfer" }, choices: [{ text: "Straight legs", correct: true, feedback: "x" }, { text: "Sprawled legs", correct: false, feedback: "y" }] };

var units = [
  { unitId: "u1", feature: "straight back legs, perpendicular to their bodies", explanation: "Straight back legs let them use less energy to move than sprawling reptiles.", featureQuote: "they had straight back legs, perpendicular to their bodies.", explanationQuote: "This allowed them to use less energy to move than other reptiles that had a sprawling stance like today's lizards and crocodiles.", beatIds: ["teach:1"] },
  { unitId: "u2", feature: "two holes behind the eye socket in the skull", explanation: "The holes held jaw muscles.", featureQuote: "two holes behind the eye socket", explanationQuote: "This let them open wide and clamp down with more force.", beatIds: ["teach:2"] },
  { unitId: "u3", feature: "feathers on the arms", explanation: "Feathers kept them warm.", featureQuote: "had feathers on their arms", explanationQuote: "The feathers kept them warm.", beatIds: ["teach:3"] }
];

// The view rule.
assert.strictEqual(Visuals.teachingView(units[0]), "comparison", "\"than\" in the explanation -> comparison");
assert.strictEqual(Visuals.teachingView(units[1]), "cutaway", "a part inside the body (skull, hole) -> cutaway");
// Patch 7: a close-up is not identifiable; an outside feature now gets the whole animal.
assert.strictEqual(Visuals.teachingView(units[2]), "whole-animal", "an outside feature with no comparison -> the whole, identifiable animal");

var plan = Visuals.planTeachingVisuals(adventure, units);
assert.deepStrictEqual(plan.map(function (a) { return a.id; }), ["hook", "teach-u1", "teach-u2", "teach-u3", "apply"]);
assert.strictEqual(plan[0].frameLabel, Visuals.FRAME_LABELS.story);
plan.slice(1, 4).forEach(function (a) { assert.strictEqual(a.frameLabel, Visuals.FRAME_LABELS.teaching); });
assert.strictEqual(plan[4].frameLabel, Visuals.FRAME_LABELS.example, "a transfer example is framed as imagined");
assert.deepStrictEqual(plan[1].beatIds, ["teach:1"]);
assert.ok(/other reptiles that had a sprawling stance/.test(plan[1].compared), "comparison names what the source compares with");

// Teaching prompts: the feature, the source wording, no people, no text, the deep-time group guard.
var p1 = Visuals.buildTeachingVisualPrompt(adventure, plan[1]);
assert.ok(/Side-by-side comparison/.test(p1));
assert.ok(p1.indexOf("straight back legs, perpendicular to their bodies") !== -1);
assert.ok(/No people/.test(p1));
assert.ok(/Do not draw any words/.test(p1));
assert.ok(/pterosaurs/.test(p1) && /do not mix animals from different periods/.test(p1), "deep-time guard in teaching prompts");
assert.ok(/single type/.test(p1));
assert.ok(/Cutaway or skull view/.test(Visuals.buildTeachingVisualPrompt(adventure, plan[2])));
assert.ok(/The whole of one animal of a single type, side-on/.test(Visuals.buildTeachingVisualPrompt(adventure, plan[3])));
// The example picture must not give the answer away.
assert.ok(/does not give away which option is the answer/.test(Visuals.buildTeachingVisualPrompt(adventure, plan[4])));
// The hook is a story picture and keeps the production no-people-beside-living-animals guard.
var hook = Visuals.buildTeachingVisualPrompt(adventure, plan[0]);
assert.ok(/STORY PICTURE: this is an imagined adventure scene/.test(hook));
assert.ok(hook.indexOf(Visuals.buildAdventurePrompt(adventure, plan[0], Visuals.charactersForAdventure(adventure))) === 0, "hook prompt starts with the production prompt (all its guards)");
assert.ok(/no people|No people|without people|no humans|No humans/i.test(hook), "no-people guard kept for a living-past hook");

// Negative: no units or no staged activities -> no teaching plan; the production planner is unchanged.
assert.deepStrictEqual(Visuals.planTeachingVisuals(adventure, []), []);
assert.deepStrictEqual(Visuals.planTeachingVisuals({ activities: [] }, units), []);
var production = Visuals.planVisualAssets(adventure);
assert.ok(production.every(function (a) { return !a.frameLabel && !/^teach-u/.test(a.id); }), "production planner adds no frame labels or unit pictures");
// Negative: no choose step -> no example picture.
var noChoose = JSON.parse(JSON.stringify(adventure));
noChoose.activities.filter(function (a) { return a.slotId === "apply"; })[0].scene.interaction = { type: "tap" };
assert.ok(Visuals.planTeachingVisuals(noChoose, units).every(function (a) { return a.id !== "apply"; }));

// Player: a beat's own picture is shown, with its frame label.
require("../schools/learn/visual-client.js");
var Shell = require("../schools/learn/lesson-shell.js");
globalThis.WondiiVisuals.bind([
  { id: "teach-u1", status: "ready", publicUrl: "images/teach-u1.jpg", frameLabel: Visuals.FRAME_LABELS.teaching },
  { id: "teach-u2", status: "ready", publicUrl: "images/teach-u2.jpg", frameLabel: Visuals.FRAME_LABELS.teaching },
  { id: "hook", status: "ready", publicUrl: "images/hook.jpg" }
]);
var teachSlide = { visualAssetId: "teach-u1", beats: [{ id: "teach:1", visualAssetId: "teach-u1" }, { id: "teach:2", visualAssetId: "teach-u2" }, { id: "teach:3" }] };
assert.strictEqual(Shell.worldFor(teachSlide, { beat: 0 }).url, "images/teach-u1.jpg");
assert.strictEqual(Shell.worldFor(teachSlide, { beat: 1 }).url, "images/teach-u2.jpg", "beat 2 shows its own unit picture");
assert.strictEqual(Shell.worldFor(teachSlide, { beat: 2 }).url, "images/teach-u1.jpg", "a beat without its own picture shows the slide picture");
assert.strictEqual(Shell.worldFor(teachSlide, { beat: 1 }).tag, Visuals.FRAME_LABELS.teaching);
assert.strictEqual(Shell.worldFor(teachSlide).url, "images/teach-u1.jpg", "no play state -> the slide picture (unchanged behaviour)");
assert.strictEqual(Shell.worldFor({ visualAssetId: "hook" }, { beat: 0 }).tag, undefined, "no label when the asset has none (production assets)");
console.log("teaching visuals tests passed");
