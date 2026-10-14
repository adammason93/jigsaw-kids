"use strict";
/* One guarded web-search probe: confirms the search model accepts allowlist domain filters
   before the single rerun. Runs only the research module (no lesson calls).
   Usage: OPENAI_API_KEY=... node scripts/source-grounded/probe-search.js --out DIR --cap USD */
var fs = require("fs");
var path = require("path");
var Guard = require("./spend-guard.js");
var R = require("../../js/source-research.js");
function arg(name, fallback) { var at = process.argv.indexOf("--" + name); return at !== -1 ? process.argv[at + 1] : fallback; }
var outDir = path.resolve(arg("out", "out"));
var key = String(process.env.OPENAI_API_KEY || "").trim();
if (!key) { console.error("OPENAI_API_KEY is not set"); process.exit(2); }
var guard = Guard.createGuard({ capUsd: Number(arg("cap", "0")), ledgerPath: path.join(outDir, "spend-ledger.jsonl"), redact: key, labelFor: function () { return "probe:research-web-search"; } });
var request = { lessonText: "Teach Year 3 about dinosaurs", topic: "Dinosaurs", yearGroup: "Year 3", learningGoal: "Pupils will understand how dinosaurs adapted to their environments.", requiredEvidence: "Pupils can explain how a specific dinosaur's features helped it survive in its habitat.", focusConcepts: ["adaptation", "habitat", "survival", "features"] };
R.researchTopic(request, { fetch: guard.wrap(global.fetch), providers: [R.openaiWebSearchProvider({ apiKey: key })], maxSources: 8 }).then(function (record) {
  var summary = { providers: record.providers, discovered: record.discovered.map(function (d) { return d.url; }), sources: record.sources.map(function (s) { return [s.url, s.passageCount]; }), refused: record.refused, spend: guard.state() };
  fs.writeFileSync(path.join(outDir, "probe-search.json"), JSON.stringify(summary, null, 2));
  console.log(guard.redact(JSON.stringify(summary, null, 1)));
});
