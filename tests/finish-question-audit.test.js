"use strict";

// Patch 9: the finish rule check (check 6) uses the boot's last question audit. Live run 24's
// finish flagged every question as "not checked" because the finish context had no audit.
var assert = require("assert");
var Finish = require("../scripts/source-grounded/finish.js");
var Brain = require("../js/lesson-brain.js");
var q = { prompt: "What did the webbed feet let Spinosaurus do?", choices: ["Swim.", "Climb trees."], correct: "Swim." };
function verdict(prompt, distractor) { return { prompt: prompt, teleological: "no", circular: "no", distractors: [distractor] }; }
var trace = { logs: [
  { stage: "QUESTION_AUDIT", ok: true, model: "m", verdicts: [verdict(q.prompt, { choice: "Climb trees.", trueInGeneral: "partly", reason: "first content" })] },
  { stage: "CONTENT_REPAIR" },
  { stage: "QUESTION_AUDIT", ok: false, verdicts: [] },
  { stage: "QUESTION_AUDIT", ok: true, model: "m", verdicts: [verdict(q.prompt, { choice: "Climb trees.", trueInGeneral: "no", reason: "final content" })] }
] };
var audit = Finish.lastQuestionAudit(trace);
assert.strictEqual(audit.questions[0].distractors[0].reason, "final content", "the last successful audit is used");
assert.deepStrictEqual(Brain.questionAuditIssues(q, 0, audit), []);
// A question the audit did not see (prompt not copied exactly) still fails as unchecked.
var other = Object.assign({}, q, { prompt: "What did the long forelegs let Brachiosaurus do?" });
assert.ok(/was not checked/.test(Brain.questionAuditIssues(other, 0, audit)[0].text));
// A failing verdict in the last audit still fails.
var badTrace = { logs: [{ stage: "QUESTION_AUDIT", ok: true, verdicts: [verdict(q.prompt, { choice: "Climb trees.", trueInGeneral: "yes", reason: "r" })] }] };
assert.strictEqual(Brain.questionAuditIssues(q, 0, Finish.lastQuestionAudit(badTrace)).length, 1);
// No audit in the trace: null, so every question fails as before.
assert.strictEqual(Finish.lastQuestionAudit({ logs: [] }), null);
assert.ok(/was not checked/.test(Brain.questionAuditIssues(q, 0, null)[0].text));
console.log("finish question audit tests passed");
