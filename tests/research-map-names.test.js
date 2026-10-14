"use strict";

// Patch 7, research mode only: an animal's name is the subject, not part of a relationship, so
// two different relationships about the same animal are not merged as restatements. Live run 15
// (6 Oct 2026, 11:58 BST) dropped "Spinosaurus's webbed feet allowed the dinosaur to swim" as a
// restatement of the nostrils explanation; the only long word they shared was the name, and the
// lesson stopped at the plan with 2 of 3 pairs. Real paraphrases are still merged.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var goal = "Pupils will understand how dinosaurs adapted to their environments.";
var nostrils = "Spinosaurus's nostrils further up let it breathe with most of its snout underwater.";
var feet = "Spinosaurus's webbed feet allowed the dinosaur to swim.";
var paraphrase = "Spinosaurus's higher nostrils let it breathe while most of its snout was underwater.";
var names = Brain.packNames({ knowledgePack: { claims: [{ text: "Researchers believe Spinosaurus's dense bones acted as a weight." }, { text: "Spinosaurus had paddle-like webbed feet." }] } });
assert.deepStrictEqual(names, { spinosaurus: 1 }, "a name used mid-sentence in a pack claim; sentence starts are not names");
// Negative (the run 15 false positive): without names (default path) the two are merged.
assert.strictEqual(Brain.sameRelationship(nostrils, feet, goal), true, "default path unchanged");
// Positive: with the research pack's names, two different relationships stay apart.
assert.strictEqual(Brain.sameRelationship(nostrils, feet, goal, names), false);
// A real paraphrase is still a restatement with names excluded.
assert.strictEqual(Brain.sameRelationship(nostrils, paraphrase, goal, names), true);
console.log("research map names tests passed");
