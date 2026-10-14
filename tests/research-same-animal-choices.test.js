"use strict";

// Patch 8, research mode only: the content brief says another taught result about the same animal
// is not a wrong choice. Live run 18's slot repair gave all three check questions the same three
// choices; two units were about Spinosaurus, so "Swim easily in the water." was a wrong choice for
// the nostrils question although it is true of Spinosaurus. The question audit and the code rule
// blocked it (unchanged); this line asks the model not to write it.
var assert = require("assert");
var Brain = require("../js/lesson-brain.js");
var rules = Brain.researchContentRules("Year 3");
assert.ok(/Never use another taught result as a wrong choice when it is about the same animal/.test(rules));
assert.ok(/Do not give every question the same set of choices/.test(rules));
// The audit rule still blocks a wrong choice the audit marks true in general (unchanged).
var q = { prompt: "What did Spinosaurus's nostrils allow it to do?", choices: ["Breathe with most of its snout underwater.", "Swim easily in the water."], correct: "Breathe with most of its snout underwater." };
var audit = Brain.parseQuestionAudit({ questions: [{ prompt: q.prompt, teleological: "no", circular: "no", distractors: [{ choice: "Swim easily in the water.", trueInGeneral: "yes", reason: "Spinosaurus's paddle-like webbed feet allowed it to swim." }] }] });
var rows = Brain.questionAuditIssues(q, 0, audit);
assert.ok(rows.some(function (r) { return /is true in general/.test(r.text); }), JSON.stringify(rows));
console.log("research same-animal choices tests passed");
