"use strict";

// Patch 7 image rules (teaching visuals for research lessons; reusable, no animal list):
// one identifiable animal per teaching picture with its taught feature clear of the text panel;
// story pictures never mix periods, using period words from the source passages (made-up animal
// names below prove nothing depends on a list); a single-animal scene with a recorded limitation
// otherwise. Test strings only.
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Visuals = require("../js/visual-adventure.js");
var Finish = require("../scripts/source-grounded/finish.js");
var Brain = require("../js/lesson-brain.js");

assert.deepStrictEqual(Visuals.periodsIn("It lived in the Jurassic period, long before the Cretaceous."), ["Jurassic", "Cretaceous"]);
assert.deepStrictEqual(Visuals.periodsIn("No period here."), []);

var a = { unitId: "u1", feature: "tall back plates", explanation: "Tall back plates let Examplosaurus warm up in the sun.", featureQuote: "Examplosaurus had tall plates along its back.", explanationQuote: "The plates let it warm up in the sun.",
  passageText: "Examplosaurus lived about 150 million years ago in the Jurassic period. Examplosaurus had tall plates along its back. The plates let it warm up in the sun. Its tail had four spikes." };
var b = { unitId: "u2", feature: "a long snout", explanation: "A long snout let Testodon catch fish.", featureQuote: "Testodon had a long snout.", explanationQuote: "This let it catch fish.",
  passageText: "Testodon had a long snout. This let it catch fish. Testodon lived during the Cretaceous period." };
var c = { unitId: "u3", feature: "wide feet", explanation: "Wide feet let Fakeops walk on mud.", featureQuote: "Fakeops had wide feet.", explanationQuote: "This let it walk on mud.", passageText: "Fakeops had wide feet. This let it walk on mud." };
var a2 = JSON.parse(JSON.stringify(b)); a2.unitId = "u4"; a2.passageText = a2.passageText.replace("Cretaceous", "Jurassic");

assert.strictEqual(Visuals.unitSubject(a), "Examplosaurus");
assert.deepStrictEqual(Visuals.unitPeriod(a), { subject: "Examplosaurus", period: "Jurassic", periods: ["Jurassic"] });
assert.strictEqual(Visuals.unitPeriod(c).period, "", "no period in the source -> unknown");

// Same period -> a group scene; mixed periods -> one animal and the limitation; unknown -> one animal.
var group = Visuals.storyScenePlan([a, a2]);
assert.strictEqual(group.mode, "group");
assert.deepStrictEqual(group.animals, ["Examplosaurus", "Testodon"]);
assert.ok(/which the sources place in the Jurassic period: Examplosaurus, Testodon/.test(Visuals.storySceneLine(group)));
var mixed = Visuals.storyScenePlan([a, b]);
assert.strictEqual(mixed.mode, "single");
assert.strictEqual(mixed.animal, "Examplosaurus");
assert.ok(/lived in different periods \(Examplosaurus: Jurassic; Testodon: Cretaceous\)/.test(mixed.limitation), mixed.limitation);
assert.ok(/Show exactly one animal: an Examplosaurus \(Jurassic period\)\. No other animals/.test(Visuals.storySceneLine(mixed)));
var unknown = Visuals.storyScenePlan([a, c]);
assert.strictEqual(unknown.mode, "single");
assert.ok(/do not say when every taught animal lived \(Fakeops\)/.test(unknown.limitation), unknown.limitation);

// The view rule: a comparison within one body is one animal; a comparison with another animal is two.
assert.strictEqual(Visuals.teachingView({ feature: "longer forelegs", explanationQuote: "its forelegs were longer than its hind legs, which helped it reach high." }), "whole-animal");
assert.strictEqual(Visuals.teachingView({ feature: "straight legs", explanationQuote: "This let them use less energy than reptiles with sprawling legs." }), "comparison");

// The panel check.
assert.strictEqual(Visuals.featureBoxClear({ left: 10, top: 60, width: 30, height: 20 }), false, "inside the lower-left panel");
assert.strictEqual(Visuals.featureBoxClear({ left: 62, top: 55, width: 30, height: 30 }), true, "right of the panel");
assert.strictEqual(Visuals.featureBoxClear({ left: 5, top: 5, width: 50, height: 40 }), true, "above the panel");
assert.strictEqual(Visuals.featureBoxClear({ left: 40, top: 40, width: 30, height: 30 }), false, "overlaps the panel corner");
assert.strictEqual(Visuals.featureBoxClear(null), false, "no box -> not clear (unchecked fails)");

// Plan and prompts for a deep-time lesson.
var adventure = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/source-grounded/run9-generate-adventure.json"), "utf8"));
adventure.topic = "Dinosaurs"; adventure.yearGroup = "Year 3"; adventure.subject = "Science";
var plan = Visuals.planTeachingVisuals(adventure, [a, b]);
var hook = plan[0];
assert.strictEqual(hook.storyScene.mode, "single");
assert.strictEqual(hook.limitation, mixed.limitation);
assert.ok(/Show exactly one animal: an Examplosaurus/.test(Visuals.buildTeachingVisualPrompt(adventure, hook)));
var t1 = plan[1];
assert.strictEqual(t1.subject, "Examplosaurus");
assert.deepStrictEqual(t1.identify, ["Examplosaurus lived about 150 million years ago in the Jurassic period."]);
var p1 = Visuals.buildTeachingVisualPrompt(adventure, t1);
assert.ok(/The whole of one Examplosaurus, side-on/.test(p1));
assert.ok(/recognisable as an Examplosaurus \(Jurassic period\)/.test(p1));
assert.ok(p1.indexOf(Visuals.COMPOSITION_LINE) !== -1);
assert.ok(/do not add features the source does not describe/.test(p1));
// Not a deep-time topic -> no story-scene rule.
var plainAdv = JSON.parse(JSON.stringify(adventure)); plainAdv.topic = "Plants"; plainAdv.title = "Plants"; plainAdv.subject = "Science";
assert.strictEqual(Visuals.planTeachingVisuals(plainAdv, [a, b])[0].storyScene, undefined);

// Vision rows: code flags over the vision answers.
var clean = { featureVisible: "yes", matchesBeat: "yes", childSafety: "ok", animalKinds: 1, isExpectedAnimal: "yes", featureBox: { left: 60, top: 10, width: 30, height: 40 } };
function row(asset, change) { return Finish.teachingVisionRow(asset, "", Object.assign({}, clean, change || {})); }
var teachAsset = { id: "teach-u1", framing: "teaching", slotId: "teach", view: "whole-animal", subject: "Examplosaurus" };
assert.strictEqual(row(teachAsset).ok, true, row(teachAsset).flags.join("; "));
assert.ok(row(teachAsset, { animalKinds: 3 }).flags.some(function (f) { return /shows 3 kinds of animal/.test(f); }));
assert.ok(row(teachAsset, { isExpectedAnimal: "partly", identifiableAs: "a crocodile" }).flags.some(function (f) { return /not recognisable as Examplosaurus \(partly: looks like a crocodile\)/.test(f); }));
assert.ok(row(teachAsset, { featureBox: { left: 10, top: 60, width: 30, height: 20 } }).flags.some(function (f) { return /taught feature sits under the text panel/.test(f); }));
assert.ok(row(teachAsset, { featureBox: null }).flags.indexOf("taught feature position: unchecked") !== -1);
assert.ok(row(teachAsset, { animalKinds: undefined }).flags.indexOf("animal kinds: unchecked") !== -1);
assert.strictEqual(row({ id: "teach-u2", framing: "teaching", slotId: "teach", view: "comparison" }, { animalKinds: 2 }).ok, true, "a comparison may show two kinds");
var storyAsset = { id: "hook", framing: "story", slotId: "hook", storyScene: mixed, limitation: mixed.limitation };
assert.strictEqual(row(storyAsset, { featureVisible: "n/a" }).ok, true);
assert.ok(row(storyAsset, { featureVisible: "n/a", animalKinds: 2 }).flags.some(function (f) { return /story picture shows 2 kinds of animal \(a single-animal scene was required/.test(f); }));
assert.strictEqual(row(storyAsset, { animalKinds: 2 }).limitation, mixed.limitation);

// "these images" over one picture (run 14's Explore line) fails in research mode only.
var acts = [{ slotId: "investigate", beats: [{ id: "investigate:0", pupil: { text: "Look at these images of the animals." } }] }];
assert.ok(/several pictures \("these images"\)/.test(Brain.pictureCountIssues(acts)[0].text));
assert.deepStrictEqual(Brain.pictureCountIssues([{ slotId: "investigate", beats: [{ id: "investigate:0", pupil: { text: "Look at this picture of the animal." } }] }]), []);
assert.deepStrictEqual(Brain.researchRuleIssues(acts, {}), [], "default path: no rule");
assert.ok(/never these images/.test(Brain.researchContentRules("Year 3")));
console.log("image rules tests passed");
