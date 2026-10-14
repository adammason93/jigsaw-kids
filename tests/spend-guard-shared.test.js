"use strict";
// The spend guard refuses a call when the shared total (prior figure + other ledgers + own
// spend) plus the doubled worst case would pass the total cap. No network: the fetch is a stub.
var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var Guard = require("../scripts/source-grounded/spend-guard.js");
var dir = fs.mkdtempSync(path.join(os.tmpdir(), "guard-"));
var other = path.join(dir, "other.jsonl");
fs.writeFileSync(other, JSON.stringify({ at: "x", label: "boot-1", kind: "chat", guard: 0.2, listed: 0.1 }) + "\n" + JSON.stringify({ event: "settled", guardUsd: 0.1, listedUsd: 0.05 }) + "\n");
var calls = 0;
function stub() { calls += 1; return Promise.resolve({ ok: true, status: 200, clone: function () { return { json: function () { return Promise.resolve({ usage: { prompt_tokens: 10, completion_tokens: 10 } }); } }; } }); }
var body = JSON.stringify({ model: "gpt-4o-mini", max_tokens: 100, messages: [{ role: "user", content: "hi" }] });
var tight = Guard.createGuard({ capUsd: 0.7, ledgerPath: path.join(dir, "a.jsonl"), totalCapUsd: 2.5, baseGuardUsd: 2.2, sharedLedgers: [other] });
assert.ok(Math.abs(tight.sharedGuardSpent() - 2.5) < 1e-9);
tight.wrap(stub)("https://api.openai.com/v1/chat/completions", { body: body }).then(function () { assert.fail("should refuse"); }, function (error) {
  assert.ok(/total cap/.test(error.message));
  assert.strictEqual(calls, 0);
  var roomy = Guard.createGuard({ capUsd: 0.7, ledgerPath: path.join(dir, "b.jsonl"), totalCapUsd: 2.5, baseGuardUsd: 1.0, sharedLedgers: [other] });
  return roomy.wrap(stub)("https://api.openai.com/v1/chat/completions", { body: body });
}).then(function () {
  assert.strictEqual(calls, 1);
  console.log("spend-guard shared total tests passed");
});
