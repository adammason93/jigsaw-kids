"use strict";

// Teaching pictures sit on every teach beat of their unit (patch 6 correction). Run 14 showed the
// feature sentence of unit 2 under unit 1's picture because only the explanation beat was mapped.
// Beat shape below mirrors run 14 (ids and unit ids only; no lesson text).
var assert = require("assert");
var Finish = require("../scripts/source-grounded/finish.js");

var teach = [
  { id: "teach:0", unitIds: ["u1"] }, { id: "teach:1", unitIds: ["u1"] },
  { id: "teach:2", unitIds: ["u2"] }, { id: "teach:3", unitIds: ["u2"] },
  { id: "teach:4", unitIds: ["u3"] }, { id: "teach:5", unitIds: ["u3"] },
  { id: "teach:6", unitIds: ["u1", "u2"] }
];
var rows = { u1: { explainBeats: ["teach:1"], beats: ["teach:0", "teach:1"] }, u2: { explainBeats: ["teach:3"] }, u3: { explainBeats: ["teach:5"] } };

// Positive: the feature beat and the explanation beat both get the unit's picture.
assert.deepStrictEqual(Finish.unitBeatIds(teach, rows.u2, "u2"), ["teach:2", "teach:3"]);
assert.deepStrictEqual(Finish.unitBeatIds(teach, rows.u3, "u3"), ["teach:4", "teach:5"]);
// Negative: another unit's beats and multi-unit beats are never claimed.
assert.ok(Finish.unitBeatIds(teach, rows.u1, "u1").indexOf("teach:2") === -1);
assert.ok(Finish.unitBeatIds(teach, rows.u1, "u1").indexOf("teach:6") === -1);
// Fallback: beats without unit ids use the lineage explanation beats.
assert.deepStrictEqual(Finish.unitBeatIds([{ id: "teach:0" }, { id: "teach:1" }], rows.u1, "u1"), ["teach:1"]);

// End to end through stampTeachingVisuals: each beat shows its own unit's picture.
var adventure = { activities: [{ slotId: "teach", beats: JSON.parse(JSON.stringify(teach)) }, { slotId: "hook", beats: [] }] };
var images = ["u1", "u2", "u3"].map(function (u) { return { id: "teach-" + u, status: "ready", beatIds: Finish.unitBeatIds(teach, rows[u], u) }; });
images.unshift({ id: "hook", status: "ready" });
Finish.stampTeachingVisuals(adventure, images);
var shown = adventure.activities[0].beats.map(function (b) { return b.visualAssetId; });
assert.deepStrictEqual(shown, ["teach-u1", "teach-u1", "teach-u2", "teach-u2", "teach-u3", "teach-u3", "teach-u3"]);
console.log("teaching picture beat tests passed");
