"use strict";

// Patch 9: the teaching-picture subject. Live run 24's units all opened their explanation with
// the animal's name ("Spinosaurus's webbed feet allowed the dinosaur to swim."), which the
// subject reader skipped as a sentence-initial word, so no teaching prompt named the animal,
// the story-picture limitation read "(: Cretaceous; ...)", and the webbed-feet picture came
// back as a sea reptile.
var assert = require("assert");
var V = require("../js/visual-adventure.js");
var passage = "Named for its seven-foot-long spines, Spinosaurus lived about a hundred million years ago during the Cretaceous period. Spinosaurus was well adapted for aquatic life. And its paddle-like webbed feet would\u2019ve allowed the animal to swim.";
var unit = { unitId: "u2", feature: "webbed feet", explanation: "Spinosaurus's webbed feet allowed the dinosaur to swim.", featureQuote: "And its paddle-like webbed feet would\u2019ve allowed the animal to swim.", explanationQuote: "And its paddle-like webbed feet would\u2019ve allowed the animal to swim.", passageText: passage };
assert.strictEqual(V.unitSubject(unit), "Spinosaurus");
assert.strictEqual(V.unitSubject(Object.assign({}, unit, { explanation: "Spinosaurus\u2019s webbed feet allowed the dinosaur to swim." })), "Spinosaurus", "curly apostrophe");
assert.deepStrictEqual(V.identifyingSentences(unit, 2), ["Named for its seven-foot-long spines, Spinosaurus lived about a hundred million years ago during the Cretaceous period.", "Spinosaurus was well adapted for aquatic life."]);
var plan = V.storyScenePlan([unit]);
assert.ok(/Spinosaurus/.test(JSON.stringify(plan.rows)));
// A sentence-initial word the passage never uses mid-sentence is not a name.
assert.strictEqual(V.unitSubject({ explanation: "These webbed feet allowed it to swim.", feature: "webbed feet", passageText: "These webbed feet allowed it to swim." }), "");
assert.strictEqual(V.unitSubject({ explanation: "Webbed feet helped the animal swim.", feature: "webbed feet", passageText: passage }), "");
// The earlier rule (a capitalised word after the first) is unchanged.
assert.strictEqual(V.unitSubject({ explanation: "The long forelegs of Brachiosaurus helped it reach high." }), "Brachiosaurus");
console.log("visual unit subject tests passed");
