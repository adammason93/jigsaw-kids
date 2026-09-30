"use strict";

var assert = require("assert");
var Shell = require("../schools/learn/lesson-shell.js");

assert.strictEqual(Shell.screenFor(null, {}, {}), "roster");
assert.strictEqual(Shell.screenFor(null, {}, { preview: true }), "stage");

var live = { mode: "live", engineStatus: "waiting", status: "waiting", slides: [{ type: "story" }] };
assert.strictEqual(Shell.screenFor(live, { entered: false }, {}), "join");

var ready = { mode: "board", engineStatus: "waiting", status: "playing", board: { phase: "gate" }, slides: [{ type: "story" }] };
assert.strictEqual(Shell.screenFor(ready, { entered: false }, {}), "ready");

var mid = { mode: "board", engineStatus: "active", status: "playing", startedAt: "2026-09-30", board: { phase: "play" }, slides: [{ type: "story" }, { type: "question" }] };
assert.strictEqual(Shell.screenFor(mid, { entered: false }, { offerRecover: true }), "recover");
assert.strictEqual(Shell.screenFor(mid, { entered: true }, { offerRecover: true }), "stage");

var paused = { mode: "board", engineStatus: "paused", status: "playing", board: { phase: "play" }, slides: [{ type: "story" }] };
assert.strictEqual(Shell.screenFor(paused, { entered: true }, {}), "paused");
assert.strictEqual(Shell.screenFor({ engineStatus: "recoverable_error", slides: [{}] }, { entered: true }, {}), "error");
assert.strictEqual(Shell.screenFor({ engineStatus: "completed" }, {}, {}), "complete");
assert.strictEqual(Shell.screenFor({ engineStatus: "ended" }, {}, {}), "ended");
assert.strictEqual(Shell.screenFor(mid, { entered: true, transition: 1 }, { offerRecover: true }), "transition");

assert.strictEqual(Shell.scoreMode({ engine: { teamMode: "none", teams: [] } }), "class");
assert.strictEqual(Shell.scoreMode({ engine: { teamMode: "two", teams: [{ name: "Red" }, { name: "Blue" }] } }), "two");
assert.strictEqual(Shell.scoreMode({ engine: { teamMode: "teacher_class", teams: [{ name: "Teacher" }, { name: "Class" }] } }), "teacher_class");
assert.strictEqual(Shell.activityName("word-search"), "Word search");
assert.ok(Shell.helpText("quiz").length > 20);

console.log("lesson-shell tests passed");
