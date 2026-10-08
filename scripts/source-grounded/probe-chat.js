"use strict";
/* One tiny guarded call: confirms the experimental research knowledge model accepts the
   request shape the boot sends to reasoning models on chat completions (json_object,
   reasoning_effort, max_completion_tokens, no temperature).
   Usage: OPENAI_API_KEY=... node scripts/source-grounded/probe-chat.js --ledger FILE --cap USD [--model gpt-6-luna] */
var path = require("path");
var Guard = require("./spend-guard.js");
function arg(name, fallback) { var at = process.argv.indexOf("--" + name); return at !== -1 ? process.argv[at + 1] : fallback; }
var key = String(process.env.OPENAI_API_KEY || "").trim();
if (!key) { console.error("OPENAI_API_KEY is not set"); process.exit(2); }
var model = arg("model", "gpt-6-luna");
var guard = Guard.createGuard({ capUsd: Number(arg("cap", "0")), ledgerPath: path.resolve(arg("ledger", "spend-ledger.jsonl")), redact: key, totalCapUsd: Number(arg("total-cap", "0")), baseGuardUsd: Number(arg("base-guard", "0")), sharedLedgers: String(arg("shared-ledgers", "")).split(",").filter(Boolean).map(function (f) { return path.resolve(f); }), labelFor: function () { return "probe:chat:" + model; } });
guard.wrap(global.fetch)("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
  body: JSON.stringify({ model: model, response_format: { type: "json_object" }, reasoning_effort: "low", max_completion_tokens: 400,
    messages: [{ role: "system", content: "Return JSON only." }, { role: "user", content: "Return {\"ok\": true, \"word\": \"fossil\"} as JSON." }] })
}).then(function (res) { return res.json().then(function (body) { return { status: res.status, body: body }; }); }).then(function (r) {
  var content = r.body && r.body.choices && r.body.choices[0] && r.body.choices[0].message && r.body.choices[0].message.content;
  console.log(guard.redact(JSON.stringify({ status: r.status, content: content || null, error: r.body && r.body.error ? r.body.error.message : null, usage: r.body && r.body.usage || null, spend: guard.state() }, null, 1)));
}).catch(function (e) { console.error(guard.redact(String(e))); process.exit(1); });
