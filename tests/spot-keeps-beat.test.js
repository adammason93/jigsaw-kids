"use strict";

// Tapping a look-closer spot keeps the current story beat (correction found in the run 14
// real-player walk: the Explore stage jumped back to its first line after the tap, so the class
// re-read three lines before the lesson moved on).
var assert = require("assert");
var Shell = require("../schools/learn/lesson-shell.js");

var steps = [{ type: "tap-to-reveal", target: "t1" }];
// Positive: beat 2 stays beat 2 after the tap; the step is revealed.
var after = Shell.completeSpot({ index: 0, step: 0, beat: 2, revealed: false }, steps);
assert.strictEqual(after.beat, 2);
assert.strictEqual(after.revealed, true);
// With more steps the tap moves to the next step and still keeps the beat.
var two = Shell.completeSpot({ index: 0, step: 0, beat: 1 }, steps.concat([{ type: "tap-to-reveal", target: "t2" }]));
assert.strictEqual(two.step, 1);
assert.strictEqual(two.beat, 1);
assert.strictEqual(two.revealed, false);
// Negative: no beat recorded means the first beat, never a made-up one.
assert.strictEqual(Shell.completeSpot({ index: 0, step: 0 }, steps).beat, 0);
console.log("spot keeps beat tests passed");
