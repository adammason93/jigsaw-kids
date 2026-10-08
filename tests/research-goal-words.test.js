"use strict";

// Patch 8, research mode only: the content brief says the goal's "adapted" wording is for the
// teacher. Live run 17's content echoed the teleological teacher goal ("How do you think
// dinosaurs adapted to their environments?", "Now we know how dinosaurs adapted to survive").
// The teleology rule is unchanged and still blocks those lines.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var rules = Brain.researchContentRules("Year 3");
assert.ok(/those words are for the teacher/.test(rules));
assert.ok(/never say an animal adapted or adapted to something/.test(rules));
// The rule still blocks the run 17 lines in pupil text.
["How do you think dinosaurs adapted to their environments?", "Now we know how dinosaurs adapted to survive in their habitats."].forEach(function (line) {
  var rows = Brain.teleologyIssues([{ slotId: "hook", beats: [{ id: "hook:0", text: line }] }]);
  assert.ok(rows.length >= 1, "blocked: " + line);
});
console.log("research goal words tests passed");
