"use strict";
// Web search worst case (patch 6). A live gpt-6-luna web search with max_tool_calls 1 billed two
// searches (run 9, 6 Oct 2026: worst case $0.015023 listed, settled $0.022940). The guard now
// allows one more search than max_tool_calls, so a settled call cannot pass its own worst case.
var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var Guard = require("../scripts/source-grounded/spend-guard.js");
var dir = fs.mkdtempSync(path.join(os.tmpdir(), "guard-ws-"));
var ledger = path.join(dir, "l.jsonl");
var payload = { output: [{ type: "web_search_call" }, { type: "web_search_call" }, { type: "message" }], usage: { input_tokens: 13039, output_tokens: 73 } };
function stub() { return Promise.resolve({ ok: true, status: 200, clone: function () { return { json: function () { return Promise.resolve(payload); } }; }, json: function () { return Promise.resolve(payload); } }); }
var guard = Guard.createGuard({ capUsd: 0.5, ledgerPath: ledger });
var body = { model: "gpt-6-luna", input: "x".repeat(3000), tools: [{ type: "web_search" }], max_tool_calls: 1, max_output_tokens: 2000 };
guard.wrap(stub)("https://api.openai.com/v1/responses", { body: JSON.stringify(body) }).then(function () {
  var row = fs.readFileSync(ledger, "utf8").trim().split("\n").map(JSON.parse).filter(function (r) { return r.event === "settled"; })[0];
  assert.strictEqual(row.detail.webSearchCalls, 2);
  assert.ok(row.worstListedUsd >= row.listedUsd, "worst " + row.worstListedUsd + " covers settled " + row.listedUsd);
  assert.ok(row.worstListedUsd >= 0.02, "two searches are priced");
  // Negative: three billed searches with max_tool_calls 1 still exceed the worst case and are recorded at the real figure.
  payload.output.push({ type: "web_search_call" });
  return guard.wrap(stub)("https://api.openai.com/v1/responses", { body: JSON.stringify(body) });
}).then(function () {
  var rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map(JSON.parse).filter(function (r) { return r.event === "settled"; });
  assert.strictEqual(rows[1].detail.webSearchCalls, 3);
  assert.ok(rows[1].listedUsd > rows[1].worstListedUsd, "settles at the billed figure even above the worst case");
  console.log("spend-guard web search tests passed");
}).catch(function (e) { console.error(e); process.exit(1); });
